# MASTER PLAN - VIETNAM JOB PLATFORM

[English](master-plan.md) | [Tiếng Việt](master-plan.vi.md)

## Microservices Architecture with .NET + Monorepo

---

## 1. PROJECT SCOPE - PRIORITY CLASSIFICATION

### 1.1. MUST HAVE
*These features MUST work STABLY 100% to pass the project*

| Component | Description | Rationale |
|:---|:---|:---|
| Authentication Service | Registration, login, JWT, basic role-based access (User/Recruiter) | System unusable without authentication |
| Job Service | CRUD operations for job postings, category management | Core business functionality |
| Search Service | Basic search with Elasticsearch (keyword, location) | Users need to find jobs |
| Application Service | Apply for jobs, upload CV, view application status | Main user flow for candidates |
| Profile Service | Manage user profiles (personal info, skills) | Users need profiles |
| API Gateway | Routing, basic JWT validation | Security and request orchestration |
| PostgreSQL Database | Data storage for all services | No data persistence without database |
| Docker Compose | Run entire system locally | Development and demo essential |
| Basic Crawler | Crawl at least 500 jobs from vieclam.gov.vn | Provide data for search and testing |
| Web App (React) | Login, Register, Job List, Job Detail, Apply screens | Basic web interface |
| Mobile App (Flutter) | Login, Register, Job List, Job Detail, Apply screens | Basic mobile interface |
| Basic CI/CD | Automated build and test on code push | Code quality assurance |

---

### 1.2. SHOULD HAVE
*Enhance user experience but can be cut if time is limited*

| Component | Description | Priority Level |
|:---|:---|:---|
| Notification Service | Send email on successful application, status changes | High - User experience |
| Redis Cache | Cache search results, reduce database load | High - Performance |
| Kafka Event Bus | Job created -> sync Elasticsearch, send notifications | High - Microservices architecture |
| Advanced Search | Filter by salary, skills, full-text Vietnamese search | Medium |
| File Storage | Upload CV, avatar (use Cloudflare R2) | Medium |
| Basic Admin Panel | Manage users, approve job postings | Medium - Admin needs |
| Detailed Role-Based Access | Admin, Recruiter, User with clear permissions | Medium |
| WebSocket Realtime | Real-time notification when new job posted | Medium |
| Push Notification | Firebase notifications on mobile | Medium |
| Basic Monitoring | Health checks, centralized logging | Medium |

---

### 1.3. NICE TO HAVE
*WOW factors - Bonus points but not mandatory*

| Component | Description | WOW Level |
|:---|:---|:---|
| AI Job Copilot (Chatbot) | RAG-based chatbot for job advice, CV suggestions | Highest |
| Smart Resume Scoring | Score CV match with job requirements | Highest |
| Telegram Job Alert Bot | Subscribe to job notifications via Telegram | High |
| Analytics Dashboard | Statistics on applications, top industries | Medium |
| Job Recommendation | Suggest jobs based on application history | Medium |
| i18n Multi-language | Vietnamese + English support | Low |
| Elasticsearch Vector Search | Semantic search instead of keyword only | High |
| Kubernetes Deployment | Deploy to K8s (instead of just Docker) | Medium |
| Mobile Offline Mode | View saved jobs without internet | Low |
| Dark Mode | Dark theme for web and mobile | Low |

---

## 2. TECHNICAL ARCHITECTURE - ADJUSTED FOR .NET MONOREPO

### 2.1. Overall Architecture Diagram

```
[Client Layer]
    Web React + Vite
    Flutter Mobile App
           |
           v
[API Gateway Layer]
    YARP Reverse Proxy (.NET)
    - Routing, Rate Limit, JWT
           |
           v
[Microservices Layer (.NET 8/9)]
    Auth Service (Port 5001)
    Job Service (Port 5002)
    Search Service (Port 5003)
    Application Service (Port 5004)
    Profile Service (Port 5005)
    Notification Service (Port 5006)
           |
           v
[AI Service - Python FastAPI] (NICE TO HAVE)
    AI Copilot + Resume Scoring (Port 6000)
           |
           v
[Data Layer]
    PostgreSQL
    Redis Cache
    Elasticsearch
           |
           v
[Event & Pipeline]
    Kafka
    Python Scrapy Crawler
```

### 2.2. Monorepo Structure

```
job-platform-monorepo/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Build & test all services
│       └── deploy-staging.yml  # Deploy to staging (SHOULD HAVE)
│
├── src/
│   ├── services/
│   │   ├── AuthService/
│   │   │   ├── AuthService.API/
│   │   │   ├── AuthService.Core/
│   │   │   ├── AuthService.Infrastructure/
│   │   │   └── AuthService.Tests/
│   │   ├── JobService/
│   │   │   └── ... (same structure)
│   │   ├── SearchService/
│   │   ├── ApplicationService/
│   │   ├── ProfileService/
│   │   └── NotificationService/
│   │
│   ├── shared/
│   │   ├── SharedKernel/       # DTOs, common interfaces
│   │   ├── EventContracts/     # Kafka event definitions
│   │   └── Infrastructure/     # Common DB, Redis, Kafka configs
│   │
│   ├── gateway/
│   │   └── ApiGateway/         # YARP Reverse Proxy
│   │
│   └── web/                    # React + Vite
│       ├── src/
│       └── package.json
│
├── mobile/                     # Flutter
│   └── lib/
│
├── crawler/                    # Python Scrapy
│   ├── spiders/
│   └── pipelines/
│
├── ai-service/                 # Python FastAPI (NICE TO HAVE)
│   ├── app/
│   └── requirements.txt
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml          # Local development
│   │   └── docker-compose.prod.yml     # Production (SHOULD HAVE)
│   └── scripts/
│       ├── init-db.sh
│       └── seed-data.sh
│
├── docs/
│   ├── api/                   # Swagger/OpenAPI
│   └── architecture/
│
├── JobPlatform.sln            # Main solution file
└── README.md
```

---

## 3. 16-WEEK ROADMAP - DETAILED BY PRIORITY LEVEL

### PHASE 1: CORE FOUNDATION (Weeks 1-4)
**Objective:** Complete 100% of MUST HAVE features

---

#### WEEK 1: SETUP & AUTH SERVICE (MUST HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | Kickoff meeting, align architecture, create repository, setup monorepo structure, setup Docker Compose with PostgreSQL, Redis, Elasticsearch, Kafka | TM1 (Lead) | Docker runs successfully |
| Tuesday | Setup .NET solution, shared kernel, AuthService with Entity Framework, JWT configuration | TM1 | Database migration successful |
| Wednesday | AuthService: Register, Login API endpoints, unit tests for Auth | TM1 | Postman tests pass |
| Thursday | React: Setup Vite, Tailwind, Axios, Login/Register page | TM3 | UI renders correctly |
| Friday | Flutter: Setup project, theme, navigation, Login/Register screen | TM4 | App runs on emulator |
| Saturday | Integrate Auth API with Web + Mobile, code review, bug fixes | All | Login flow fully functional |
| Sunday | Rest | - | - |

**Week 1 Deliverable:** Users can register and login on both Web and Mobile

---

#### WEEK 2: JOB SERVICE + SEARCH SERVICE (MUST HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | JobService: CRUD APIs (Create, Read, Update, Delete), Database schema for Job, Category | TM2 | Postman tests pass |
| Tuesday | SearchService: Elasticsearch config, index mapping, basic search API (keyword, location) | TM2 | Search returns results |
| Wednesday | Sync Job to Elasticsearch (on create/update), Redis cache for search | TM1 + TM2 | Cache working |
| Thursday | React: Job List page, Job Detail page, API integration | TM3 | Jobs displayed |
| Friday | Flutter: Job List, Job Detail screens, API integration | TM4 | Mobile displays jobs |
| Saturday | Web + Mobile search integration, bug fixes | All | Search works |
| Sunday | Rest | - | - |

**Week 2 Deliverable:** Users can view job lists and details, basic search functional

---

#### WEEK 3: APPLICATION + PROFILE SERVICE (MUST HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | ApplicationService: Apply API, upload CV (local storage), Application database schema | TM1 | Application successful |
| Tuesday | ProfileService: User profile CRUD, Skills, Experience entities | TM2 | Profile updated |
| Wednesday | Application status flow (pending -> reviewed -> ...), Application history | TM1 + TM2 | Status changes work |
| Thursday | React: Apply form, Upload CV, Profile page, Application history list | TM3 | Web apply works |
| Friday | Flutter: Apply form, Profile screen, Application history | TM4 | Mobile apply works |
| Saturday | Full flow integration testing: post job -> search -> apply, bug fixes | All | Full flow works |
| Sunday | Rest | - | - |

**Week 3 Deliverable:** Complete flow: Recruiter posts job -> User searches -> Applies -> Views status

---

#### WEEK 4: API GATEWAY + CRAWLER (MUST HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | Setup YARP API Gateway, routing for all services, JWT validation middleware | TM1 | Routes working |
| Tuesday | Crawler: Setup Scrapy, spider for vieclam.gov.vn, clean data pipeline | TM2 | Crawl 100 jobs |
| Wednesday | Crawler: Crawl 500+ jobs, duplicate handling, save to PostgreSQL + Elasticsearch | TM2 | 500+ jobs ready |
| Thursday | Web: Call API through Gateway instead of direct, update base URL | TM3 | Web works through Gateway |
| Friday | Mobile: Call API through Gateway, final integration test | TM4 | Mobile works through Gateway |
| Saturday | Full system test through Gateway, bug fixing | All | Gateway flow passes |
| Sunday | Rest | - | - |

**Week 4 Deliverable:**
- API Gateway working with JWT
- 500+ jobs from crawler
- Web + Mobile through Gateway

**PHASE 1 COMPLETE: 100% MUST HAVE FEATURES DONE**

---

### PHASE 2: ENHANCED EXPERIENCE (Weeks 5-8)
**Objective:** Complete SHOULD HAVE features

---

#### WEEK 5: NOTIFICATION + KAFKA EVENT BUS (SHOULD HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | Setup Kafka topics (job-events, application-events), Producer/Consumer config | TM1 | Kafka connects successfully |
| Tuesday | NotificationService: Email template, send email on successful application | TM1 | Email received |
| Wednesday | JobService publishes event -> SearchService consumer syncs ES, ApplicationService publishes -> NotifService consumes | TM2 | Auto-sync works |
| Thursday | Web: In-app notification (toast) when new job posted, UI/UX improvements | TM3 | Notification UI displayed |
| Friday | Mobile: Push notification (Firebase) basic setup, UI/UX improvements | TM4 | Push notification received |
| Saturday | Test event-driven flow: post job -> ES sync -> Notification, bug fixes | All | Event flow works |
| Sunday | Rest | - | - |

**Week 5 Deliverable:** Notification working, Kafka event-driven architecture implemented

---

#### WEEK 6: ADVANCED SEARCH + REDIS CACHE (SHOULD HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | Elasticsearch: Vietnamese analyzer (icu_tokenizer), filter by salary, skills, location | TM2 | Filters working |
| Tuesday | Redis: Cache popular searches with TTL 5 minutes, invalidate cache on new job | TM1 | Cache hit works |
| Wednesday | Web: Advanced search UI with filters, React Query for caching | TM3 | UI filters displayed |
| Thursday | Mobile: Search with filters, local caching (Hive/SharedPrefs) | TM4 | Mobile filters work |
| Friday | Search performance optimization, benchmark: response time < 200ms | TM2 | Performance OK |
| Saturday | Integration test search flow, bug fixes | All | Advanced search OK |
| Sunday | Rest | - | - |

**Week 6 Deliverable:** Advanced search with filters and cache

---

#### WEEK 7: ADMIN PANEL + ROLE-BASED ACCESS (SHOULD HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | Detailed role-based access: Admin, Recruiter, User, Policy-based authorization in API | TM1 | Role check works |
| Tuesday | Admin APIs: User management, job approval, basic statistics | TM2 | Admin API works |
| Wednesday | React: Admin Dashboard layout, User management page, Job approval page | TM3 | Admin UI works |
| Thursday | React: Basic statistics (job count, user count, applications), Chart.js for charts | TM3 | Charts display |
| Friday | Flutter: Admin view only (no full UI), Role-based navigation | TM4 | Role-based works |
| Saturday | Test admin flows, security check (non-admin cannot access admin), bug fixes | All | Security OK |
| Sunday | Rest | - | - |

**Week 7 Deliverable:** Basic Admin Panel, complete role-based access

---

#### WEEK 8: MONITORING + CI/CD (SHOULD HAVE)

| Day | Tasks | Assignee | Validation |
|:---|:---|:---|:---|
| Monday | Health checks for all services, Serilog centralized logging | TM1 | Health endpoint works |
| Tuesday | GitHub Actions CI: Automated build, test, SonarCloud integration (optional) | TM1 | CI passes |
| Wednesday | Docker Compose production config, Deploy script to Fly.io/Railway | TM1 | Deploy works |
| Thursday | Grafana + Prometheus: Monitor metrics, basic dashboard | TM2 | Metrics display |
| Friday | Web: Production build optimization, Environment variables | TM3 | Production build works |
| Saturday | Mobile: Release build test, bug fixes | TM4 | Release build OK |
| Sunday | Rest | - | - |

**Week 8 Deliverable:** CI/CD working, basic monitoring in place

**PHASE 2 COMPLETE: 100% SHOULD HAVE FEATURES DONE**

---

### PHASE 3: WOW FACTOR (Weeks 9-13)
**Objective:** Create differentiation - NICE TO HAVE (choose at least 2)

---

#### WEEKS 9-10: AI JOB COPILOT (CHATBOT) (NICE TO HAVE)

| Week | Tasks | Assignee | Difficulty |
|:---|:---|:---|:---|
| Week 9 | Setup Python FastAPI service, OpenAI/Gemini API integration, LangChain/Semantic Kernel basic | TM2 (primary) + TM1 | 7/10 |
| Week 9 | Elasticsearch vector store setup, Embedding job descriptions, Basic RAG pipeline | TM2 | 8/10 |
| Week 10 | Chat API endpoint: POST /api/ai/chat, Streaming response (Server-Sent Events) | TM2 | 7/10 |
| Week 10 | React: Chat UI component, Context management for conversation | TM3 | 6/10 |
| Week 10 | Flutter: Chat screen, Stream handling | TM4 | 7/10 |

**Weeks 9-10 Deliverable:** Users can chat with AI about jobs, get job recommendations

---

#### WEEK 11: SMART RESUME SCORING (NICE TO HAVE)

| Day | Tasks | Assignee | Difficulty |
|:---|:---|:---|:---|
| Monday | PDF parsing (PyPDF2/PDFPlumber), CV text extraction | TM2 | 5/10 |
| Tuesday | Compare CV with Job Description (cosine similarity), Return score + improvement suggestions | TM2 | 7/10 |
| Wednesday | AI scoring API: POST /api/ai/score-resume, Cache result in Redis (24h) | TM2 | 6/10 |
| Thursday | Web: Upload CV -> view score, Suggestions UI | TM3 | 6/10 |
| Friday | Mobile: Upload CV -> view score, Improvement suggestions | TM4 | 6/10 |
| Saturday | Integration test, prompt optimization, bug fixes | All | 5/10 |
| Sunday | Rest | - | - |

**Week 11 Deliverable:** Users upload CV and see match score with each job

---

#### WEEK 12: TELEGRAM JOB ALERT BOT (NICE TO HAVE)

| Day | Tasks | Assignee | Difficulty |
|:---|:---|:---|:---|
| Monday | Create Telegram Bot, get token, Webhook setup | TM1 | 3/10 |
| Tuesday | Subscribe/Unsubscribe logic, Store user Telegram ID | TM1 | 4/10 |
| Wednesday | On new job -> send message via Telegram, Format message nicely | TM1 | 4/10 |
| Thursday | Test bot with team, bug fixes | All | 3/10 |
| Friday-Saturday | Reserved for overall testing and bug fixing | All | - |
| Sunday | Rest | - | - |

**Week 12 Deliverable:** Users receive job notifications via Telegram

---

#### WEEK 13: JOB RECOMMENDATION + POLISHING (NICE TO HAVE)

| Day | Tasks | Assignee | Difficulty |
|:---|:---|:---|:---|
| Monday | Recommendation engine based on application history, Simple collaborative filtering | TM2 | 6/10 |
| Tuesday | API endpoint: GET /api/jobs/recommended, Cache integration | TM2 | 5/10 |
| Wednesday | Web: Recommended jobs section, "Jobs you might like" | TM3 | 4/10 |
| Thursday | Mobile: Recommended jobs section, UI/UX optimization | TM4 | 4/10 |
| Friday-Saturday | Overall bug fixing, Performance optimization, Code cleanup | All | - |
| Sunday | Rest | - | - |

**Week 13 Deliverable:** Users receive personalized job recommendations

---

### PHASE 4: TESTING & DEPLOYMENT (Weeks 14-16)

---

#### WEEK 14: SYSTEM TESTING (MUST HAVE)

| Day | Tasks | Assignee |
|:---|:---|:---|
| Monday-Tuesday | Integration testing all services, End-to-end testing full flows | All |
| Wednesday | Performance testing: 100 concurrent users, k6 load test script | TM1 + TM2 |
| Thursday | Cross-browser testing (Chrome, Firefox, Safari) | TM3 |
| Friday | Mobile testing (iOS 16+, Android 12+) | TM4 |
| Saturday | Bug fixing priority (critical bugs only) | All |
| Sunday | Rest | - |

**Week 14 Deliverable:** Test report, 95% test cases passed

---

#### WEEK 15: STAGING + USER TESTING

| Day | Tasks | Assignee |
|:---|:---|:---|
| Monday-Tuesday | Deploy to staging environment (Fly.io/Railway), Sync data to staging | TM1 + TM2 |
| Wednesday | Invite 5-10 users to test, Collect feedback | All |
| Thursday-Friday | Fix bugs from feedback, Polish UI/UX | All |
| Saturday | Final bug fixing, Code freeze | All |
| Sunday | Rest | - |

**Week 15 Deliverable:** Staging environment live, user feedback collected and addressed

---

#### WEEK 16: FINAL PRESENTATION

| Day | Tasks | Assignee |
|:---|:---|:---|
| Monday | Compile final report | All |
| Tuesday | Prepare presentation slides, Demo script | All |
| Wednesday | Record video demo (5-7 minutes), WOW features must be in video | TM3 |
| Thursday | Rehearsal presentation, Finalize slides | All |
| Friday | **FINAL PRESENTATION + DEMO** | All |
| Saturday | Submit final report and source code | All |
| Sunday | Project closure | - |

---

## 4. TEAM RESPONSIBILITY MATRIX

### TM1 - Backend Lead + DevOps

| Weeks | Primary Tasks | Difficulty |
|:---|:---|:---|
| 1-4 | AuthService, API Gateway, Docker, Kafka setup | 7/10 |
| 5-8 | NotificationService, CI/CD, Monitoring, Redis cache | 7/10 |
| 9-12 | Telegram Bot, AI API integration support | 6/10 |
| 13-16 | Performance testing, Deployment, Documentation | 6/10 |

### TM2 - Backend + Search + AI Specialist

| Weeks | Primary Tasks | Difficulty |
|:---|:---|:---|
| 1-4 | JobService, SearchService, Crawler | 7/10 |
| 5-8 | Kafka consumer, Elasticsearch optimization, Data pipeline | 7/10 |
| 9-12 | AI Service, RAG, Resume Scoring | 8/10 |
| 13-16 | Testing, Data sync, Bug fixing | 6/10 |

### TM3 - Frontend Web (React)

| Weeks | Primary Tasks | Difficulty |
|:---|:---|:---|
| 1-4 | Auth UI, Job List/Detail, Apply form, Profile | 6/10 |
| 5-8 | Advanced search UI, Admin Panel, Dashboard | 6/10 |
| 9-12 | AI Chat UI, Resume Scoring UI, Recommendation | 7/10 |
| 13-16 | Polish UI/UX, Bug fixing, Deployment | 5/10 |

### TM4 - Mobile (Flutter) + QA

| Weeks | Primary Tasks | Difficulty |
|:---|:---|:---|
| 1-4 | Auth screens, Job List/Detail, Apply, Profile | 6/10 |
| 5-8 | Push notification, Advanced search, Admin view | 7/10 |
| 9-12 | AI Chat screen, Scoring UI, Recommendation | 7/10 |
| 13-16 | Mobile testing, Bug fixing, App store submission | 6/10 |

---

## 5. MASTER CHECKLIST - PROGRESS TRACKING

### MUST HAVE (Required - 100% completion needed)

- [ ] Authentication (Login/Register/JWT)
- [ ] Job CRUD
- [ ] Basic Search (keyword + location)
- [ ] Application (Apply + CV upload)
- [ ] Profile Service
- [ ] API Gateway (YARP)
- [ ] PostgreSQL database
- [ ] Docker Compose local
- [ ] Crawler (500+ jobs)
- [ ] Web App (React) - all main screens
- [ ] Mobile App (Flutter) - all main screens
- [ ] Basic CI/CD (GitHub Actions)

### SHOULD HAVE (Priority after Must Have)

- [ ] Notification Service (email)
- [ ] Redis Cache
- [ ] Kafka Event Bus
- [ ] Advanced Search (salary, skills filters)
- [ ] File Storage (Cloudflare R2)
- [ ] Basic Admin Panel
- [ ] Detailed Role-Based Access
- [ ] WebSocket Realtime Notification
- [ ] Push Notification (Firebase)
- [ ] Monitoring (Health checks, logging)

### NICE TO HAVE (Maximum 3 for WOW factor)

- [ ] AI Job Copilot Chatbot
- [ ] Smart Resume Scoring
- [ ] Telegram Job Alert Bot
- [ ] Job Recommendation
- [ ] Elasticsearch Vector Search
- [ ] Analytics Dashboard
- [ ] Dark Mode

---

## 6. RISK MANAGEMENT

| Risk | Severity | Mitigation Strategy |
|:---|:---|:---|
| AI implementation too difficult | High | Build prototype in weeks 7-8, reduce scope if needed (e.g., chatbot without RAG) |
| Team lacks .NET skills | Medium | Dedicate first week to .NET Core learning, pair programming |
| Crawler blocked by IP | Medium | Prioritize vieclam.gov.vn (less restrictive), use proxy rotation if needed |
| Flutter development too heavy | Medium | Consider React Native alternative, or simplify mobile features |
| Time shortage | High | Cut NICE TO HAVE features, keep only one WOW feature |

---

## 7. FINAL RECOMMENDATIONS

1. **Prioritize stability:** Weeks 1-4 focus on MUST HAVE features. Do not start AI work until authentication is working.

2. **Choose one WOW feature to excel:** Recommend **AI Job Copilot** as it is most impressive and easiest to demonstrate.

3. **Git discipline:** Commit daily, do not wait until end of week to push.

4. **Daily standup:** 15 minutes each morning - what each person did, what they will do, any blockers.

5. **Demo early, demo often:** At end of each week, demonstrate working features to the whole team.

---

**Start Date:** August 17, 2026 (Monday)
**End Date:** December 6, 2026 (Sunday)
**Version:** 4.0