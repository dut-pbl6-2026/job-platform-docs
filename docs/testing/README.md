# Automated E2E Testing (Playwright) — Forgot/Reset Password & Personal Profile

| File | Contents |
|:--|:--|
| `test-cases.xlsx` / `test-cases.csv` | Test case table (22 cases: 20 Automation, 1 Automation that records a defect, 1 Manual) |
| `playwright/tests/password-reset.spec.ts` | 11 UI tests for AUTH-01-07/08 |
| `playwright/tests/profile.spec.ts` | 10 UI tests for PROFILE-01 |
| `playwright/run-tests.sh` | Prepares the environment (SMTP→MailHog, resets the rate limit) and then runs Playwright |

Run: `cd playwright && WEB_URL=http://localhost:3000 ./run-tests.sh`; view the report with `npx playwright show-report`.
Every test records a trace and a screenshot (video on failure) → use these as evidence for the report.

Notes:
- Seed the local stack before running the suite: from `job-platform-infra`, run `bash scripts/seed-dev.sh` (Linux/macOS) or `pwsh ./scripts/seed-dev.ps1` (PowerShell 7+). It creates 3 demo companies, 3 accounts and 8 jobs; the accounts are registered as `User`, marked verified and promoted in SQL, and the seeded recruiter is the company admin. Never seed a shared or production environment.
- The dev `docker-compose.yml` gives notif-svc `SMTP_HOST=mailhog`, but auth-svc reads the value from `envs/.env.dev`: use `SMTP_HOST=mailhog` when auth-svc runs in compose, and `SMTP_HOST=localhost` when it runs on the host next to `docker compose up mailhog` (the example file uses `localhost`). The MailHog web UI is `http://localhost:8025`.
- The web container on `:5173` is an old build; when testing, run the web app from `main` (Vite, port 3000 because the gateway only allows CORS from 5173/3000) and set `VITE_API_BASE_URL=http://localhost:5000/api`.
- **Resolved (PROF-UI-09):** the web app now calls `/api/profiles/*`, matching the gateway route; it no longer falls back to mock data for profile calls.
