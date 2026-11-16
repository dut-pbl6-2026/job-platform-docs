# Backlog — Workarounds (PBL6-16)

> PBL6-16 E2E auth — tracked debt.

## 1) Web register → explicit login
- Status: resolved.
- Now: `POST /api/auth/register` returns `202 { message }` and no tokens; the web shows the "check your email" state and links to `/verify-email`. Login happens only after verification.

## 2) Mobile secure storage not wired
- Status: resolved.
- Now: `lib/features/splash/splash_screen.dart` calls `AuthSession.instance.load()` and `ApiAuthRepository().validateRestoredSession()`; the auth screens default to `ApiAuthRepository`; `minSdk = 31`.

## 3) GHCR local-feed pinned
- Status: resolved. There is no committed `local-feed/` directory.
- Now: every consumer takes `JobPlatform.SharedKernel` from GitHub Packages `https://nuget.pkg.github.com/dut-pbl6-2026/index.json` via `nuget.config`. Authentication is still required even though the package is public: restore needs `GITHUB_TOKEN` with `read:packages`; Docker builds mount it as the BuildKit secret `nuget_token`.

## 4) Missing HSTS + security headers (MitM: SSL-strip)
- Status: resolved at the production edge.
- Now: `docker/caddy/Caddyfile` sends `Strict-Transport-Security: max-age=31536000; includeSubDomains`; the gateway also sends HSTS over HTTPS. The Caddy edge drops the upstream copy so clients see one header.

## 5) SMTP STARTTLS opportunistic → STRIPTLS-able
- File: `job-platform-auth-svc/src/Auth.Infrastructure/Services/SmtpEmailSender.cs:52` (`StartTlsWhenAvailable`)
- Log: active MitM stripping STARTTLS capability downgrades password-reset mail (with 15m token link) to plaintext.
- Fix: when host is not local/MailHog enforce `SecureSocketOptions.StartTls` (fail-closed instead of downgrade); keep `None` for `localhost/127.0.0.1/mailhog`.

## 6) DB conn string without SSL Mode + tokens in localStorage (noted)
- File: `job-platform-infra/envs/.env.*.example` (`DATABASE_URL_*`) `job-platform-web/src/lib/api.ts:6-15`
- Log: Npgsql default `Prefer` — encrypted in practice (Supabase enforces server-side) but not explicit; web stores access+refresh in `localStorage` so a successful MitM/XSS loses both (currently mitigated only by refresh rotation + reuse-revoke).
- Fix (later phase): add `SSL Mode=Require` to prod conn string template; move tokens to `httpOnly; Secure; SameSite` cookies + CSRF (needs web + API rework, large effort).
