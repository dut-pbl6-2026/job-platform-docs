# k6 Load Test — Local Gateway (PBL6-67)

Script: `load-test.js`. A 100-VU load test on the main read endpoints and login, through the gateway at `http://localhost:5000/api`.

**Scope and limits**
- Runs on WSL2; all services are in one compose file (`job-platform-infra/docker-compose.yml`). This is **not production**, and the results do **not** represent Azure or any other deployment environment.
- The script refuses any `BASE_URL` that is not `localhost` / `127.0.0.1`. Do not point k6 at production or Azure.
- No fake data is created: if the local DB has no `Active` job, `setup()` stops with an error message.

## How to run

Requirements: the local stack is running (gateway :5000, search-svc :5003, job-svc :5002, auth-svc :5001). To run with Docker (no k6 install needed):

```bash
docker run --rm --network host \
  -v "$PWD":/scripts:ro \
  grafana/k6 run --summary-export=/scripts/summary.json /scripts/load-test.js
```

If k6 is already installed (tested with k6 v2.4.0):

```bash
k6 run load-test.js
# Đổi gốc API nếu cần (vẫn phải là localhost):
BASE_URL=http://localhost:5000/api k6 run load-test.js
```

`--network host` is required with Docker so that `localhost:5000` points to the host machine. The run takes about 3 minutes (30s ramp, 2 min hold, 10s ramp-down).

## Scenarios

Total 100 VUs = 4 scenarios × 25 VUs; each scenario calls one endpoint:

| Scenario | Request | Actual endpoint | Notes |
|:--|:--|:--|:--|
| `list` | GET `/api/search/jobs?page=0&size=20` | search-svc | Job list. `job-svc` has no public list endpoint (`GET /api/jobs` returns 405); the web app also calls search-svc. |
| `search` | GET `/api/search/jobs?q=<keyword>&page=0&size=20` | search-svc | Keyword picked at random: react, developer, python, java, frontend. |
| `detail` | GET `/api/jobs/{id}` | job-svc | IDs come from the `list` results in `setup()`, only `Active` jobs (a `Pending` job returns 404). |
| `login` | POST `/api/auth/login` | auth-svc | A test user is registered in `setup()` via `POST /api/auth/register`, role `User`, password `Abc12345`. The email is unique for each run. |

## Pass criteria (set before running)

1. **Correct-status rate ≥ 95%** for each endpoint (metric `checks{endpoint:X}`, expecting HTTP 200). Requests that get 429 or 5xx count as failures.
2. **p95 latency** for each endpoint:

| Endpoint | p95 threshold |
|:--|:--|
| list | < 500 ms |
| search | < 800 ms |
| detail | < 300 ms |
| login | < 1000 ms (PERF-01a: 95% within 1000 ms at 25 concurrent logins; the login scenario has 25 VUs) |

The p95 thresholds follow the NFRs `PERF-01` (p95 < 500 ms), `PERF-01a` (login p95 < 1000 ms at 25 concurrent logins) and `PERF-02` (search p95 < 200 ms). There is no SLO for 100 concurrent logins: the script does not assert a p95 for that level. The thresholds above are looser so they can be measured on local WSL2; they are not production targets.

Important note on the gateway limit: `Gateway.Api/Program.cs` sets a global rate limit of **600 requests/minute/IP**. All VUs run from the same IP (localhost), so 100 VUs exceed this limit. The excess requests receive 429. The script does **not** disable or work around that limit (no IP changes, no spoofed headers). This is a finding of the test, not a script bug.

## Run results

Run: k6 v2.4.0 (image `grafana/k6`), WSL2, local stack, gateway `localhost:5000`, 100 VUs, 2 minutes 40 seconds, 1,439,880 requests. Data: 8 `Active` jobs in search-svc (no extra fake data added). k6 exit code = 99 (threshold not met).

| Endpoint | Correct-status rate (target ≥ 95%) | p95 (all responses, including 429) | p95 threshold |
|:--|:--|:--|:--|
| list | **0.19%** (not met) | 21.24 ms | < 500 ms (met, but meaningless, see below) |
| search | **0.17%** (not met) | 21.28 ms | < 800 ms (met, but meaningless, see below) |
| detail | **0.11%** (not met) | 21.16 ms | < 300 ms (met, but meaningless, see below) |
| login | **0.01%** (not met) | 20.74 ms | < 1000 ms (met, but meaningless, see below) |

Overall: 1,438,082 responses were **429** (99.87%); only 1,798 responses were 200. The large number of 429s shows the gateway global rate limit (600 requests/minute/IP) blocked almost all of the load.

**How to read these results**
- The results do **not** measure backend latency. The p95 values above mostly measure how fast the gateway rejects requests. Do not use these numbers to draw conclusions about PERF-01 or PERF-02.
- The 95% criterion is **not met** on all four endpoints. This is the real result of the current configuration, not a script error. The script does not disable the rate limit and does not change the IP.
- To measure backend latency meaningfully, one of the following is needed (not yet done): lower the load to under 10 requests/second in total (for example with `constant-arrival-rate`), or run on an environment whose rate limit is separated for testing. Relaxing the gateway limit is a decision for the project owner and is not done in this script.
