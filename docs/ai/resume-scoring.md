# Resume Scoring — Technical Specification (SCORE-01)

> Language: English · Tiếng Việt: [resume-scoring.vi.md](resume-scoring.vi.md)
> Status: **v1 — implemented; measured results in `job-platform-ai-svc/eval/REPORT.md`.** Supersedes the informal "Hybrid" write-up; where this document and `srs/en/5-nice-to-have-fr.md` §5.3 differ, this document wins (differences listed in §11).
> Owner: TM2 (AI) · Service: `job-platform-ai-svc` · Port `6000` · Gateway prefix `/api/ai/*`

## 1. Goal

Given a candidate CV (PDF or DOCX, text-based **or scanned**) and a job posting stored in `job-svc`, return a **0–100 match score** with an explainable breakdown (skills, semantic fit, experience, education) and actionable suggestions.

### 1.1 Hard constraints (from the course supervisor and the team)

| # | Constraint | Consequence |
|---|---|---|
| C1 | **No third-party AI/LLM API calls** (supervisor: "calling an API is too easy"). | All models run inside our container. Models are open-weight, bundled in the image, downloaded at build time, never fetched at runtime. |
| C2 | The feature must run **on production** and be testable live by the supervisor. | Deterministic core, no external dependency at request time, graceful errors, health endpoint, warm-up on start. |
| C3 | CPU only (single Azure VM, shared with other services). | Small ONNX models, bounded concurrency, page cap on OCR. |
| C4 | Candidate data is PII. | CV text is never logged or persisted; only the score result is cached (24 h). |

### 1.2 Non-goals (v1)

Chatbot/Copilot (separate spec), fine-tuned NER, learned-to-rank model, LLM-generated suggestions, persisted score history (`GET/DELETE /score-resume/{id}` from SRS is deferred), `.doc` legacy format.

### 1.3 Success criteria (measured, reported honestly — see §8)

| Metric | Target | Notes |
|---|---|---|
| Parse success on a 300-CV random sample | ≥ 98 % non-empty text | Includes OCR path |
| Spearman ρ vs. consensus labels (held-out JDs) | ≥ 0.60 | Reported with 95 % bootstrap CI |
| Binary relevance AUC (label ≥ 3) on held-out JDs | ≥ 0.85 | |
| Hybrid beats each single signal (ablation) | yes | Else we report that it does not |
| Robustness suite (§8.5) | 100 % of cases pass | hidden text, negation, empty/corrupt files |
| Latency, 2 vCPU | text PDF p95 < 3 s; 1-page scanned p95 < 10 s | Measured; OCR is the bottleneck |
| Third-party AI calls | 0 | Enforced by an offline run in CI |

Targets are goals, not claims; the evaluation report states the measured values even if they miss.

## 2. Architecture

```
Client ──► Gateway (JWT) ──► ai-svc (FastAPI :6000)
                               │  1 validate upload (size, magic bytes, type)
                               │  2 parse  ──► text-layer │ OCR fallback │ DOCX
                               │  3 sanitize (hidden text) + normalize + sections
                               │  4 extract (skills, years, degree) from CV and JD
                               │  5 semantic similarity (local ONNX embedding)
                               │  6 score + explain + suggestions
                               │  7 cache (Redis, key = sha256(cv)+job_id+ruleset)
                               └──► job-svc  GET /api/jobs/{id}  (job text)
```

Redis is optional: if unavailable the service falls back to an in-process LRU and stays healthy.

## 3. Parsing (all input cases)

The supplied sample set (`~/cv-local-sample`, 8 905 PDFs) was probed: **300/300 sampled PDFs have no text layer** (they are page images). OCR is therefore a first-class path, not an exception.

| Case | Detection | Handling |
|---|---|---|
| Text PDF | text length per page ≥ 40 chars | PyMuPDF span extraction in the file's block order (hidden spans filtered) |
| Scanned / image PDF | text < 40 chars/page | Render 200 DPI → Tesseract (`eng+vie`, `--psm 3`) |
| Mixed (some pages text, some image) | decided **per page** | Each page takes its own path |
| DOCX | magic `PK` + `word/document.xml` | `python-docx` paragraphs + tables; header/footer ignored; hidden runs (`w:vanish`) and white-coloured runs dropped |
| Legacy `.doc`, other types | extension/magic | `415 unsupported_media_type` with guidance |
| Encrypted PDF | `needs_pass` | `422 cv_encrypted` |
| Corrupt / truncated | open fails | `422 cv_unreadable` |
| Empty / no text after OCR | < 80 chars total | `422 cv_no_text` (guidance: upload a clearer file) |
| Too large (> 5 MB) / too many pages (> 5 processed) | size / page count | `413`; extra pages beyond 5 are ignored with a warning |
| Rotated page / landscape | Tesseract OSD (only if OCR confidence low) | auto-rotate, retry once |
| Multi-column layout | — | text path: PyMuPDF block order; OCR path: Tesseract `psm 3` (automatic layout analysis) |
| Not a CV (e.g., random document) | no CV section headers and < 2 skills found | process, but return `warnings:["not_cv_like"]` and cap the score at 40 |
| Language | simple script/stop-word detector | `en`, `vi` or `mixed`; Vietnamese is normalised (NFC, diacritics folded for matching only) |

**Hidden-text defence (text layer only).** For each text span: drop if (a) fill colour is within ΔE ≤ 8 (or RGB distance ≤ 24) of the page background **estimated from the rendered pixels under the span**, not assumed white; (b) font size < 3 pt; (c) outside the page rectangle; (d) fully covered by a filled shape drawn later. Dropped characters are counted and reported as `warnings:["hidden_text_removed:N"]`. This is an anti-stuffing measure, and it makes the CV unparseable for prompt injection (there is no LLM in the loop anyway).

## 4. Understanding the text

1. **Normalise:** Unicode NFC, collapse whitespace, de-hyphenate line breaks; keep original casing for display; a lower-cased, diacritic-folded copy for matching.
2. **Sections:** header lexicon (EN+VI: *skills/kỹ năng, experience/kinh nghiệm, education/học vấn, summary/mục tiêu, projects, certifications*) → `{summary, skills, experience, education, projects, other}`.
3. **Skill extraction:** curated taxonomy `data/skills.yaml` (canonical name, aliases EN/VI, group). Matching on token boundaries over the folded text (handles `C#`, `C++`, `.NET`, `Node.js`, `ReactJS/React.js/React`). Each hit records its sentence as *evidence*.
4. **Negation:** a hit is **negated** when, in the same sentence (split on `.;\n|•`), a negation cue occurs within 4 tokens before the skill (EN: *no, not, without, never, lack of, limited, hate*; "basic" is deliberately *not* a cue; VI: *không, chưa, chưa từng, hạn chế, ghét*; accent-insensitive: *khong, chua*). Cues that do not scope over the skill ("not only X but also Y") are excluded by a small exception list. A skill counts as present if **any** non-negated occurrence exists.
5. **Experience years:** (a) explicit statements `N+ years`, `N năm`; (b) union of date ranges in the experience section (`Jun 2022 – Aug 2023`, `2019–present`) merged to avoid double counting; take the larger plausible value (cap 40).
6. **Education level:** lexicon → `none < diploma < bachelor < master < phd` (EN + VI: *cao đẳng, đại học, cử nhân, kỹ sư, thạc sĩ, tiến sĩ*).
7. **Job requirements** come from `title`, `requirements`, `description`, `experience_level`, `category`: required skills = taxonomy hits in `requirements` (fallback: description); nice-to-have = hits flagged by cues (*preferred, a plus, ưu tiên, lợi thế*); required years from `N years / N năm` or mapped from `experience_level`; required degree from lexicon.

## 5. Semantic similarity (local model)

* Model: `paraphrase-multilingual-MiniLM-L12-v2` quantised ONNX via `fastembed` (no PyTorch; CPU; **235 MB** on disk, ~2 s to load). Only this model was evaluated (larger multilingual models are future work). A multilingual model is needed because JDs on the platform are mostly Vietnamese while CVs may be English: measured cosine VI↔EN same-meaning sentences 0.79–0.94, unrelated ≈ 0.0–0.1.
* The CV is split into **chunks** (sentences/bullets, 64–128 tokens); the model truncates long input, so whole-document embedding is not used.
* JD side: title + each requirement line.
* `semantic = mean over JD lines of max-cosine(JD line, CV chunk)`, plus `title_fit = max-cosine(JD title, CV summary/headline/experience titles)`. Raw cosine is mapped to 0–1 by a **calibrated** linear transform (`lo` = median raw cosine of weak/unrelated training pairs, `hi` = 90th percentile of good/strong pairs), fitted **separately for same-language and cross-language (VI job × EN CV) pairs**, because cross-language cosines are systematically lower and raw MiniLM cosines are compressed.
* Job embeddings are cached per `(job_id, updated_at)`.

## 6. Scoring

```
requirement items = alternative groups ("Django or Flask") + single required skills + nice-to-have skills
   weight: required 1.0 · nice-to-have 0.4 · ×0.3 for generic skills (communication, leadership, MS Office, ...)
skills_score     = Σ w·[any member of item present] / Σ w          (None if the job lists no recognised skills)
semantic_score   = calibrated(0.7·requirement_coverage + 0.3·title_fit)
relevance        = max(semantic_score, skills_score or 0)
experience_score = min(cv_years / required_years, 1) · relevance     (None if the job states no years)
education_score  = {1.0 if level ≥ required, 0.5 if one below, else 0} · relevance   (None if not stated)

overall = 100 · Σ W_k·score_k / Σ W_k        over the components that are not None
```

* Experience and education are *qualification* signals that only mean something inside the job's domain, so they are multiplied by `relevance` (otherwise a nurse with 20 years would earn full experience credit for a Python job).
* Components that do not apply are **excluded and the weights renormalised** (a job without stated years or degree must not hand every CV free points).

* Weights `W` and the calibration are **fitted** on the labelled training jobs (maximise Pearson correlation with the 0–4 consensus label, non-negative, normalised to sum 1, with a small regulariser towards the prior 0.35/0.40/0.15/0.10), not hand-set. They are stored in `data/model_params.json` with the dataset and metrics. Current fit: skills 0.481 · semantic 0.433 · experience 0.087 · education 0.000 (education had no predictive value on the sample; it stays in the breakdown for explanation).
* If the JD has no extractable skills, the skills component is dropped and the others renormalised (reported in `notes`).
* Caps: `not_cv_like` → 40; no *non-generic* required skill present → 60 (a CV matching no real requirement cannot score "good").
* Score bands: ≥ 75 *Strong*, 55–74 *Good*, 35–54 *Partial*, < 35 *Weak*.

### 6.1 Response

```json
{
  "overall_score": 78,
  "band": "Good",
  "breakdown": {
    "skills":     {"score": 85, "matching": ["python","react"], "missing": ["docker"], "negated": [], "extra": ["vue"]},
    "semantic":   {"score": 71, "top_matches": [{"requirement": "...", "cv_excerpt": "...", "similarity": 0.74}]},
    "experience": {"score": 75, "cv_years": 3.5, "required_years": 5},
    "education":  {"score": 100, "cv_level": "bachelor", "required_level": "bachelor"}
  },
  "suggestions": ["Add or evidence Docker ...", "..."],
  "warnings": [],
  "meta": {"parser": "ocr", "pages": 1, "language": "en", "ruleset": "1.0.0", "model": "...", "cached": false, "elapsed_ms": 3120}
}
```

Suggestions are template-based from computed gaps (missing skills, years shortfall, missing section, no quantified achievements), in the CV's language (EN/VI). Evidence excerpts are truncated to 160 chars and contain no contact data (emails/phones are redacted from excerpts).

## 7. API

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/ai/score-resume` | app-svc scoring token, or a user with role `Recruiter`/`Admin` | multipart: `cv_file` (PDF/DOCX ≤ 5 MB), `job_id` (UUID). `200` result above. |
| `GET /api/ai/health` | none | `{status, service:"ai", models_loaded, ocr_available}` (liveness) |
| `GET /health` | none | same, for compose healthchecks |

Errors (RFC 7807 style `{type,title,status,detail,code}`): `400 bad_request` (missing/invalid `job_id`), `403 forbidden` (a user without role `Recruiter` or `Admin`), `404 job_not_found`, `413 file_too_large`, `415 unsupported_media_type`, `422 cv_encrypted | cv_unreadable | cv_no_text`, `429 rate_limited` (default 10 req/min/user, in-memory token bucket), `503 job_service_unavailable`.
Concurrency: a semaphore limits parallel OCR to `OCR_CONCURRENCY` (default 2); excess requests wait up to 30 s then `503 busy`.

A match score is **recruiter/admin-only**. `POST /api/ai/score-resume` accepts either the app-svc scoring token (`AI_SCORING_SERVICE_TOKEN`, used for the automatic per-application score) or a user identity with role `Recruiter` or `Admin`. Any other user identity, including a candidate (role `User` or no role), gets `403 forbidden`, so a candidate cannot obtain a score. The automatic per-application score is likewise visible only to recruiters and admins.

## 8. Evaluation protocol

### 8.1 Data
* **CVs:** `~/cv-local-sample` (8 905 PDFs, 60+ occupation folders, English, scanned). Folder names are **not** trusted as labels (verified: `Testing/165.pdf` is a nurse CV).
* **JDs:** 24 job descriptions written for the evaluation (16 EN, 8 VI; IT and non-IT; varied seniority), kept in `eval/jobs.json` in the `job-svc` field format.
* **Pairs:** 10 CVs per JD (stratified: some from the likely-relevant occupation, some adjacent, some unrelated) = 240 pairs.
* **Split by JD:** 16 train JDs (fit weights / calibration), 8 held-out JDs (report).

### 8.2 Labels
Two independent annotators (separate Claude sessions on different models — A: Opus, B: Sonnet — blind to each other, to the system output and to folder names) grade each pair 0–4 with a written rubric (`eval/RUBRIC.md`): 0 unrelated · 1 weak · 2 partial · 3 good · 4 strong. Consensus = mean of the two; relevance = consensus ≥ 3.
**Limitation (stated in the report):** labels are produced by an LLM, not by recruiters; results measure agreement with an LLM-annotated ground truth and inter-annotator agreement is reported (weighted κ, Spearman) to bound it. A small human spot-check (≥ 20 pairs by a team member) is recommended before the defence.

### 8.3 Metrics
Spearman ρ (+ bootstrap 95 % CI), Kendall τ, AUC for relevance, NDCG@5 per JD, MAE after linear calibration, parse success rate, latency percentiles.

### 8.4 Baselines / ablation
Keyword-only · embedding-only · TF-IDF cosine · hybrid (full) · hybrid without negation handling · hybrid without hidden-text removal.

### 8.5 Robustness suite (automated tests)
Hidden/white-text stuffing (text PDF generated in tests) · tiny-font stuffing · off-page text · negated skills EN/VI/no-diacritics · "not only X but Y" · empty, corrupt, encrypted, image-only, rotated, 6-page, oversize, wrong-type files · Vietnamese CV vs English JD and the reverse · duplicate-submission cache hit · concurrent requests.

## 9. Deployment

* Image: `python:3.12-slim` + `tesseract-ocr tesseract-ocr-eng tesseract-ocr-vie`; Python deps pinned (`uv.lock`); the ONNX model is fetched **at build time** into `/models` (or copied from `./models` if present — `mise run models`) and the runtime is offline (`HF_HUB_OFFLINE=1`); non-root user.
* Auth: `Authorization: Bearer <JWT>` validated as RS256 against auth-svc's JWKS; `JWT_METADATA_ADDRESS` (auth-svc discovery URL) is required to start, and HS256 is refused. `JWT_ISSUER`/`JWT_AUDIENCE` default to `job-platform`. `X-User-Id` is trusted only in local development (`DEV_AUTH_ENABLED=true` AND a Development environment AND `JWT_METADATA_ADDRESS` unset), like the other services' DevAuth. The gateway already enforces authentication on `/api/ai/*`.
* Config (env, no literals in code): `PORT`, `JOB_SERVICE_URL`, `JWT_METADATA_ADDRESS`, `REDIS_URL` (optional), `OCR_CONCURRENCY`, `MAX_UPLOAD_BYTES`, `MAX_PAGES`, `RATE_LIMIT_PER_MIN`, `LOG_LEVEL`, plus the internal bearers `AI_SCORING_SERVICE_TOKEN` and `AI_INTERNAL_TOKEN_FOR_SEARCH`.
* Compose: service `ai` added to `job-platform-infra/docker-compose.yml`, healthchecked, 1 GB memory limit; warm-up runs one embedding on start so the first request is not cold. (A prod compose file is not in the repository yet; add the same service block when it is created.)
* Gateway: routes `/api/ai/{**catch-all}` → cluster `ai` (`GATEWAY_UPSTREAM_AI`), `AuthorizationPolicy: Authenticated`, request body limit ≥ 6 MB.
* Note: `GET /api/jobs/{id}` in `job-svc` increments `ViewCount`; `ai-svc` caches job text for 10 min to avoid inflating it, and a dedicated internal read endpoint is recommended as follow-up.

## 10. Web UI (M4)

There is no candidate-facing score page: a match score is recruiter/admin-only, and the web client's candidate resume-score page was removed on 2026-11-16. Recruiters see the automatic per-application score on the applicant list and the application detail (backlog B11). Web route ownership lives in `job-platform-web/README.md`.

## 11. Differences from the SRS / earlier informal spec

| Topic | SRS 5.3 / informal spec | This spec | Reason |
|---|---|---|---|
| LLM provider | OpenAI/Gemini | none | Supervisor constraint C1 |
| Weights | fixed 60 % AI / 40 % rules | fitted on labelled data | defensible, measured |
| Hard criteria | recruiter types must-have keywords | extracted automatically from the JD (editable later) | less recruiter overhead |
| Score persistence | `GET/DELETE /score-resume/{id}` | none in v1 | PII minimisation |
| Hidden-text check | "colour ≈ white" | background-aware (pixel-sampled), plus size/off-page/covered | fewer false positives |
| Negation | 30-char look-back | sentence-scoped 4-token window, accent-insensitive, exceptions | fewer false zeros |
| Embedding input | whole text | chunked | 128-token truncation |
| Accuracy claim | ">85 %" | measured metrics in §1.3 | unsupported otherwise |

## 12. Milestones

| ID | Done when |
|---|---|
| M1 | `ai-svc` runs locally; parses text/scanned/DOCX; scores one CV against a job JSON; unit tests green |
| M2 | Labelled set + evaluation script; weights fitted; report `eval/REPORT.md` with the metrics of §8 |
| M3 | Docker image; compose + gateway route; works through the gateway; robustness suite green; latency measured |
| M4 | Recruiter/admin score request working end-to-end against the local stack; there is no candidate-facing score page |

## 13. Risks

| Risk | Mitigation |
|---|---|
| OCR latency on a shared 2-vCPU VM | page cap, concurrency semaphore, 200 DPI, result cache, warm-up |
| Taxonomy coverage (non-IT roles) | semantic signal carries the rest; taxonomy extensible (`data/skills.yaml`); coverage reported |
| LLM-generated labels may be biased | two blind annotators, agreement reported, human spot-check |
| Weights overfit 16 JDs | non-negative constrained fit, held-out report, bootstrap CI |
| Scoring people is sensitive | score is advisory; breakdown and evidence shown; no automated decision |
