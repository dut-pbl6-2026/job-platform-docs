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
| Đăng tin | `post_job_screen.dart` | `POST /api/jobs`; `GET /api/auth/me` (lấy `companyId`) | `JobEndpoints.cs:25`; auth-svc `AuthEndpoints.cs:131` (`UserDto.CompanyId`) | `jobs-create` = Recruiter; `auth` = không có policy ở gateway (auth-svc kiểm tra token) |
| Hồ sơ ứng tuyển của ứng viên | `candidate_applications_screen.dart` | `GET /api/applications/job/{jobId}`; `PUT /api/applications/{id}/status` | app-svc `ApplicationEndpoints.cs:39`, `:42` | `apps` = Authenticated **duy nhất** (khoảng trống, xem §5) |


> **Đính chính (đã kiểm tra trong code):** `companyId` không có trong `ProfileDetailDto` của profile-svc. Nó là `UserDto.CompanyId` từ `GET /api/auth/me` của auth-svc. Dòng `GET /api/profiles/me` trước đó là sai.

### Ngoài phạm vi (CHƯA CÓ BACKEND — không xây trên web)

- **Việc làm đã lưu** — chưa có endpoint lưu trữ.
- **Kết nối** — chưa có endpoint.
- **Trình tạo CV** — lưu là no-op trên mobile.
- **Danh sách thông báo phía server** — `GET /api/notifications` không tồn tại trong notif-svc. Chỉ có `/history`, và endpoint này yêu cầu token. Vì vậy chuông ở §5 tổng hợp những dữ liệu người dùng đã được phép đọc.

## 3. Tuyến đường web (hiện tại)

| Tuyến | Khung | Vai trò | Chức năng |
|---|---|---|---|
| `/` | Công khai | Khách, mọi vai trò | Trang chủ: tìm kiếm, ngành nghề, việc làm mới, công ty |
| `/jobs`, `/jobs/:id` | Công khai | Khách, mọi vai trò | Bảng việc làm và chi tiết tin |
| `/companies/:id` | Công khai | Khách, mọi vai trò | Hồ sơ công ty công khai và các tin đang tuyển |
| `/login`, `/register`, `/register-company`, `/forgot-password`, `/reset-password`, `/verify-email` | Xác thực | Khách | Đăng nhập, đăng ký ứng viên/công ty, xác minh email |
| `/profile` | Đã đăng nhập | Mọi vai trò | Hồ sơ (menu avatar); trợ lý AI không còn hiển thị |
| `/applications`, `/applications/:id`, `/jobs/:id/apply` | Đã đăng nhập | Ứng viên | Danh sách/chi tiết đơn và luồng ứng tuyển ba bước |
| `/interviews` | Đã đăng nhập | Ứng viên | Lịch phỏng vấn của ứng viên |
| `/recruiter` | Khu làm việc | Nhà tuyển dụng | Tổng quan |
| `/recruiter/jobs` | Khu làm việc | Nhà tuyển dụng | Tin tuyển dụng |
| `/recruiter/jobs?new=1`, `/recruiter/jobs?edit=<id>` | Khu làm việc | Nhà tuyển dụng | Wizard đăng/sửa ba bước dưới dạng hộp thoại trên danh sách tin (`/recruiter/jobs/new` và `/:id/edit` chuyển hướng về đây) |
| `/recruiter/candidates` | Khu làm việc | Nhà tuyển dụng | Kanban ứng viên; kéo để chuyển bước, bấm thẻ để mở hồ sơ, bấm avatar/tên để xem hồ sơ công khai |
| `/recruiter/jobs/:jobId/applications` | Khu làm việc | Nhà tuyển dụng | Hồ sơ của tin dưới dạng bảng: ứng viên, ngày, điểm AI, trạng thái, thao tác |
| `/recruiter/applications/:id` | Khu làm việc | Nhà tuyển dụng | Một hồ sơ: báo cáo AI, thư ứng tuyển và CV đã nộp, bố cục hai cột |
| `/recruiter/interviews` | Khu làm việc | Nhà tuyển dụng | Lịch tháng các buổi phỏng vấn, kèm thao tác huỷ |
| `/recruiter/email-templates` | Khu làm việc | Nhà tuyển dụng | Mẫu email đã lưu (tạo, sửa, xoá) |
| `/recruiter/company` | Khu làm việc | Nhà tuyển dụng | Hồ sơ công ty; chỉ quản trị viên công ty được sửa |
| `/recruiter/invite-codes`, `/recruiter/join-requests` | Khu làm việc | Quản trị viên công ty | Mã mời và yêu cầu tham gia công ty |
| `/admin`, `/admin/jobs`, `/admin/users` | Khu làm việc | Quản trị viên | Tổng quan, kiểm duyệt tin (gỡ/khôi phục), người dùng |
| `*` | Công khai | Khách, mọi vai trò | Trang 404 với liên kết về bảng việc làm và trang chủ |

Khung: `PublicLayout` hiển thị thanh điều hướng trên và chân trang; `AuthedLayout` chọn đầu trang
gọn cho `User` và thanh bên `WorkspaceLayout` cho `Recruiter`/`Admin` (không có chân trang tiếp thị
trong hai khu làm việc). Menu tài khoản nằm sau ảnh đại diện: Hồ sơ, Đơn ứng tuyển (ứng viên),
Công ty (nhà tuyển dụng), Quản trị (quản trị viên), Trợ lý AI, Đăng xuất. Trang chấm điểm CV của ứng
viên đã bị bỏ: điểm phù hợp chỉ hiển thị cho nhà tuyển dụng theo từng hồ sơ.

Thanh bên của nhà tuyển dụng gồm: Tổng quan, Ứng viên, Tin tuyển dụng, Lịch phỏng vấn, Mẫu email — rồi
nhóm **QUẢN TRỊ CÔNG TY** với Công ty (mọi nhà tuyển dụng) và, với quản trị viên công ty, Mã mời và Yêu
cầu tham gia. Không còn mục "Đăng tin" riêng: đăng tin là hộp thoại mở từ Tin tuyển dụng.

## 4. Bảo vệ tuyến đường

Việc kiểm tra nằm ở ranh giới khung: `ProtectedRoute` cho đăng nhập và `RequireRole` cho khu vực
theo vai trò. Tuyến chỉ dành cho ứng viên sẽ chuyển hướng kèm thông báo; app-svc/job-svc kiểm tra
quyền lại ở máy chủ.

| Tuyến | Vai trò được phép | Ngược lại |
|---|---|---|
| `/applications`, `/applications/:id`, `/jobs/:id/apply` | Chỉ ứng viên (User) | Chuyển hướng về `/jobs` kèm thông báo |
| `/recruiter/*` | Chỉ nhà tuyển dụng | Chuyển hướng về `/jobs` kèm thông báo |
| `/admin/*` | Chỉ quản trị viên | Chuyển hướng về `/jobs` kèm thông báo |

## 5. Luồng tương tác (2026-11)

**Ứng tuyển** là wizard ba bước, không phải một biểu mẫu dài: (1) xem lại hồ sơ mà nhà tuyển dụng sẽ
nhận, kèm danh sách thông tin còn thiếu và bước xác nhận rõ ràng; (2) chọn CV và viết thư giới thiệu nếu
muốn; (3) xem lại và gửi. Bước hồ sơ là bắt buộc vì đơn ứng tuyển mang danh tính đó vào pipeline của
nhà tuyển dụng. **Đăng tin** cũng ba bước: thông tin cơ bản → mô tả kèm lương → chỉ xem trước, trong hộp
thoại trên danh sách tin (không còn trang riêng).

Danh sách hồ sơ là bảng. Một dòng mở `/recruiter/applications/:id`: cột trái là thư ứng tuyển và CV đã
nộp, cột phải là báo cáo đầy đủ của ai-svc đã tạo ra điểm — giống màn hình chấm CV thử đã bị xoá, bỏ
phần gợi ý cải thiện CV vì người đọc là nhà tuyển dụng. CV được tải bằng token phiên và hiển thị ngay
trong trang, không mở tab mới và không có nút tải riêng. Nếu trình duyệt có trình xem PDF
(`navigator.pdfViewerEnabled`), tệp nằm trong `iframe` nên **giữ được khung của trình duyệt** — chuyển
trang, phóng to, in và lưu. Nơi không có trình xem (Chrome headless, trình duyệt nhúng), **pdf.js render
thành các canvas** để CV không bao giờ là ô trống. Khi triển khai cần cả hai đường nạp: nginx trả `.mjs`
với `application/javascript`, CSP cho phép `worker-src 'self' blob:` và `frame-src 'self' blob:`. Bấm avatar hoặc tên ứng
viên, ở bảng hay kanban, mở hồ sơ công khai `/candidates/:id` (không có PII).

| Bề mặt | Route web | Endpoint app-svc |
|---|---|---|
| Bảng ứng viên | `/recruiter/candidates` | `GET /api/applications/job/{jobId}`; `PUT /api/applications/{id}/status` |
| Gửi email | hộp thoại trên bảng và trang hồ sơ | `POST /api/applications/{id}/email` |
| Mẫu email | `/recruiter/email-templates` | `GET/POST /api/email-templates`; `PUT/DELETE /api/email-templates/{id}` |
| Đặt lịch phỏng vấn | hộp thoại trên bảng và trang hồ sơ | `POST /api/interviews` |
| Lịch phỏng vấn | `/recruiter/interviews`, `/interviews` | `GET /api/interviews`; `PUT /api/interviews/{id}`; `POST /api/interviews/{id}/cancel`; `GET /api/interviews/{id}/ics` |
| Chuông thông báo | mọi khung đã đăng nhập | Tổng hợp `GET /api/applications/me`, `GET /api/applications/job/{id}` và `GET /api/interviews`; mốc mở gần nhất lưu theo tài khoản trong `localStorage` |

Mỗi buổi phỏng vấn lưu ảnh chụp tên tin, công ty, ứng viên và nhà tuyển dụng, nên lịch và tệp `.ics`
không phụ thuộc vào thay đổi sau đó. Thư mời luôn kèm tệp `.ics`, nên lịch không có nút tải riêng.
Thao tác CV trên bảng mở trang hồ sơ, nơi CV hiển thị tại chỗ (xem ở trên); trình xem trong trang cũng
thay thế cách mở tab mới trước đây. Thư mời đi qua endpoint nội bộ `POST /api/internal/email` của
notif-svc với tệp `text/calendar` theo RFC 5545; lỗi gửi mail không làm mất buổi phỏng vấn đã lưu và API
trả `inviteSent`. Mẫu email dùng được `{{candidate_name}}`, `{{job_title}}`, `{{recruiter_name}}` và được
thay ở server. Mẫu là riêng của từng nhà tuyển dụng.

## 6. Khoảng trống đã biết

1. **Route hồ sơ ứng tuyển không có chính sách Recruiter ở gateway.** Route `apps` chỉ yêu cầu `Authenticated`, nên mọi người dùng đã đăng nhập đều qua được gateway. Việc thực thi cho hành động chỉ dành cho nhà tuyển dụng chỉ nằm ở app-svc. Tài liệu ghi nhận khoảng trống này. Gateway không được thay đổi trong công việc này.
2. **Đăng tin dùng endpoint Recruiter, không dùng endpoint admin.** Form web phải gọi `POST /api/jobs`. Không được gọi `POST /api/admin/jobs` (được `AdminJobForm` dùng).
3. **Chưa có kiểm thử với backend thật.** Công việc web được xác minh bằng lời gọi API giả lập trong Playwright.

## 7. Kiểm chứng

Mỗi PR triển khai phải vượt qua `npx tsc -b`, `npm run build`, và bộ e2e Playwright với số worker giảm, không có lỗi mới so với baseline đã ghi. Lint không chạy được trong môi trường hiện tại (chưa cài eslint).
