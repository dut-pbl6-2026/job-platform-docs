# Cross-Browser and Device Testing (PBL6-68)

> **Historical report.** The suite at the time included `tests/resume-score.spec.ts` for the candidate-facing score page. That page and its spec were removed on 2026-11-16 (a match score is recruiter/admin-only), so the run commands below no longer match the current suite; the results are kept as recorded.

Runs the same E2E suite (`password-reset`, `profile`, `resume-score`) on 5 Playwright projects. Demo-record is out of scope.

## Scope and limits

| Project | Engine | Device | Notes |
|---|---|---|---|
| `chromium` | Chromium | Desktop | |
| `firefox` | Firefox | Desktop | |
| `webkit` | WebKit | Desktop | Playwright's WebKit engine, **not Safari** |
| `mobile-pixel-5` | Chromium | Pixel 5 (emulated) | Emulated viewport and user agent, **not a real device** |
| `mobile-iphone-13` | WebKit | iPhone 13 (emulated) | Emulated, **not real iOS 16+** |

Not tested yet: real Safari, real iOS 16+, real Android 12+. The results below must not be taken as evidence for those devices.

## Environment

- Dev stack (`job-platform-infra`, `docker compose up`) is running, gateway on `:5000`.
- Web dev server on `:3000` (`VITE_API_BASE_URL=http://localhost:5000/api`).
- auth-svc uses `docker-compose.smtp.override.yml` to send mail to MailHog (`:8025`).
- `SCORE_JOB_ID` must be an active **Python** job (test RS-UI-03 checks the CV score for the Python job).
- Playwright `1.64.1`, runs in the image `mcr.microsoft.com/playwright:v1.64.1-noble`. This Ubuntu image is the supported platform for WebKit. On Fedora, the WebKit libraries do not match (ICU 74 is not available).

## How to run

Run each project separately and reset the auth-svc mail rate-limit counter before each project. If all 5 projects run in one go, the 5-per-hour counter is shared and later tests fail for reasons unrelated to the code.

```bash
# trước mỗi project
docker restart job-platform-auth

# project desktop/mobile dùng Chromium hoặc Firefox trên máy
WEB_URL=http://localhost:3000 SCORE_JOB_ID=<uuid job Python> \
  npx playwright test tests/password-reset.spec.ts tests/profile.spec.ts tests/resume-score.spec.ts \
  --project=<project> --workers=1

# WebKit và iPhone: chạy trong container (copy thư mục để container không ghi vào thư mục này)
cp -a . /tmp/pw-run && cd /tmp/pw-run && \
docker run --rm --network host -v "$PWD:/work" -w /work \
  -e WEB_URL=http://localhost:3000 -e SCORE_JOB_ID=<uuid job Python> -e CI=1 \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  npx playwright test tests/password-reset.spec.ts tests/profile.spec.ts tests/resume-score.spec.ts \
  --project=<project> --workers=1
```

## Results

Each project runs 29 tests.

| Project | Passed | Failed | Only failure |
|---|---|---|---|
| `chromium` | 28 | 1 | PWD-UI-11 |
| `firefox` | 28 | 1 | PWD-UI-11 |
| `webkit` | 28 | 1 | PWD-UI-11 |
| `mobile-pixel-5` | 28 | 1 | PWD-UI-11 |
| `mobile-iphone-13` | 28 | 1 | PWD-UI-11 |

### PWD-UI-11 failure (product defect, not a test defect)

What the test checks: after more than 5 forgot-password requests within 1 hour, the UI shows a failure message in Vietnamese.

What happens: the limit works correctly, but the forgot-password page shows the backend's original message in English: `Forgot password request limit exceeded. Please try again later.`

Rule violation: UI copy must be Vietnamese only. Fix in `job-platform-web` (`ForgotPasswordPage`, map the 429 error to a Vietnamese message). This is a web defect; it is not fixed in the test suite.

### Changes made to the test suite (test defects, not product defects)

- Outdated input selectors: `#email` → `#forgot-email`; `getByPlaceholder` → `#reset-pwd`, `#reset-confirm`, `#reset-token` (the reset page does not set placeholders).
- After login, the app redirects to `/jobs` (there is no `/dashboard` route).
- Link message: matched by content instead of exact text, because the alert also contains the link "Nhận liên kết mới" ("Get a new link").
- `SCORE_JOB_ID` pointed to a React job earlier; test RS-UI-03 needs a Python job.

## Uncertainties

- The WebKit and iPhone results come from the WebKit engine in Playwright and emulation mode, not from Safari or a real device.
- The results are based on a single run per project, on the local dev stack.
