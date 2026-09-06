# Backlog — Workarounds (PBL6-16)

> PBL6-16 E2E auth (Render + Vercel + Supabase) — tracked debt.

## 1) Web register → explicit login
- File: `job-platform-web/src/contexts/AuthContext.tsx:43` `src/lib/api.ts:81`
- Log: `POST /api/auth/register` returns `201 {userId}` not tokens; web does `await register` then `await login` extra call.
- Fix: if backend returns tokens on register, remove second `login` call.

## 2) Mobile secure storage not wired
- File: `job-platform-mobile/pubspec.yaml` `lib/core/session/auth_session.dart` `lib/features/auth/data/repositories/api_auth_repository.dart`
- Log: `dio/secure_storage/shared_prefs` added, `AuthSession.load()/setSession()` with `encryptedSharedPreferences` and `ApiAuthRepository` ready, but screens still use `MockAuthRepository`, `main.dart` not calling `load()`, `android minSdk 23` not set, `flutter analyze` not run.
- Fix: wire `main.dart await AuthSession.instance.load()`, inject `ApiAuthRepository` via `FLUTTER_API_URL`, set `minSdk 23`, run `flutter analyze`.

## 3) GHCR local-feed pinned
- File: `job-platform-auth-svc/nuget.config` `local-feed/JobPlatform.SharedKernel.0.1.0.nupkg` `job-platform-gateway/nuget.config`
- Log: CI `dotnet restore` uses committed `0.1.0.nupkg`; not rebuilding `SharedKernel` in auth/gateway CI.
- Fix: on `SharedKernel` bump run `mise run pack && cp artifacts/*.nupkg ../job-platform-auth-svc/local-feed/ ../job-platform-gateway/local-feed/`.

## 4) Missing HSTS + security headers (MitM: SSL-strip)
- File: `job-platform-gateway/src/Gateway.Api/Program.cs` `job-platform-auth-svc/src/Auth.Api/Program.cs` (neither has `UseHsts`/headers)
- Log: TLS currently relies on Render/Vercel edge only; no `Strict-Transport-Security` so first-visit over HTTP is SSL-strippable. SRS `7-eir.md:400` requires headers at SHOULD.
- Fix: centralized headers middleware at gateway (covers all downstream): `Strict-Transport-Security: max-age=2592000` (30 days, no preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; enable HSTS only when non-Development.

## 5) SMTP STARTTLS opportunistic → STRIPTLS-able
- File: `job-platform-auth-svc/src/Auth.Infrastructure/Services/SmtpEmailSender.cs:52` (`StartTlsWhenAvailable`)
- Log: active MitM stripping STARTTLS capability downgrades password-reset mail (with 15m token link) to plaintext.
- Fix: when host is not local/MailHog enforce `SecureSocketOptions.StartTls` (fail-closed instead of downgrade); keep `None` for `localhost/127.0.0.1/mailhog`.

## 6) DB conn string without SSL Mode + tokens in localStorage (noted)
- File: `job-platform-infra/envs/.env.*.example` (`DATABASE_URL_*`) `job-platform-web/src/lib/api.ts:6-15`
- Log: Npgsql default `Prefer` — encrypted in practice (Supabase enforces server-side) but not explicit; web stores access+refresh in `localStorage` so a successful MitM/XSS loses both (currently mitigated only by refresh rotation + reuse-revoke).
- Fix (later phase): add `SSL Mode=Require` to prod conn string template; move tokens to `httpOnly; Secure; SameSite` cookies + CSRF (needs web + API rework, large effort).
