"""SQLite connection policy and request-scoped sessions."""
import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

class Base(DeclarativeBase):
    pass

DEFAULT_DB = Path(__file__).resolve().parents[1] / 'airbnb.db'
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DEFAULT_DB}')
if not DATABASE_URL.startswith('sqlite:'):
    raise ValueError('This implementation requires SQLite')
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False, 'timeout': 30})

@event.listens_for(engine, 'connect')
def configure_sqlite(connection, _):
    cursor = connection.cursor()
    cursor.execute('PRAGMA foreign_keys=ON')
    cursor.execute('PRAGMA busy_timeout=30000')
    cursor.close()

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def get_db():
    with SessionLocal() as session:
        yield session
