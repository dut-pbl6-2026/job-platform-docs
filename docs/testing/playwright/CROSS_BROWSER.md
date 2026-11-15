# Kiểm thử đa trình duyệt và thiết bị (PBL6-68)

Chạy cùng bộ test E2E (`password-reset`, `profile`, `resume-score`) trên 5 project Playwright. Demo-record không nằm trong phạm vi.

## Phạm vi và giới hạn

| Project | Engine | Thiết bị | Ghi chú |
|---|---|---|---|
| `chromium` | Chromium | Desktop | |
| `firefox` | Firefox | Desktop | |
| `webkit` | WebKit | Desktop | Engine WebKit của Playwright, **không phải Safari** |
| `mobile-pixel-5` | Chromium | Pixel 5 (giả lập) | Giả lập viewport và user agent, **không phải thiết bị thật** |
| `mobile-iphone-13` | WebKit | iPhone 13 (giả lập) | Giả lập, **không phải iOS 16+ thật** |

Chưa kiểm thử: Safari thật, iOS 16+ thật, Android 12+ thật. Các kết quả dưới đây không được coi là bằng chứng cho các thiết bị đó.

## Môi trường

- Stack dev (`job-platform-infra`, `docker compose up`) đang chạy, gateway ở `:5000`.
- Web dev ở `:3000` (`VITE_API_BASE_URL=http://localhost:5000/api`).
- auth-svc dùng `docker-compose.smtp.override.yml` để gửi mail tới MailHog (`:8025`).
- `SCORE_JOB_ID` phải là job **Python** đang Active (test RS-UI-03 kiểm tra điểm CV cho job Python).
- Playwright `1.64.1`, chạy trong image `mcr.microsoft.com/playwright:v1.64.1-noble`. Image Ubuntu này là nền tảng WebKit được hỗ trợ. Trên Fedora, các thư viện WebKit không khớp (ICU 74 không có sẵn).

## Cách chạy

Chạy từng project riêng và reset bộ đếm giới hạn gửi mail của auth-svc trước mỗi project. Nếu chạy cả 5 project trong một lần, bộ đếm 5 lần/giờ sẽ bị dùng chung và các test sau đó sẽ lỗi không liên quan đến code.

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

## Kết quả

Mỗi project chạy 29 test.

| Project | Đạt | Lỗi | Lỗi duy nhất |
|---|---|---|---|
| `chromium` | 28 | 1 | PWD-UI-11 |
| `firefox` | 28 | 1 | PWD-UI-11 |
| `webkit` | 28 | 1 | PWD-UI-11 |
| `mobile-pixel-5` | 28 | 1 | PWD-UI-11 |
| `mobile-iphone-13` | 28 | 1 | PWD-UI-11 |

### Lỗi PWD-UI-11 (lỗi sản phẩm, không phải lỗi test)

Test kiểm tra: gửi quá 5 yêu cầu quên mật khẩu trong 1 giờ thì UI hiển thị thông báo gửi thất bại bằng tiếng Việt.

Thực tế: giới hạn hoạt động đúng, nhưng trang quên mật khẩu hiển thị thông báo gốc của backend bằng tiếng Anh: `Forgot password request limit exceeded. Please try again later.`

Vi phạm quy tắc: copy giao diện chỉ dùng tiếng Việt. Cần sửa ở `job-platform-web` (`ForgotPasswordPage`, ánh xạ lỗi 429 sang thông báo tiếng Việt). Đây là lỗi web, không sửa trong bộ test.

### Các sửa đổi trong bộ test (lỗi test, không phải lỗi sản phẩm)

- Selector trường nhập đã lỗi thời: `#email` → `#forgot-email`; `getByPlaceholder` → `#reset-pwd`, `#reset-confirm`, `#reset-token` (trang reset không đặt placeholder).
- Sau đăng nhập, app chuyển tới `/jobs` (không có route `/dashboard`).
- Thông báo link đã dùng: khớp theo nội dung thay vì khớp chính xác từng chữ, vì alert có thêm link "Nhận liên kết mới".
- `SCORE_JOB_ID` trỏ tới job React trước đây; test RS-UI-03 cần job Python.

## Không chắc chắn

- Kết quả WebKit và iPhone là của engine WebKit trong Playwright và chế độ giả lập, không phải Safari hay thiết bị thật.
- Kết quả chỉ dựa trên một lần chạy cho mỗi project, trên stack dev local.
