# Quy ước API: Đặt tên, Cấu trúc, Phân trang, Enum

> **Phiên bản:** 1.0 (2026-11-05) · **Trạng thái:** Bắt buộc áp dụng · **Bản tiếng Anh:** [`api-conventions.md`](api-conventions.md)
> **Áp dụng cho:** mọi hợp đồng REST đi qua ranh giới service: client (web, mobile) → gateway → service, và service → service qua HTTP.
> **Liên quan:** SRS §7 (Yêu cầu giao diện bên ngoài), §8 (Kiến trúc hệ thống, *API-first OpenAPI 3*), Phụ lục D.1 (Tóm tắt điểm cuối API).

## 1. Vì sao cần tài liệu này

Đợt review chéo các repo (2026-11-05) phát hiện web client, các bảng trong SRS và các service đã triển khai không thống nhất với nhau về đường dẫn (`/api/profile` so với `/api/profiles`), kiểu chữ tên field (`company_name` so với `companyName`), gốc phân trang (0 so với 1), envelope và giá trị enum (`Full-time` so với `FullTime`). Web client âm thầm chuyển sang dữ liệu mock mỗi khi lệch, nên không lỗi nào lộ ra khi kiểm thử.

Tài liệu này chốt **một** quy ước cho mọi repo. SRS quy định *có những* endpoint nào. Tài liệu này quy định chúng được *đặt tên và định dạng ra sao*. Khi hai bên mâu thuẫn về tên hoặc cấu trúc, **tài liệu này được ưu tiên** và dòng tương ứng trong SRS phải được sửa.

## 2. Đường dẫn URL

| Quy tắc | Ví dụ |
|:--------|:------|
| Tiền tố `/api/`, sau đó là tài nguyên dạng **danh từ số nhiều**, chữ thường, kebab-case | `/api/profiles`, `/api/applications`, `/api/job-alerts` |
| Tập con cũng dùng số nhiều | `/api/profiles/experiences`, `/api/profiles/educations` |
| Người dùng hiện tại là `me` | `/api/profiles/me`, `/api/applications/me` |
| Định danh trên đường dẫn là UUID | `/api/jobs/{id}` |
| Hành động thay đổi trạng thái không phải CRUD dùng `POST` vào tài nguyên con mang tên động từ, **mỗi hành động một endpoint** | `POST /api/admin/jobs/{id}/approve`, `POST /api/admin/jobs/{id}/reject` |
| Lọc danh sách dùng query parameter, không thêm đoạn đường dẫn | `GET /api/admin/jobs?status=Pending`, không dùng `/api/admin/jobs/pending` |

Không bao giờ mã hoá quyết định vào body của một hành động mang tên khác (ví dụ `POST /approve` với `{ "approved": false }`). Mỗi hành động một endpoint giúp nhìn rõ tác động trong log, trong policy của gateway và trong code gọi nó.

## 3. Tên field JSON

| Quy tắc | Ví dụ |
|:--------|:------|
| **camelCase** trong mọi body JSON của request và response | `fullName`, `salaryMin`, `createdAt` |
| Từ viết tắt được viết như một từ | `cvUrl`, `userId`, `jobId` (không dùng `CVUrl`, `userID`) |
| Boolean bắt đầu bằng `is` / `has` | `isActive`, `isCurrent` |
| Khoá ngoại kết thúc bằng `Id` | `companyId`, `categoryId`, `recruiterId` |

**.NET:** giữ mặc định của ASP.NET Core (`JsonSerializerDefaults.Web`). **Không** gắn `[JsonPropertyName("snake_case")]` lên DTO của API.

**Không bao giờ trả thẳng model lưu trữ.** Document Elasticsearch và entity EF giữ tên riêng của chúng (field Elasticsearch và cột PostgreSQL dùng snake_case, điều này đúng *cho tầng lưu trữ*). Endpoint phải map sang DTO. Đổi tên field lưu trữ để sửa tên trên API sẽ buộc phải reindex hoặc migration, nên hãy map thay vì đổi tên.

### 3.1 Tham chiếu tới tài nguyên khác

Response có tham chiếu tới tài nguyên khác trả về id **và** một object lồng nhỏ:

```json
{
  "id": "6f1c…",
  "title": "Backend Developer",
  "companyId": "a12b…",
  "company": { "id": "a12b…", "name": "FPT Software" },
  "categoryId": "c34d…",
  "category": { "id": "c34d…", "name": "IT" }
}
```

Trong giai đoạn chuyển đổi, các field phẳng cũ (`companyName`, `categoryName`) được giữ song song với object lồng (§9). `categoryName` trên `GET /api/jobs/{id}` phải giữ cho tới khi `ai-svc` thôi đọc field này.

### 3.2 Giá trị

| Loại | Định dạng | Ví dụ |
|:-----|:----------|:------|
| Thời điểm | ISO-8601, UTC, có `Z` | `"2026-11-05T08:30:00Z"` |
| Ngày không có giờ | `YYYY-MM-DD` | `"2001-04-17"` (`dateOfBirth`, `startDate`) |
| Định danh | chuỗi UUID | `"6f1c2d3e-…"` |
| Tiền | số + mã tiền tệ ISO-4217 ở field bên cạnh | `"salaryMin": 15000000, "salaryCurrency": "VND"` |
| Enum | chuỗi, giá trị theo §6 | `"employmentType": "FullTime"` |

## 4. Query parameter

| Quy tắc | Ví dụ |
|:--------|:------|
| camelCase | `minSalary`, `maxSalary`, `employmentType`, `experienceLevel`, `isActive` |
| Tìm kiếm tự do dùng `q` | `GET /api/search/jobs?q=dotnet`, `GET /api/admin/users?q=lan@` |
| Bộ lọc nhiều giá trị phân tách bằng dấu phẩy. Các giá trị của **cùng một** tham số kết hợp theo OR, các tham số khác nhau kết hợp theo AND | `employmentType=FullTime,PartTime&location=Hà Nội` |
| Kỹ năng nhận `skillOp=or` (mặc định) hoặc `skillOp=and` | `skills=C#,SQL&skillOp=and` |
| Bộ lọc trỏ tới tài nguyên khác nhận **id** của tài nguyên đó | `category=<UUID của danh mục>` |
| Sắp xếp dùng `sortBy` với danh sách token cố định | `relevance` (mặc định), `created_at_desc`, `created_at_asc`, `salary_desc`, `salary_asc` |

Token sắp xếp là giá trị, không phải tên field. Chúng giữ nguyên cách viết hiện tại để client đang chạy không bị vỡ.

## 5. Phân trang

**Request:** `page` (đếm từ 0, mặc định `0`) và `size` (mặc định `20`, `1 ≤ size ≤ 100`). Đây chính là quy tắc đã ghi trong SRS SEARCH-01-04.

**Response:** mọi service luôn trả đúng envelope này:

```json
{ "items": [ … ], "total": 137, "page": 0, "size": 20, "totalPages": 7 }
```

- `page` trong response là đúng chỉ số (đếm từ 0) mà client đã gửi.
- `totalPages` luôn có mặt (`ceil(total / size)`, tối thiểu `1`).
- Không dùng envelope khác (`{ data, pagination }`, `{ content, totalElements }`, mảng trần) cho danh sách phân trang.
- Kiểu dùng chung nằm trong `job-platform-shared` (`PaginatedResponse<T>`) để các service không tự định nghĩa lại.

## 6. Giá trị enum

Enum được truyền dưới dạng **chuỗi PascalCase** đúng như bảng dưới. Service đọc input **không phân biệt hoa thường** và luôn **trả ra** cách viết chuẩn. Nhãn hiển thị (tiếng Việt) là việc của client và không bao giờ gửi lên API.

| Enum | Giá trị (chuẩn) | Nhãn tiếng Việt (client) |
|:-----|:----------------|:-------------------------|
| `EmploymentType` | `FullTime`, `PartTime`, `Contract`, `Internship` | Toàn thời gian, Bán thời gian, Hợp đồng, Thực tập |
| `ExperienceLevel` | `Entry`, `Mid`, `Senior`, `Lead` | Mới vào nghề, Trung cấp, Senior, Lead |
| `JobStatus` | `Pending`, `Active`, `Closed`, `Rejected`, `Deleted` | Chờ duyệt, Đang tuyển, Đã đóng, Bị từ chối, Đã xoá |
| `ApplicationStatus` | `Pending`, `Reviewed`, `Shortlisted`, `Accepted`, `Rejected` | Chờ xem, Đã xem, Vào vòng sau, Nhận việc, Không đậu |
| `Role` | `User`, `Recruiter`, `Admin` | Ứng viên, Nhà tuyển dụng, Quản trị viên |

Endpoint công khai không bao giờ trả về `Deleted`.

**Thêm một giá trị:** thêm vào service sở hữu trước (job-svc cho enum của tin tuyển dụng, app-svc cho trạng thái ứng tuyển), sau đó cập nhật bảng này, cuối cùng mới tới client. Client không bao giờ được đưa ra giá trị lọc mà service sở hữu không lưu được.

**Quyết định còn mở:** SRS ADV-01-04/05 còn liệt kê `Freelance` và `Junior`. job-svc không hỗ trợ hai giá trị này. Cho tới khi nhóm quyết định bổ sung vào job-svc, chúng **không** phải giá trị hợp lệ.

## 7. Lỗi

- Lỗi dùng RFC 7807 Problem Details: `{ "type", "title", "status", "detail" }`. Lỗi validation bổ sung `"errors": { "<tênField>": ["thông báo"] }` với tên field **camelCase**, khớp với body của request.
- Xác nhận thành công đơn giản có thể trả `{ "message": "…" }` (như trong các bảng SRS).
- Nội dung lỗi dành cho người đọc. Client rẽ nhánh theo `status` và, nếu có, theo field `code` cố định, không bao giờ theo nội dung `detail`.

## 8. Ngoại lệ đã thống nhất

Những chỗ dưới đây lệch quy ước có chủ đích và được giữ nguyên:

| Ở đâu | Ngoại lệ | Lý do |
|:------|:---------|:------|
| Field của form multipart (`POST /api/applications`, `POST /api/ai/score-resume`) | snake_case: `job_id`, `cover_letter`, `cv_file`, `lang` | Hợp đồng sẵn có, dùng chung giữa hai service. Giữ các endpoint multipart nhất quán với nhau. |
| JSON của `ai-svc` (Python/FastAPI) | snake_case cho toàn bộ service (`overall_score`, `top_matches`, …) | Quy ước của Python, mỗi service một kiểu. Client tự map tại ranh giới. |
| Token sắp xếp | `created_at_desc`, `salary_asc`, … | Là giá trị, không phải tên field (§4). |
| Tầng lưu trữ (cột PostgreSQL, field Elasticsearch) | snake_case | Chỉ dùng cho lưu trữ, không bao giờ trả thẳng ra API (§3). |
| WebSocket `?token=` | JWT trên query string | Trình duyệt không cho đặt header khi mở WebSocket. Sẽ thay bằng ticket ngắn hạn khi triển khai WS. |

Event Kafka **không** phải ngoại lệ: chúng dùng record C# dùng chung trong `job-platform-shared` (`SharedKernel/Events`), serialize thành JSON camelCase (`KafkaJson`).

## 9. Thay đổi một hợp đồng đang có

1. **Bổ sung trước.** Thêm field, endpoint hoặc giá trị mới bên cạnh cái cũ. Không bao giờ đổi tên tại chỗ.
2. **Đánh dấu deprecated.** Ghi cái cũ là deprecated trong Swagger và ở §10 của tài liệu này, kèm tên thay thế.
3. **Thông báo** cho người phụ trách web và mobile. Cả hai client phải chuyển xong trước khi xoá.
4. **Xoá** sau ít nhất một sprint và chỉ khi cả hai client không còn dùng.
5. Mọi PR thêm hoặc sửa endpoint đều phải đi qua checklist dưới đây.

**Checklist review cho PR có endpoint**

- [ ] Đường dẫn theo §2 (danh từ số nhiều, `me`, mỗi hành động một endpoint)
- [ ] Body của request và response là DTO camelCase, không phải model lưu trữ (§3)
- [ ] Query parameter camelCase, ngữ nghĩa nhiều giá trị theo §4
- [ ] Danh sách phân trang dùng envelope §5 với `page` đếm từ 0
- [ ] Giá trị enum theo §6, đọc không phân biệt hoa thường
- [ ] Gateway có route và đúng policy (SRS §3.7.3)
- [ ] Sửa dòng SRS cả bản EN **và** VI trong cùng PR

## 10. Các điểm lệch đã biết (tính đến 2026-11-05)

Những phần triển khai **chưa** theo tài liệu này. Client xử lý từng điểm tại ranh giới cho tới khi được sửa. Xoá dòng khi bản sửa đã merge.

| # | Ở đâu | Điểm lệch | Cách sửa (repo phụ trách) |
|:--|:------|:----------|:--------------------------|
| D1 | search-svc `GET /api/search/jobs` | Trả thẳng document Elasticsearch: snake_case (`company_name`, `salary_min`, `currency`, `created_at`), company/category dạng phẳng | search-svc: thêm `JobSearchItemDto` camelCase có `company`/`category` lồng nhau và map sang |
| D2 | job-svc `GET /api/jobs/{id}` | `companyName`/`categoryName` dạng phẳng, không có object lồng | job-svc: thêm object `company`/`category`, giữ `categoryName` cho ai-svc |
| D3 | app-svc `GET /api/applications/me`, `/job/{jobId}` | `page` đếm từ 1, thiếu `totalPages` | app-svc: dùng `PaginatedResponse<T>` chung, đếm từ 0 |
| D4 | auth-svc `GET /api/admin/users` | `{ data, pagination{ page, pageSize, totalItems, totalPages } }`, đếm từ 1, tham số tìm kiếm là `search` | auth-svc: envelope §5, đếm từ 0, nhận `q` (giữ `search` làm alias deprecated) |
| D5 | job-svc `GET /api/admin/jobs` | `page` đếm từ 1 | job-svc: đếm từ 0 |
| D6 | app-svc `GET /api/applications/{id}/allowed-transitions`, `/status-flow` | snake_case (`current_status`, `allowed_transitions`, `all_statuses`) | app-svc: DTO camelCase |
| D7 | Response ứng tuyển của app-svc | `status` trả chữ thường (`"pending"`) | app-svc: trả giá trị chuẩn `Pending` (ưu tiên thấp, client đã tự chuẩn hoá) |
| D8 | Bộ lọc của search-svc | CSV của `employmentType`/`experienceLevel` bị so khớp như một giá trị. Không hỗ trợ `skillOp` (luôn OR) | search-svc: tách CSV thành terms query, thêm `skillOp` |
| D9 | Đồng bộ search-svc / job-svc | `created_at` trong Elasticsearch bị ghi đè mỗi lần có `job.updated` | shared + job-svc + search-svc: đưa `CreatedAt` vào event và payload đồng bộ |
| D10 | Lỗi của app-svc | 401/403/409 trả `{ message }` thay vì Problem Details | app-svc (ưu tiên thấp) |

**Đã đặc tả nhưng chưa triển khai** (là tính năng còn thiếu, không phải điểm lệch): `GET /api/search/skills`, `GET /api/search/locations`, facet tìm kiếm, đổi vai trò người dùng ở trang quản trị, `POST /api/admin/categories`, thông báo trong ứng dụng (`/api/notifications`, đăng ký thiết bị, trạng thái đã đọc), WebSocket `/ws/notifications`, chat AI (`/api/ai/chat`, `/api/ai/session*`). Client phải hiển thị các tính năng này là chưa khả dụng và không được giả lập ngoài mock khi phát triển.
