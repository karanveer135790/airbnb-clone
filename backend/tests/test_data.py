"""Run against a disposable database: DATABASE_URL=sqlite:// python -m unittest discover -s tests -v."""
import unittest
from datetime import date
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError
from app.database import SessionLocal, engine
from app.models import User, Listing, Booking, Review
from app.schemas import BookingCreate, ListingUpdate, ListingRead, BookingRead, ReviewRead
from seed import seed

class DataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if engine.url.database not in (None, '', ':memory:'):
            raise RuntimeError('Tests require DATABASE_URL=sqlite://')
        seed(date(2026, 10, 8))

    def test_seed_is_repeatable_and_serializable(self):
        seed(date(2026, 10, 8))
        with SessionLocal() as db:
            self.assertEqual([db.scalar(select(func.count()).select_from(m)) for m in (User, Listing, Booking, Review)], [4, 12, 24, 12])
            for model, schema in ((Listing, ListingRead), (Booking, BookingRead), (Review, ReviewRead)):
                for row in db.scalars(select(model)):
                    schema.model_validate(row)
            self.assertEqual(db.connection().exec_driver_sql('PRAGMA foreign_key_check').all(), [])

    def test_invalid_dates_and_patch(self):
        with self.assertRaises(ValidationError):
            BookingCreate(listing_id=1, guests=2, check_in='2026-10-10', check_out='2026-10-10')
        for values in ({'title': None}, {'max_guests': 0}, {'host_id': 2}):
            with self.assertRaises(ValidationError):
                ListingUpdate(**values)
        self.assertEqual(ListingUpdate(title='Updated title').model_dump(exclude_unset=True), {'title': 'Updated title'})

    def test_database_rejects_corrupt_price_snapshot(self):
        with SessionLocal() as db:
            booking = db.scalar(select(Booking))
            booking.total_cents += 1
            with self.assertRaises(IntegrityError):
                db.flush()
            db.rollback()

    def test_database_rejects_missing_host(self):
        with SessionLocal() as db:
            listing = db.scalar(select(Listing))
            listing.host_id = 999999
            with self.assertRaises(IntegrityError):
                db.flush()
            db.rollback()

if __name__ == '__main__':
    unittest.main()
