MonitorHealth

A full-stack uptime and health monitoring system with a Node.js/Express backend and a Next.js/Tailwind frontend. It tracks monitors (HTTP endpoints or TCP targets), schedules checks, stores results, and provides dashboards with uptime, latency, and history.

Key features
- Create, edit, and delete monitors with flexible intervals and regions
- Scheduled checks with result storage (status, latency, error)
- Uptime and latency charts, history drill-down, and detail modals
- Email alerting hooks (extensible service)
- Auth, settings, and basic RBAC scaffolding
- PostgreSQL via Drizzle ORM (migration from Mongo supported)
- Docker Compose for local dev; per-service Dockerfiles

Repository layout
- backend/ — Express API, Drizzle, scheduler, services, scripts
- frontend/ — Next.js app, Tailwind UI
- docker-compose.yml — Local dev stack (backend, frontend, db)

Quick start (Docker)
1) Prerequisites: Docker Desktop
2) Environment: copy .env.example to .env at root, backend/.env.example to backend/.env, frontend/.env.local.example to frontend/.env.local and adjust values
3) Start: docker compose up --build
4) App URLs:
   - Backend API: http://localhost:4000
   - Frontend UI: http://localhost:3000

Local dev without Docker
Backend
- cd backend
- bun install (or npm install)
- Configure backend/.env (DB URL, JWT secret, SMTP if used)
- bun run migrate (or: node scripts/migrate.js)
- bun run dev (or: node server.js)

Frontend
- cd frontend
- bun install (or npm install)
- Configure frontend/.env.local (NEXT_PUBLIC_API_URL)
- bun dev (or npm run dev)

Database and migrations
- Drizzle config in backend/drizzle.config.js
- Migrate: bun run migrate
- Verify/fix schema helpers under backend/scripts
- Sample scripts: testCheck.js, testRawInsert.js

Configuration
- Root .env: shared configs for docker compose
- backend/.env: API, DB, auth, email
- frontend/.env.local: public API URL and UI flags

Common commands
- docker compose up -d
- docker compose logs -f backend
- docker compose logs -f frontend
- docker compose down -v

Alerts and email
- Email service is pluggable (backend/services/emailService.js). Provide SMTP creds in backend/.env to enable.

Security
- Basic JWT auth and middleware
- Input validation utilities in backend/utils/validator.js

Monitoring model
- monitors: target URL/host, method, headers, interval
- check_results: timestamped status/latency/error per run

Troubleshooting
- Ensure DB is reachable (postgres connection string)
- Run backend/scripts/verifySchema.js to confirm schema
- Use backend/utils/logger.js for detailed logs

License
- Proprietary/organization-internal by default. Update as needed.