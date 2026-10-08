from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..models import Listing, Review
from ..schemas import ListingRead


def get_listing(db: Session, listing_id: int, active: bool = True) -> Listing:
    listing = db.get(Listing, listing_id)
    if not listing or (active and not listing.is_active):
        raise HTTPException(404, 'Listing not found')
    return listing


def owned_listing(db: Session, listing_id: int, user_id: int) -> Listing:
    listing = get_listing(db, listing_id, active=False)
    if listing.host_id != user_id:
        raise HTTPException(403, 'You do not own this listing')
    return listing


def present_listings(db: Session, listings: list[Listing]) -> list[ListingRead]:
    if not listings:
        return []
    aggregates = db.execute(select(Review.listing_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.listing_id.in_([l.id for l in listings])).group_by(Review.listing_id)).all()
    ratings = {id_: (float(avg), count) for id_, avg, count in aggregates}
    return [ListingRead.model_validate(l).model_copy(update={
        'rating': ratings.get(l.id, (None, 0))[0],
        'review_count': ratings.get(l.id, (None, 0))[1],
    }) for l in listings]
