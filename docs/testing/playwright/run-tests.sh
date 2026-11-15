#!/usr/bin/env bash
# Chạy Playwright E2E. Yêu cầu: stack dev (job-platform-infra) + profile-svc :5005 + web đang chạy.
#   WEB_URL=http://localhost:3000 ./run-tests.sh      (mặc định http://localhost:5173)
set -euo pipefail
cd "$(dirname "$0")"
INFRA="${INFRA_DIR:-../../../../job-platform-infra}"

echo "▶ auth-svc: SMTP→MailHog và reset rate-limit (bộ đếm nằm trong RAM)"
docker compose -f "$INFRA/docker-compose.yml" -f docker-compose.smtp.override.yml up -d --no-deps --no-build auth >/dev/null
docker restart job-platform-auth >/dev/null
for _ in $(seq 1 30); do curl -sf localhost:5001/health >/dev/null && break; sleep 2; done
curl -sf localhost:5001/health >/dev/null || { echo "auth-svc không healthy"; exit 1; }
curl -sf localhost:5000/health >/dev/null || { echo "gateway chưa chạy ở :5000"; exit 1; }
curl -sf localhost:5005/health >/dev/null || { echo "profile-svc chưa chạy ở :5005"; exit 1; }
curl -sf localhost:8025/api/v2/messages?limit=1 >/dev/null || { echo "MailHog chưa chạy ở :8025"; exit 1; }

[ -d node_modules ] || npm ci
npx playwright install chromium >/dev/null
npx playwright test "$@"
echo "Báo cáo HTML: npx playwright show-report   |   JUnit: reports/junit.xml"
