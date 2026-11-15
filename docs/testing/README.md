# Kiểm thử tự động E2E (Playwright) — Quên/đặt lại mật khẩu & Hồ sơ cá nhân

| File | Nội dung |
|:--|:--|
| `test-cases.xlsx` / `test-cases.csv` | Bảng test case (22 case: 20 Automation, 1 Automation ghi nhận lỗi, 1 Manual) |
| `playwright/tests/password-reset.spec.ts` | 11 test UI cho AUTH-01-07/08 |
| `playwright/tests/profile.spec.ts` | 10 test UI cho PROFILE-01 |
| `playwright/tests/resume-score.spec.ts` | 8 test UI/API cho SCORE-01 (chấm điểm CV); cần `SCORE_JOB_ID=<uuid job>`, gateway có route `/api/ai/*`, `ai-svc` :6000, `job-svc` :5002. Fixture CV trong `playwright/tests/fixtures/` (PDF text, PDF scan, DOCX, PDF trống, .txt) |
| `playwright/run-tests.sh` | Chuẩn bị môi trường (SMTP→MailHog, reset rate-limit) rồi chạy Playwright |

Chạy: `cd playwright && WEB_URL=http://localhost:3000 ./run-tests.sh`, xem báo cáo bằng `npx playwright show-report`.
Mỗi test đều có trace, screenshot (video khi fail) → dùng làm minh chứng cho báo cáo.

Lưu ý:
- `docker-compose.yml` dev đặt `SMTP_HOST=localhost` nên mail reset không tới MailHog; `playwright/docker-compose.smtp.override.yml` chỉ sửa khi test.
- Container web ở `:5173` là bản build cũ; khi test hãy chạy web từ `main` (Vite, cổng 3000 vì gateway chỉ cho CORS 5173/3000) và đặt `VITE_API_BASE_URL=http://localhost:5000/api`.
- **Lỗi đã biết (PROF-UI-09):** web gọi `/api/profile/*` (số ít), gateway chỉ có `/api/profiles/*` → 404 → web dùng dữ liệu giả trong localStorage.
