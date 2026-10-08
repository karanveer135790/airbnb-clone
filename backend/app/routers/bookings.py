from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from ..dependencies import DB, Identity, require_user
from ..models import Booking, BookingStatus
from ..schemas import BookingCreate, BookingCheckout, BookingRead, QuoteRead, TripRead
from ..services.bookings import quote, create_booking, today
from ..services.listings import present_listings
from ..services.transactions import write_transaction

router = APIRouter(prefix='/bookings', tags=['Bookings'])

@router.post('/quote', response_model=QuoteRead)
def price_quote(payload: BookingCreate, db: DB, user_id: Identity):
    require_user(db, user_id)
    return quote(db, payload, user_id)

@router.post('', response_model=BookingRead, status_code=201)
def reserve(payload: BookingCheckout, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id)
        return create_booking(db, BookingCreate.model_validate(payload.model_dump(exclude={'expected_total_cents'})), user_id, payload.expected_total_cents)

@router.get('/{booking_id}', response_model=TripRead)
def booking_detail(booking_id: int, db: DB, user_id: Identity):
    require_user(db, user_id)
    booking = db.get(Booking, booking_id)
    if not booking or (booking.guest_id != user_id and booking.listing.host_id != user_id):
        raise HTTPException(404, 'Booking not found')
    return TripRead(**BookingRead.model_validate(booking).model_dump(), listing=present_listings(db, [booking.listing])[0], review_id=booking.review.id if booking.review else None)

@router.post('/{booking_id}/cancel', response_model=BookingRead)
def cancel(booking_id: int, db: DB, user_id: Identity):
    with write_transaction(db):
        require_user(db, user_id)
        booking = db.get(Booking, booking_id)
        if not booking or booking.guest_id != user_id:
            raise HTTPException(404, 'Booking not found')
        if booking.status == BookingStatus.CANCELLED:
            return BookingRead.model_validate(booking)
        if booking.check_in <= today():
            raise HTTPException(409, 'Only future stays may be cancelled')
        booking.status = BookingStatus.CANCELLED
        db.flush()
        return BookingRead.model_validate(booking)
