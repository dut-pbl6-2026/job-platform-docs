# Triển khai demo theo nhu cầu (Azure)

> **Trạng thái:** Nháp · **Bản gương:** [`on-demand-deploy.md`](on-demand-deploy.md)
> **Chủ sở hữu:** `job-platform-infra` (`scripts/stack.sh`, `terraform/`)
> **Runbook:** `job-platform-infra/docs/azure-on-demand.md`

## 1. Vì sao stack không chạy 24/7

Đây là dự án học tập dùng credit **Azure for Students** (3 tài khoản × $100, không gộp). SRS (Phần 9)
đã giả định một VM **bật khi test/demo rồi deallocate**. Chạy liên tục sẽ đốt hết credit trong vài
tuần mà giữa các buổi không mang lại giá trị gì.

| Trạng thái | Thành phần chạy | Chi phí |
|---|---|---|
| Bật (`stack.sh up`) | 1 VM `Standard_B2s_v2` + toàn bộ compose (Postgres, Redis, Elasticsearch, Kafka, 9 service, Caddy) | ~$0.09/giờ |
| Tắt (`stack.sh down`, mặc định) | không có gì; chỉ còn đĩa OS + IP công khai tĩnh | ~$5–8 + ~$3.6 mỗi tháng |

Dữ liệu (database, tệp CV, chứng chỉ Caddy) nằm trên đĩa VM, nên một chu kỳ tắt/bật vẫn giữ nguyên
bản demo. Xoá dữ liệu là hành động riêng, có xác nhận (`stack.sh destroy`).

## 2. Công cụ

| Công cụ | Cài bởi | Dùng cho |
|---|---|---|
| `az` (Azure CLI) | hệ thống / Microsoft | start/deallocate VM, auto-shutdown |
| `terraform` 1.9.8 | `mise install` (ghim phiên bản) | tạo/xoá VM, mạng, IP, lịch tắt |
| `cloudflared` | `mise install` | edge bằng tunnel (tuỳ chọn, chưa nối vào compose) |
| `gh` | `mise install` | đọc tag image trên GHCR |
| Docker + compose | hệ thống | build image cục bộ, hoặc chạy compose trên host bất kỳ |

`scripts/preflight.sh` kiểm tra tất cả (chỉ đọc) và in cách sửa từng mục thiếu. Cloudflare là tuỳ
chọn: chỉ cần bản ghi `A`, quản lý bằng `scripts/cloudflare-dns.sh` với token `Zone:DNS:Edit`.
Không dùng wrangler (Workers/Pages).

## 3. Triển khai lần đầu

```bash
az login
scripts/preflight.sh

# Tạo RG, VNet/NSG, IP tĩnh + DNS label, VM (Docker qua cloud-init), lịch tự tắt hằng đêm.
# Ghi envs/azure.local, sinh envs/.env.prod, cập nhật DNS, rồi deallocate VM.
scripts/stack.sh bootstrap --domain demo.example.com

scripts/stack.sh up     # boot, pull, migrate, health, smoke công khai
scripts/stack.sh        # trạng thái: power, URL, tag image, chi phí
```

`bootstrap` hỏi xác nhận (vì tạo tài nguyên tính tiền). Thêm `--admin-cidr <ip>/32` để giới hạn SSH
thay vì tự dò IP công khai hiện tại.

`prod-env.sh` sinh toàn bộ secret ngay trên máy (khoá ký RSA, mật khẩu từng role Postgres, token nội
bộ) và không in ra. Placeholder còn sót sẽ chặn deploy, nên stack không thể khởi động với mật khẩu
mẫu. SMTP không có thông tin thật vẫn khởi động nhưng không gửi được mail; script cảnh báo rõ.

## 4. Mỗi buổi demo

```bash
scripts/stack.sh up        # ~3–5 phút
scripts/stack.sh down      # deallocate, dữ liệu giữ nguyên
```

| Tiện ích | Tác dụng |
|---|---|
| `mise run stack-up` / `stack-down` / `stack-status` | các lệnh tương đương |
| `stack.sh up --hours 4` | đặt tự tắt hằng ngày sau 4 giờ (buổi demo dài) |
| `stack.sh down --clean` | dừng container trước rồi deallocate (không bao giờ xoá volume) |
| `stack.sh logs gateway` | theo dõi log một service qua SSH |
| `stack.sh url` | in URL công khai |
| `stack.sh destroy` | xoá VM, đĩa, IP và dữ liệu (phải gõ tên resource group) |

Lịch tự tắt hằng đêm (mặc định 22:00 giờ Việt Nam) là lưới an toàn khi quên `down`.

## 4.1 Email (SMTP) qua gcloud

`auth-svc` và `notif-svc` gửi mail xác minh, mail cho nhà tuyển dụng và thư mời phỏng vấn qua SMTP.
Hộp thư demo là Gmail nên thông tin đăng nhập là **App Password của Google**: Google chỉ hiện một
lần và `gcloud` không tạo được, nhưng có thể lưu trong Secret Manager để mật khẩu không vào git hay
lịch sử shell.

```bash
scripts/gcloud-smtp.sh guide                                  # các bước tạo App Password (thủ công, cần 2-Step Verification)
scripts/gcloud-smtp.sh bootstrap --enable-api --user you@gmail.com --from you@gmail.com
scripts/gcloud-smtp.sh pull                                   # ghi SMTP_* vào envs/.env.prod
scripts/gcloud-smtp.sh test --to you@gmail.com                # đăng nhập và gửi thử một mail
```

`prod-env.sh --smtp-gcloud` gọi luôn bước pull khi sinh file env; `check` chỉ đọc (tài khoản, project,
API/secret có tồn tại, env còn thông tin demo hay không). Gmail dùng `smtp.gmail.com:587` với STARTTLS
(`SMTP_SSL=true`), và `SMTP_FROM` phải bằng `SMTP_USER` vì Gmail ghi đè header From. Cổng 465 không
được cấu hình MailKit hiện tại hỗ trợ. Không có thông tin đăng nhập thì stack vẫn khởi động, mỗi lần
gửi sẽ log lỗi; stack không từ chối boot.

## 5. Image và phiên bản

Mỗi repo publish image với kiểu tag riêng (`<sha>`, `sha-<ngắn>`, `<sha>-type-raw`), nên **không có
một tag chung cho cả stack**. `scripts/pin-images.sh` đọc phiên bản mới nhất có tag của từng package
trên GHCR và ghi `AUTH_TAG … WEB_TAG` vào `envs/.env.prod`; compose ưu tiên các khoá này hơn
`IMAGE_TAG`. `stack.sh up` chạy script đó tự động và không bao giờ ghim `latest`, nên hai lần `up`
không có image mới sẽ chạy đúng bản cũ.

## 6. Edge công khai

Caddy là container duy nhất mở cổng (80 cho ACME/chuyển hướng, 443 TLS/HSTS). Hostname có bản ghi
`A` trỏ tới IP **tĩnh** của VM; Caddy lấy và gia hạn chứng chỉ Let's Encrypt trong volume
`caddy_data`.

Bản ghi đang đi qua Cloudflare (bật proxy) với SSL/TLS **Full (strict)**. Caddy tin các dải IP của
Cloudflare và đọc `CF-Connecting-IP`, nên gateway và auth-svc vẫn giới hạn theo IP thật của người
dùng thay vì một IP edge; nhớ cập nhật danh sách CIDR khi Cloudflare thay đổi. Chế độ Flexible sẽ
lặp vô hạn vì Caddy chuyển hướng HTTPS. DNS-only cũng dùng được nếu muốn TLS trực tiếp.

## 7. Chốt an toàn

- `deploy.sh` từ chối tag `latest` và mọi giá trị placeholder.
- `destroy` buộc gõ tên resource group; mọi lệnh khác đều có thể đảo ngược.
- `--dry-run` có ở cả `stack.sh` và `deploy.sh`.
- `job-platform-infra` không có CI/CD: không có gì tự bật VM hay tiêu credit khi push.
- Không bao giờ chạy `docker compose down -v` trên VM: sẽ mất dữ liệu demo và chứng chỉ.
