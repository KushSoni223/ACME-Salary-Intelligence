# Deployment and Production Checklist

## Current status

This workspace is runnable locally, but it is not deployed. No cloud account, deployment credentials, public repository URL, or video-recording target is available in this environment. Do not represent the app as hosted until a real environment has been provisioned and verified.

## Assessment demo deployment

1. Provision an internal, access-controlled environment and a persistent relational database.
2. Set `DATABASE_URL` for the API and restrict CORS to the deployed frontend origin.
3. Run `python -m pip install -r backend/requirements.txt` as part of the backend build.
4. Run `python -m app.seed` once against a new demo database, then start the API with `uvicorn app.main:app --host 0.0.0.0 --port 8000` from `backend/`.
5. Build the frontend with `npm ci && npm run build` from `frontend/`; configure the web host to route `/api/*` to the API and serve the static `dist/` assets.
6. Verify health, filter/search, analytics, add/edit, and persistence against the deployed database before sharing the URL.

The code's default database is a local SQLite file. For an externally hosted demo, choose persistent storage deliberately; an ephemeral filesystem may lose all salary data on restart. A production migration should use PostgreSQL and a migration tool rather than relying on startup `create_all`.

## Required before public or real-data deployment

- Authentication, SSO, role-based access, and authorization on every employee/salary endpoint.
- HTTPS, secret management, database encryption/backups, retention and deletion policy, audit history, and incident monitoring.
- Dedicated CORS origins; remove local development origins from the deployed configuration.
- Database migrations, connection pooling, health/readiness checks, structured logging, metrics, and operational alerts.
- Security/privacy review and HR/legal validation of country, currency, and salary policies.
- Load test the 10,000-record analytics path and verify the chosen database's query plans.

## Demo video

No recording has been created. Use [the walkthrough](demo-script.md) with synthetic data and capture the browser plus brief narration after a deployment or local run is available.
