# Load test k6 — Gateway local (PBL6-67)

Script: `load-test.js`. Kiểm thử tải 100 VU trên các endpoint đọc chính và đăng nhập, qua gateway `http://localhost:5000/api`.

**Phạm vi và giới hạn**
- Chạy trên WSL2, toàn bộ service nằm trong một compose file (`job-platform-infra/docker-compose.yml`). Đây **không phải production** và kết quả **không** đại diện cho Azure hay bất kỳ môi trường deploy nào.
- Script từ chối `BASE_URL` không phải `localhost` / `127.0.0.1`. Không trỏ k6 vào production hoặc Azure.
- Không tạo dữ liệu giả: nếu DB local không có job `Active` nào, `setup()` dừng với thông báo lỗi.

## Cách chạy

Yêu cầu: stack local đang chạy (gateway :5000, search-svc :5003, job-svc :5002, auth-svc :5001). Chạy bằng Docker (không cần cài k6):

```bash
docker run --rm --network host \
  -v "$PWD":/scripts:ro \
  grafana/k6 run --summary-export=/scripts/summary.json /scripts/load-test.js
```

Nếu đã cài k6 (đã kiểm thử với k6 v2.4.0):

```bash
k6 run load-test.js
# Đổi gốc API nếu cần (vẫn phải là localhost):
BASE_URL=http://localhost:5000/api k6 run load-test.js
```

`--network host` là bắt buộc với Docker để `localhost:5000` trỏ về máy host. Thời gian chạy khoảng 3 phút (ramp 30s, giữ 2 phút, ramp-down 10s).

## Kịch bản

Tổng 100 VU = 4 scenario × 25 VU, mỗi scenario gọi một endpoint:

| Scenario | Request | Endpoint thực tế | Ghi chú |
|:--|:--|:--|:--|
| `list` | GET `/api/search/jobs?page=0&size=20` | search-svc | Danh sách job. `job-svc` không có endpoint danh sách công khai (`GET /api/jobs` trả 405), web cũng gọi search-svc. |
| `search` | GET `/api/search/jobs?q=<từ khóa>&page=0&size=20` | search-svc | Từ khóa lấy ngẫu nhiên: react, developer, python, java, frontend. |
| `detail` | GET `/api/jobs/{id}` | job-svc | Id lấy từ kết quả `list` trong `setup()`, chỉ lấy job `Active` (job `Pending` trả 404). |
| `login` | POST `/api/auth/login` | auth-svc | User test đăng ký trong `setup()` bằng `POST /api/auth/register`, role `User`, mật khẩu `Abc12345`. Email duy nhất cho mỗi lần chạy. |

## Tiêu chí đạt (đặt trước khi chạy)

1. **Tỷ lệ đúng status ≥ 95%** cho từng endpoint (metric `checks{endpoint:X}`, mong đợi HTTP 200). Request bị 429 hoặc 5xx đều tính là lỗi.
2. **p95 latency** cho từng endpoint:

| Endpoint | p95 ngưỡng |
|:--|:--|
| list | < 500 ms |
| search | < 800 ms |
| detail | < 300 ms |
| login | < 800 ms |

Ngưỡng p95 bám theo NFR `PERF-01` (p95 < 500 ms) và `PERF-02` (search p95 < 200 ms). Các ngưỡng trên nới lỏng hơn để đo trên WSL2 local; đây không phải chỉ tiêu production.

Lưu ý quan trọng về giới hạn gateway: `Gateway.Api/Program.cs` đặt global rate limit **600 request/phút/IP**. Tất cả VU chạy từ cùng một IP (localhost), nên tải 100 VU vượt giới hạn này. Phần request vượt sẽ nhận 429. Script **không** tắt hay né giới hạn đó (không đổi IP, không giả header). Đây là một phát hiện của bài test, không phải lỗi của script.

## Kết quả lần chạy

Lần chạy: k6 v2.4.0 (image `grafana/k6`), WSL2, stack local, gateway `localhost:5000`, 100 VU, 2 phút 40 giây, 1.439.880 request. Dữ liệu job: 8 job `Active` trong search-svc (không có dữ liệu giả thêm). Exit code k6 = 99 (threshold không đạt).

| Endpoint | Tỷ lệ đúng status (mục tiêu ≥ 95%) | p95 (mọi response, gồm cả 429) | Ngưỡng p95 |
|:--|:--|:--|:--|
| list | **0,19%** (không đạt) | 21,24 ms | < 500 ms (đạt, nhưng không có ý nghĩa, xem dưới) |
| search | **0,17%** (không đạt) | 21,28 ms | < 800 ms (đạt, nhưng không có ý nghĩa, xem dưới) |
| detail | **0,11%** (không đạt) | 21,16 ms | < 300 ms (đạt, nhưng không có ý nghĩa, xem dưới) |
| login | **0,01%** (không đạt) | 20,74 ms | < 800 ms (đạt, nhưng không có ý nghĩa, xem dưới) |

Toàn bộ: 1.438.082 response là **429** (99,87%), chỉ 1.798 response là 200. Tổng số 429 cho thấy gateway global rate limit (600 request/phút/IP) đã chặn gần như toàn bộ tải.

**Cách đọc kết quả này**
- Kết quả **không** đo được độ trễ của backend. Các p95 ở trên gần như chỉ đo thời gian gateway từ chối request. Không dùng các số này để kết luận về PERF-01 hay PERF-02.
- Tiêu chí 95% **không đạt** ở cả bốn endpoint. Đây là kết quả thật của cấu hình hiện tại, không phải lỗi script. Script không tắt rate limit và không đổi IP.
- Để đo độ trễ backend có ý nghĩa, cần một trong các cách sau (chưa thực hiện): hạ tải xuống dưới 10 request/giây tổng (ví dụ `constant-arrival-rate`), hoặc chạy trên môi trường có rate limit tách biệt cho test. Việc nới giới hạn gateway là quyết định của chủ dự án, không làm trong script này.
