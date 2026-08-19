# job-platform-docs

Central documentation and governance repository for the **Vietnam Job Platform** (`pbl6`) project.

This is the **meta/docs repository** of the [dut-pbl6-2026](https://github.com/dut-pbl6-2026) organization. It contains all planning, requirements, and governance artifacts; actual source code lives in the dedicated `job-platform-*` repositories.

## Contents

| Path | Description |
|:-----|:------------|
| `docs/master-plan.md` / `.vi.md` | 16-week master plan, architecture, team assignments (EN/VI) |
| `docs/srs/en/` | Software Requirements Specification (English) |
| `docs/srs/vi/` | Software Requirements Specification (Vietnamese) |
| `.github/git-strategy.md` | Git branching, commit, and release conventions |

## Related Repositories

All repositories are hosted under the [dut-pbl6-2026](https://github.com/dut-pbl6-2026) organization:

- `job-platform-shared` — shared kernel, DTOs, event contracts (NuGet package)
- `job-platform-auth-svc` — authentication & authorization service
- `job-platform-job-svc` — job posting & category management service
- `job-platform-search-svc` — Elasticsearch search service
- `job-platform-app-svc` — job application & CV management service
- `job-platform-profile-svc` — user profile service
- `job-platform-notif-svc` — notification service
- `job-platform-gateway` — API gateway (YARP)
- `job-platform-web` — React web app
- `job-platform-mobile` — Flutter mobile app
- `job-platform-crawler` — Python Scrapy crawler
- `job-platform-ai-svc` — AI copilot & resume scoring (optional)
- `job-platform-infra` — Docker Compose, K8s manifests, deployment scripts

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Languages

Documentation is maintained in both English and Vietnamese; each document links to its counterpart.