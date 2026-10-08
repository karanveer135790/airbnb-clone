"""Relational entities. Money is stored as integer cents, dates as half-open stays."""
from datetime import date, datetime, timezone
from enum import Enum
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Role(str, Enum):
    GUEST = 'guest'
    HOST = 'host'

class BookingStatus(str, Enum):
    CONFIRMED = 'confirmed'
    CANCELLED = 'cancelled'

class Category(str, Enum):
    BEACH = 'Beachfront'
    CABINS = 'Cabins'
    COUNTRYSIDE = 'Countryside'
    CITY = 'City'
    DESIGN = 'Design'
    POOLS = 'Amazing pools'

def enum_column(cls):
    return SAEnum(cls, values_callable=lambda e: [v.value for v in e], native_enum=False, create_constraint=True)

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class User(TimestampMixin, Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    role: Mapped[Role] = mapped_column(enum_column(Role), default=Role.GUEST)
    avatar_url: Mapped[str] = mapped_column(String(2048))
    bio: Mapped[str] = mapped_column(Text, default='')
    is_superhost: Mapped[bool] = mapped_column(Boolean, default=False)
    listings: Mapped[list['Listing']] = relationship(back_populates='host')
    bookings: Mapped[list['Booking']] = relationship(back_populates='guest')
    reviews: Mapped[list['Review']] = relationship(back_populates='author')

class Listing(TimestampMixin, Base):
    __tablename__ = 'listings'
    __table_args__ = (
        CheckConstraint('nightly_rate_cents > 0 AND cleaning_fee_cents >= 0 AND service_fee_cents >= 0'),
        CheckConstraint('max_guests > 0 AND bedrooms >= 0 AND beds > 0 AND bathrooms > 0'),
        CheckConstraint('latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180'),
        Index('ix_listing_search', 'is_active', 'category', 'city'),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100))
    address: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float]
    longitude: Mapped[float]
    category: Mapped[Category] = mapped_column(enum_column(Category))
    property_type: Mapped[str] = mapped_column(String(80), default='Entire home')
    max_guests: Mapped[int]
    bedrooms: Mapped[int]
    beds: Mapped[int]
    bathrooms: Mapped[float]
    nightly_rate_cents: Mapped[int]
    cleaning_fee_cents: Mapped[int] = mapped_column(default=0)
    service_fee_cents: Mapped[int] = mapped_column(default=0)
    currency: Mapped[str] = mapped_column(String(3), default='USD')
    photos: Mapped[list[str]] = mapped_column(JSON)
    amenities: Mapped[list[str]] = mapped_column(JSON)
    house_rules: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(default=True)
    host: Mapped[User] = relationship(back_populates='listings')
    bookings: Mapped[list['Booking']] = relationship(back_populates='listing')
    reviews: Mapped[list['Review']] = relationship(back_populates='listing')

class Booking(TimestampMixin, Base):
    __tablename__ = 'bookings'
    __table_args__ = (
        CheckConstraint('check_out > check_in'), CheckConstraint('guests > 0'),
        CheckConstraint('nightly_rate_cents > 0 AND cleaning_fee_cents >= 0 AND service_fee_cents >= 0'),
        CheckConstraint('total_cents = nights * nightly_rate_cents + cleaning_fee_cents + service_fee_cents'),
        CheckConstraint('nights = CAST(julianday(check_out) - julianday(check_in) AS INTEGER) AND nights > 0'),
        Index('ix_booking_availability', 'listing_id', 'status', 'check_in', 'check_out'),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey('listings.id', ondelete='RESTRICT'))
    guest_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    check_in: Mapped[date] = mapped_column(Date)
    check_out: Mapped[date] = mapped_column(Date)
    guests: Mapped[int]
    status: Mapped[BookingStatus] = mapped_column(enum_column(BookingStatus), default=BookingStatus.CONFIRMED)
    nights: Mapped[int]
    nightly_rate_cents: Mapped[int]
    cleaning_fee_cents: Mapped[int]
    service_fee_cents: Mapped[int]
    total_cents: Mapped[int]
    currency: Mapped[str] = mapped_column(String(3), default='USD')
    mock_payment_reference: Mapped[str] = mapped_column(String(100), unique=True)
    listing: Mapped[Listing] = relationship(back_populates='bookings')
    guest: Mapped[User] = relationship(back_populates='bookings')
    review: Mapped['Review | None'] = relationship(back_populates='booking', uselist=False)

class Review(TimestampMixin, Base):
    __tablename__ = 'reviews'
    __table_args__ = (CheckConstraint('rating BETWEEN 1 AND 5'), UniqueConstraint('booking_id'))
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey('bookings.id', ondelete='RESTRICT'))
    listing_id: Mapped[int] = mapped_column(ForeignKey('listings.id', ondelete='RESTRICT'), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    rating: Mapped[int]
    comment: Mapped[str] = mapped_column(Text)
    booking: Mapped[Booking] = relationship(back_populates='review')
    listing: Mapped[Listing] = relationship(back_populates='reviews')
    author: Mapped[User] = relationship(back_populates='reviews')

class Wishlist(Base):
    __tablename__ = 'wishlists'
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey('listings.id', ondelete='CASCADE'), primary_key=True)
