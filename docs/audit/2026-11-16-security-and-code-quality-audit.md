# Security and code-quality audit — 2026-11-16

Full-stack review of the 14 service repositories on `main`, looking for real defects and for
places where a simple implementation was chosen over a correct one. Four reviewers worked in
parallel (auth/job/app/gateway; notif/profile/search/ai/shared/crawler; web/mobile; infra/CI).
Each finding below was read in the code; several were reproduced against the local compose stack.
No finding is copied from a scanner.

Code audited: `auth-svc e8b09ce`, `job-svc f8acf5e`, `gateway db0e34e`, `app-svc a4b13e9`,
`profile-svc 8d4ed19`, `notif-svc d08015c`, `search-svc ebce1cc`, `ai-svc ac059a1`,
`web 62358b6`, `mobile 947e9bc`, `infra 7a04259`.

## Summary

| Severity | Found | Fixed in this session | Open |
|:---------|------:|----------------------:|-----:|
| Critical | 2 | 0 | 2 |
| High | 12 | 6 | 6 |
| Medium | 24 | 2 | 22 |
| Low | 17 | 0 | 17 |

Two things are worth saying before the list.

- The security-critical core is in better shape than the count suggests: gateway routing,
  per-caller internal tokens, RS256 validation, IDOR checks on applications, CV upload limits,
  log redaction and the absence of secrets in git were all checked and came back clean.
- What is weak is **operational**: there is no backup/restore path at all, deploys could report
  success with dead upstreams, and quality gates are decorative. Those are the "simple choice"
  that would actually hurt if the project is demonstrated on a real VM.

## Fixed in this session

| # | What | PR |
|:--|:-----|:---|
| 1 | `POST /api/internal/companies` answered `{ id }` while auth-svc binds `{ companyId }`. A verified founder was linked to the all-zero company: `/me` returned `0000…`, invite codes and join requests answered `404 COMPANY_NOT_FOUND`. Found by running the flow. | job-svc #64 |
| 2 | auth-svc accepted that response unvalidated. Now a 2xx without a usable id fails verification cleanly instead of linking `Guid.Empty`. | auth-svc #57 |
| 3 | `sync-env.sh` copied Infisical's single-quoted values (`LOG_LEVEL='Information'`, port `'6000'`) into `.env`, so the dev stack could not start. | infra #49 |
| 4 | The .NET Dockerfiles require a BuildKit secret `nuget_token`; compose never mapped it, so no image could build. auth-svc also sent mail to `localhost` inside its container. | infra #50 |
| 5 | Postgres healthcheck probed the unix socket, so on a fresh volume it went healthy during `initdb` and the migrate containers failed with "Failed to connect". | infra #51 |
| 6 | Prod SMTP settings defaulted to empty: notif started and silently dropped every email. Now required at compose time. | infra #52 |
| 7 | Deploys enforced `/health` (200 even when degraded) and only warned about `/health/ready`. Readiness now covers the upstreams and fails the deploy. | infra #54 |

In flight at the time of writing (same findings as below): job-svc dev-auth gate and
company-membership job posting; auth-svc rate-limit keying; notif history scoping; removal of
`recruiterId` from public search; rejection of placeholder secrets; mobile mock gating and error
copy; `.dockerignore` for six repos.

## Critical

**C1. There is no backup or restore path.** `docker-compose.prod.yml` (volumes
`pg_data`, `cv_data`, `es_data`, `kafka_data`) has no dump sidecar, and no script in
`scripts/` creates or restores a backup. CVs are written to the `cv_data` volume
(`app-svc …/LocalCvStorageService.cs:8`) while the R2 keys in `envs/.env.prod.example:46-50`
are passed to no service. One lost volume (`docker compose down -v` is in the project's own
documentation) is unrecoverable, and the SRS still promises 7-day retention.
*Fix:* a nightly `pg_dump` + CV-directory archive to off-box storage, plus a restore script that
is actually exercised once. This needs the owner's storage decision, so it is a decision, not
just code.

**C2. Mobile ships mock data as the answer to any failed request, including 4xx, in release.**
`mobile/lib/features/jobs/data/api_job_repository.dart:125-171,199-206`,
`api_profile_repository.dart:50,82` (a profile write reports "saved" with no server call),
`api_notification_repository.dart:106-128`, `api_recruiter_repository.dart:41-68,139-176,210-225`.
A logged-out or rate-limited user sees plausible jobs, and a failed save looks successful.
*Fix:* mock data only behind an explicit compile-time flag, only for transport/5xx failures.
Being fixed.

## High

**H1. Every deploy could succeed with dead upstreams.** Fixed (infra #54).

**H2. `GET /api/notifications/history` returns every user's recipient address and subject** to
any holder of the static `NOTIF_HISTORY_TOKEN`, and the local stack was verified to serve it on
`:5006` with no auth. PII exposure; Jira PBL6-79. *Fix:* scope by the authenticated user, keep
the token only for an Admin/machine path. Being fixed.

**H3. Production could send no email and record it as sent.**
`notif-svc/src/Notif.Api/Program.cs:66-76` falls back to `LoggerEmailSender` when SMTP is
unconfigured. Compose now requires the settings (infra #52), but the code still degrades
silently if they are wrong rather than absent. *Fix:* fail startup outside Development, and stop
marking rows `sent` on the logger path.

**H4. Root containers with production secrets.** `notif-svc/Dockerfile:12-17` has no `USER`
(confirmed at runtime: `Config.User=""`), as do web and crawler; the others drop privileges.
Six Dockerfiles also `COPY . .` with no `.dockerignore`, so on the documented
`SERVICES_SRC=..` path the 88-key `.env` (including the RS256 private key) lands in a layer.
`.dockerignore` is being added; the `USER` line is still open.

**H5. Images publish on `main` without waiting for CI.** Six `publish-image.yml` and
`job-svc/cd.yml` trigger on push with no `needs`/`workflow_run`, tagging `:latest` from code that
may have failed its own checks. *Fix:* trigger from `workflow_run` on a successful CI run, or add
`needs`.

**H6. dev auth is enabled by the environment name alone in job-svc.**
`job-svc/src/Job.Api/Program.cs:163-169` registers `DevAuthMiddleware`, which trusts a
caller-supplied `X-User-Role: Admin`. app-svc gates the same middleware behind
`ENABLE_DEV_AUTH`; job-svc does not. Verified: an Admin-level read on `:5002` with no token.
Being fixed (flag) together with binding dev ports to loopback.

**H7. One attacker can lock every user out of login.** `auth-svc` rate-limits on
`Connection.RemoteIpAddress` (`IpRateLimitMiddleware.cs:22`), which behind the gateway is always
the gateway. Verified: 11 bad logins with a rotating `X-Forwarded-For` produced `429` for the
whole platform for 15 minutes, and the brute-force limit is platform-wide rather than
per-attacker. Being fixed (trusted-proxy chain, per-client bucket).

**H8. Every invited recruiter gets 403 on `POST /api/jobs`.**
`job-svc/src/Job.Api/Endpoints/JobEndpoints.cs:73` requires `companies.created_by == caller`.
The SRS says a Company has many Recruiters and each posts jobs (JOB-01-01,
`2-overall-description.md:346`), and the gateway already admits any `Recruiter`. The multi-recruiter
feature therefore cannot work; the only workaround is sharing the founder account, which destroys
the per-recruiter audit trail. Being fixed (authorize by the `company_id` claim).

**H9. A release APK can be built pointing at `127.0.0.1:5000`.**
`mobile/lib/core/network/api_config.dart:18-47` falls back to localhost when `FLUTTER_API_URL` is
missing, and CI never builds a release, so nothing catches it. Being fixed (fail loudly + a CI
release build).

**H10. Mobile tells an invited recruiter to "check your email"** for a link the server never
sends; auth-svc activates invited recruiters immediately
(`mobile/…/register_screen.dart:15,189-197`). Being fixed.

**H11. Raw backend and Dart exception text is shown to users**
(`mobile/lib/core/error/error_mapper.dart:13,170-171` and four screens). Being fixed.

**H12. Quality gates are decorative.** SonarCloud jobs pass when `SONAR_TOKEN` is absent and
never set `sonar.qualitygate.wait`; mobile's "70 % soft" coverage gate only prints; 4 of 7
deployed services (app, profile, notif, search, ai, crawler) have no CodeQL job. A gate that
cannot fail is worse than no gate, because it is cited as evidence.

## Medium (open)

| # | Finding | Evidence |
|:--|:--------|:---------|
| M1 | A used password-reset token does not invalidate the user's other reset tokens: 15-minute replay window after the victim resets. | `auth-svc/src/Auth.Infrastructure/Services/AuthService.cs:427-490` |
| M2 | `link-company` writes `Role="Recruiter"` unconditionally, so an internal call can demote a platform Admin. | `auth-svc …/InternalUserEndpoints.cs:62-65` |
| M3 | Support decisions transfer company ownership on the service token alone and take `operator` from the caller, so the audit trail is forgeable. | `job-svc …/InternalCompanyEndpoints.cs:235-297` |
| M4 | Kafka unset silently disables indexing and notifications in every environment (no-op producers), while the outbox grows. | `job-svc/src/Job.Api/Program.cs:89-102`, `app-svc/src/App.Api/Program.cs:71-80` |
| M5 | job-svc's production-only SQL (`SKIP LOCKED`, `ON CONFLICT`, `ILIKE`) is only exercised against the in-memory provider. | `job-svc/tests` |
| M6 | Internal HTTP contracts are duplicated per repo with no pinning; this session's `companyId` bug was exactly that. | `auth-svc …/HttpCompanyDirectoryClient.cs` vs `job-svc …/InternalCompanyEndpoints.cs` |
| M7 | The dev RS256 private key is injected into every container, including postgres and kafka, via the shared `envs/.env.dev`. | `infra/envs/.env.dev` distribution step |
| M8 | Logout with a refresh token leaves the 60-minute access token valid (no revocation on logout). | `auth-svc …/AuthEndpoints.cs` logout |
| M9 | Public search responses leak `recruiterId`; `GET /api/jobs/{id}` hides it. | `search-svc …/JobResponseDto.cs:24,48` |
| M10 | Internal tokens accept the literal placeholder `__SET_VIA_INFISICAL__` as a secret. | `search-svc`, `notif-svc`, `ai-svc` token checks |
| M11 | `bulk-index` returns `200` and `totalIndexed: 0` when the embedding service is down, so a reindex reports success. | `search-svc …/IndexEndpoints.cs:161-169` |
| M12 | The crawler silently stops publishing when `ELASTICSEARCH_INDEX` differs from infra's value (`jobs` vs `jobs_v2`). | `crawler/.env.example` |
| M13 | Kafka consumers use `AutoOffsetReset=Earliest`, so a reset offset re-sends old status-change emails. | `shared/…/KafkaConsumerService.cs:193` |
| M14 | The dev stack runs Development with internals published on all interfaces (index writes, PII history, passwordless Redis, ES with security off). | `infra/docker-compose.yml` ports |
| M15 | `sync-env.sh` copies every prod secret, including the RS256 key, into web/mobile/docs/crawler checkouts. | `infra/scripts/sync-env.sh:118-129` |
| M16 | CI supply chain: `curl \| bash` in infra CI; `id-token: write` and `packages: write` on PR build jobs. | `infra/.github/workflows/ci.yml:18` |
| M17 | No Dockerfile is built in PR CI; a `gateway` Dockerfile with sdk 11 vs runtime 10 is the kind of drift it would catch. | `gateway/Dockerfile:1` |
| M18 | ai-svc accepts a 5 MB DOCX that expands to ~50 MB of XML, parsed twice concurrently in a 1 GB container (OOM risk, magnitude unverified). | `ai-svc` upload path |
| M19 | Score records keep unmasked CV excerpts for 30 days, contradicting the "never persists CV text" claim. | `ai-svc` retention |
| M20 | Web de-authenticates the UI on a transient `/auth/me` 5xx while keeping the tokens. | `web/src/contexts/AuthContext.tsx:40-59` |
| M21 | Web chat streams with raw `fetch`, bypassing refresh-on-401, so the copilot dies when the access token expires. | `web/src/lib/chatApi.ts:298-330` |
| M22 | Recruiter join-request row can double-submit; busy state is keyed to one mutation's variables. | `web/src/pages/RecruiterJoinRequestsPage.tsx:130,179-192` |

## Low (open, abbreviated)

Notification history and CV details expose internal user GUIDs; the free-email blocklist is
exact-match (subdomains pass); the dead `JWT_SECRET` is still distributed; `POST /api/companies`
is a permanent 409 stub; Swagger is served in Staging; `/health` discloses upstream topology;
password reset has no concurrency guard; the crawler strips HTML from two fields only; search
accepts unbounded `q`/CSV filters (ES `max_clause_count`); the search cache generation key has a
fixed 1 h TTL; Telegram alerts discard keywords and the broadcaster is never called; recruiter
notification for a new application is permanently skipped; `safeInternalPath` accepts `/..//host`
(only react-router ≥ 7.5.2 saves the redirect); mobile auth labels are not the fields'
accessible names.

## Deliberate simplifications we accept (for now)

These are choices, not accidents. Listing them keeps them from being rediscovered as bugs.

- **One VM, one compose file, HTTP inside the private network.** JWKS, Kafka, ES and Redis are
  plaintext between containers; the blast radius is "whoever holds a container". Acceptable for
  the course scope, must be written down before anyone assumes otherwise.
- **Per-caller bearer tokens are static strings.** No rotation, no expiry, no per-call signature.
- **Synchronous internal HTTP between services.** No circuit breaker beyond the gateway's, no
  retries on non-idempotent calls (deliberate).
- **The AI feature is local and rule-based.** No third-party API anywhere — verified, and a hard
  project constraint.
- **Mobile has no i18n framework.** Copy is Dart constants, by owner decision.
- **Search index writes remain reachable for an ops script** (A15 in `open-items.md`), protected
  by one token.
- **`POST /api/auth/register` rate limit is per IP** (5/hour), not per identity.

## Checked and found clean

Gateway policy table and header stripping (`X-User-*` cannot be spoofed through the gateway);
`/api/internal/*` not gateway-routed (probed: 404); per-caller internal tokens fail closed and
compare with fixed time; RS256 validation (issuer, audience, lifetime, key); no secrets in any
git history or tracked file; no SQL built by concatenation; CV upload limits, type checks and
ownership; application IDOR checks on list/detail/history/status; outbox ordering; migrations
non-destructive; log redaction for emails and tokens; admin role double-checked; web token
refresh (multi-tab lock, rotation, 429 backoff), logout clearing, no open redirect via `?next=`,
no `dangerouslySetInnerHTML`, `rel="noopener"`, `safeHttpUrl` for user URLs, web mock gating
(default off, no-mocks e2e), anti-enumeration copy on company sign-up; profile AES-GCM field
encryption; search index-token pre-binding check and Active-only filtering; ai-svc
auth/ownership/upload limits; Kafka commit and DLQ mechanics.

## Recommended order

1. **C1 backups + a tested restore.** Nothing else matters if the demo data can be lost.
2. **H5 image publishing gated on CI**, **H12 gates that can fail**, **CodeQL for the missing
   services.** These change what "green" means, so do them before more merges.
3. **H2/H3/H4** (PII history, silent mail fallback, root containers + `.dockerignore`).
4. **H6/H7/H8** (dev auth, rate-limit keying, company-membership posting) — already in flight.
5. **M1-M3** (reset-token invalidation, `link-company` demotion, support-operator identity):
   three small guards on auth state transitions.
6. **M6** (pin the internal contracts) — it prevented nothing this session; the bug was found by
   running the flow, not by a test.
7. Everything else as time allows.

The SRS is unaffected by these findings except C1 (retention promise) and H8 (multi-recruiter
posting, which the SRS already requires).
