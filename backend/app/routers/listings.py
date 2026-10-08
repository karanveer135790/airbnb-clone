from datetime import date
from math import ceil
from typing import Annotated, Literal
from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import selectinload
from ..dependencies import DB, Identity, require_user
from ..models import Booking, Category, Listing, Review
from ..schemas import ListingCreate, ListingUpdate, ListingRead, ListingPage, AvailabilityRange, ReviewRead
from ..services.listings import get_listing, owned_listing, present_listings
from ..services.bookings import overlap, today
from ..services.transactions import write_transaction

router = APIRouter(prefix='/listings', tags=['Listings'])

@router.get('', response_model=ListingPage)
def search(db: DB, location: str = '', category: Category | None = None,
           property_type: str | None = None, guests: int = Query(1, ge=1, le=30),
           min_price: int | None = Query(None, ge=0), max_price: int | None = Query(None, ge=0),
           amenities: Annotated[list[str] | None, Query()] = None,
           check_in: date | None = None, check_out: date | None = None,
           page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=48),
           sort: Literal['recommended', 'price_asc', 'price_desc'] = 'recommended'):
    if (check_in is None) != (check_out is None):
        raise HTTPException(422, 'Supply both check-in and check-out')
    if check_in and (check_in < today() or check_out <= check_in or (check_out-check_in).days > 365):
        raise HTTPException(422, 'Invalid search dates')
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(422, 'Minimum price exceeds maximum price')
    filters = [Listing.is_active.is_(True), Listing.max_guests >= guests]
    if location.strip():
        # Escape wildcard characters so user input remains a literal substring.
        term = location.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        filters.append(or_(*[column.ilike(f'%{term}%', escape='\\') for column in (Listing.city, Listing.country, Listing.title)]))
    if category:
        filters.append(Listing.category == category)
    if property_type:
        filters.append(Listing.property_type == property_type)
    if min_price is not None:
        filters.append(Listing.nightly_rate_cents >= min_price)
    if max_price is not None:
        filters.append(Listing.nightly_rate_cents <= max_price)
    for amenity in amenities or []:
        values = func.json_each(Listing.amenities).table_valued('key', 'value')
        filters.append(exists(select(1).select_from(values).where(values.c.value == amenity)))
    if check_in:
        filters.append(~exists(select(Booking.id).where(*overlap(Listing.id, check_in, check_out))))
    total = db.scalar(select(func.count()).select_from(Listing).where(*filters))
    ordering = {'recommended': Listing.id, 'price_asc': Listing.nightly_rate_cents.asc(), 'price_desc': Listing.nightly_rate_cents.desc()}[sort]
    rows = list(db.scalars(select(Listing).options(selectinload(Listing.host)).where(*filters)
                          .order_by(ordering, Listing.id).offset((page-1)*page_size).limit(page_size)))
    return ListingPage(items=present_listings(db, rows), total=total, page=page, page_size=page_size, pages=ceil(total/page_size))

@router.get('/{listing_id}', response_model=ListingRead)
def detail(listing_id: int, db: DB):
    return present_listings(db, [get_listing(db, listing_id)])[0]

@router.get('/{listing_id}/availability', response_model=list[AvailabilityRange])
def availability(listing_id: int, db: DB):
    get_listing(db, listing_id)
    return db.scalars(select(Booking).where(Booking.listing_id == listing_id,
        Booking.status == 'confirmed', Booking.check_out > today()).order_by(Booking.check_in)).all()

@router.get('/{listing_id}/reviews', response_model=list[ReviewRead])
def reviews(listing_id: int, db: DB, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    get_listing(db, listing_id)
    return db.scalars(select(Review).options(selectinload(Review.author)).where(Review.listing_id == listing_id)
        .order_by(Review.created_at.desc(), Review.id.desc()).offset((page-1)*page_size).limit(page_size)).all()

@router.post('', response_model=ListingRead, status_code=201)
def create(payload: ListingCreate, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id, host=True)
        listing = Listing(host_id=user_id, **payload.model_dump(mode='json'))
        db.add(listing)
        db.flush()
        return present_listings(db, [listing])[0]

@router.patch('/{listing_id}', response_model=ListingRead)
def update(listing_id: int, payload: ListingUpdate, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id, host=True)
        listing = owned_listing(db, listing_id, user_id)
        if not listing.is_active:
            raise HTTPException(409, 'Archived listings cannot be edited')
        merged = {key: getattr(listing, key) for key in ListingCreate.model_fields}
        merged.update(payload.model_dump(exclude_unset=True, mode='json'))
        data = ListingCreate.model_validate(merged)
        if db.scalar(select(Booking.id).where(Booking.listing_id == listing.id, Booking.status == 'confirmed',
                Booking.check_out > today(), Booking.guests > data.max_guests).limit(1)):
            raise HTTPException(409, 'Capacity cannot be reduced below an existing reservation')
        for key, value in data.model_dump(mode='json').items():
            setattr(listing, key, value)
        db.flush()
        return present_listings(db, [listing])[0]

@router.delete('/{listing_id}', status_code=204)
def delete(listing_id: int, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id, host=True)
        owned_listing(db, listing_id, user_id).is_active = False
    return Response(status_code=204)
