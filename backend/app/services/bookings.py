from datetime import date, datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Booking, BookingStatus
from ..schemas import BookingCreate, BookingRead, QuoteRead
from .listings import get_listing


def today() -> date:
    # The demo uses a documented single UTC booking calendar.
    return datetime.now(timezone.utc).date()


def overlap(listing_id, start, end):
    return (Booking.listing_id == listing_id,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.check_in < end, Booking.check_out > start)


def quote(db: Session, request: BookingCreate, guest_id: int) -> QuoteRead:
    listing = get_listing(db, request.listing_id)
    if listing.host_id == guest_id:
        raise HTTPException(400, 'You cannot book your own listing')
    if request.check_in < today():
        raise HTTPException(422, 'Check-in cannot be in the past')
    if request.guests > listing.max_guests:
        raise HTTPException(422, 'Guest count exceeds listing capacity')
    if db.scalar(select(Booking.id).where(*overlap(listing.id, request.check_in, request.check_out)).limit(1)):
        raise HTTPException(409, 'These dates are no longer available')
    nights = (request.check_out - request.check_in).days
    return QuoteRead(**request.model_dump(), nights=nights,
        nightly_rate_cents=listing.nightly_rate_cents,
        cleaning_fee_cents=listing.cleaning_fee_cents,
        service_fee_cents=listing.service_fee_cents,
        total_cents=nights * listing.nightly_rate_cents + listing.cleaning_fee_cents + listing.service_fee_cents,
        currency=listing.currency)


def create_booking(db: Session, request: BookingCreate, guest_id: int, expected_total_cents: int | None = None) -> BookingRead:
    """Caller MUST hold write_transaction from before the first database read."""
    pricing = quote(db, request, guest_id)
    if expected_total_cents is not None and pricing.total_cents != expected_total_cents:
        raise HTTPException(409, 'The price has changed. Please review your updated total before confirming.')
    booking = Booking(**pricing.model_dump(), guest_id=guest_id,
                      mock_payment_reference=f'mock-{uuid4().hex}')
    db.add(booking)
    db.flush()
    return BookingRead.model_validate(booking)
