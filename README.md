# ACME Salary Intelligence

A salary-management workspace for ACME HR. The app supports a 10,000-person seeded directory, filtered compensation analytics, employee creation, and salary updates through a React UI and FastAPI API backed by SQLite.

## Capabilities

- Search by employee name, ID, or email; filter by country, department, status, and currency.
- Sort and paginate directory results without loading the whole directory into the browser.
- Review annual payroll, average and median pay, department/country distributions, and top earners.
- Keep every aggregate and ranking grouped by currency. No exchange-rate conversion is implied.
- Add employees, update salary/currency/effective date, and export the current filtered page to CSV.
- Generate exactly 10,000 deterministic fictional employee records.

## Stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite, Pydantic.
- Frontend: React 19, TypeScript, Vite, Lucide icons.
- Tests: pytest and FastAPI TestClient, using isolated in-memory SQLite databases.

## Run locally

Requirements: Python 3.12+ and Node.js 20.19+ or 22.12+.

In PowerShell, from the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m app.seed
python -m uvicorn app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. The API is available at <http://localhost:8000>, with interactive OpenAPI docs at <http://localhost:8000/docs>. Vite proxies `/api` requests to the API on port 8000.

The seed command only runs against an empty database and refuses to add duplicate records. The default database is `backend/acme_salary.db` and is ignored by Git. To start over with fictional data, stop the API and remove that file before running the seed command again.

## Verification

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm run build
npm run lint
```

The API supports `DATABASE_URL` for choosing another SQLAlchemy database URL. For the demo, SQLite is intentionally simple and keeps setup reproducible.

## API surface

- `GET /api/v1/health`
- `GET /api/v1/meta`
- `GET /api/v1/employees` with search, filters, sort, and pagination
- `POST /api/v1/employees`
- `PATCH /api/v1/employees/{employee_id}/compensation`
- `GET /api/v1/analytics` with the same population filters

## Artifacts

- [Product requirements](docs/requirements.md)
- [Architecture and trade-offs](docs/architecture.md)
- [Demo walkthrough](docs/demo-script.md)
- [AI-assisted development notes](docs/ai-notes.md)
- [Deployment and production checklist](docs/deployment.md)

## Readiness note

This repository is a locally runnable assessment prototype; it has not been deployed to a public hosting provider and no demo video has been recorded. The deployment notes describe what is required to publish it. It has no authentication or authorization, so do not expose it to the public internet or load real employee salary data until access control, audit, and operational requirements are implemented.
