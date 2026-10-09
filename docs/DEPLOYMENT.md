# Deployment handoff

These files prepare the existing Next.js + FastAPI + SQLite application for a
container host. They do not change the application stack or publish it.

## Docker Compose on your machine

Install Docker with Compose, then run from the project root:

```bash
docker compose build
docker compose run --rm backend python seed.py
docker compose up -d
```

Open http://localhost:3000. Only the frontend is exposed, on the host's loopback
interface. Next.js reaches FastAPI at `http://backend:8000` inside the private
Compose network. The backend uses a named `airbnb-data` volume at `/data`.
Existing data is kept. Startup repairs only recognized original demo photo arrays;
custom host photos and booking records are preserved.

```bash
docker compose ps
docker compose logs --tail=100 frontend backend
docker compose down
```

`down` preserves the volume. Do not use `down -v` unless you intend to delete all
persisted listings, bookings, reviews, users and favorites.

Containers run as non-root users. A new named volume inherits `/data` ownership
from the backend image. For an existing volume or host bind mount, ensure UID/GID
10001 can write to the mount. No database or environment-secret file is copied
into either image. Docker itself is not available in the authoring environment,
so image building, health checks and Compose startup still need validation on a
Docker-enabled machine.

## Publishing to a container provider

The next connected-provider workflow is:

1. Use the source repository: https://github.com/karanveer135790/airbnb-clone.
2. Create one backend service from `backend/Dockerfile` with a persistent volume
   mounted at `/data` and `DATABASE_URL=sqlite:////data/airbnb.db`.
3. Seed the mounted backend database once using `python seed.py` in that service.
4. Create the frontend from `frontend/Dockerfile`. Set its **build argument**
   `API_ORIGIN` to the backend origin reachable by the frontend runtime. Supply
   the same value in its runtime environment and rebuild if it changes.
5. Configure the backend service port as 8000 and frontend port as 3000. If a
   provider supplies a different port, configure the service port or override the
   start command to match; these Dockerfiles deliberately use fixed ports.
6. Expose only the frontend over HTTPS where the provider supports private
   service networking. Keep the backend volume on a single instance.
7. Run the acceptance checks below before submitting the public URL.

Provider configuration and billing are not assumed or created by these files.
Actual deployment requires an authenticated account, a selected project, and a
persistent-volume-capable service. GitHub and Railway integrations are connected.
Live demo: https://frontend-production-a014e.up.railway.app

This assignment deliberately uses mock identity selection. A public demo lets
visitors act as seeded users and modify demo data. It is not a production account
or payment system; do not put real guest information into it.

## Acceptance checks

- Frontend loads without console errors and shows seeded homes.
- Desktop, tablet and phone layouts are readable in light and dark mode.
- A host can create/edit/archive a listing; another host cannot modify it.
- A guest can quote and reserve a stay and reload the confirmation receipt.
- Another guest cannot reserve overlapping nights; adjacent stays work.
- Cancellation releases the dates and survives a backend restart.
- My Trips and host reservations show only the selected account's records.
- Completed stays accept one review; reviewed stays show their existing state.
- Data remains after service restarts/redeploys.
- External photo URLs and map tiles load or display their fallback states.

## Validation status

The application passed its TypeScript/production webpack build, 19 backend tests,
six calendar tests, and HTTP integration checks before this packaging step.
Both Docker images built and deployed successfully on Railway; no local Docker daemon/CLI is available.
Visual QA remains unverified because Chromium crashes at launch in this sandbox.
Pixel-perfect equivalence remains uncertified. Both Railway services reached terminal `SUCCESS`.
Live HTTP checks passed for home, listing detail, trips, hosting, listings, users,
availability, guest trips, and host reservations. The seed remained intact across backend restarts.

Additional packaging checks passed: standalone production build and TypeScript,
standalone server startup, home/hosting/trips routes, favicon delivery, and the API
proxy returning seeded listings. Compose YAML structure and the named-volume wiring
were checked without Docker; this is not a substitute for a container build/run.


## Railway configuration

- Project: `airbnb-clone`; environment: `production`.
- Frontend: `/frontend` build root, `Dockerfile`, port `3000`, health check `/`.
- Frontend build/runtime `API_ORIGIN`: `http://backend.railway.internal:8000`.
- Backend: `/backend` build root, `Dockerfile`, port `8000`, health check `/health`.
- Backend start command: `sh -c 'python seed.py && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1'`.
- Backend volume: 500 MB mounted at `/data`; `DATABASE_URL=sqlite:////data/airbnb.db`.
- `RAILWAY_RUN_UID=0` on the backend permits writing the root-owned Railway volume.
- Seeding creates demo data only on an empty database. Each demo listing has five distinct photos from its own credited property source. Subsequent starts repair only exact recognized legacy demo photo arrays; host-edited galleries and bookings are preserved.
- Both services track the GitHub `main` branch. The backend uses private networking.
