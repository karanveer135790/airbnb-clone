from contextlib import contextmanager
from sqlalchemy.orm import Session

@contextmanager
def write_transaction(db: Session):
    """Lock before ANY reads; competing SQLite writers wait and then recheck.

    Works across processes using the same database file, not just one worker.
    The session must be fresh to avoid upgrading a stale read transaction.
    """
    if db.in_transaction():
        raise RuntimeError('Write transaction must start before database reads')
    try:
        db.connection().exec_driver_sql('BEGIN IMMEDIATE')
        yield
        db.commit()
    except Exception:
        db.rollback()
        raise
