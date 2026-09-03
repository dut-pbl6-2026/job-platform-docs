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
