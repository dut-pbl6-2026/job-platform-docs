# AGENTS — job-platform-docs

> Source of truth hub. SRS bilingual `docs/srs/en`↔`vi` (v1.0 2026-08-17), `docs/master-plan.md` (v4.0 16w), Git `/.github/git-strategy.md`.

## Mise activation

Activate `mise` for bare `dotnet`/`infisical` without `mise exec`:

| Shell | Add to config file | Activate |
|-------|--------------------|----------|
| `bash` | `~/.bashrc` or `~/.bash_profile` | `eval "$(mise activate bash)"` |
| `zsh` | `~/.zshrc` | `eval "$(mise activate zsh)"` |
| `fish` | `~/.config/fish/config.fish` | `mise activate fish \| source` |
| `PowerShell` | `$PROFILE` | `mise activate pwsh \| Out-String \| Invoke-Expression` |

Agent uses `mise exec -- dotnet ...` / `mise exec -- infisical ...` due to non-interactive shell without `mise activate`; humans just use `dotnet` / `infisical` after `mise install`.

## Scope

Vietnam Job Platform (`pbl6`) — `dut-pbl6-2026` 14 multirepos: `shared auth-svc job-svc search-svc app-svc profile-svc notif-svc gateway web mobile crawler ai-svc infra docs`. No app code — docs only.

## Structure

```
docs/master-plan.md          # priority + architecture + 16w roadmap + team
docs/master-plan.vi.md       # VI mirror
docs/srs/en/{1..10}.md       # EN SRS
docs/srs/vi/{1..10}.vi.md    # VI SRS
.github/git-strategy.md      # branch/commit/PR/release
```

Parts: `1-introduction`, `2-overall-description` (personas, 14-repo table, US-01..21), `3-must-have-fr` (12 MUST), `4-should-have-fr` (10 SHOULD), `5-nice-have-fr` (10 NICE), `6-nfr` (52 NFR), `7-eir` (37 interfaces), `8-system-architecture` (microservices + DB-per-service + events), `9-infra-cost-analysis` (zero-cost $0), `10-appendices` (glossary, team, Gantt, API 55 rows, DB schema).

## Priority discipline (master-plan.md:1, SRS 3-5)

- **MUST** (12, W1-4): Auth, Job, Search, App, Profile, Gateway, PostgreSQL, Docker Compose, Crawler 500 jobs `vieclam.gov.vn`, Web React, Mobile Flutter, CI/CD — no SHOULD/NICE before MUST stable.
- **SHOULD** (10, W5-8): Notification, Redis cache, Kafka, Advanced Search, R2 storage, Admin, RBAC, WebSocket, FCM Push, Monitoring.
- **NICE** (10, W9-13, pick ≥2): AI Copilot RAG (`ai-svc` 6000), Resume Scoring, Telegram Bot, Analytics, Recommendation, i18n, Vector Search, K8s, Offline, Dark Mode — risks `master-plan.md:6` (prototype AI W7-8).

## Architecture (SRS 8)

Layers `Client React/Flutter → YARP Gateway JWT/RateLimit → 6 .NET10 LTS svcs 5001-5006 + AI 6000 → PG/Redis/ES → Kafka → Crawler → R2`. Principles: microservices + `DB-per-service` + API-first OpenAPI3 + event-driven `job.created|updated|deleted|application.submitted|updated` at-least-once DLQ 7d retention + stateless + IaC.

## NFR summary (SRS 6: 52 NFR)

`PERF-01 p95<500ms p99<1000ms`, `PERF-02 search p95<200ms`, `PERF-03 100RPS`, `PERF-07 cache hit 60% qs / 80% job`, `SEC-01 JWT 60m`, `SEC-03 bcrypt12`, `SEC-08 AES-256-GCM phone/address per-record IV 90d rotation + CV private ACL`, `SEC-09 refresh SHA256 7/30d reuse→revoke family`, `REL-01 99% + circuit breaker + retry3 exp backoff`, `MAINT-01 clean arch Api/Core/Infrastructure`, `MAINT-02 coverage>70% lint enforced`, `PORT-02 no hard-code`.

## Infra cost (SRS 9)

Zero-cost $0 (16w): Render Free 750h + Vercel + Supabase 500MB + Upstash 10k/d + Bonsai 1GB + Confluent Basic + R2 10GB + GHCR + Actions 2kmin + Grafana. Thresholds: Supabase 400MB/15conn, Upstash 8k/d, Bonsai 800MB.

## Git strategy (git-strategy.md)

`main` only, `feature/* 1-7d` / `bugfix/*` / `release/vX.Y.Z` / `hotfix/*` → `main`, `rebase + --force-with-lease` preferred. Commits `<type>(<scope>): <subject>` types `feat/fix/docs/refactor/test/chore/ci` scopes `auth/job/search/app/profile/notif/ai/web/mobile/gateway/shared/infra`. PR: Description/Type/Testing/Checklist `build/tests/conflicts/docs` `Closes #`, 1 review + CODEOWNERS + CI.

## Workflow

Keep EN/VI sync on every edit. Keep `master-plan.md` in sync with SRS changes. `feature/docs-*` or `docs/*` → `main` per `CONTRIBUTING.md`.
