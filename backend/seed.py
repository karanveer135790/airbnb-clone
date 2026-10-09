"""Run `python seed.py`; never erases existing data. Dates relative to seed day."""
import argparse
from datetime import date, timedelta
from sqlalchemy import func, select
from app.database import Base, engine, SessionLocal
from app.models import User, Listing, Booking, Review, Wishlist, Role, Category
from app.schemas import ListingCreate

LEGACY_PHOTOS = [
    'photo-1613490493576-7fde63acd811', 'photo-1600210492486-724fe5c67fb0',
    'photo-1600607687939-ce8a6c25118c', 'photo-1600566753086-00f18fb6b3ea',
    'photo-1600047509807-ba8f99d2cdde', 'photo-1518780664697-55e3ad937233',
    'photo-1449158743715-0a90ebb6d2d8', 'photo-1449844908441-8829872d2607',
]
# Curated demo properties; photographs are illustrative, not verified locations.
PROPERTIES = [
    ('Clifftop villa above the Pacific', 'Malibu', 'United States', 34.0259, -118.7798, Category.BEACH, 42500, 'Villa', 'Watch the surf from a private terrace, then cook dinner in the open kitchen. Beach access is a short walk down the coastal path.'),
    ('A-frame hideaway among the pines', 'Big Bear Lake', 'United States', 34.2439, -116.9114, Category.CABINS, 18900, 'Cabin', 'A warm timber retreat with a reading loft and wood-burning fireplace. Spend mornings on forest trails and evenings beneath the stars.'),
    ('Sunlit loft in the heart of the city', 'Lisbon', 'Portugal', 38.7223, -9.1393, Category.CITY, 13200, 'Loft', 'Tall windows and locally made ceramics bring character to this airy loft. Walk to neighborhood bakeries and tram stops from the front door.'),
    ('Stone farmhouse with olive gardens', 'Florence', 'Italy', 43.7696, 11.2558, Category.COUNTRYSIDE, 24600, 'Farmhouse', 'Slow down in a restored farmhouse overlooking rolling hills. A shaded outdoor table and well-equipped kitchen make long lunches easy.'),
    ('Architect-designed desert sanctuary', 'Joshua Tree', 'United States', 34.1347, -116.3131, Category.DESIGN, 27800, 'Home', 'Clean lines frame wide desert views in this thoughtfully designed home. Enjoy quiet courtyards, a record collection, and a spectacular night sky.'),
    ('Tropical villa with a private pool', 'Ubud', 'Indonesia', -8.5069, 115.2625, Category.POOLS, 15800, 'Villa', 'Wake to garden views and step straight into your private pool. Open living spaces and a shaded lounge invite relaxed afternoons at home.'),
    ('Coastal cottage beside the dunes', 'Comporta', 'Portugal', 38.3805, -8.7861, Category.BEACH, 21400, 'Cottage', 'Natural textures and sandy tones define this peaceful cottage. Borrow the beach chairs for a day beside the water, then dine on the veranda.'),
    ('Lakeside cabin with mountain views', 'Queenstown', 'New Zealand', -45.0312, 168.6626, Category.CABINS, 22500, 'Cabin', 'A cozy base for mountain adventures with a generous deck overlooking the lake. Return from a hike to comfortable beds and a crackling fireplace.'),
    ('Quiet apartment near the old town', 'Kyoto', 'Japan', 35.0116, 135.7681, Category.CITY, 14600, 'Apartment', 'Discover neighborhood tea shops from this calm apartment on a residential street. A compact kitchen and dedicated workspace support longer visits.'),
    ('Country house with a lavender garden', 'Gordes', 'France', 43.9112, 5.2002, Category.COUNTRYSIDE, 26700, 'Home', 'Stone floors and wooden beams preserve the character of this country house. Gather on the garden terrace after exploring nearby village markets.'),
    ('Modern retreat beneath the mountains', 'Palm Springs', 'United States', 33.8303, -116.5453, Category.DESIGN, 31900, 'Home', 'Mid-century details meet a bright, contemporary interior. Sliding doors connect the living room to an enclosed garden and mountain-facing dining area.'),
    ('Ocean-view escape with infinity pool', 'Koh Samui', 'Thailand', 9.5120, 100.0136, Category.POOLS, 28900, 'Villa', 'An elevated island escape with broad sea views and a private swimming pool. Share meals outdoors and enjoy spacious bedrooms cooled by air conditioning.'),
]

# Explicit cover assignments. Only one illustrative photo is available per demo
# home: never fill a gallery with unrelated properties to meet a photo count.
COVER_PHOTOS = {
    'Malibu': 'photo-1613490493576-7fde63acd811',
    'Big Bear Lake': 'photo-1449844908441-8829872d2607',
    'Lisbon': 'photo-1600210492486-724fe5c67fb0',
    'Florence': 'photo-1600566753086-00f18fb6b3ea',
    'Joshua Tree': 'photo-1600047509807-ba8f99d2cdde',
    'Ubud': 'photo-1564013799919-ab600027ffc6',
    'Comporta': 'photo-1518780664697-55e3ad937233',
    'Queenstown': 'photo-1449158743715-0a90ebb6d2d8',
    'Kyoto': 'photo-1600607687939-ce8a6c25118c',
    'Gordes': 'photo-1600607687920-4e2a09cf159d',
    'Palm Springs': 'photo-1600596542815-ffad4c1539a9',
    'Koh Samui': 'photo-1613977257363-707ba9348227',
}

# Previous single-photo assignments, retained only for a narrow data migration.
DUPLICATE_COVERS = {
    'Ubud': 'photo-1613490493576-7fde63acd811',
    'Koh Samui': 'photo-1613490493576-7fde63acd811',
    'Gordes': 'photo-1600566753086-00f18fb6b3ea',
    'Palm Springs': 'photo-1600047509807-ba8f99d2cdde',
}

def photo_url(photo_id):
    return f'https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=1600&q=85'

def repair_legacy_photos(db):
    """Repair exact former seed photos only; preserve host edits and bookings."""
    repaired = 0
    for i, (title, city, country, *_) in enumerate(PROPERTIES):
        original = [photo_url(LEGACY_PHOTOS[(i+j) % len(LEGACY_PHOTOS)]) for j in range(5)]
        rows = db.scalars(select(Listing).join(User).where(
            Listing.title == title, Listing.city == city, Listing.country == country,
            Listing.address == f'{i + 10} Example Lane (demo address)',
            User.email == ('sofia@example.com' if i % 2 == 0 else 'arjun@example.com')))
        for listing in rows:
            if listing.photos == original or (city in DUPLICATE_COVERS and
                    listing.photos == [photo_url(DUPLICATE_COVERS[city])]):
                listing.photos = [photo_url(COVER_PHOTOS[city])]
                repaired += 1
    return repaired

def seed(today: date):
    Base.metadata.create_all(engine)
    with SessionLocal.begin() as db:
        # Serialize seed writers before testing whether this is an empty database.
        db.connection().exec_driver_sql('BEGIN IMMEDIATE')
        if any(db.scalar(select(func.count()).select_from(model)) for model in (User, Listing, Booking, Review, Wishlist)):
            repaired = repair_legacy_photos(db)
            print(f'Database preserved; repaired {repaired} legacy demo photo galleries.')
            return
        users = [User(name=name, email=email, role=role,
                      avatar_url=f'https://i.pravatar.cc/160?img={avatar}',
                      bio=bio, is_superhost=role == Role.HOST)
                 for name, email, role, avatar, bio in [
                     ('Sofia Bennett', 'sofia@example.com', Role.HOST, 47, 'Design enthusiast and local guide. Hosting since 2018.'),
                     ('Arjun Mehta', 'arjun@example.com', Role.HOST, 12, 'I love sharing peaceful homes and favorite local walks.'),
                     ('Emma Wilson', 'emma@example.com', Role.GUEST, 44, 'Weekend explorer and architecture lover.'),
                     ('Noah Kim', 'noah@example.com', Role.GUEST, 13, 'Coffee, hiking, and slow travel.'),
                 ]]
        db.add_all(users)
        db.flush()
        for i, (title, city, country, lat, lon, category, rate, kind, description) in enumerate(PROPERTIES):
            amenities = ['Wifi', 'Kitchen', 'Free parking', 'Dedicated workspace', 'Washer', 'Air conditioning']
            if category == Category.POOLS:
                amenities.append('Private pool')
            if category == Category.CABINS:
                amenities.append('Indoor fireplace')
            data = ListingCreate(title=title, description=description, city=city, country=country,
                address=f'{i + 10} Example Lane (demo address)', latitude=lat, longitude=lon,
                category=category, property_type=kind, max_guests=4 + i % 3, bedrooms=2 + i % 2,
                beds=3 + i % 2, bathrooms=2, nightly_rate_cents=rate, cleaning_fee_cents=4500,
                service_fee_cents=3200, photos=[photo_url(COVER_PHOTOS[city])],
                amenities=amenities, house_rules=['Check-in after 3 PM', 'Check-out before 11 AM', 'No smoking', 'No parties'])
            listing = Listing(host_id=users[i % 2].id, **data.model_dump(mode='json'))
            db.add(listing)
            db.flush()
            for past in (True, False):
                start = today + timedelta(days=-30-i if past else 7+i)
                nights = 3 if past else 4
                guest = users[2 + (i % 2)]
                booking = Booking(listing_id=listing.id, guest_id=guest.id,
                    check_in=start, check_out=start+timedelta(days=nights), guests=2, nights=nights,
                    nightly_rate_cents=rate, cleaning_fee_cents=4500, service_fee_cents=3200,
                    total_cents=rate*nights+7700, mock_payment_reference=f'mock-seed-{i}-{past}')
                db.add(booking)
                db.flush()
                if past:
                    db.add(Review(booking_id=booking.id, listing_id=listing.id, author_id=guest.id,
                        rating=4 if i % 4 == 0 else 5,
                        comment=f'We loved our stay in {city}. The home was clean and comfortable, and our host shared helpful local recommendations.',
                        created_at=booking.check_out))
            if i < 3:
                db.add(Wishlist(user_id=users[2].id, listing_id=listing.id))
    print('Seeded 4 users, 12 listings, 24 bookings, 12 reviews, and 3 wishlist entries.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--today', type=date.fromisoformat, default=date.today(), help='YYYY-MM-DD; fixes demo dates for reproducibility')
    seed(parser.parse_args().today)
