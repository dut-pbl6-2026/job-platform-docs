# On-demand demo deployment (Azure)

> **Status:** Draft · **Mirror:** [`on-demand-deploy.vi.md`](on-demand-deploy.vi.md)
> **Owner:** `job-platform-infra` (`scripts/stack.sh`, `terraform/`)
> **Runbook:** `job-platform-infra/docs/azure-on-demand.md`

## 1. Why the stack is not always on

This is a learning project on **Azure for Students** credit (3 accounts × $100, not pooled). The SRS
(Part 9) already assumes one VM that is **started for tests and demos, then deallocated**. Keeping it
running 24/7 would consume a student credit in a few weeks and provide no value between sessions.

| State | What runs | Cost |
|---|---|---|
| On (`stack.sh up`) | 1 × `Standard_B2s_v2` VM + full compose stack (Postgres, Redis, Elasticsearch, Kafka, 9 services, Caddy) | ~$0.09/h |
| Off (`stack.sh down`, default) | nothing; OS disk + static public IP remain | ~$5–8 + ~$3.6 per month |

Data (databases, CV files, Caddy certificate) lives on the VM disk, so an off/on cycle keeps the same
demo. Removing it is a separate, explicit action (`stack.sh destroy`).

## 2. Tools

| Tool | Installed by | Used for |
|---|---|---|
| `az` (Azure CLI) | system / Microsoft | VM start/deallocate, auto-shutdown |
| `terraform` 1.9.8 | `mise install` (pinned) | create/delete the VM, network, IP, schedule |
| `cloudflared` | `mise install` | optional tunnel edge (not wired into compose) |
| `gh` | `mise install` | read GHCR image tags |
| Docker + compose | system | build images locally, or run compose on any host |

`scripts/preflight.sh` checks all of them read-only and prints how to fix each missing item. Cloudflare
is optional: only an `A` record is needed, managed with `scripts/cloudflare-dns.sh` and a
`Zone:DNS:Edit` token. wrangler (Workers/Pages) is not used.

## 3. First deployment

```bash
az login
scripts/preflight.sh

# Creates RG, VNet/NSG, static IP + DNS label, VM (Docker via cloud-init), nightly auto-shutdown.
# Writes envs/azure.local, generates envs/.env.prod, upserts DNS, then deallocates the VM.
scripts/stack.sh bootstrap --domain demo.example.com

scripts/stack.sh up     # boot, pull, migrate, health, public smoke
scripts/stack.sh        # status: state, URL, image tags, cost
```

`bootstrap` asks for a confirmation (it creates billable resources). Pass `--admin-cidr <ip>/32` to
restrict SSH instead of detecting the current public IP.

`prod-env.sh` generates every secret locally (RSA signing key, Postgres role passwords, internal
tokens) and never prints them. A placeholder that survives blocks deploy, so the stack cannot start
with an example password. SMTP without real credentials starts but sends nothing; the script warns.

## 4. Every demo, afterwards

```bash
scripts/stack.sh up        # ~3–5 minutes
scripts/stack.sh down      # deallocate, data stays
```

| Convenience | Effect |
|---|---|
| `mise run stack-up` / `stack-down` / `stack-status` | same commands |
| `stack.sh up --hours 4` | daily auto-shutdown four hours from now (long demo) |
| `stack.sh down --clean` | stop the containers first, then deallocate (volumes never removed) |
| `stack.sh logs gateway` | follow one service's logs over SSH |
| `stack.sh url` | print the public URL |
| `stack.sh destroy` | delete VM, disk, IP and data (asks for the resource group name) |

A nightly auto-shutdown (22:00 Vietnam by default) is the safety net for a forgotten `down`.

## 4.1 Email (SMTP) through gcloud

`auth-svc` and `notif-svc` send verification mail, recruiter email and interview invites over SMTP.
The demo mailbox is Gmail, so the credential is a **Google App Password**: Google shows it once and
`gcloud` cannot create it, but it can keep it in Secret Manager so it never reaches git or a shell
history.

```bash
scripts/gcloud-smtp.sh guide                                  # App Password steps (manual, 2-Step Verification)
scripts/gcloud-smtp.sh bootstrap --enable-api --user you@gmail.com --from you@gmail.com
scripts/gcloud-smtp.sh pull                                   # writes SMTP_* into envs/.env.prod
scripts/gcloud-smtp.sh test --to you@gmail.com                # logs in and sends one message
```

`prod-env.sh --smtp-gcloud` chains the pull while generating the env file, and `check` is read-only
(account, project, API/secret presence, whether the env still holds demo credentials). Gmail uses
`smtp.gmail.com:587` with STARTTLS (`SMTP_SSL=true`), and `SMTP_FROM` must equal `SMTP_USER` because
Gmail rewrites the From header. Port 465 is not supported by the current MailKit setup. Without
credentials the stack starts and logs a send failure per message; it does not refuse to boot.

## 5. Images and versions

Each repository publishes its own image with its own tag shape (`<sha>`, `sha-<short>`,
`<sha>-type-raw`), so **one tag does not exist for the whole stack**. `scripts/pin-images.sh` reads
the newest tagged version of every package from GHCR and writes `AUTH_TAG … WEB_TAG` into
`envs/.env.prod`; compose gives those keys precedence over `IMAGE_TAG`. `stack.sh up` runs it
automatically and never pins `latest`, so two `up` runs without new images restart the same build.

## 6. Public edge

Caddy is the only published container (80 for ACME/redirect, 443 TLS/HSTS). The hostname has an `A`
record pointing at the VM's **static** IP; Caddy obtains and renews the Let's Encrypt certificate in
the `caddy_data` volume.

The record is proxied through Cloudflare (orange cloud) with SSL/TLS mode **Full (strict)**. Caddy
trusts Cloudflare's published ranges and reads `CF-Connecting-IP`, so the gateway and auth-svc
rate-limit the real client rather than one edge IP; refresh that CIDR list when it changes. Flexible
mode loops on Caddy's HTTPS redirect. DNS-only also works if direct TLS is preferred.

## 7. Guardrails

- `deploy.sh` refuses `latest` and any placeholder value.
- `destroy` requires typing the resource group; every other command is reversible.
- `--dry-run` exists on `stack.sh` and `deploy.sh`.
- There is no CI/CD in `job-platform-infra`: nothing starts the VM or spends credit on a push.
- Never `docker compose down -v` on the VM: it would delete the demo data and the certificate.
