import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from threading import Barrier
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from app.database import get_db, configure_sqlite
from app.main import app
from app.models import Booking, Review, Listing
from seed import seed, LEGACY_PHOTOS, COVER_PHOTOS, photo_url

class APITests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.engine = create_engine(f'sqlite:///{Path(self.directory.name) / "test.db"}',
                                   connect_args={'check_same_thread': False, 'timeout': 30})
        event.listen(self.engine, 'connect', configure_sqlite)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        with patch('seed.engine', self.engine), patch('seed.SessionLocal', self.sessions):
            seed(date.today())
        def db_override():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = db_override
        self.client = TestClient(app)
        self.start = date.today() + timedelta(days=100)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()
        self.directory.cleanup()

    def payload(self, start=0, end=3, **changes):
        return {'listing_id': 1, 'check_in': str(self.start+timedelta(days=start)),
                'check_out': str(self.start+timedelta(days=end)), 'guests': 2, **changes}

    def book(self, data=None, user=3):
        return self.client.post('/api/bookings', json=data or self.payload(), headers={'X-User-ID': str(user)})

    def test_legacy_gallery_repair_preserves_custom_photos_and_bookings(self):
        with self.sessions.begin() as db:
            db.get(Listing, 6).photos = [photo_url(LEGACY_PHOTOS[(5+j) % len(LEGACY_PHOTOS)]) for j in range(5)]
            custom = ['https://example.com/host-photo.jpg']
            db.get(Listing, 1).photos = custom
            before = [(b.id, b.listing_id, b.total_cents) for b in db.scalars(select(Booking))]
        for _ in range(2):
            with patch('seed.engine', self.engine), patch('seed.SessionLocal', self.sessions):
                seed(date.today())
        with self.sessions() as db:
            self.assertEqual(db.get(Listing, 6).photos, [photo_url(COVER_PHOTOS['Ubud'])])
            self.assertEqual(db.get(Listing, 1).photos, custom)
            self.assertEqual([(b.id, b.listing_id, b.total_cents) for b in db.scalars(select(Booking))], before)

    def test_photo_edits_are_scoped_to_one_listing(self):
        before = self.client.get('/api/listings/2').json()['photos']
        photos = ['https://example.com/my-property.jpg']
        response = self.client.patch('/api/listings/1', json={'photos': photos}, headers={'X-User-ID': '1'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['photos'], photos)
        self.assertEqual(self.client.get('/api/listings/2').json()['photos'], before)
        self.assertEqual(self.client.patch('/api/listings/1', json={'photos': []}, headers={'X-User-ID': '1'}).status_code, 422)

    def test_overlap_variants_and_adjacent_stays(self):
        self.assertEqual(self.book().status_code, 201)
        for start, end in [(0, 3), (1, 2), (-1, 4), (-1, 1), (2, 5)]:
            self.assertEqual(self.book(self.payload(start, end), user=4).status_code, 409)
        for start, end in [(-3, 0), (3, 5)]:
            self.assertEqual(self.book(self.payload(start, end), user=4).status_code, 201)

    def test_concurrent_requests_have_one_winner(self):
        barrier = Barrier(2)
        # Do not start production lifespan during isolated requests.
        def attempt_without_lifespan(user):
            barrier.wait(timeout=5)
            client = TestClient(app)
            try:
                return client.post('/api/bookings', json=self.payload(), headers={'X-User-ID': str(user)}).status_code
            finally:
                client.close()
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(attempt_without_lifespan, [3, 4]))
        self.assertEqual(sorted(statuses), [201, 409])
        with self.sessions() as db:
            rows = db.scalars(select(Booking).where(Booking.check_in == self.start)).all()
            self.assertEqual(len(rows), 1)

    def test_validation_and_server_prices(self):
        for data in [self.payload(0, 0), self.payload(3, 0), self.payload(0, 366),
                     self.payload(guests=30), self.payload(total_cents=1),
                     self.payload(check_in=str(date.today()-timedelta(days=1)))]:
            self.assertEqual(self.book(data).status_code, 422)
        self.assertEqual(self.book(user=1).status_code, 400)
        self.assertEqual(self.book(user=999).status_code, 401)
        self.assertEqual(self.client.post('/api/bookings', json=self.payload()).status_code, 401)
        quote = self.client.post('/api/bookings/quote', json=self.payload(), headers={'X-User-ID': '3'})
        booking = self.book().json()
        self.assertEqual(booking['total_cents'], 42500*3+7700)
        self.assertEqual(quote.json()['total_cents'], booking['total_cents'])

    def test_checkout_rejects_stale_price_and_accepts_reviewed_total(self):
        stale = self.book(self.payload(expected_total_cents=1))
        self.assertEqual(stale.status_code, 409)
        self.assertIn('price has changed', stale.json()['detail'])
        # The rejected checkout must not consume availability.
        response = self.book(self.payload(expected_total_cents=42500*3+7700))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['total_cents'], 42500*3+7700)

    def test_trips_expose_review_state_and_archive_keeps_reservation(self):
        headers = {'X-User-ID': '3'}
        past = self.client.get('/api/me/trips?period=past', headers=headers).json()
        self.assertTrue(past)
        self.assertTrue(all(trip['review_id'] is not None for trip in past))
        booking = self.book().json()
        detail = self.client.get(f'/api/bookings/{booking["id"]}', headers=headers).json()
        self.assertIsNone(detail['review_id'])
        self.assertEqual(self.client.delete('/api/listings/1', headers={'X-User-ID': '1'}).status_code, 204)
        upcoming = self.client.get('/api/me/trips?period=upcoming', headers=headers).json()
        trip = next(t for t in upcoming if t['id'] == booking['id'])
        self.assertFalse(trip['listing']['is_active'])
        self.assertEqual(self.client.post(f'/api/bookings/{booking["id"]}/cancel', headers=headers).status_code, 200)
        cancelled = self.client.get('/api/me/trips?period=cancelled', headers=headers).json()
        self.assertIn(booking['id'], [t['id'] for t in cancelled])

    def test_cancellation_releases_dates_and_protects_owner(self):
        booking = self.book().json()
        path = f'/api/bookings/{booking["id"]}/cancel'
        self.assertEqual(self.client.post(path, headers={'X-User-ID': '4'}).status_code, 404)
        self.assertEqual(self.client.post(path, headers={'X-User-ID': '3'}).status_code, 200)
        self.assertEqual(self.client.post(path, headers={'X-User-ID': '3'}).status_code, 200)
        self.assertEqual(self.book(user=4).status_code, 201)

    def test_search_and_global_availability(self):
        self.assertEqual(self.client.get('/api/listings', params={'page_size': 5}).json()['total'], 12)
        self.assertEqual(len(self.client.get('/api/listings', params={'amenities': 'Private pool'}).json()['items']), 2)
        self.assertEqual(self.client.get('/api/listings', params={'min_price': 10, 'max_price': 1}).status_code, 422)
        self.book()
        params = {'location': 'Malibu', 'check_in': str(self.start), 'check_out': str(self.start+timedelta(days=3))}
        self.assertEqual(self.client.get('/api/listings', params=params).json()['total'], 0)
        ranges = self.client.get('/api/listings/1/availability').json()
        self.assertIn({'check_in': params['check_in'], 'check_out': params['check_out']}, ranges)

    def test_host_crud_and_price_snapshot(self):
        guest = {'X-User-ID': '3'}
        host = {'X-User-ID': '1'}
        before = self.book().json()
        self.assertEqual(self.client.patch('/api/listings/1', json={'nightly_rate_cents': 90000}, headers=guest).status_code, 403)
        self.assertEqual(self.client.patch('/api/listings/1', json={'title': 'Changed title'}, headers={'X-User-ID': '2'}).status_code, 403)
        self.assertEqual(self.client.patch('/api/listings/1', json={'nightly_rate_cents': 90000}, headers=host).status_code, 200)
        self.assertEqual(self.client.get(f'/api/bookings/{before["id"]}', headers=guest).json()['total_cents'], before['total_cents'])
        self.assertEqual(self.client.patch('/api/listings/1', json={'max_guests': 1}, headers=host).status_code, 409)
        self.assertEqual(self.client.delete('/api/listings/1', headers=host).status_code, 204)
        self.assertEqual(self.book().status_code, 404)
        self.assertEqual(self.client.get('/api/listings/1').status_code, 404)
        self.assertEqual(self.client.get(f'/api/bookings/{before["id"]}', headers=guest).status_code, 200)
        from app.schemas import ListingCreate
        with self.sessions() as db:
            from app.models import Listing
            row = db.get(Listing, 2)
            payload = {k: getattr(row, k) for k in ListingCreate.model_fields}
            payload = ListingCreate.model_validate(payload).model_dump(mode='json')
        created = self.client.post('/api/listings', json=payload, headers=host)
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()['host_id'], 1)

    def test_dashboards_wishlist_and_reviews(self):
        guest = {'X-User-ID': '3'}
        self.assertEqual(self.client.get('/api/host/reservations', headers=guest).status_code, 403)
        reservations = self.client.get('/api/host/reservations', headers={'X-User-ID': '1'}).json()
        self.assertTrue(all(r['listing']['host_id'] == 1 for r in reservations))
        trips = self.client.get('/api/me/trips', headers=guest).json()
        self.assertTrue(all(t['guest_id'] == 3 for t in trips))
        for _ in range(2):
            self.assertEqual(self.client.put('/api/me/wishlist/5', headers=guest).status_code, 204)
        ids = [l['id'] for l in self.client.get('/api/me/wishlist', headers=guest).json()]
        self.assertEqual(ids.count(5), 1)
        self.assertEqual(self.client.delete('/api/me/wishlist/5', headers=guest).status_code, 204)
        future = self.book().json()
        review = {'booking_id': future['id'], 'rating': 5, 'comment': 'A very comfortable stay.'}
        self.assertEqual(self.client.post('/api/reviews', json=review, headers=guest).status_code, 409)
        with self.sessions.begin() as db:
            previous = db.scalar(select(Review).where(Review.author_id == 3))
            booking_id = previous.booking_id
            db.delete(previous)
        review['booking_id'] = booking_id
        self.assertEqual(self.client.post('/api/reviews', json=review, headers={'X-User-ID': '4'}).status_code, 404)
        self.assertEqual(self.client.post('/api/reviews', json=review, headers=guest).status_code, 201)
        self.assertEqual(self.client.post('/api/reviews', json=review, headers=guest).status_code, 409)
        self.assertIsNotNone(self.client.get('/api/listings/1').json()['rating'])

if __name__ == '__main__':
    unittest.main()
