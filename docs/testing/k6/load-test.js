// PBL6-67: k6 load test cho gateway local (WSL2, một compose file, KHÔNG phải production).
// Chạy: xem README.md cùng thư mục. Script từ chối BASE_URL không phải localhost.
//
// Tổng 100 VU = 4 scenario × 25 VU, mỗi scenario gọi một endpoint:
//   list   GET /api/search/jobs            (danh sách job, do search-svc phục vụ)
//   search GET /api/search/jobs?q=...      (tìm kiếm theo từ khóa)
//   detail GET /api/jobs/{id}              (id lấy từ danh sách Active trong setup)
//   login  POST /api/auth/login            (user test đăng ký trong setup)
//
// Tiêu chí đạt (đặt trước khi chạy, không chỉnh theo kết quả):
//   - >= 95% request trả đúng status (200) → metric checks{endpoint:X}
//   - p95 latency: list < 500ms, search < 800ms, detail < 300ms, login < 1000ms (PERF-01a, 25 concurrent logins)
// Lưu ý: gateway có global rate limit 600 request/phút/IP (Gateway.Api/Program.cs).
// Vượt ngưỡng này sẽ nhận 429; script KHÔNG tắt hay né giới hạn đó. 429 được tính là lỗi.

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:5000/api';
const PASSWORD = 'Abc12345';
const SEARCH_TERMS = ['react', 'developer', 'python', 'java', 'frontend'];
const RAMP = [
  { duration: '30s', target: 25 },
  { duration: '2m', target: 25 },
  { duration: '10s', target: 0 },
];

const responses429 = new Counter('responses_429');

export const options = {
  scenarios: {
    list: { executor: 'ramping-vus', exec: 'listJobs', stages: RAMP, gracefulRampDown: '10s' },
    search: { executor: 'ramping-vus', exec: 'searchJobs', stages: RAMP, gracefulRampDown: '10s' },
    detail: { executor: 'ramping-vus', exec: 'jobDetail', stages: RAMP, gracefulRampDown: '10s' },
    login: { executor: 'ramping-vus', exec: 'login', stages: RAMP, gracefulRampDown: '10s' },
  },
  thresholds: {
    'checks{endpoint:list}': ['rate>=0.95'],
    'checks{endpoint:search}': ['rate>=0.95'],
    'checks{endpoint:detail}': ['rate>=0.95'],
    'checks{endpoint:login}': ['rate>=0.95'],
    'http_req_duration{endpoint:list}': ['p(95)<500'],
    'http_req_duration{endpoint:search}': ['p(95)<800'],
    'http_req_duration{endpoint:detail}': ['p(95)<300'],
    // PERF-01a: 95% of login requests within 1000ms at 25 concurrent logins (this scenario is 25 VU).
    // The 100-concurrent login level has no SLO and is not asserted here.
    'http_req_duration{endpoint:login}': ['p(95)<1000'],
  },
};

export function setup() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(BASE)) {
    throw new Error(`BASE_URL phải là localhost/127.0.0.1, nhận: ${BASE}`);
  }

  // Danh sách job thật từ search-svc. Không tạo dữ liệu giả.
  const list = http.get(`${BASE}/search/jobs?page=0&size=100`, { tags: { endpoint: 'setup' } });
  if (list.status !== 200) throw new Error(`Không lấy được danh sách job: HTTP ${list.status}`);
  const items = (list.json('items') || []).filter((j) => j.status === 'Active');
  const jobIds = items.map((j) => j.id);
  if (jobIds.length === 0) {
    throw new Error('DB local không có job Active nào. Hãy seed dữ liệu trước; script không tự tạo dữ liệu giả.');
  }

  // Một user test duy nhất cho mỗi lần chạy.
  const email = `k6.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  const reg = http.post(
    `${BASE}/auth/register`,
    JSON.stringify({ email, password: PASSWORD, fullName: 'k6 load user', role: 'User' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'setup' } },
  );
  if (reg.status < 200 || reg.status >= 300) {
    throw new Error(`Đăng ký user test thất bại: HTTP ${reg.status} ${reg.body}`);
  }

  return { jobIds, email };
}

function record(res, endpoint) {
  if (res.status === 429) responses429.add(1, { endpoint });
  return check(res, { 'status is 200': (r) => r.status === 200 }, { endpoint });
}

export function listJobs() {
  const res = http.get(`${BASE}/search/jobs?page=0&size=20`, { tags: { endpoint: 'list' } });
  record(res, 'list');
}

export function searchJobs(data) {
  const q = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const res = http.get(`${BASE}/search/jobs?q=${encodeURIComponent(q)}&page=0&size=20`, {
    tags: { endpoint: 'search' },
  });
  record(res, 'search');
}

export function jobDetail(data) {
  const id = data.jobIds[Math.floor(Math.random() * data.jobIds.length)];
  const res = http.get(`${BASE}/jobs/${id}`, { tags: { endpoint: 'detail' } });
  record(res, 'detail');
}

export function login(data) {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: data.email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } },
  );
  record(res, 'login');
}
