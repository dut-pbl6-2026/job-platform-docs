# Giao diện Nhà tuyển dụng — Web (đồng bộ với mobile)

> **Trạng thái:** Bản nháp · **Bản gốc:** [`recruiter-ui.md`](recruiter-ui.md)
> **Áp dụng cho:** `job-platform-web` (React/TS/Vite). Tham chiếu: `job-platform-mobile` (Flutter).
> **Liên quan:** [Quy ước API](../api-conventions.vi.md) (đường dẫn, kiểu đặt tên, enum).

## 1. Mục đích

Ứng dụng mobile có vai trò Nhà tuyển dụng với bốn màn hình hoạt động. Web hiện chưa có vai trò này. Tài liệu này ánh xạ từng màn hình mobile tới các endpoint và chính sách gateway bảo vệ chúng, để bản web khớp hành vi mobile và các khoảng trống được nhận biết trước khi bắt đầu.

## 2. Ma trận màn hình (đã kiểm kê)

| Màn hình | File mobile | Endpoint | Backend | Chính sách gateway |
|---|---|---|---|---|
| Tổng quan nhà tuyển dụng | `lib/features/recruiter/presentation/recruiter_dashboard_screen.dart` | `GET /api/jobs/recruiter`; `GET /api/applications/job/{jobId}` cho từng tin | job-svc `JobEndpoints.cs:26`; app-svc `ApplicationEndpoints.cs:39` | `jobs-recruiter` = Recruiter; `apps` = Authenticated |
| Danh sách tin tuyển dụng | `recruiter_jobs_screen.dart` | `GET /api/jobs/recruiter` | job-svc `JobEndpoints.cs:26` | Recruiter |
| Đăng tin | `post_job_screen.dart` | `POST /api/jobs`; `GET /api/profiles/me` (lấy `companyId`) | `JobEndpoints.cs:25`; profile-svc `ProfileEndpoints.cs:29` | `jobs-create` = Recruiter; `profiles` = Authenticated |
| Hồ sơ ứng tuyển của ứng viên | `candidate_applications_screen.dart` | `GET /api/applications/job/{jobId}`; `PUT /api/applications/{id}/status` | app-svc `ApplicationEndpoints.cs:39`, `:42` | `apps` = Authenticated **duy nhất** (khoảng trống, xem §5) |

### Ngoài phạm vi (CHƯA CÓ BACKEND — không xây trên web)

- **Việc làm đã lưu** — chưa có endpoint lưu trữ.
- **Kết nối** — chưa có endpoint.
- **Trình tạo CV** — lưu là no-op trên mobile.
- **Danh sách thông báo** — `GET /api/notifications` không tồn tại trong notif-svc. Chỉ có `/history`, và endpoint này yêu cầu token.

## 3. Route web (dự kiến)

| Route | Vai trò | Chức năng |
|---|---|---|
| `/recruiter` | Recruiter | Tổng quan |
| `/recruiter/jobs` | Recruiter | Danh sách tin tuyển dụng |
| `/recruiter/jobs/new` | Recruiter | Đăng tin |
| `/recruiter/jobs/:jobId/applications` | Recruiter | Hồ sơ ứng tuyển theo từng tin |

Các trang nhà tuyển dụng nằm sau guard `RecruiterRoute`, được mô phỏng theo `AdminRoute`. Menu nhà tuyển dụng chỉ hiển thị khi `isRecruiter` là true trong `src/lib/roles.ts`.

## 4. Guard route (khớp mobile)

Mobile (`app_router.dart`, khoảng dòng 128–145) giữ các trang chỉ dành cho ứng viên tách khỏi nhà tuyển dụng. Web phải làm tương tự.

| Route | Vai trò được phép | Trường hợp khác |
|---|---|---|
| `/applications`, `/applications/:id`, `/jobs/:id/apply`, `/resume-score` | Chỉ ứng viên (User) | Chuyển hướng về `/jobs` kèm thông báo |
| `/recruiter/*` | Chỉ Recruiter | Chuyển hướng đi kèm thông báo |

Hiện `ProtectedRoute` của web chỉ kiểm tra đăng nhập. Cần bổ sung kiểm tra vai trò cho các route trên.

## 5. Khoảng trống đã biết

1. **Route hồ sơ ứng tuyển không có chính sách Recruiter ở gateway.** Route `apps` chỉ yêu cầu `Authenticated`, nên mọi người dùng đã đăng nhập đều qua được gateway. Việc thực thi cho hành động chỉ dành cho nhà tuyển dụng chỉ nằm ở app-svc. Tài liệu ghi nhận khoảng trống này. Gateway không được thay đổi trong công việc này.
2. **Đăng tin dùng endpoint Recruiter, không dùng endpoint admin.** Form web phải gọi `POST /api/jobs`. Không được gọi `POST /api/admin/jobs` (được `AdminJobForm` dùng).
3. **Chưa có kiểm thử với backend thật.** Công việc web được xác minh bằng lời gọi API giả lập trong Playwright.

## 6. Kiểm chứng

Mỗi PR triển khai phải vượt qua `npx tsc -b`, `npm run build`, và bộ e2e Playwright với số worker giảm, không có lỗi mới so với baseline đã ghi. Lint không chạy được trong môi trường hiện tại (chưa cài eslint).
