# API Conventions — Naming, Shapes, Pagination, Enums

> **Version:** 1.0 (2026-11-05) · **Status:** Normative · **Mirror:** [`api-conventions.vi.md`](api-conventions.vi.md)
> **Applies to:** every REST contract that crosses a service boundary: clients (web, mobile) → gateway → services, and service → service over HTTP.
> **Related:** SRS §7 (External Interface Requirements), §8 (System Architecture, *API-first OpenAPI 3*), Appendix D.1 (API endpoint summary).

## 1. Why this document exists

A cross-repo review (2026-11-05) found that the web client, the SRS tables and the implemented services disagreed on paths (`/api/profile` vs `/api/profiles`), field casing (`company_name` vs `companyName`), pagination base (0 vs 1), envelopes and enum values (`Full-time` vs `FullTime`). The web client silently fell back to mock data on every mismatch, so none of it surfaced in testing.

This document fixes **one** convention for all repositories. The SRS says *which* endpoints exist. This document says *how* they are named and shaped. When the two disagree on naming or shape, **this document wins** and the SRS row must be corrected.

## 2. URL paths

| Rule | Example |
|:-----|:--------|
| Prefix `/api/`, then the resource as a **plural noun**, lowercase, kebab-case | `/api/profiles`, `/api/applications`, `/api/job-alerts` |
| Sub-collections are plural too | `/api/profiles/experiences`, `/api/profiles/educations` |
| The current user is `me` | `/api/profiles/me`, `/api/applications/me` |
| Identifiers are UUIDs in the path | `/api/jobs/{id}` |
| State-changing actions that are not CRUD are `POST` to a verb sub-resource, **one endpoint per action** | `POST /api/admin/jobs/{id}/approve`, `POST /api/admin/jobs/{id}/reject` |
| Filtering a collection uses query parameters, not extra path segments | `GET /api/admin/jobs?status=Pending`, not `/api/admin/jobs/pending` |

Never encode a decision in the body of a differently named action (for example `POST /approve` with `{ "approved": false }`). One action per endpoint keeps the effect visible in logs, in gateway policies and in the code that calls it.

## 3. JSON field names

| Rule | Example |
|:-----|:--------|
| **camelCase** in every JSON request and response body | `fullName`, `salaryMin`, `createdAt` |
| Acronyms are written as words | `cvUrl`, `userId`, `jobId` (not `CVUrl`, `userID`) |
| Booleans start with `is` / `has` | `isActive`, `isCurrent` |
| Foreign keys end with `Id` | `companyId`, `categoryId`, `recruiterId` |

**.NET:** keep the ASP.NET Core default (`JsonSerializerDefaults.Web`). Do **not** put `[JsonPropertyName("snake_case")]` on an API DTO.

**Storage models are never returned directly.** Elasticsearch documents and EF entities keep their own names (Elasticsearch fields and PostgreSQL columns are snake_case, which is correct *for storage*). Endpoints map them to a DTO. Renaming a storage field to fix an API name forces a reindex or migration. Map instead.

### 3.1 References to other resources

Responses that reference another resource return the id **and** a small nested object:

```json
{
  "id": "6f1c…",
  "title": "Backend Developer",
  "companyId": "a12b…",
  "company": { "id": "a12b…", "name": "FPT Software" },
  "categoryId": "c34d…",
  "category": { "id": "c34d…", "name": "IT" }
}
```

During a migration, the legacy flat fields (`companyName`, `categoryName`) may stay beside the nested objects (§9). `categoryName` on `GET /api/jobs/{id}` must stay until `ai-svc` stops reading it.

### 3.2 Values

| Kind | Format | Example |
|:-----|:-------|:--------|
| Timestamp | ISO-8601, UTC, with `Z` | `"2026-11-05T08:30:00Z"` |
| Date without time | `YYYY-MM-DD` | `"2001-04-17"` (`dateOfBirth`, `startDate`) |
| Identifier | UUID string | `"6f1c2d3e-…"` |
| Money | number + ISO-4217 currency in a sibling field | `"salaryMin": 15000000, "salaryCurrency": "VND"` |
| Enum | string, values from §6 | `"employmentType": "FullTime"` |

## 4. Query parameters

| Rule | Example |
|:-----|:--------|
| camelCase | `minSalary`, `maxSalary`, `employmentType`, `experienceLevel`, `isActive` |
| Free-text search is `q` | `GET /api/search/jobs?q=dotnet`, `GET /api/admin/users?q=lan@` |
| Multi-value filters are comma-separated. Values of **one** parameter are OR-ed, different parameters are AND-ed | `employmentType=FullTime,PartTime&location=Hà Nội` |
| Skills accept `skillOp=or` (default) or `skillOp=and` | `skills=C#,SQL&skillOp=and` |
| A filter that targets another resource takes its **id** | `category=<categoryId UUID>` |
| Sorting uses `sortBy` with a fixed token list | `relevance` (default), `created_at_desc`, `created_at_asc`, `salary_desc`, `salary_asc` |

Sort tokens are values, not field names. They keep their current spelling so that existing clients do not break.

## 5. Pagination

**Request:** `page` (0-based, default `0`) and `size` (default `20`, `1 ≤ size ≤ 100`). This is the rule already written in SRS SEARCH-01-04.

**Response:** always this envelope, from every service:

```json
{ "items": [ … ], "total": 137, "page": 0, "size": 20, "totalPages": 7 }
```

- `page` in the response is the same 0-based index the client sent.
- `totalPages` is always present (`ceil(total / size)`, minimum `1`).
- No other envelopes (`{ data, pagination }`, `{ content, totalElements }`, bare arrays) for paginated lists.
- The shared type lives in `job-platform-shared` (`PaginatedResponse<T>`) so that services do not redefine it.

## 6. Enum values

Enums travel as **PascalCase strings** exactly as below. Services parse input **case-insensitively** and always **emit** the canonical spelling. Display labels (Vietnamese) are a client concern and are never sent to the API.

| Enum | Values (canonical) | Vietnamese label (clients) |
|:-----|:-------------------|:---------------------------|
| `EmploymentType` | `FullTime`, `PartTime`, `Contract`, `Internship` | Toàn thời gian, Bán thời gian, Hợp đồng, Thực tập |
| `ExperienceLevel` | `Entry`, `Mid`, `Senior`, `Lead` | Mới vào nghề, Trung cấp, Senior, Lead |
| `JobStatus` | `Pending`, `Active`, `Closed`, `Rejected`, `Deleted` | Chờ duyệt, Đang tuyển, Đã đóng, Bị từ chối, Đã xoá |
| `ApplicationStatus` | `Pending`, `Reviewed`, `Shortlisted`, `Accepted`, `Rejected` | Chờ xem, Đã xem, Vào vòng sau, Nhận việc, Không đậu |
| `Role` | `User`, `Recruiter`, `Admin` | Ứng viên, Nhà tuyển dụng, Quản trị viên |

`Deleted` is never returned by public endpoints.

**Adding a value:** add it to the owning service first (job-svc for job enums, app-svc for application status), then to this table, then to clients. A client must never offer a filter value that the owning service cannot store.

**Open decision:** SRS ADV-01-04/05 also lists `Freelance` and `Junior`. job-svc does not support them. Until the team decides to add them to job-svc, they are **not** valid values.

## 7. Errors

- Errors use RFC 7807 Problem Details: `{ "type", "title", "status", "detail" }`. Validation errors add `"errors": { "<fieldName>": ["message"] }` with **camelCase** field names, matching the request body.
- Simple success acknowledgements may return `{ "message": "…" }` (as in the SRS tables).
- Error text is for humans. Clients branch on `status` and, where defined, a stable `code` field, never on `detail` text.

## 8. Documented exceptions

These deviate on purpose and stay as they are:

| Where | Exception | Reason |
|:------|:----------|:-------|
| Multipart form fields (`POST /api/applications`, `POST /api/ai/score-resume`) | snake_case: `job_id`, `cover_letter`, `cv_file`, `lang` | Existing contract shared by two services. Keep multipart endpoints consistent with each other. |
| `ai-svc` (Python/FastAPI) JSON | snake_case across the whole service (`overall_score`, `top_matches`, …) | Python convention, one style per service. Clients map at the boundary. |
| Sort tokens | `created_at_desc`, `salary_asc`, … | Values, not field names (§4). |
| Storage (PostgreSQL columns, Elasticsearch fields) | snake_case | Storage only, never returned directly (§3). |
| WebSocket `?token=` | JWT in the query string | Browsers cannot set headers on WebSocket. To be replaced by a short-lived ticket when WS ships. |

Kafka events are **not** an exception: they use the shared C# records in `job-platform-shared` (`SharedKernel/Events`) serialised as camelCase JSON (`KafkaJson`).

## 9. Changing an existing contract

1. **Additive first.** Add the new field, endpoint or value next to the old one. Never rename in place.
2. **Deprecate.** Mark the old one as deprecated in Swagger and in §10 of this document, with the replacing name.
3. **Notify** the web and mobile owners. Both clients must be migrated before removal.
4. **Remove** after at least one sprint and only when both clients no longer use it.
5. Every PR that adds or changes an endpoint checks the list below.

**Review checklist for an endpoint PR**

- [ ] Path follows §2 (plural noun, `me`, one action per endpoint)
- [ ] Request and response bodies are camelCase DTOs, not storage models (§3)
- [ ] Query parameters camelCase, multi-value semantics as §4
- [ ] Paginated lists use the §5 envelope with a 0-based `page`
- [ ] Enum values from §6, parsed case-insensitively
- [ ] Gateway route exists and has the right policy (SRS §3.7.3)
- [ ] SRS EN **and** VI rows updated in the same PR

## 10. Known deviations (as of 2026-11-05)

Implementation that does **not** yet follow this document. Clients handle each one at the boundary until it is fixed. Remove a row when its fix is merged.

| # | Where | Deviation | Fix (owner repo) |
|:--|:------|:----------|:-----------------|
| D1 | search-svc `GET /api/search/jobs` | Returns the Elasticsearch document directly: snake_case (`company_name`, `salary_min`, `currency`, `created_at`), flat company/category | search-svc: add a camelCase `JobSearchItemDto` with nested `company`/`category` and map to it |
| D2 | job-svc `GET /api/jobs/{id}` | Flat `companyName`/`categoryName`, no nested objects | job-svc: add `company`/`category` objects, keep `categoryName` for ai-svc |
| D3 | app-svc `GET /api/applications/me`, `/job/{jobId}` | `page` is 1-based, no `totalPages` | app-svc: shared `PaginatedResponse<T>`, 0-based |
| D4 | auth-svc `GET /api/admin/users` | `{ data, pagination{ page, pageSize, totalItems, totalPages } }`, 1-based, free-text parameter is `search` | auth-svc: §5 envelope, 0-based, accept `q` (keep `search` as a deprecated alias) |
| D5 | job-svc `GET /api/admin/jobs` | `page` is 1-based | job-svc: 0-based |
| D6 | app-svc `GET /api/applications/{id}/allowed-transitions`, `/status-flow` | snake_case (`current_status`, `allowed_transitions`, `all_statuses`) | app-svc: camelCase DTOs |
| D7 | app-svc application responses | `status` emitted lowercase (`"pending"`) | app-svc: emit canonical `Pending` (low priority, clients already normalise) |
| D8 | search-svc filters | `employmentType`/`experienceLevel` CSV is matched as one value. `skillOp` is not supported (always OR) | search-svc: split CSV into a terms query, add `skillOp` |
| D9 | search-svc / job-svc sync | `created_at` in Elasticsearch is overwritten on every `job.updated` | shared + job-svc + search-svc: carry `CreatedAt` in job events and sync payload |
| D10 | app-svc errors | 401/403/409 return `{ message }` instead of Problem Details | app-svc (low priority) |

**Specified but not implemented yet** (features, not deviations): `GET /api/search/skills`, `GET /api/search/locations`, search facets, admin role change, `POST /api/admin/categories`, in-app notifications (`/api/notifications`, devices, read state), WebSocket `/ws/notifications`, AI chat (`/api/ai/chat`, `/api/ai/session*`). Clients must show these as unavailable and must not simulate them outside development mocks.
