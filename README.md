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

## Onboarding — First Pull Local

Per-repo READMEs are the source of truth (simple, no hiding):

- `job-platform-infra/README.md` — `mise` `dotnet 10.0.100` `docker compose` `sync-env` one command + `docker compose up -d`
- `job-platform-shared/README.md` — `net10.0` `JobPlatform.SharedKernel 0.1.0` `dotnet pack` + `local-feed`
- `job-platform-auth-svc/README.md` — `net10.0` `EF 10.0.4` `Npgsql 10.0.3` `dotnet build/test/ef` `dotnet run :5001` + `health` `swagger`

Quick start:

```bash
for r in infra shared auth-svc docs; do gh repo clone dut-pbl6-2026/job-platform-$r; done
cd job-platform-infra && mise trust && mise install && dotnet --version  # 10.0.100
./scripts/sync-env.sh dev && docker compose up -d && docker compose ps
cd ../job-platform-shared && dotnet build SharedKernel.sln
cd ../job-platform-auth-svc && dotnet build AuthService.sln && dotnet test
```

> Note: agent uses `mise exec -- dotnet ...` due to non-interactive shell without `mise activate`; humans just use `dotnet` after `mise install`.

See also `job-platform-infra/envs/README.md` for `Infisical` + `master-plan.md:150`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Languages

Documentation is maintained in both English and Vietnamese; each document links to its counterpart.