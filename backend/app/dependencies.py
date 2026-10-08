"""Replace demo identity selection with real authentication before production."""
from typing import Annotated
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Role

DB = Annotated[Session, Depends(get_db)]

def demo_identity(x_user_id: Annotated[int | None, Header()] = None) -> int:
    if x_user_id is None or x_user_id < 1:
        raise HTTPException(401, 'Choose a demo user with X-User-ID')
    return x_user_id

Identity = Annotated[int, Depends(demo_identity)]

def require_user(db: Session, user_id: int, host: bool = False) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, 'Unknown demo user')
    if host and user.role != Role.HOST:
        raise HTTPException(403, 'A host account is required')
    return user
