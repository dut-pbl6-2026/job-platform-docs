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
| Post job | `post_job_screen.dart` | `POST /api/jobs`; `GET /api/auth/me` (for `companyId`) | `JobEndpoints.cs:25`; auth-svc `AuthEndpoints.cs:131` (`UserDto.CompanyId`) | `jobs-create` = Recruiter; `auth` = no policy at gateway (token checked by auth-svc) |
| Candidate applications | `candidate_applications_screen.dart` | `GET /api/applications/job/{jobId}`; `PUT /api/applications/{id}/status` | app-svc `ApplicationEndpoints.cs:39`, `:42` | `apps` = Authenticated **only** (gap, see §5) |


> **Correction (verified in code):** `companyId` is not in profile-svc `ProfileDetailDto`. It is `UserDto.CompanyId` from auth-svc `GET /api/auth/me`. The earlier `GET /api/profiles/me` row was wrong.

### Out of scope (no backend — do not build in web)

- **Saved jobs** — no persistence endpoint.
- **Connections** — no endpoint.
- **CV builder** — save is a no-op on mobile.
- **Server-side notification list** — `GET /api/notifications` does not exist in notif-svc. Only `/history` exists, and it requires a token. The bell in §5 therefore aggregates reads the user is already allowed to make.

## 3. Web routes (current)

| Route | Shell | Role | Feature |
|---|---|---|---|
| `/` | Public | Guest, any | Homepage: search, categories, latest jobs, companies |
| `/jobs`, `/jobs/:id` | Public | Guest, any | Board and job detail |
| `/companies/:id` | Public | Guest, any | Public company profile and its active jobs |
| `/login`, `/register`, `/register-company`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth | Guest | Sign-in, candidate/company sign-up, verification |
| `/profile` | Authed | any signed-in | Profile (avatar menu); the AI assistant is not surfaced |
| `/applications`, `/applications/:id`, `/jobs/:id/apply` | Authed | User | Application list/detail and the three-step apply wizard |
| `/interviews` | Authed | User | The candidate's interview calendar |
| `/candidates/:id` | Public | anyone | A candidate's public profile (no phone, address or date of birth) |
| `/recruiter` | Workspace | Recruiter | Dashboard (Tổng quan) |
| `/recruiter/jobs` | Workspace | Recruiter | Job list (Tin tuyển dụng) |
| `/recruiter/jobs?new=1`, `/recruiter/jobs?edit=<id>` | Workspace | Recruiter | The three-step post/edit wizard as a dialog on the job list (`/recruiter/jobs/new` and `/:id/edit` redirect here) |
| `/recruiter/candidates` | Workspace | Recruiter | Candidate kanban; drag to advance, click for the application, click the avatar or name for the public profile |
| `/recruiter/jobs/:jobId/applications` | Workspace | Recruiter | Applications as a table: candidate, date, AI score, status, actions |
| `/recruiter/applications/:id` | Workspace | Recruiter | One application: AI report, cover letter and the submitted CV in a two-column page |
| `/recruiter/interviews` | Workspace | Recruiter | Month calendar of scheduled interviews, with cancel |
| `/recruiter/email-templates` | Workspace | Recruiter | Saved email templates (create, edit, delete) |
| `/recruiter/company` | Workspace | Recruiter | Company profile; editing is Company Admin only |
| `/recruiter/invite-codes`, `/recruiter/join-requests` | Workspace | Company Admin | Invite codes and company join requests |
| `/admin`, `/admin/jobs`, `/admin/users` | Workspace | Admin | Overview, job moderation (takedown/restore), users |
| `*` | Public | Guest, any | 404 with links back to the board and homepage |

Layouts: `PublicLayout` renders the top nav and footer; `AuthedLayout` picks the compact candidate
header for `User` and the sidebar `WorkspaceLayout` for `Recruiter`/`Admin` (no marketing footer on
either console). The signed-in account menu hangs off the avatar: Profile, Applications (User),
Company (Recruiter), Admin console (Admin), Chat, Sign out. The candidate resume-score page no
longer exists: a match score is shown to recruiters per application only.

The recruiter sidebar is: Tổng quan, Ứng viên, Tin tuyển dụng, Lịch phỏng vấn, Mẫu email — then the
**QUẢN TRỊ CÔNG TY** group with Công ty (every recruiter) and, for the company admin, Mã mời and Yêu cầu
tham gia. There is no separate "Đăng tin" item: posting is the dialog opened from Tin tuyển dụng.

## 4. Route guards

Guards live at the layout boundary: `ProtectedRoute` for sign-in and `RequireRole` for role-only
areas. Candidate-only routes redirect away with a notice; app-svc/job-svc re-check authorization.

| Route | Allowed roles | Otherwise |
|---|---|---|
| `/applications`, `/applications/:id`, `/jobs/:id/apply` | Applicant (User) only | Redirect to `/jobs` with a notice |
| `/recruiter/*` | Recruiter only | Redirect to `/jobs` with a notice |
| `/admin/*` | Admin only | Redirect to `/jobs` with a notice |

## 5. Engagement flows (2026-11)

**Apply** is a three-step wizard, not one long form: (1) review the profile that the recruiter will see,
with a checklist of missing fields and an explicit confirmation; (2) choose the CV and write an optional
cover letter; (3) review and submit. The profile step is mandatory because the application carries that
identity into the recruiter's pipeline. **Post job** is likewise three steps: basics → description with
salary → preview only, inside a dialog on the job list (no separate page).

The applications list is a table. A row opens `/recruiter/applications/:id`: the left column holds the
cover letter and the submitted CV, the right column holds the full ai-svc report that produced the score —
the breakdown the removed trial-scoring screen showed, minus the CV-improvement suggestions because the
reader is the recruiter. The CV is fetched with the session token and shown in the page, never in a new
tab and with no separate download button. If the browser has its own PDF viewer
(`navigator.pdfViewerEnabled`) the file is embedded in an `iframe`, so the viewer's **frame** stays —
page navigation, zoom, print and save. Where there is no viewer (headless Chrome, embedded browsers)
**pdf.js renders the pages into canvases** instead, so the CV is never a blank box. Deployment needs
both paths to load: nginx serves `.mjs` as `application/javascript`, and the CSP allows
`worker-src 'self' blob:` and `frame-src 'self' blob:`. Clicking a candidate's avatar or name, in the table or on
the kanban, opens their public profile at `/candidates/:id` (no PII).

| Surface | Web route | app-svc endpoint(s) |
|---|---|---|
| Candidate board | `/recruiter/candidates` | `GET /api/applications/job/{jobId}`; `PUT /api/applications/{id}/status` |
| Email a candidate | dialog on the board and applications page | `POST /api/applications/{id}/email` |
| Templates | `/recruiter/email-templates` | `GET/POST /api/email-templates`; `PUT/DELETE /api/email-templates/{id}` |
| Schedule an interview | dialog on the board and applications page | `POST /api/interviews` |
| Interview calendars | `/recruiter/interviews`, `/interviews` | `GET /api/interviews`; `PUT /api/interviews/{id}`; `POST /api/interviews/{id}/cancel`; `GET /api/interviews/{id}/ics` |
| Notification bell | every signed-in shell | Aggregates `GET /api/applications/me`, `GET /api/applications/job/{id}` and `GET /api/interviews`; the last-opened instant is per account in `localStorage` |

An interview saves a snapshot of the job title, company, candidate and recruiter identity, so the
calendar and the `.ics` file do not depend on later edits. The invite always carries the `.ics`
attachment, so the calendars do not offer a separate download. The board's CV action opens the
application page, where the CV renders in place (see above); the in-page viewer also replaced the old
new-tab preview. Sending an invite goes through notif-svc's
internal `POST /api/internal/email` with an RFC 5545 `text/calendar` attachment; a mail failure never
rolls back the saved interview, and the API reports `inviteSent`. Templates may use
`{{candidate_name}}`, `{{job_title}}` and `{{recruiter_name}}`, resolved on the server. Templates are
private to the recruiter who created them.

## 6. Known gaps

1. **Applications route has no Recruiter policy at the gateway.** The `apps` route is `Authenticated` only, so any logged-in user passes the gateway. Enforcement for recruiter-only actions is in app-svc only. This spec records the gap. The gateway is not changed in this work.
2. **Post job uses the Recruiter endpoint, not the admin endpoint.** The web form must call `POST /api/jobs`. It must not call `POST /api/admin/jobs` (used by `AdminJobForm`).
3. **No real-backend test.** Web work is verified with mocked API calls in Playwright.

## 7. Verification

Each implementation PR must pass `npx tsc -b`, `npm run build`, and the Playwright e2e suite with reduced workers, with no new failures against the recorded baseline. Lint is not runnable in the current environment (eslint is not installed).
