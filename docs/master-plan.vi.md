# KẾ HOẠCH TỔNG THỂ - NỀN TẢNG VIỆC LÀM VIỆT NAM

[English](master-plan.md) | [Tiếng Việt](master-plan.vi.md)

## Kiến trúc Microservices với .NET + Monorepo

---

## 1. PHẠM VI DỰ ÁN - PHÂN LOẠI ƯU TIÊN

### 1.1. BẮT BUỘC PHẢI CÓ
*Những tính năng này PHẢI hoạt động ỔN ĐỊNH 100% để đạt yêu cầu dự án*

| Thành phần | Mô tả | Lý do |
|:---|:---|:---|
| Dịch vụ Xác thực | Đăng ký, đăng nhập, JWT, phân quyền cơ bản theo vai trò (Người dùng/Nhà tuyển dụng) | Hệ thống không thể sử dụng nếu thiếu xác thực |
| Dịch vụ Tin tuyển dụng | Thao tác CRUD cho tin tuyển dụng, quản lý danh mục | Chức năng kinh doanh cốt lõi |
| Dịch vụ Tìm kiếm | Tìm kiếm cơ bản với Elasticsearch (từ khóa, địa điểm) | Người dùng cần tìm việc làm |
| Dịch vụ Ứng tuyển | Ứng tuyển vào việc làm, tải lên CV, xem trạng thái ứng tuyển | Luồng chính cho ứng viên |
| Dịch vụ Hồ sơ | Quản lý hồ sơ người dùng (thông tin cá nhân, kỹ năng) | Người dùng cần có hồ sơ |
| API Gateway | Định tuyến, xác thực JWT cơ bản | Bảo mật và điều phối yêu cầu |
| Cơ sở dữ liệu PostgreSQL | Lưu trữ dữ liệu cho tất cả dịch vụ | Không có lưu trữ dữ liệu nếu thiếu DB |
| Docker Compose | Chạy toàn bộ hệ thống cục bộ | Cần thiết cho phát triển và demo |
| Trình thu thập cơ bản | Thu thập ít nhất 500 tin từ vieclam.gov.vn | Cung cấp dữ liệu cho tìm kiếm và kiểm thử |
| Ứng dụng Web (React) | Màn hình Đăng nhập, Đăng ký, Danh sách việc làm, Chi tiết việc làm, Ứng tuyển | Giao diện web cơ bản |
| Ứng dụng Di động (Flutter) | Màn hình Đăng nhập, Đăng ký, Danh sách việc làm, Chi tiết việc làm, Ứng tuyển | Giao diện di động cơ bản |
| CI/CD cơ bản | Tự động xây dựng và kiểm thử khi đẩy mã | Đảm bảo chất lượng mã |

---

### 1.2. NÊN CÓ
*Nâng cao trải nghiệm người dùng nhưng có thể cắt bỏ nếu thời gian hạn chế*

| Thành phần | Mô tả | Mức độ ưu tiên |
|:---|:---|:---|
| Dịch vụ Thông báo | Gửi email khi ứng tuyển thành công, thay đổi trạng thái | Cao - Trải nghiệm người dùng |
| Redis Cache | Lưu đệm kết quả tìm kiếm, giảm tải cơ sở dữ liệu | Cao - Hiệu năng |
| Kafka Event Bus | Tin tuyển dụng được tạo -> đồng bộ Elasticsearch, gửi thông báo | Cao - Kiến trúc microservices |
| Tìm kiếm Nâng cao | Lọc theo mức lương, kỹ năng, tìm kiếm toàn văn tiếng Việt | Trung bình |
| Lưu trữ Tệp | Tải lên CV, ảnh đại diện (sử dụng Cloudflare R2) | Trung bình |
| Bảng quản trị cơ bản | Quản lý người dùng, phê duyệt tin tuyển dụng | Trung bình - Nhu cầu quản trị |
| Phân quyền chi tiết | Quản trị viên, Nhà tuyển dụng, Người dùng với quyền rõ ràng | Trung bình |
| WebSocket Realtime | Thông báo thời gian thực khi có tin tuyển dụng mới | Trung bình |
| Thông báo đẩy | Thông báo Firebase trên di động | Trung bình |
| Giám sát cơ bản | Kiểm tra sức khỏe, ghi nhật ký tập trung | Trung bình |

---

### 1.3. TỐT NÊN CÓ
*Yếu tố gây ấn tượng - Điểm thưởng nhưng không bắt buộc*

| Thành phần | Mô tả | Mức độ WOW |
|:---|:---|:---|
| Trợ lý AI việc làm (Chatbot) | Chatbot dựa trên RAG tư vấn việc làm, gợi ý CV | Cao nhất |
| Chấm điểm CV thông minh | Đánh giá mức độ phù hợp của CV với yêu cầu công việc | Cao nhất |
| Bot cảnh báo việc làm qua Telegram | Đăng ký nhận thông báo việc làm qua Telegram | Cao |
| Bảng điều khiển phân tích | Thống kê về ứng tuyển, ngành hàng đầu | Trung bình |
| Gợi ý việc làm | Đề xuất công việc dựa trên lịch sử ứng tuyển | Trung bình |
| Đa ngôn ngữ i18n | Hỗ trợ Tiếng Việt + Tiếng Anh | Thấp |
| Tìm kiếm Vector Elasticsearch | Tìm kiếm ngữ nghĩa thay vì chỉ tìm theo từ khóa | Cao |
| Triển khai Kubernetes | Triển khai lên K8s (thay vì chỉ Docker) | Trung bình |
| Chế độ ngoại tuyến trên di động | Xem việc làm đã lưu khi không có Internet | Thấp |
| Chế độ tối | Giao diện tối cho web và di động | Thấp |

---

## 2. KIẾN TRÚC KỸ THUẬT - ĐIỀU CHỈNH CHO .NET Multirepo

### 2.1. Sơ đồ kiến trúc tổng thể

```
[Lớp Client]
    Web React + Vite
    Ứng dụng Flutter Mobile
           |
           v
[Lớp API Gateway]
    YARP Reverse Proxy (.NET)
    - Định tuyến, Giới hạn tốc độ, JWT
           |
           v
[Lớp Microservices (.NET 8/9)]
    Dịch vụ Xác thực (Cổng 5001)
    Dịch vụ Tin tuyển dụng (Cổng 5002)
    Dịch vụ Tìm kiếm (Cổng 5003)
    Dịch vụ Ứng tuyển (Cổng 5004)
    Dịch vụ Hồ sơ (Cổng 5005)
    Dịch vụ Thông báo (Cổng 5006)
           |
           v
[Dịch vụ AI - Python FastAPI] (TỐT NÊN CÓ)
    Trợ lý AI + Chấm điểm CV (Cổng 6000)
           |
           v
[Lớp Dữ liệu]
    PostgreSQL
    Redis Cache
    Elasticsearch
           |
           v
[Sự kiện & Đường ống]
    Kafka
    Trình thu thập Python Scrapy
```

### 2.2. Tổ chức Repository (Đa Repo - Multirepo)

Dự án phải được triển khai trên nhiều repository (kho lưu trữ), có thể phân bố trên nhiều tổ chức (Organization) khác nhau trên GitHub theo đúng yêu cầu của môn học. Mỗi microservice, thư viện dùng chung và ứng dụng client đều có repository riêng để đảm bảo quản lý phiên bản, triển khai và quyền sở hữu độc lập.

Các repository sau đây phải được tạo:

Tên Repository	Mô tả	Công nghệ
job-platform-shared	Shared kernel, DTO và Event Contracts (schema Kafka)	.NET Class Library
job-platform-auth-svc	Dịch vụ Xác thực và Phân quyền	.NET Web API
job-platform-job-svc	Quản lý CRUD Tin tuyển dụng và Danh mục	.NET Web API
job-platform-search-svc	Lập chỉ mục và Truy vấn tìm kiếm Elasticsearch	.NET Web API
job-platform-app-svc	Quản lý Ứng tuyển và CV	.NET Web API
job-platform-profile-svc	Hồ sơ, Kỹ năng, Kinh nghiệm, Giáo dục	.NET Web API
job-platform-notif-svc	Thông báo Email, Push và In-App	.NET Web API
job-platform-gateway	API Gateway (Định tuyến, Xác thực JWT)	.NET Web API (YARP)
job-platform-web	Ứng dụng React Single Page	React + Vite
job-platform-mobile	Ứng dụng Di động đa nền tảng Flutter	Flutter
job-platform-crawler	Trình thu thập dữ liệu Python Scrapy	Python (Scrapy)
job-platform-ai-svc	Trợ lý AI và Chấm điểm CV (Tùy chọn)	Python FastAPI
job-platform-infra	Docker Compose, Kubernetes Manifests, Scripts triển khai	YAML / Shell
Quản lý thư viện dùng chung:
Vì không thể tham chiếu thư mục trực tiếp (../shared/) giữa các repository khác nhau, repository job-platform-shared phải được xây dựng và xuất bản dưới dạng gói NuGet lên một feed riêng tư (ví dụ: GitHub Packages, Azure Artifacts, hoặc NuGet.org). Tất cả các microservice phải tham chiếu gói này thông qua `<PackageReference>` trong file .csproj.

Chiến lược quản lý phiên bản: Mỗi repository tuân theo quy tắc Semantic Versioning (SemVer 2.0). Khi thư viện dùng chung thay đổi, một phiên bản mới được xuất bản và các dịch vụ phụ thuộc sẽ được cập nhật dần dần.
---

## 3. LỘ TRÌNH 16 TUẦN - CHI TIẾT THEO MỨC ĐỘ ƯU TIÊN

### GIAI ĐOẠN 1: NỀN TẢNG CỐT LÕI (Tuần 1-4)
**Mục tiêu:** Hoàn thành 100% các tính năng BẮT BUỘC PHẢI CÓ

---

#### TUẦN 1: THIẾT LẬP & DỊCH VỤ XÁC THỰC (BẮT BUỘC)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | Họp khởi động, thống nhất kiến trúc, tạo kho lưu trữ, thiết lập cấu trúc monorepo, thiết lập Docker Compose với PostgreSQL, Redis, Elasticsearch, Kafka | TM1 (Trưởng nhóm) | Docker chạy thành công |
| Thứ Ba | Thiết lập giải pháp .NET, shared kernel, AuthService với Entity Framework, cấu hình JWT | TM1 | Migration cơ sở dữ liệu thành công |
| Thứ Tư | AuthService: API đăng ký, đăng nhập, kiểm thử đơn vị cho Auth | TM1 | Kiểm thử Postman thành công |
| Thứ Năm | React: Thiết lập Vite, Tailwind, Axios, trang Đăng nhập/Đăng ký | TM3 | Giao diện hiển thị đúng |
| Thứ Sáu | Flutter: Thiết lập dự án, theme, điều hướng, màn hình Đăng nhập/Đăng ký | TM4 | Ứng dụng chạy trên giả lập |
| Thứ Bảy | Tích hợp Auth API với Web + Di động, xem xét mã, sửa lỗi | Tất cả | Luồng đăng nhập hoạt động đầy đủ |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 1:** Người dùng có thể đăng ký và đăng nhập trên cả Web và Di động

---

#### TUẦN 2: DỊCH VỤ TIN TUYỂN DỤNG + DỊCH VỤ TÌM KIẾM (BẮT BUỘC)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | JobService: API CRUD (Tạo, Đọc, Cập nhật, Xóa), Lược đồ cơ sở dữ liệu cho Job, Category | TM2 | Kiểm thử Postman thành công |
| Thứ Ba | SearchService: Cấu hình Elasticsearch, ánh xạ chỉ mục, API tìm kiếm cơ bản (từ khóa, địa điểm) | TM2 | Tìm kiếm trả về kết quả |
| Thứ Tư | Đồng bộ Job vào Elasticsearch (khi tạo/cập nhật), Redis cache cho tìm kiếm | TM1 + TM2 | Cache hoạt động |
| Thứ Năm | React: Trang Danh sách việc làm, Trang Chi tiết việc làm, tích hợp API | TM3 | Hiển thị việc làm |
| Thứ Sáu | Flutter: Màn hình Danh sách việc làm, Chi tiết việc làm, tích hợp API | TM4 | Di động hiển thị việc làm |
| Thứ Bảy | Tích hợp tìm kiếm Web + Di động, sửa lỗi | Tất cả | Tìm kiếm hoạt động |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 2:** Người dùng có thể xem danh sách và chi tiết việc làm, tìm kiếm cơ bản hoạt động

---

#### TUẦN 3: DỊCH VỤ ỨNG TUYỂN + HỒ SƠ (BẮT BUỘC)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | ApplicationService: API Ứng tuyển, tải lên CV (lưu trữ cục bộ), lược đồ cơ sở dữ liệu Application | TM1 | Ứng tuyển thành công |
| Thứ Ba | ProfileService: CRUD hồ sơ người dùng, Thực thể Kỹ năng, Kinh nghiệm | TM2 | Cập nhật hồ sơ thành công |
| Thứ Tư | Luồng trạng thái ứng tuyển (đang chờ -> đã xem xét -> ...), Lịch sử ứng tuyển | TM1 + TM2 | Thay đổi trạng thái hoạt động |
| Thứ Năm | React: Form ứng tuyển, Tải lên CV, Trang hồ sơ, Danh sách lịch sử ứng tuyển | TM3 | Ứng tuyển trên web hoạt động |
| Thứ Sáu | Flutter: Form ứng tuyển, Màn hình hồ sơ, Lịch sử ứng tuyển | TM4 | Ứng tuyển trên di động hoạt động |
| Thứ Bảy | Kiểm thử tích hợp toàn luồng: đăng tin -> tìm kiếm -> ứng tuyển, sửa lỗi | Tất cả | Toàn luồng hoạt động |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 3:** Luồng hoàn chỉnh: Nhà tuyển dụng đăng tin -> Người dùng tìm kiếm -> Ứng tuyển -> Xem trạng thái

---

#### TUẦN 4: API GATEWAY + TRÌNH THU THẬP (BẮT BUỘC)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | Thiết lập YARP API Gateway, định tuyến cho tất cả dịch vụ, middleware xác thực JWT | TM1 | Định tuyến hoạt động |
| Thứ Ba | Trình thu thập: Thiết lập Scrapy, spider cho vieclam.gov.vn, đường ống làm sạch dữ liệu | TM2 | Thu thập 100 tin |
| Thứ Tư | Trình thu thập: Thu thập 500+ tin, xử lý trùng lặp, lưu vào PostgreSQL + Elasticsearch | TM2 | Sẵn sàng 500+ tin |
| Thứ Năm | Web: Gọi API qua Gateway thay vì trực tiếp, cập nhật base URL | TM3 | Web hoạt động qua Gateway |
| Thứ Sáu | Di động: Gọi API qua Gateway, kiểm thử tích hợp cuối cùng | TM4 | Di động hoạt động qua Gateway |
| Thứ Bảy | Kiểm thử toàn hệ thống qua Gateway, sửa lỗi | Tất cả | Luồng qua Gateway thành công |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 4:**
- API Gateway hoạt động với JWT
- 500+ tin từ trình thu thập
- Web + Di động qua Gateway

**KẾT THÚC GIAI ĐOẠN 1: HOÀN THÀNH 100% TÍNH NĂNG BẮT BUỘC PHẢI CÓ**

---

### GIAI ĐOẠN 2: NÂNG CAO TRẢI NGHIỆM (Tuần 5-8)
**Mục tiêu:** Hoàn thành các tính năng NÊN CÓ

---

#### TUẦN 5: THÔNG BÁO + KAFKA EVENT BUS (NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | Thiết lập các topic Kafka (job-events, application-events), cấu hình Producer/Consumer | TM1 | Kết nối Kafka thành công |
| Thứ Ba | NotificationService: Mẫu email, gửi email khi ứng tuyển thành công | TM1 | Nhận được email |
| Thứ Tư | JobService xuất bản sự kiện -> SearchService consumer đồng bộ ES, ApplicationService xuất bản -> NotifService tiêu thụ | TM2 | Tự động đồng bộ hoạt động |
| Thứ Năm | Web: Thông báo trong ứng dụng (toast) khi có tin tuyển dụng mới, cải thiện UI/UX | TM3 | Hiển thị thông báo UI |
| Thứ Sáu | Di động: Thông báo đẩy (Firebase) thiết lập cơ bản, cải thiện UI/UX | TM4 | Nhận thông báo đẩy |
| Thứ Bảy | Kiểm thử luồng hướng sự kiện: đăng tin -> đồng bộ ES -> Thông báo, sửa lỗi | Tất cả | Luồng sự kiện hoạt động |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 5:** Thông báo hoạt động, kiến trúc hướng sự kiện Kafka được triển khai

---

#### TUẦN 6: TÌM KIẾM NÂNG CAO + REDIS CACHE (NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | Elasticsearch: Bộ phân tích tiếng Việt (icu_tokenizer), lọc theo lương, kỹ năng, địa điểm | TM2 | Bộ lọc hoạt động |
| Thứ Ba | Redis: Lưu đệm các tìm kiếm phổ biến với TTL 5 phút, xóa cache khi có tin mới | TM1 | Cache hit hoạt động |
| Thứ Tư | Web: Giao diện tìm kiếm nâng cao với bộ lọc, React Query cho cache | TM3 | Hiển thị bộ lọc UI |
| Thứ Năm | Di động: Tìm kiếm với bộ lọc, cache cục bộ (Hive/SharedPrefs) | TM4 | Bộ lọc trên di động hoạt động |
| Thứ Sáu | Tối ưu hiệu năng tìm kiếm, kiểm chuẩn: thời gian phản hồi < 200ms | TM2 | Hiệu năng OK |
| Thứ Bảy | Kiểm thử tích hợp luồng tìm kiếm, sửa lỗi | Tất cả | Tìm kiếm nâng cao OK |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 6:** Tìm kiếm nâng cao với bộ lọc và cache

---

#### TUẦN 7: BẢNG QUẢN TRỊ + PHÂN QUYỀN THEO VAI TRÒ (NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | Phân quyền chi tiết theo vai trò: Quản trị viên, Nhà tuyển dụng, Người dùng, Ủy quyền dựa trên chính sách trong API | TM1 | Kiểm tra vai trò hoạt động |
| Thứ Ba | API Quản trị: Quản lý người dùng, phê duyệt tin tuyển dụng, thống kê cơ bản | TM2 | API Quản trị hoạt động |
| Thứ Tư | React: Bố cục Bảng điều khiển Quản trị, Trang quản lý người dùng, Trang phê duyệt tin | TM3 | Giao diện Quản trị hoạt động |
| Thứ Năm | React: Thống kê cơ bản (số lượng tin, người dùng, ứng tuyển), Chart.js cho biểu đồ | TM3 | Hiển thị biểu đồ |
| Thứ Sáu | Flutter: Chỉ hiển thị chế độ xem quản trị (không có UI đầy đủ), Điều hướng theo vai trò | TM4 | Phân quyền theo vai trò hoạt động |
| Thứ Bảy | Kiểm thử luồng quản trị, kiểm tra bảo mật (người không phải quản trị không truy cập được), sửa lỗi | Tất cả | Bảo mật OK |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 7:** Bảng quản trị cơ bản, phân quyền theo vai trò hoàn chỉnh

---

#### TUẦN 8: GIÁM SÁT + CI/CD (NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Xác nhận |
|:---|:---|:---|:---|
| Thứ Hai | Kiểm tra sức khỏe cho tất cả dịch vụ, Ghi nhật ký tập trung Serilog | TM1 | Điểm cuối sức khỏe hoạt động |
| Thứ Ba | GitHub Actions CI: Tự động xây dựng, kiểm thử, Tích hợp SonarCloud (tùy chọn) | TM1 | CI thành công |
| Thứ Tư | Cấu hình Docker Compose cho sản phẩm, Script triển khai lên Fly.io/Railway | TM1 | Triển khai hoạt động |
| Thứ Năm | Grafana + Prometheus: Giám sát chỉ số, bảng điều khiển cơ bản | TM2 | Hiển thị chỉ số |
| Thứ Sáu | Web: Tối ưu bản dựng sản phẩm, Biến môi trường | TM3 | Bản dựng sản phẩm hoạt động |
| Thứ Bảy | Di động: Kiểm thử bản dựng phát hành, sửa lỗi | TM4 | Bản dựng phát hành OK |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 8:** CI/CD hoạt động, giám sát cơ bản được thiết lập

**KẾT THÚC GIAI ĐOẠN 2: HOÀN THÀNH 100% TÍNH NĂNG NÊN CÓ**

---

### GIAI ĐOẠN 3: YẾU TỐ WOW (Tuần 9-13)
**Mục tiêu:** Tạo sự khác biệt - TỐT NÊN CÓ (chọn ít nhất 2)

---

#### TUẦN 9-10: TRỢ LÝ AI VIỆC LÀM (CHATBOT) (TỐT NÊN CÓ)

| Tuần | Nhiệm vụ | Người phụ trách | Độ khó |
|:---|:---|:---|:---|
| Tuần 9 | Thiết lập dịch vụ Python FastAPI, Tích hợp API OpenAI/Gemini, LangChain/Semantic Kernel cơ bản | TM2 (chính) + TM1 | 7/10 |
| Tuần 9 | Thiết lập kho vector Elasticsearch, Nhúng mô tả công việc, Đường ống RAG cơ bản | TM2 | 8/10 |
| Tuần 10 | API Chat: POST /api/ai/chat, Phản hồi luồng (Server-Sent Events) | TM2 | 7/10 |
| Tuần 10 | React: Thành phần Chat UI, Quản lý ngữ cảnh cho cuộc trò chuyện | TM3 | 6/10 |
| Tuần 10 | Flutter: Màn hình Chat, Xử lý luồng | TM4 | 7/10 |

**Kết quả Tuần 9-10:** Người dùng có thể trò chuyện với AI về việc làm, nhận gợi ý công việc

---

#### TUẦN 11: CHẤM ĐIỂM CV THÔNG MINH (TỐT NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Độ khó |
|:---|:---|:---|:---|
| Thứ Hai | Phân tích PDF (PyPDF2/PDFPlumber), Trích xuất văn bản CV | TM2 | 5/10 |
| Thứ Ba | So sánh CV với Mô tả công việc (độ tương tự cosine), Trả về điểm số + gợi ý cải thiện | TM2 | 7/10 |
| Thứ Tư | API chấm điểm AI: POST /api/ai/score-resume, Lưu đệm kết quả trong Redis (24h) | TM2 | 6/10 |
| Thứ Năm | Web: Tải CV lên -> xem điểm, Giao diện gợi ý | TM3 | 6/10 |
| Thứ Sáu | Di động: Tải CV lên -> xem điểm, Gợi ý cải thiện | TM4 | 6/10 |
| Thứ Bảy | Kiểm thử tích hợp, tối ưu prompt, sửa lỗi | Tất cả | 5/10 |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 11:** Người dùng tải CV và xem điểm phù hợp với từng công việc

---

#### TUẦN 12: BOT CẢNH BÁO VIỆC LÀM QUA TELEGRAM (TỐT NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Độ khó |
|:---|:---|:---|:---|
| Thứ Hai | Tạo Bot Telegram, lấy token, Thiết lập Webhook | TM1 | 3/10 |
| Thứ Ba | Logic Đăng ký/Hủy đăng ký, Lưu ID Telegram người dùng | TM1 | 4/10 |
| Thứ Tư | Khi có tin mới -> gửi tin nhắn qua Telegram, Định dạng tin nhắn đẹp | TM1 | 4/10 |
| Thứ Năm | Kiểm thử bot với nhóm, sửa lỗi | Tất cả | 3/10 |
| Thứ Sáu-Thứ Bảy | Dành cho kiểm thử tổng thể và sửa lỗi | Tất cả | - |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 12:** Người dùng nhận thông báo việc làm qua Telegram

---

#### TUẦN 13: GỢI Ý VIỆC LÀM + HOÀN THIỆN (TỐT NÊN CÓ)

| Ngày | Nhiệm vụ | Người phụ trách | Độ khó |
|:---|:---|:---|:---|
| Thứ Hai | Công cụ gợi ý dựa trên lịch sử ứng tuyển, Lọc cộng tác đơn giản | TM2 | 6/10 |
| Thứ Ba | API: GET /api/jobs/recommended, Tích hợp cache | TM2 | 5/10 |
| Thứ Tư | Web: Phần gợi ý việc làm, "Có thể bạn quan tâm" | TM3 | 4/10 |
| Thứ Năm | Di động: Phần gợi ý việc làm, Tối ưu UI/UX | TM4 | 4/10 |
| Thứ Sáu-Thứ Bảy | Tổng thể sửa lỗi, Tối ưu hiệu năng, Dọn dẹp mã | Tất cả | - |
| Chủ Nhật | Nghỉ | - | - |

**Kết quả Tuần 13:** Người dùng nhận được gợi ý việc làm cá nhân hóa

---

### GIAI ĐOẠN 4: KIỂM THỬ & TRIỂN KHAI (Tuần 14-16)

---

#### TUẦN 14: KIỂM THỬ HỆ THỐNG (BẮT BUỘC)

| Ngày | Nhiệm vụ | Người phụ trách |
|:---|:---|:---|
| Thứ Hai-Thứ Ba | Kiểm thử tích hợp tất cả dịch vụ, Kiểm thử End-to-End toàn luồng | Tất cả |
| Thứ Tư | Kiểm thử hiệu năng: 100 người dùng đồng thời, Script tải k6 | TM1 + TM2 |
| Thứ Năm | Kiểm thử đa trình duyệt (Chrome, Firefox, Safari) | TM3 |
| Thứ Sáu | Kiểm thử di động (iOS 16+, Android 12+) | TM4 |
| Thứ Bảy | Sửa lỗi ưu tiên (chỉ lỗi nghiêm trọng) | Tất cả |
| Chủ Nhật | Nghỉ | - |

**Kết quả Tuần 14:** Báo cáo kiểm thử, 95% ca kiểm thử thành công

---

#### TUẦN 15: STAGING + KIỂM THỬ NGƯỜI DÙNG

| Ngày | Nhiệm vụ | Người phụ trách |
|:---|:---|:---|
| Thứ Hai-Thứ Ba | Triển khai lên môi trường staging (Fly.io/Railway), Đồng bộ dữ liệu lên staging | TM1 + TM2 |
| Thứ Tư | Mời 5-10 người dùng kiểm thử, Thu thập phản hồi | Tất cả |
| Thứ Năm-Thứ Sáu | Sửa lỗi từ phản hồi, Hoàn thiện UI/UX | Tất cả |
| Thứ Bảy | Sửa lỗi cuối cùng, Đóng băng mã | Tất cả |
| Chủ Nhật | Nghỉ | - |

**Kết quả Tuần 15:** Môi trường staging hoạt động, phản hồi người dùng được thu thập và xử lý

---

#### TUẦN 16: THUYẾT TRÌNH CUỐI CÙNG

| Ngày | Nhiệm vụ | Người phụ trách |
|:---|:---|:---|
| Thứ Hai | Tổng hợp báo cáo cuối cùng | Tất cả |
| Thứ Ba | Chuẩn bị slide thuyết trình, Kịch bản demo | Tất cả |
| Thứ Tư | Quay video demo (5-7 phút), Tính năng WOW phải có trong video | TM3 |
| Thứ Năm | Diễn tập thuyết trình, Hoàn thiện slide | Tất cả |
| Thứ Sáu | **THUYẾT TRÌNH + DEMO CUỐI CÙNG** | Tất cả |
| Thứ Bảy | Nộp báo cáo cuối cùng và mã nguồn | Tất cả |
| Chủ Nhật | Kết thúc dự án | - |

---

## 4. MA TRẬN TRÁCH NHIỆM NHÓM

### TM1 - Trưởng nhóm Backend + DevOps

| Tuần | Nhiệm vụ chính | Độ khó |
|:---|:---|:---|
| 1-4 | AuthService, API Gateway, Docker, thiết lập Kafka | 7/10 |
| 5-8 | NotificationService, CI/CD, Giám sát, Redis cache | 7/10 |
| 9-12 | Bot Telegram, hỗ trợ tích hợp AI API | 6/10 |
| 13-16 | Kiểm thử hiệu năng, Triển khai, Tài liệu | 6/10 |

### TM2 - Chuyên gia Backend + Tìm kiếm + AI

| Tuần | Nhiệm vụ chính | Độ khó |
|:---|:---|:---|
| 1-4 | JobService, SearchService, Trình thu thập | 7/10 |
| 5-8 | Kafka consumer, Tối ưu Elasticsearch, Đường ống dữ liệu | 7/10 |
| 9-12 | Dịch vụ AI, RAG, Chấm điểm CV | 8/10 |
| 13-16 | Kiểm thử, Đồng bộ dữ liệu, Sửa lỗi | 6/10 |

### TM3 - Frontend Web (React)

| Tuần | Nhiệm vụ chính | Độ khó |
|:---|:---|:---|
| 1-4 | Giao diện Xác thực, Danh sách/Chi tiết việc làm, Form ứng tuyển, Hồ sơ | 6/10 |
| 5-8 | Giao diện tìm kiếm nâng cao, Bảng quản trị, Bảng điều khiển | 6/10 |
| 9-12 | Giao diện Chat AI, Giao diện Chấm điểm CV, Gợi ý | 7/10 |
| 13-16 | Hoàn thiện UI/UX, Sửa lỗi, Triển khai | 5/10 |

### TM4 - Di động (Flutter) + QA

| Tuần | Nhiệm vụ chính | Độ khó |
|:---|:---|:---|
| 1-4 | Màn hình Xác thực, Danh sách/Chi tiết việc làm, Ứng tuyển, Hồ sơ | 6/10 |
| 5-8 | Thông báo đẩy, Tìm kiếm nâng cao, Chế độ xem quản trị | 7/10 |
| 9-12 | Màn hình Chat AI, Giao diện Chấm điểm, Gợi ý | 7/10 |
| 13-16 | Kiểm thử di động, Sửa lỗi, Nộp lên App Store | 6/10 |

---

## 5. DANH SÁCH KIỂM TRA CHÍNH - THEO DÕI TIẾN ĐỘ

### BẮT BUỘC PHẢI CÓ (Yêu cầu - cần hoàn thành 100%)

- [ ] Xác thực (Đăng nhập/Đăng ký/JWT)
- [ ] CRUD Tin tuyển dụng
- [ ] Tìm kiếm cơ bản (từ khóa + địa điểm)
- [ ] Ứng tuyển (Ứng tuyển + Tải CV)
- [ ] Dịch vụ Hồ sơ
- [ ] API Gateway (YARP)
- [ ] Cơ sở dữ liệu PostgreSQL
- [ ] Docker Compose cục bộ
- [ ] Trình thu thập (500+ tin)
- [ ] Ứng dụng Web (React) - tất cả màn hình chính
- [ ] Ứng dụng Di động (Flutter) - tất cả màn hình chính
- [ ] CI/CD cơ bản (GitHub Actions)

### NÊN CÓ (Ưu tiên sau BẮT BUỘC)

- [ ] Dịch vụ Thông báo (email)
- [ ] Redis Cache
- [ ] Kafka Event Bus
- [ ] Tìm kiếm Nâng cao (bộ lọc lương, kỹ năng)
- [ ] Lưu trữ Tệp (Cloudflare R2)
- [ ] Bảng quản trị cơ bản
- [ ] Phân quyền chi tiết theo vai trò
- [ ] Thông báo Realtime WebSocket
- [ ] Thông báo đẩy (Firebase)
- [ ] Giám sát (Kiểm tra sức khỏe, ghi nhật ký)

### TỐT NÊN CÓ (Tối đa 3 để tạo yếu tố WOW)

- [ ] Trợ lý AI việc làm (Chatbot)
- [ ] Chấm điểm CV thông minh
- [ ] Bot cảnh báo việc làm qua Telegram
- [ ] Gợi ý việc làm
- [ ] Tìm kiếm Vector Elasticsearch
- [ ] Bảng điều khiển phân tích
- [ ] Chế độ tối

---

## 6. QUẢN LÝ RỦI RO

| Rủi ro | Mức độ nghiêm trọng | Chiến lược giảm thiểu |
|:---|:---|:---|
| Triển khai AI quá khó | Cao | Xây dựng prototype trong tuần 7-8, giảm phạm vi nếu cần (ví dụ: chatbot không RAG) |
| Nhóm thiếu kỹ năng .NET | Trung bình | Dành tuần đầu tiên học .NET Core, lập trình cặp |
| Trình thu thập bị chặn IP | Trung bình | Ưu tiên vieclam.gov.vn (ít hạn chế), sử dụng luân phiên proxy nếu cần |
| Phát triển Flutter quá nặng | Trung bình | Cân nhắc React Native thay thế, hoặc đơn giản hóa tính năng di động |
| Thiếu thời gian | Cao | Cắt bỏ các tính năng TỐT NÊN CÓ, chỉ giữ lại một tính năng WOW |

---

## 7. KHUYẾN NGHỊ CUỐI CÙNG

1. **Ưu tiên sự ổn định:** Tuần 1-4 tập trung vào các tính năng BẮT BUỘC PHẢI CÓ. Không bắt đầu công việc AI cho đến khi xác thực hoạt động.

2. **Chọn một tính năng WOW để xuất sắc:** Khuyến nghị **Trợ lý AI việc làm** vì nó ấn tượng nhất và dễ trình diễn nhất.

3. **Kỷ luật Git:** Cam kết hàng ngày, không đợi đến cuối tuần mới đẩy.

4. **Họp đứng hàng ngày:** 15 phút mỗi sáng - mỗi người đã làm gì, sẽ làm gì, có vướng mắc gì.

5. **Demo sớm, demo thường xuyên:** Cuối mỗi tuần, trình diễn các tính năng đang hoạt động cho toàn nhóm.

---

**Ngày bắt đầu:** 17 tháng 8 năm 2026 (Thứ Hai)
**Ngày kết thúc:** 6 tháng 12 năm 2026 (Chủ Nhật)
**Phiên bản:** 4.0