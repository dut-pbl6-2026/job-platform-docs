# Đặc tả kỹ thuật — Chấm điểm CV (SCORE-01)

> Ngôn ngữ: Tiếng Việt · English: [resume-scoring.md](resume-scoring.md) (bản EN là bản đầy đủ, chi tiết nhất)
> Trạng thái: **v1 — đã triển khai; số đo thực tế ở `job-platform-ai-svc/eval/REPORT.md`.** Thay thế bản "Hybrid" viết nhanh trước đó. Nếu khác `srs/vi/5-nice-to-have-fr.vi.md` mục 5.3 thì tài liệu này được ưu tiên (xem mục 11).
> Phụ trách: TM2 (AI) · Service: `job-platform-ai-svc` · Cổng `6000` · Gateway `/api/ai/*`

## 1. Mục tiêu

Với một CV (PDF hoặc DOCX, **có text hoặc dạng ảnh scan**) và một tin tuyển dụng trong `job-svc`, trả về **điểm phù hợp 0–100** kèm phân tích giải thích được (kỹ năng, ngữ nghĩa, kinh nghiệm, học vấn) và gợi ý cải thiện.

### 1.1 Ràng buộc cứng

| # | Ràng buộc | Hệ quả |
|---|---|---|
| C1 | **Không gọi API AI/LLM của bên thứ ba** (giảng viên: "gọi API quá dễ"). | Mọi mô hình chạy trong container, là mô hình mở, tải lúc build, không tải lúc chạy. |
| C2 | Chạy được **trên prod**, giảng viên tự kiểm thử. | Lõi tất định, không phụ thuộc dịch vụ ngoài khi xử lý yêu cầu, lỗi rõ ràng, có health, warm-up. |
| C3 | Chỉ CPU (một VM Azure dùng chung). | ONNX nhỏ, giới hạn đồng thời, giới hạn số trang OCR. |
| C4 | CV là dữ liệu cá nhân. | Không ghi log, không lưu nội dung CV; chỉ cache kết quả điểm 24 giờ. |

### 1.2 Ngoài phạm vi v1
Chatbot (spec riêng), NER tự huấn luyện, mô hình xếp hạng học máy, gợi ý do LLM sinh, lưu lịch sử điểm (`GET/DELETE /score-resume/{id}` của SRS để sau), định dạng `.doc`.

### 1.3 Tiêu chí thành công (đo thật, báo cáo trung thực — xem mục 8)

| Chỉ số | Mục tiêu |
|---|---|
| Đọc được 300 CV ngẫu nhiên | ≥ 98 % có text (kể cả đường OCR) |
| Spearman ρ so với nhãn đồng thuận (JD giữ lại) | ≥ 0,60 (kèm khoảng tin cậy bootstrap 95 %) |
| AUC phân biệt "phù hợp" (nhãn ≥ 3) | ≥ 0,85 |
| Bản lai tốt hơn từng tín hiệu riêng lẻ (ablation) | có; nếu không thì báo cáo là không |
| Bộ kiểm thử độ bền (mục 8.5) | đạt 100 % |
| Độ trễ 2 vCPU | PDF text p95 < 3 s; PDF scan 1 trang p95 < 10 s |
| Số lần gọi API AI bên thứ ba | 0 |

Đây là mục tiêu, không phải cam kết: báo cáo đánh giá nêu số đo thực tế kể cả khi chưa đạt.

## 2. Kiến trúc

Client → Gateway (JWT) → `ai-svc` (FastAPI :6000): (1) kiểm tra file → (2) đọc: text-layer / OCR / DOCX → (3) lọc chữ ẩn, chuẩn hóa, tách mục → (4) trích xuất kỹ năng, số năm, bằng cấp từ CV và JD → (5) độ tương đồng ngữ nghĩa bằng embedding ONNX chạy local → (6) chấm điểm, giải thích, gợi ý → (7) cache Redis (khóa `sha256(cv)+job_id+ruleset`). `ai-svc` gọi `job-svc` `GET /api/jobs/{id}` để lấy nội dung job. Redis là tùy chọn: mất Redis thì dùng LRU trong bộ nhớ, dịch vụ vẫn khỏe.

## 3. Đọc file (mọi trường hợp)

Bộ mẫu `~/cv-local-sample` (8.905 PDF) đã được thăm dò: **300/300 file lấy mẫu không có lớp text** (là ảnh từng trang). Vì vậy OCR là đường chính.

| Trường hợp | Nhận biết | Xử lý |
|---|---|---|
| PDF có text | ≥ 40 ký tự/trang | PyMuPDF, sắp xếp theo thứ tự đọc |
| PDF ảnh/scan | < 40 ký tự/trang | Render 200 DPI → Tesseract (`eng+vie`, `--psm 3`) |
| Hỗn hợp | quyết định **theo từng trang** | mỗi trang đi đường riêng |
| DOCX | magic `PK` + `word/document.xml` | `python-docx` (đoạn + bảng); bỏ header/footer, bỏ run ẩn/chữ trắng |
| `.doc` cũ, loại khác | đuôi/magic | `415` kèm hướng dẫn |
| PDF mã hóa | `needs_pass` | `422 cv_encrypted` |
| File hỏng | mở lỗi | `422 cv_unreadable` |
| Không có text sau OCR | < 80 ký tự | `422 cv_no_text` |
| Quá lớn (> 5 MB) / quá nhiều trang (> 5) | kích thước/số trang | `413`; trang thừa bị bỏ kèm cảnh báo |
| Trang xoay | Tesseract OSD khi độ tin cậy thấp | tự xoay, thử lại 1 lần |
| Nhiều cột | — | đường text: sắp theo khối; OCR: `psm 3` |
| Không giống CV | không có mục CV và < 2 kỹ năng | vẫn xử lý, cảnh báo `not_cv_like`, giới hạn điểm ≤ 40 |
| Ngôn ngữ | bộ nhận diện ký tự/từ dừng | `en`, `vi`, `mixed`; chuẩn hóa NFC, bỏ dấu khi so khớp |

**Chống nhồi chữ ẩn (chỉ với lớp text):** loại span nếu (a) màu chữ gần màu nền **ước lượng từ điểm ảnh thực tế dưới span** (không giả định nền trắng); (b) cỡ chữ < 3 pt; (c) nằm ngoài trang; (d) bị hình khối vẽ sau che hoàn toàn. Số ký tự bị loại được báo trong `warnings`.

## 4. Hiểu nội dung

1. **Chuẩn hóa:** NFC, gộp khoảng trắng, nối từ bị ngắt dòng; giữ bản gốc để hiển thị, bản thường + bỏ dấu để so khớp.
2. **Tách mục:** từ điển tiêu đề EN+VI (kỹ năng, kinh nghiệm, học vấn, mục tiêu…).
3. **Kỹ năng:** từ điển `data/skills.yaml` (tên chuẩn, alias EN/VI, nhóm), khớp theo ranh giới token (xử lý `C#`, `C++`, `.NET`, `Node.js`, `ReactJS/React.js/React`); lưu câu chứa kỹ năng làm *bằng chứng*.
4. **Phủ định:** kỹ năng bị coi là phủ định khi **cùng câu** có từ phủ định trong 4 token phía trước (VI: *không, chưa, chưa từng, hạn chế, ghét*, không phân biệt dấu; EN: *no, not, without, never, lack of, limited*), có danh sách ngoại lệ ("không chỉ X mà còn Y"). Kỹ năng được tính là có nếu **tồn tại ít nhất một lần xuất hiện không bị phủ định**.
5. **Số năm kinh nghiệm:** câu khẳng định (`N năm`, `N years`) và hợp các khoảng thời gian trong mục kinh nghiệm (không đếm trùng).
6. **Học vấn:** `none < diploma < bachelor < master < phd` (có từ khóa VI: cao đẳng, đại học, cử nhân, kỹ sư, thạc sĩ, tiến sĩ).
7. **Yêu cầu của job:** lấy từ `title`, `requirements`, `description`, `experience_level`, `category`; kỹ năng bắt buộc trong `requirements`; "ưu tiên/lợi thế/preferred" là nice-to-have; số năm yêu cầu từ văn bản hoặc ánh xạ từ `experience_level`.

## 5. Ngữ nghĩa (mô hình local)

`paraphrase-multilingual-MiniLM-L12-v2` lượng tử hóa ONNX qua `fastembed` (không cần PyTorch, **235 MB**, nạp ~2 giây). Mới chỉ đánh giá mô hình này (mô hình đa ngôn ngữ lớn hơn là việc tương lai); đo thực tế: câu cùng nghĩa VI↔EN có cosine 0,79–0,94, không liên quan ≈ 0,0–0,1. CV được **chia đoạn** (câu/gạch đầu dòng) vì mô hình cắt ở ~128 token. `semantic` = trung bình, trên các dòng yêu cầu của JD, của cosine lớn nhất với các đoạn CV; cộng `title_fit`. Cosine thô được **hiệu chuẩn** tuyến tính về 0–1 (`lo` = trung vị của cặp yếu/không liên quan, `hi` = phân vị 90 của cặp tốt/mạnh), **riêng cho cặp cùng ngôn ngữ và khác ngôn ngữ** (job VI × CV EN) vì cosine khác ngôn ngữ thấp hơn hẳn. Embedding của job được cache theo `(job_id, updated_at)`.

## 6. Chấm điểm

```
mục yêu cầu = nhóm lựa chọn thay thế ("Django hoặc Flask") + kỹ năng bắt buộc đơn + kỹ năng ưu tiên
   trọng số: bắt buộc 1,0 · ưu tiên 0,4 · ×0,3 với kỹ năng chung (giao tiếp, lãnh đạo, MS Office...)
skills     = Σ w·[có ít nhất một thành viên của mục] / Σ w
semantic   = calibrated(0,7·mức_phủ_yêu_cầu + 0,3·title_fit)
relevance  = max(semantic, skills)
experience = min(năm_CV / năm_yêu_cầu, 1) · relevance      (bỏ qua nếu tin không nêu số năm)
education  = {1,0 nếu đủ bậc; 0,5 nếu thấp hơn một bậc; 0} · relevance   (bỏ qua nếu không nêu)
overall    = 100 · Σ W_k·score_k / Σ W_k   trên các thành phần áp dụng được
```

Kinh nghiệm và học vấn chỉ có nghĩa trong đúng lĩnh vực nên được nhân với `relevance`; thành phần không áp dụng bị loại và trọng số được chuẩn hóa lại (tránh cho mọi CV điểm miễn phí). 

Trọng số `W` và hiệu chuẩn được **học** trên các JD huấn luyện (tối đa hóa tương quan Pearson với nhãn 0–4, không âm, tổng bằng 1, có điều chuẩn nhẹ về giá trị tiên nghiệm), lưu trong `data/model_params.json`; kết quả hiện tại: kỹ năng 0,481 · ngữ nghĩa 0,433 · kinh nghiệm 0,087 · học vấn 0 (học vấn không có giá trị dự đoán trên dữ liệu mẫu, vẫn hiển thị để giải thích). Nếu JD không có kỹ năng trích được thì bỏ thành phần đó. Giới hạn: `not_cv_like` ≤ 40; không khớp kỹ năng bắt buộc *không chung chung* nào ≤ 60. Mức: ≥ 75 Mạnh, 55–74 Tốt, 35–54 Một phần, < 35 Yếu. Cấu trúc phản hồi JSON như bản EN (mục 6.1): `overall_score`, `band`, `breakdown{skills, semantic, experience, education}`, `suggestions`, `warnings`, `meta`. Gợi ý sinh theo mẫu từ các khoảng trống đã tính, theo ngôn ngữ của CV; đoạn trích bằng chứng ≤ 160 ký tự và đã xóa email/số điện thoại.

## 7. API

| Endpoint | Xác thực | Mô tả |
|---|---|---|
| `POST /api/ai/score-resume` | token chấm điểm của app-svc, hoặc người dùng có vai trò `Recruiter`/`Admin` | multipart `cv_file` (PDF/DOCX ≤ 5 MB), `job_id` (UUID) |
| `GET /api/ai/health`, `GET /health` | không | trạng thái, mô hình đã nạp, OCR có sẵn |

Lỗi: `400`, `403 forbidden` (người dùng không có vai trò `Recruiter` hoặc `Admin`), `404 job_not_found`, `413`, `415`, `422 cv_encrypted|cv_unreadable|cv_no_text`, `429` (10 yêu cầu/phút/người dùng), `503 job_service_unavailable|busy`. OCR đồng thời bị giới hạn bằng semaphore (`OCR_CONCURRENCY`, mặc định 2).

Điểm phù hợp **chỉ dành cho Nhà tuyển dụng/Quản trị viên**. `POST /api/ai/score-resume` chấp nhận token chấm điểm của app-svc (`AI_SCORING_SERVICE_TOKEN`, dùng cho điểm tự động theo từng hồ sơ) hoặc danh tính người dùng có vai trò `Recruiter` hoặc `Admin`. Mọi danh tính người dùng khác, kể cả ứng viên (vai trò `User` hoặc không có vai trò), nhận `403 forbidden`, nên ứng viên không thể lấy điểm. Điểm tự động theo từng hồ sơ cũng chỉ nhà tuyển dụng và quản trị viên thấy.

## 8. Quy trình đánh giá

* **Dữ liệu:** CV từ `~/cv-local-sample` (tiếng Anh, dạng ảnh); tên thư mục **không** được tin làm nhãn (đã kiểm chứng: `Testing/165.pdf` là CV y tá). 24 JD tự viết (16 EN, 8 VI, IT và ngoài IT, nhiều cấp độ) trong `eval/jobs.json`. Mỗi JD ghép 10 CV (một số liên quan, một số lân cận, một số không liên quan) = 240 cặp. Chia theo JD: 16 huấn luyện (học trọng số, hiệu chuẩn) + 8 giữ lại (để báo cáo).
* **Nhãn:** hai người chấm độc lập (hai phiên Claude riêng trên hai mô hình khác nhau — A: Opus, B: Sonnet — mù lẫn nhau, mù kết quả hệ thống và tên thư mục), thang 0–4 theo `eval/RUBRIC.md`. Nhãn đồng thuận = trung bình. **Hạn chế (nêu rõ trong báo cáo):** nhãn do LLM tạo, không phải nhà tuyển dụng; báo cáo độ đồng thuận giữa hai người chấm (κ có trọng số, Spearman); nên có ≥ 20 cặp được thành viên nhóm kiểm tra thủ công trước khi bảo vệ.
* **Chỉ số:** Spearman (+CI bootstrap), Kendall τ, AUC, NDCG@5, MAE, tỉ lệ đọc được, độ trễ.
* **Ablation:** chỉ từ khóa · chỉ embedding · TF-IDF · bản đầy đủ · không xử lý phủ định · không lọc chữ ẩn.
* **Bộ kiểm thử độ bền:** nhồi chữ trắng/chữ nhỏ/ngoài trang; phủ định EN/VI/không dấu; "không chỉ X mà còn Y"; file rỗng/hỏng/mã hóa/chỉ ảnh/xoay/6 trang/quá lớn/sai loại; CV tiếng Việt với JD tiếng Anh và ngược lại; cache; yêu cầu đồng thời.

## 9. Triển khai

Image `python:3.12-slim` + `tesseract-ocr` (eng, vie); mô hình ONNX tải **lúc build** (`HF_HUB_OFFLINE=1` khi chạy); chạy user không phải root. Cấu hình qua biến môi trường: `PORT`, `JOB_SERVICE_URL`, `JWT_METADATA_ADDRESS`, `REDIS_URL` (tùy chọn), `OCR_CONCURRENCY`, `MAX_UPLOAD_BYTES`, `MAX_PAGES`, `RATE_LIMIT_PER_MIN`, `LOG_LEVEL`, cùng các bearer nội bộ `AI_SCORING_SERVICE_TOKEN` và `AI_INTERNAL_TOKEN_FOR_SEARCH`. Thêm service `ai` vào `job-platform-infra/docker-compose.yml` (giới hạn 1 GB RAM, có healthcheck, warm-up khi khởi động; repo chưa có compose prod, khi tạo thì thêm cùng khối này). Xác thực: JWT RS256 đối chiếu JWKS của auth-svc; `JWT_METADATA_ADDRESS` (URL discovery của auth-svc) bắt buộc để khởi động và HS256 bị từ chối; `JWT_ISSUER`/`JWT_AUDIENCE` mặc định `job-platform`. Chỉ trong dev mới tin header `X-User-Id` (`DEV_AUTH_ENABLED=true`, môi trường Development và `JWT_METADATA_ADDRESS` chưa đặt). Gateway: route `/api/ai/{**catch-all}` → cluster `ai` (`GATEWAY_UPSTREAM_AI`), yêu cầu xác thực, cho phép body ≥ 6 MB. Lưu ý: `GET /api/jobs/{id}` của `job-svc` tăng `ViewCount`; `ai-svc` cache nội dung job 10 phút để không làm sai lệch, nên bổ sung endpoint nội bộ đọc không tăng lượt xem.

## 10. Giao diện web (M4)

Không có trang chấm điểm dành cho ứng viên: điểm phù hợp chỉ dành cho Nhà tuyển dụng/Quản trị viên, và trang chấm điểm CV dành cho ứng viên trong web client đã bị gỡ ngày 2026-11-16. Nhà tuyển dụng thấy điểm tự động theo từng hồ sơ trên danh sách ứng viên và chi tiết ứng tuyển (backlog B11). Việc quản lý route web thuộc `job-platform-web/README.md`.

## 11. Khác biệt so với SRS và bản nháp trước

Không dùng LLM bên ngoài (ràng buộc C1); trọng số **học từ dữ liệu** thay vì cố định 60/40; kỹ năng bắt buộc **tự trích từ JD** thay vì nhà tuyển dụng nhập; không lưu lịch sử điểm (giảm dữ liệu cá nhân); kiểm tra chữ ẩn theo nền thực tế; phủ định theo câu và không phân biệt dấu; embedding theo đoạn; bỏ tuyên bố ">85 %" và thay bằng số đo thật.

## 12. Cột mốc

| ID | Hoàn thành khi |
|---|---|
| M1 | `ai-svc` chạy local; đọc text/scan/DOCX; chấm được CV với job; test đơn vị xanh |
| M2 | Có tập nhãn + script đánh giá; trọng số đã học; báo cáo `eval/REPORT.md` |
| M3 | Docker image; compose + gateway; chạy qua gateway; bộ độ bền xanh; đã đo độ trễ |
| M4 | Yêu cầu chấm điểm của Nhà tuyển dụng/Quản trị viên chạy end-to-end với stack local; không có trang chấm điểm dành cho ứng viên |

## 13. Rủi ro

OCR chậm trên VM dùng chung (giới hạn trang, semaphore, cache, warm-up); từ điển kỹ năng chưa phủ nghề ngoài IT (tín hiệu ngữ nghĩa bù, từ điển mở rộng được); nhãn do LLM có thể thiên lệch (hai người chấm mù, báo cáo độ đồng thuận, kiểm tra thủ công); trọng số quá khớp 16 JD (ràng buộc không âm, báo cáo trên tập giữ lại, CI bootstrap); chấm điểm ứng viên là việc nhạy cảm (điểm chỉ mang tính tham khảo, hiển thị đầy đủ bằng chứng, không tự động quyết định).
