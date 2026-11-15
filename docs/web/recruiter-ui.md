# Recruiter UI — Web (parity with mobile)

> **Status:** Draft · **Mirror:** [`recruiter-ui.vi.md`](recruiter-ui.vi.md)
> **Applies to:** `job-platform-web` (React/TS/Vite). Reference: `job-platform-mobile` (Flutter).
> **Related:** [API conventions](../api-conventions.md) (paths, casing, enums).

## 1. Purpose

The mobile app has a Recruiter role with four working screens. The web app has none. This spec maps each mobile screen to the endpoints it calls and the gateway policy that protects them, so the web build can match mobile behaviour and so gaps are visible before work starts.

## 2. Screen matrix (verified by inventory)

| Screen | Mobile file | Endpoint(s) | Backend | Gateway policy |
|---|---|---|---|---|
| Recruiter dashboard | `lib/features/recruiter/presentation/recruiter_dashboard_screen.dart` | `GET /api/jobs/recruiter`; `GET /api/applications/job/{jobId}` per job | job-svc `JobEndpoints.cs:26`; app-svc `ApplicationEndpoints.cs:39` | `jobs-recruiter` = Recruiter; `apps` = Authenticated |
| Recruiter job list | `recruiter_jobs_screen.dart` | `GET /api/jobs/recruiter` | job-svc `JobEndpoints.cs:26` | Recruiter |
| Post job | `post_job_screen.dart` | `POST /api/jobs`; `GET /api/profiles/me` (for `companyId`) | `JobEndpoints.cs:25`; profile-svc `ProfileEndpoints.cs:29` | `jobs-create` = Recruiter; `profiles` = Authenticated |
| Candidate applications | `candidate_applications_screen.dart` | `GET /api/applications/job/{jobId}`; `PUT /api/applications/{id}/status` | app-svc `ApplicationEndpoints.cs:39`, `:42` | `apps` = Authenticated **only** (gap, see §5) |

### Out of scope (no backend — do not build in web)

- **Saved jobs** — no persistence endpoint.
- **Connections** — no endpoint.
- **CV builder** — save is a no-op on mobile.
- **Notification list** — `GET /api/notifications` does not exist in notif-svc. Only `/history` exists, and it requires a token.

## 3. Web routes (planned)

| Route | Role | Feature |
|---|---|---|
| `/recruiter` | Recruiter | Dashboard (Tổng quan) |
| `/recruiter/jobs` | Recruiter | Job list (Tin tuyển dụng) |
| `/recruiter/jobs/new` | Recruiter | Post job (Đăng tin) |
| `/recruiter/jobs/:jobId/applications` | Recruiter | Candidate applications per job |

The recruiter pages sit behind a `RecruiterRoute` guard modelled on `AdminRoute`. Recruiter nav is shown only when `isRecruiter` is true in `src/lib/roles.ts`.

## 4. Route guards (match mobile)

Mobile (`app_router.dart`, about lines 128–145) keeps applicant-only pages away from recruiters. Web must do the same.

| Route | Allowed roles | Otherwise |
|---|---|---|
| `/applications`, `/applications/:id`, `/jobs/:id/apply`, `/resume-score` | Applicant (User) only | Redirect to `/jobs` with a notice |
| `/recruiter/*` | Recruiter only | Redirect away with a notice |

Today web's `ProtectedRoute` checks login only. It must also check role for the routes above.

## 5. Known gaps

1. **Applications route has no Recruiter policy at the gateway.** The `apps` route is `Authenticated` only, so any logged-in user passes the gateway. Enforcement for recruiter-only actions is in app-svc only. This spec records the gap. The gateway is not changed in this work.
2. **Post job uses the Recruiter endpoint, not the admin endpoint.** The web form must call `POST /api/jobs`. It must not call `POST /api/admin/jobs` (used by `AdminJobForm`).
3. **No real-backend test.** Web work is verified with mocked API calls in Playwright.

## 6. Verification

Each implementation PR must pass `npx tsc -b`, `npm run build`, and the Playwright e2e suite with reduced workers, with no new failures against the recorded baseline. Lint is not runnable in the current environment (eslint is not installed).
