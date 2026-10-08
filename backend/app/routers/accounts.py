from typing import Literal
from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..dependencies import DB, Identity, require_user
from ..models import Booking, Listing, Review, User, Wishlist
from ..schemas import UserPublic, UserRead, ListingRead, BookingRead, TripRead, ReservationRead, ReviewCreate, ReviewRead
from ..services.bookings import today
from ..services.listings import get_listing, present_listings
from ..services.transactions import write_transaction

router = APIRouter(tags=['Accounts and dashboards'])

@router.get('/demo/users', response_model=list[UserPublic])
def demo_users(db: DB):
    return db.scalars(select(User).order_by(User.id)).all()

@router.get('/me', response_model=UserRead)
def me(db: DB, user_id: Identity):
    return require_user(db, user_id)

@router.get('/me/trips', response_model=list[TripRead])
def trips(db: DB, user_id: Identity, period: Literal['all', 'upcoming', 'past', 'cancelled'] = 'all',
          page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    require_user(db, user_id)
    filters = [Booking.guest_id == user_id]
    if period == 'cancelled':
        filters.append(Booking.status == 'cancelled')
    elif period != 'all':
        filters.extend([Booking.status == 'confirmed', Booking.check_out <= today() if period == 'past' else Booking.check_out > today()])
    rows = db.scalars(select(Booking).options(selectinload(Booking.review), selectinload(Booking.listing).selectinload(Listing.host))
        .where(*filters).order_by(Booking.check_in.desc(), Booking.id.desc()).offset((page-1)*page_size).limit(page_size)).all()
    listings = {l.id: l for l in present_listings(db, list({b.listing.id: b.listing for b in rows}.values()))}
    return [TripRead(**BookingRead.model_validate(b).model_dump(), listing=listings[b.listing_id], review_id=b.review.id if b.review else None) for b in rows]

@router.get('/host/listings', response_model=list[ListingRead])
def host_listings(db: DB, user_id: Identity, include_archived: bool = False):
    require_user(db, user_id, host=True)
    statement = select(Listing).where(Listing.host_id == user_id)
    if not include_archived:
        statement = statement.where(Listing.is_active.is_(True))
    return present_listings(db, list(db.scalars(statement.order_by(Listing.id.desc()))))

@router.get('/host/reservations', response_model=list[ReservationRead])
def reservations(db: DB, user_id: Identity, listing_id: int | None = None,
                 page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    require_user(db, user_id, host=True)
    statement = select(Booking).join(Listing).where(Listing.host_id == user_id)
    if listing_id is not None:
        statement = statement.where(Booking.listing_id == listing_id)
    rows = db.scalars(statement.options(selectinload(Booking.guest), selectinload(Booking.listing).selectinload(Listing.host))
        .order_by(Booking.check_in.desc(), Booking.id.desc()).offset((page-1)*page_size).limit(page_size)).all()
    listings = {l.id: l for l in present_listings(db, list({b.listing.id: b.listing for b in rows}.values()))}
    return [ReservationRead(**BookingRead.model_validate(b).model_dump(), listing=listings[b.listing_id],
                            guest=UserPublic.model_validate(b.guest)) for b in rows]

@router.get('/me/wishlist', response_model=list[ListingRead])
def wishlist(db: DB, user_id: Identity):
    require_user(db, user_id)
    rows = db.scalars(select(Listing).join(Wishlist).where(Wishlist.user_id == user_id, Listing.is_active.is_(True)).order_by(Listing.id)).all()
    return present_listings(db, list(rows))

@router.put('/me/wishlist/{listing_id}', status_code=204)
def save_favorite(listing_id: int, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id)
        get_listing(db, listing_id)
        if not db.get(Wishlist, (user_id, listing_id)):
            db.add(Wishlist(user_id=user_id, listing_id=listing_id))
    return Response(status_code=204)

@router.delete('/me/wishlist/{listing_id}', status_code=204)
def remove_favorite(listing_id: int, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id)
        row = db.get(Wishlist, (user_id, listing_id))
        if row:
            db.delete(row)
    return Response(status_code=204)

@router.post('/reviews', response_model=ReviewRead, status_code=201)
def review(payload: ReviewCreate, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id)
        booking = db.get(Booking, payload.booking_id)
        if not booking or booking.guest_id != user_id:
            raise HTTPException(404, 'Booking not found')
        if booking.status != 'confirmed' or booking.check_out > today():
            raise HTTPException(409, 'Only completed stays may be reviewed')
        if db.scalar(select(Review.id).where(Review.booking_id == booking.id)):
            raise HTTPException(409, 'This stay has already been reviewed')
        row = Review(**payload.model_dump(), author_id=user_id, listing_id=booking.listing_id)
        db.add(row)
        db.flush()
        return ReviewRead.model_validate(row)
