# Automated E2E Testing (Playwright) — Forgot/Reset Password & Personal Profile

| File | Contents |
|:--|:--|
| `test-cases.xlsx` / `test-cases.csv` | Test case table (22 cases: 20 Automation, 1 Automation that records a defect, 1 Manual) |
| `playwright/tests/password-reset.spec.ts` | 11 UI tests for AUTH-01-07/08 |
| `playwright/tests/profile.spec.ts` | 10 UI tests for PROFILE-01 |
| `playwright/tests/resume-score.spec.ts` | 8 UI/API tests for SCORE-01 (CV scoring); requires `SCORE_JOB_ID=<job uuid>`, the gateway must have the `/api/ai/*` route, `ai-svc` on :6000, `job-svc` on :5002. CV fixtures are in `playwright/tests/fixtures/` (text PDF, scanned PDF, DOCX, empty PDF, .txt) |
| `playwright/run-tests.sh` | Prepares the environment (SMTP→MailHog, resets the rate limit) and then runs Playwright |

Run: `cd playwright && WEB_URL=http://localhost:3000 ./run-tests.sh`; view the report with `npx playwright show-report`.
Every test records a trace and a screenshot (video on failure) → use these as evidence for the report.

Notes:
- The dev `docker-compose.yml` sets `SMTP_HOST=localhost`, so reset emails do not reach MailHog; `playwright/docker-compose.smtp.override.yml` should only be applied when testing.
- The web container on `:5173` is an old build; when testing, run the web app from `main` (Vite, port 3000 because the gateway only allows CORS from 5173/3000) and set `VITE_API_BASE_URL=http://localhost:5000/api`.
- **Known issue (PROF-UI-09):** the web app calls `/api/profile/*` (singular), but the gateway only has `/api/profiles/*` → 404 → the web app falls back to mock data in localStorage.
