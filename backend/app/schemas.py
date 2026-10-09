"""API contracts; ownership and price totals are always assigned by the server."""
from datetime import date, datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, create_model, model_validator
from .models import Role, Category, BookingStatus

PositiveInt = Annotated[int, Field(strict=True, gt=0)]
Money = Annotated[int, Field(strict=True, ge=0, le=100_000_000)]

class Contract(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra='forbid', str_strip_whitespace=True)

class UserPublic(Contract):
    id: int
    name: str
    role: Role
    avatar_url: str
    bio: str
    is_superhost: bool
    created_at: datetime

class UserRead(UserPublic):
    email: EmailStr

class ListingCreate(Contract):
    title: str = Field(min_length=5, max_length=160)
    description: str = Field(min_length=30, max_length=10000)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=255)
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    category: Category
    property_type: str = Field(default='Entire home', min_length=1, max_length=80)
    max_guests: PositiveInt = Field(le=30)
    bedrooms: int = Field(strict=True, ge=0, le=30)
    beds: PositiveInt = Field(le=50)
    bathrooms: float = Field(gt=0, le=30, allow_inf_nan=False)
    nightly_rate_cents: Money = Field(gt=0)
    cleaning_fee_cents: Money = 0
    service_fee_cents: Money = 0
    currency: str = Field(default='USD', pattern='^USD$')
    photos: list[HttpUrl] = Field(min_length=1, max_length=30)
    amenities: list[Annotated[str, Field(min_length=1, max_length=80)]] = Field(min_length=1, max_length=50)
    house_rules: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(default_factory=list, max_length=20)

# PATCH accepts omitted fields, but rejects explicit null. Revalidate the merged
# resource as ListingCreate in the service before writing it to the database.
class PatchContract(Contract):
    @model_validator(mode='before')
    @classmethod
    def reject_nulls(cls, values):
        if isinstance(values, dict) and any(value is None for value in values.values()):
            raise ValueError('Listing fields cannot be null')
        return values

ListingUpdate = create_model('ListingUpdate', __base__=PatchContract, **{
    name: (Annotated[field.annotation, *field.metadata] if field.metadata else field.annotation, None)
    for name, field in ListingCreate.model_fields.items()
})

class ListingRead(ListingCreate):
    id: int
    host_id: int
    is_active: bool
    created_at: datetime
    host: UserPublic
    rating: float | None = None  # Populate using a database aggregate.
    review_count: int = 0

class BookingCreate(Contract):
    listing_id: PositiveInt
    check_in: date
    check_out: date
    guests: PositiveInt = Field(le=30)

    @model_validator(mode='after')
    def valid_stay(self):
        if self.check_out <= self.check_in:
            raise ValueError('Check-out must be after check-in')
        if (self.check_out - self.check_in).days > 365:
            raise ValueError('A stay cannot exceed 365 nights')
        return self

class BookingRead(BookingCreate):
    id: int
    guest_id: int
    status: BookingStatus
    nights: int
    nightly_rate_cents: int
    cleaning_fee_cents: int
    service_fee_cents: int
    total_cents: int
    currency: str
    mock_payment_reference: str
    created_at: datetime

class ReviewCreate(Contract):
    booking_id: PositiveInt
    rating: int = Field(strict=True, ge=1, le=5)
    comment: str = Field(min_length=10, max_length=3000)

class ReviewRead(ReviewCreate):
    id: int
    listing_id: int
    author_id: int
    author: UserPublic
    created_at: datetime

class AvailabilityRange(Contract):
    check_in: date
    check_out: date

class ListingPage(Contract):
    items: list[ListingRead]
    total: int
    page: int
    page_size: int
    pages: int

class QuoteRead(Contract):
    listing_id: int
    check_in: date
    check_out: date
    guests: int
    nights: int
    nightly_rate_cents: int
    cleaning_fee_cents: int
    service_fee_cents: int
    total_cents: int
    currency: str

class TripRead(BookingRead):
    listing: ListingRead
    review_id: int | None = None

class ReservationRead(TripRead):
    guest: UserPublic


class BookingCheckout(BookingCreate):
    # Optional for legacy API clients; the browser always supplies the reviewed total.
    expected_total_cents: Annotated[int, Field(strict=True, ge=0)] | None = None
