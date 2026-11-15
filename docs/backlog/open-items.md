# Open items backlog

Status as of 2026-11-15. Items are grouped by what blocks a real deployment.

## A. Must decide before a real deployment

These need a decision or an external input. Nothing here can be finished by code alone.

| # | Item | Options | Status |
|---|---|---|---|
| A1 | Where services run and how they find each other | Azure Container Apps, AKS, or one VM with compose and Consul | Open. Waiting for the teacher's expectations. Consul alone does not provide scaling. |
| A2 | Where stateful services run | Containers on the VM, or Azure managed services (Postgres, Kafka, Redis, Elasticsearch) | Open. Hardest to change later, so decide before data exists. Backups are already decided as daily with 7-day retention. |
| A3 | Azure subscription, VM details, and DNS | Confirm the subscription, the VM name, size and public IP. Create the DNS A record for `jobs.ioaspire.com` to the VM IP. | Open. Needed before Caddy can issue a certificate. |
| A4 | Azure Key Vault wiring | Create the vault, give the VM a managed identity, and change the deploy script to fetch secrets. | Decided (Key Vault). Blocked on A3. |
| A5 | Rotate committed secrets | Gateway and auth dev JWT secrets are in git history, and the profile encryption key must be replaced. Nothing is deployed yet, so this is a pre-deploy checklist. | Open. Do before the first deploy. |
| A6 | Production values in Key Vault | Gmail address and App Password (`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), `WEB_URL`, `DOMAIN`, the six Postgres role passwords, and `IMAGE_TAG`. | Open. Blocked on A4. |
| A7 | Web build variable | Set repository variable `VITE_API_URL=https://jobs.ioaspire.com` in the web repo, so the published build calls the right host. | Open. |
| A8 | Existing Postgres volume | Init scripts run only on an empty data volume. An existing VM needs a one-off ownership migration; dev needs `docker compose down -v` once. | Open. Only if a VM already has data. |
| A9 | Gmail sending limits | A consumer Google account has a daily sending cap. Confirm volume is acceptable, or pick a transactional mail provider. | Open. |
| A10 | First Company of an organisation | Self-serve company sign-up with a verified work email (chosen, AUTH-01-10 and AUTH-01-11). A sign-up whose domain already belongs to a verified Company becomes a join request for that Company's admin, not a second Company (AUTH-01-12). Not chosen: (a) operator script, (b) Admin creates Companies, (c) manual approval. | Decided 2026-11-15 by the owner. Specified in AUTH-01-06, AUTH-01-10 to AUTH-01-15. |
| A11 | Join-request waiting period | `COMPANY_JOIN_REQUEST_TTL_DAYS`, default **7 days** from creation (AUTH-01-13). After expiry the requester may escalate to support, once (AUTH-01-14); there is no automatic takeover. A rejected request follows the same path (AUTH-01-12). | Decided 2026-11-15 by the owner: 7 days, configurable through `COMPANY_JOIN_REQUEST_TTL_DAYS`. |
| A12 | Meaning of `Company.verified` | Chosen: `Company.verified` is set to true when the founding admin completes work-email verification (AUTH-01-10, AUTH-01-11). It proves a mailbox at the domain, not that the company is genuine, and domain routing (AUTH-01-12) relies on it. Not chosen: a manual platform check before verification (slower; close to option (c) of A10). | Decided 2026-11-15 by the owner. Accepted residual risk: the first person to verify a domain becomes that Company's admin, so a squatter can claim a domain before the real company does. No extra rule in this version. Mitigation: the real company joins by join request and can recover the domain through support escalation (AUTH-01-14). |
| A13 | Identical response for company sign-up | Chosen: `register-company` returns the same `202` and `{ message }` for every outcome. Every address gets one mail. The verification email goes out when the sign-up can proceed (new email, `companyName` and `taxCode` free, or domain matched to a verified Company). Otherwise the notice goes out (AUTH-01-10): one fixed text for every notice case, saying the company could not be registered with these details and pointing to support. The mailbox owner is told that the sign-up could not proceed, with no other detail (for example, which value was taken). It never contains a link. Duplicate email, duplicate `companyName` and taken `taxCode` all look the same to the caller. Not chosen: a `409` on duplicates, which tells anyone which emails and company names exist. Consequence: a founder whose `companyName` or `taxCode` is already taken gets no account, no pending sign-up and no error at sign-up or verification, only the notice email; support is the path to resolve it. Every sign-up runs the same availability and domain-match lookups before the outcome is chosen (AUTH-01-10). Specified in AUTH-01-10, AUTH-01-11 and the `register-company` endpoint row. | Decided 2026-11-15 by the owner, including the founder notice. |
| A14 | Method of the internal availability lookup | Chosen: `POST /api/internal/companies/availability { companyName, taxCode? }` on job-svc, not the `GET` with a query string the earlier draft showed. A query string puts company names and tax codes into access logs and gateway traces, and the values are not secrets but they are not public either. The endpoint keeps no side effects, so the method change does not change behaviour. Not chosen: `GET` (spec draft) and `POST` + `GET` both supported (two paths to keep in sync). | Decided 2026-11-16 by the owner. Specified in AUTH-01-10 and the internal endpoint table in Appendix D. |
| A15 | Who may call the search index endpoints | Chosen: keep `POST /api/search/index`, `POST /api/search/bulk-index` and `DELETE /api/search/index/{id}` on search-svc, guarded by `X-Internal-Token` = `SEARCH_INDEX_TOKEN`, and document `scripts/reindex_jobs.py` as the only caller. Normal indexing goes over Kafka; the script copies documents between indices so each one gets its embedding again after a mapping change, which an Elasticsearch `_reindex` cannot do. Not chosen: removing the endpoints and the token, which would leave a mapping change with no rebuild path except a Kafka replay or a full re-crawl. | Decided 2026-11-16 by the owner. Specified in SEARCH-01 API specifications and the internal endpoint table in Appendix D. |
| A16 | Gateway policy for `/api/auth/*` | Chosen: the gateway route stays anonymous. Login, refresh, register, register-company, verify-email, forgot-password and reset-password are all under the prefix, so a route-level token requirement would break sign-in. auth-svc enforces the token itself on `/me` and `/logout`, and it was already the enforcement point. Not chosen: splitting the prefix into public and protected gateway routes, which puts authorization decisions in two places. | Decided 2026-11-16 by the owner. Specified in the routing rules (3.7.3) with a pointer to §8.8.2.1. |

## B. Decided, engineering in progress

| # | Item | Notes |
|---|---|---|
| B1 | Gateway scale-out | Trust only its own network for forwarded client IPs; rate limits move to Redis. PR in progress. |
| B2 | Auth scale-out | Rate limits move to Redis; access tokens last 15 minutes. PR in progress. |
| B3 | Dead-letter topic | Failed Kafka messages go to `<topic>.dlq` and the partition moves on. PR in progress (shared). |
| B4 | Mail queue | Durable outbox with retries so failed mail is not silently lost. |
| B5 | Migrations as a separate deploy step | Stop auto-migrating on service start. |
| B6 | Outbox coverage | job-svc create, update and delete publish directly after commit (lost events on crash). app-svc publishes after save with no outbox. Extend the existing outbox to both. Also stop the outbox giving up after five failed cycles. |
| B7 | RS256 signing with JWKS | Only auth-svc holds the private key. Replaces the one HS256 secret shared by every service. |
| B8 | Per-caller internal tokens | Replace the one shared `INTERNAL_SERVICE_TOKEN` with per-caller tokens. |
| B9 | CVs to Azure Blob Storage | Private container, access by short-lived SAS URL or streaming. |
| B10 | Backups | Daily dump of Postgres and CV blobs, 7-day retention, tested restore. |
| B11 | Scoring worker | Runs automatically when an applicant applies. Compares CV to job description. Recruiter sees the score on the applicant list and the application detail. Applicants never see it. |
| B12 | Invite codes for recruiter registration | Invite codes let a recruiter join an existing Company only. Only the company creator (`companies.created_by`, the company admin) issues codes. Each code is bound to one email address and is accepted only with that address. Single-use, 7-day expiry. Registration validates and redeems the code through job-svc. Company sign-up does not use codes. Specified in SRS AUTH-01-06, AUTH-01-09, AUTH-01-10 and AUTH-01-15. Engineering in progress. |
| B13 | Crawled jobs as external events | Crawler publishes `job.external` to Kafka; search-svc indexes it with embeddings. |
| B14 | Recruiter id on `application.submitted` | Add the recruiter user id to the event so notif-svc can email the recruiter. |
| B15 | Search JSON to camelCase | search-svc responses change from snake_case to camelCase, and ai-svc and web change with it. |
| B16 | Shared release 0.3.1 | Bump the version and add CHANGELOG.md once the DLQ PR merges. |
| B17 | Closed jobs hidden from public detail | Decided. Implement in job-svc and confirm Pending stays hidden. |
| B18 | Mobile and web registration flow | "Check your email" screen, `/verify-email` page, and resend-verification screen. Also the join-request status screen with the escalate action (AUTH-01-13, AUTH-01-14), and the invite-code field that asks for the bound email (AUTH-01-15). |
| B19 | Resend-verification endpoint | For unverified accounts whose link expired. Rate-limited, generic response. |
| B20 | Refresh-token concurrency | Concurrency token on the refresh-token row so only one refresh wins. |
| B21 | Mask emails in audit logs | Done in auth-svc PR #46. Confirm across other services. |
| B22 | Web PR #42 | Mock gating and error text. Needs a rebase and `npm run lint:fix`. Remove the admin mock store that CodeQL flags. |
| B23 | Web i18n migration | About 800 Vietnamese UI literal lines across about 52 files. Vietnamese and English through resource files. |
| B24 | Web JSON handling | Remove the dual-format parsing after B15. |
| B25 | Bootstrap admin | Command implemented (auth-svc #45). Run once per environment after the first deploy. |

## C. Not started, lower priority

| # | Item |
|---|---|
| C1 | Profile-svc leftovers: avatar URL scheme check, non-root Dockerfile, 404/403 existence check, committed dev connection string. |
| C2 | job-svc and gateway test layers (contract, unit, integration). |
| C3 | Translate the 17 Vietnamese Markdown files in docs to English. |
| C4 | k6 login threshold: change from 800 ms to 1000 ms (PERF-01a). |
| C5 | Mobile release signing: release builds must fail without a real keystore. Verify the Gradle guard on a machine with network access. |
| C6 | Mobile candidate and registration copy: decide Vietnamese or English for the new strings (Vietnamese chosen; implement). |
| C7 | Crawler: remaining Medium items after the external-event change. |
| C8 | Test suite runtime: the search-svc suite takes about 14 minutes per run. Find the slow test or shutdown hang. |
| C9 | Gateway HSTS consistency with the edge (Caddy sets it). |
| C10 | Dependabot: patch bumps only. .NET 11 stays deferred. |
| C11 | Linting: Biome is the gate in web. Mobile and backend have no equivalent check to review. |
| C12 | Multi-company (agency) support: one account managing several Companies. Not in scope now; one Company per account (AUTH-01-06). |
| C13 | Email to the Company admin when a join request is created. Not in this version (AUTH-01-12). |
| C14 | Remove `POST /api/companies`. Every Recruiter has a Company, so the endpoint always returns `409 ACCOUNT_ALREADY_HAS_COMPANY` (AUTH-01-06). Decide whether to delete it. |

## D. Known limits accepted for now

- Revocation fails open when Redis is down (documented trade-off).
- Mail is fire-and-log until B4 lands.
- Semantic search has no score cutoff, so weak matches still appear.
- Company name is empty in chat job hits.
