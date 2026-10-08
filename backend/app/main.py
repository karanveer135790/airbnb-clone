import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
from .database import Base, engine
from .routers import accounts, bookings, listings

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield

app = FastAPI(title='Airbnb Clone API', version='0.2.0', lifespan=lifespan,
              description='Demo only. X-User-ID selects a seeded identity; it is not secure authentication.')
app.add_middleware(CORSMiddleware,
    allow_origins=[v.strip() for v in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',') if v.strip()],
    allow_credentials=False, allow_methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allow_headers=['Content-Type', 'X-User-ID'])
for router in (listings.router, bookings.router, accounts.router):
    app.include_router(router, prefix='/api')

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    return JSONResponse(status_code=409, content={'detail': 'The change conflicts with stored data'})

@app.exception_handler(OperationalError)
async def database_error(request: Request, exc: OperationalError):
    if 'locked' in str(exc.orig).lower() or 'busy' in str(exc.orig).lower():
        return JSONResponse(status_code=503, content={'detail': 'Database busy; please retry'}, headers={'Retry-After': '1'})
    raise exc
