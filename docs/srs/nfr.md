# Software Requirements Specification (SRS)
## Vietnam Job Platform - Microservices Architecture

**Version:** 1.0  
**Date:** August 17, 2026  
**Project:** Vietnam Job Platform (Nền tảng việc làm Việt Nam)  

---

## Part 6: Non-Functional Requirements

### 6.1 Overview

This section documents all non-functional requirements for the Vietnam Job Platform. These requirements define the quality attributes, performance characteristics, and constraints that the system must satisfy. Unlike functional requirements, which specify *what* the system does, non-functional requirements specify *how well* the system does it.

Non-functional requirements are grouped into the following categories:

```mermaid
flowchart TB
    subgraph NFR["Non-Functional Requirements"]
        PERF["Performance"]
        SEC["Security"]
        USAB["Usability"]
        REL["Reliability"]
        SCAL["Scalability"]
        MAINT["Maintainability"]
        PORT["Portability"]
        COMP["Compliance"]
    end
```

---

### 6.2 Performance Requirements

Performance requirements define the system's responsiveness, throughput, and resource utilisation under specified conditions.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| PERF-01 | The system shall respond to API requests within acceptable time limits | - 95% of requests complete within 500ms<br>- 99% of requests complete within 1000ms<br>- Response time measured at API Gateway | MUST |
| PERF-02 | The system shall handle search queries efficiently | - 95% of search queries complete within 200ms<br>- 99% of search queries complete within 500ms<br>- Measured from search service | SHOULD |
| PERF-03 | The system shall support concurrent users | - Support at least 100 concurrent users<br>- Support at least 1,000 requests per minute<br>- Performance degrades gracefully under load | MUST |
| PERF-04 | The web application shall load quickly | - First Contentful Paint (FCP) < 1.5 seconds<br>- Largest Contentful Paint (LCP) < 2.5 seconds<br>- Time to Interactive (TTI) < 3.0 seconds | SHOULD |
| PERF-05 | The mobile application shall be responsive | - App launches within 3 seconds (cold start)<br>- Screen transitions < 300ms<br>- Scrolling is smooth (60fps) | SHOULD |
| PERF-06 | The system shall use database connection pooling | - Connection pool size appropriate for expected load<br>- Connection timeout < 30 seconds<br>- No connection leaks | MUST |
| PERF-07 | The system shall utilise caching effectively | - Cache hit rate > 60% for search results<br>- Cache hit rate > 80% for popular job listings<br>- Cache miss penalty < 200ms | SHOULD |
| PERF-08 | The system shall optimise file uploads | - File upload time < 5 seconds for 1MB file<br>- Upload progress indicator provided<br>- Chunked upload for large files (> 5MB) | NICE |

---

### 6.3 Security Requirements

Security requirements define how the system protects data, prevents unauthorised access, and maintains user privacy.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| SEC-01 | The system shall authenticate all users before granting access | - Token-based authentication required for all protected endpoints<br>- Invalid tokens rejected<br>- Session timeout after inactivity (1 hour) | MUST |
| SEC-02 | The system shall authorise access based on user roles | - Role-based access control (RBAC) enforced<br>- Users cannot access resources outside their permissions<br>- Admin-only endpoints protected | MUST |
| SEC-03 | The system shall encrypt all passwords | - Passwords hashed using bcrypt or PBKDF2<br>- Salt used for each password<br>- Plain text passwords never stored | MUST |
| SEC-04 | The system shall use TLS for all communication | - TLS 1.2 or higher for all endpoints<br>- Valid SSL certificate<br>- Automatic redirect from HTTP to HTTPS | MUST |
| SEC-05 | The system shall protect against common web vulnerabilities | - SQL injection prevention (parameterised queries)<br>- XSS prevention (output encoding)<br>- CSRF protection (tokens)<br>- Input validation on all user inputs | MUST |
| SEC-06 | The system shall implement rate limiting | - Rate limiting per IP address<br>- Rate limiting per API key/user<br>- 100 requests per minute default limit | SHOULD |
| SEC-07 | The system shall provide audit logging | - Log all authentication attempts (success/failure)<br>- Log all authorisation failures<br>- Log all administrative actions | SHOULD |
| SEC-08 | The system shall protect sensitive data | - Personal information encrypted at rest<br>- CV files stored with restricted access<br>- API keys and secrets not exposed | MUST |
| SEC-09 | The system shall implement secure session management | - JWT tokens with appropriate expiry (1 hour)<br>- Refresh token rotation<br>- Token revocation on logout | MUST |
| SEC-10 | The system shall implement proper CORS policy | - CORS configured for trusted origins only<br>- Preflight requests handled correctly<br>- Cross-origin requests validated | MUST |

---

### 6.4 Usability Requirements

Usability requirements define how easy and pleasant the system is for users to interact with.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| USAB-01 | The system shall provide a consistent user experience | - Consistent navigation across all pages/screens<br>- Consistent terminology throughout<br>- Consistent visual style and branding | MUST |
| USAB-02 | The system shall provide clear error messages | - User-friendly error messages (not technical)<br>- Suggested actions to resolve errors<br>- Error messages in user's language | MUST |
| USAB-03 | The system shall provide feedback on user actions | - Loading indicators for async operations<br>- Success/confirmation messages<br>- Validation feedback in real-time | MUST |
| USAB-04 | The system shall be responsive on all devices | - Web application responsive (desktop, tablet, mobile)<br>- Touch-friendly interface on mobile<br>- Readable font sizes on all devices | MUST |
| USAB-05 | The system shall support accessible design | - WCAG 2.1 AA compliance (where practical)<br>- Keyboard navigation support<br>- Screen reader compatibility | NICE |
| USAB-06 | The system shall provide helpful onboarding | - New user guide or walkthrough<br>- Tooltips for key features<br>- Clear call-to-action buttons | SHOULD |
| USAB-07 | The system shall support efficient workflows | - Minimal clicks to complete tasks<br>- Keyboard shortcuts (web)<br>- Quick actions from search results | NICE |
| USAB-08 | The system shall provide intuitive navigation | - Clear navigation structure<br>- Breadcrumbs on web<br>- Bottom navigation on mobile | MUST |

---

### 6.5 Reliability Requirements

Reliability requirements define the system's stability, fault tolerance, and recovery capabilities.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| REL-01 | The system shall maintain high availability | - Uptime > 99% during operating hours<br>- Scheduled maintenance < 2 hours per month<br>- No unscheduled downtime during demos | MUST |
| REL-02 | The system shall handle failures gracefully | - Service failures handled with graceful degradation<br>- User-facing error pages for critical failures<br>- Service recovery without manual intervention | SHOULD |
| REL-03 | The system shall implement circuit breakers | - Circuit breaker pattern for external service calls<br>- Fallback responses when circuit is open<br>- Automatic recovery when service becomes available | SHOULD |
| REL-04 | The system shall support data persistence | - Data persisted to database on all write operations<br>- No data loss on service restart<br>- Transaction support for data consistency | MUST |
| REL-05 | The system shall implement retry mechanisms | - Retry on transient failures (3 attempts)<br>- Exponential backoff between retries<br>- Configurable retry timeout | SHOULD |
| REL-06 | The system shall provide health check endpoints | - Health check endpoint per service<br>- Aggregated health status via API Gateway<br>- Dashboard for health monitoring | SHOULD |
| REL-07 | The system shall implement error handling | - Exception handling in all layers<br>- User-friendly error pages (not stack traces)<br>- Error logging for diagnostics | MUST |
| REL-08 | The system shall support graceful shutdown | - In-flight requests completed on shutdown<br>- Connections closed properly<br>- Clean resource cleanup | SHOULD |

---

### 6.6 Scalability Requirements

Scalability requirements define the system's ability to handle growing loads and user bases.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| SCAL-01 | The system shall support horizontal scaling | - Services can be scaled independently<br>- Stateless services for easy scaling<br>- Load balancing across instances | SHOULD |
| SCAL-02 | The system shall handle data growth | - Database can handle growth to 10,000+ jobs<br>- Search index can handle growth to 10,000+ jobs<br>- Storage can handle 5,000+ CV files | MUST |
| SCAL-03 | The system shall support caching at scale | - Distributed cache (Redis) for shared state<br>- Cache consistency across instances<br>- Cache invalidation on data changes | SHOULD |
| SCAL-04 | The system shall support database scalability | - Database connections pooled<br>- Query optimisation for large datasets<br>- Indexes on frequently queried fields | MUST |
| SCAL-05 | The system shall support elastic scaling (Nice to Have) | - Auto-scaling based on load metrics<br>- Horizontal Pod Autoscaling (Kubernetes)<br>- Scale-down during low traffic | NICE |

---

### 6.7 Maintainability Requirements

Maintainability requirements define how easy it is to update, modify, and extend the system.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| MAINT-01 | The system shall follow clean architecture principles | - Separation of concerns (API, Business Logic, Data)<br>- Dependency inversion<br>- Services with clear boundaries | MUST |
| MAINT-02 | The system shall maintain code quality | - Code coverage > 70% (unit tests)<br>- Static code analysis passes<br>- Linting rules enforced | SHOULD |
| MAINT-03 | The system shall maintain documentation | - API documentation (Swagger/OpenAPI)<br>- Setup/installation guide<br>- Architectural documentation | MUST |
| MAINT-04 | The system shall support version control | - All source code in version control<br>- Feature branch workflow<br>- Pull request reviews | MUST |
| MAINT-05 | The system shall support CI/CD | - Automated builds on code push<br>- Automated tests on code push<br>- Automated deployments (staging/prod) | SHOULD |
| MAINT-06 | The system shall support logging | - Structured logging (JSON format)<br>- Configurable log levels<br>- Log aggregation and centralised access | SHOULD |
| MAINT-07 | The system shall support monitoring | - Performance metrics collection<br>- Error tracking and alerts<br>- Dashboard for monitoring | SHOULD |
| MAINT-08 | The system shall support modular design | - Service independence (minimal coupling)<br>- Shared libraries for common functionality<br>- Contracts between services defined | MUST |

---

### 6.8 Portability Requirements

Portability requirements define the system's ability to run in different environments.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| PORT-01 | The system shall run on multiple operating systems | - Development on Windows, macOS, Linux<br>- Deployment on Linux-based cloud instances<br>- No OS-specific dependencies | MUST |
| PORT-02 | The system shall support containerisation | - Docker containers for all services<br>- Docker Compose for local development<br>- Images run consistently across environments | MUST |
| PORT-03 | The system shall support multiple deployment environments | - Development environment (local)<br>- Staging environment (Cloud)<br>- Production environment (Cloud) | MUST |
| PORT-04 | The system shall be cloud-agnostic | - No vendor lock-in<br>- Can run on AWS, GCP, Azure, or self-hosted<br>- Uses standard cloud services | SHOULD |
| PORT-05 | The system shall use environment variables for configuration | - No hardcoded configuration values<br>- Environment-specific settings via variables<br>- Sensitive data via secrets management | MUST |

---

### 6.9 Compliance Requirements

Compliance requirements define the standards and regulations the system must adhere to.

| ID | Requirement | Acceptance Criteria | Priority |
|:---|:------------|:-------------------|:----------|
| COMP-01 | The system shall comply with personal data protection regulations | - User data collected only with consent<br>- User can request data deletion<br>- Data stored securely | MUST |
| COMP-02 | The system shall comply with copyright and licensing laws | - No unauthorised use of third-party code<br>- Proper attribution for open-source libraries<br>- Crawler respects robots.txt | MUST |
| COMP-03 | The system shall comply with accessibility guidelines (Nice to Have) | - Basic WCAG 2.1 compliance<br>- Alt text on images<br>- Keyboard navigation support | NICE |
| COMP-04 | The system shall maintain audit trails | - Administrative actions logged<br>- Data access logged<br>- User activity (sensitive) logged | SHOULD |
| COMP-05 | The system shall support Vietnamese language standards | - Vietnamese character support<br>- Vietnamese date/time formats<br>- Vietnamese currency (VND) formatting | MUST |

---

### 6.10 Non-Functional Requirements Summary

| Category | MUST | SHOULD | NICE | Total |
|:---------|:-----|:-------|:-----|:------|
| Performance | 3 | 3 | 1 | 7 |
| Security | 8 | 1 | 0 | 9 |
| Usability | 5 | 1 | 2 | 8 |
| Reliability | 3 | 4 | 0 | 7 |
| Scalability | 2 | 2 | 1 | 5 |
| Maintainability | 3 | 3 | 0 | 6 |
| Portability | 4 | 1 | 0 | 5 |
| Compliance | 3 | 1 | 1 | 5 |
| **Total** | **31** | **16** | **5** | **52** |

---

### 6.11 Non-Functional Requirements Traceability

The following table maps non-functional requirements to the functional requirements they support:

| NFR ID | Related Functional Components | Justification |
|:-------|:------------------------------|:--------------|
| PERF-01, PERF-02 | All API endpoints | All requests must respond quickly |
| PERF-03 | All services | System must handle concurrent users |
| PERF-04 | Web Application | Web UI must load quickly for good UX |
| PERF-05 | Mobile Application | Mobile UI must be responsive |
| SEC-01, SEC-02, SEC-09 | Authentication Service | Core security for all services |
| SEC-03, SEC-05 | All services | Security must be consistent across services |
| SEC-08 | File Storage, Profile Service | Sensitive data must be protected |
| USAB-01, USAB-02, USAB-03 | All services | Consistent UX across platform |
| REL-01, REL-02, REL-03 | All services | System must be reliable |
| SCAL-01, SCAL-02 | All services | System must handle growth |
| MAINT-01, MAINT-02 | All services | Code quality and maintainability |
| PORT-01, PORT-02 | All services | Portability across environments |

---

### 6.12 Measurement and Verification

| NFR Category | How to Measure | When to Verify | Tools/Methods |
|:-------------|:---------------|:---------------|:--------------|
| Performance | Response times, throughput, resource usage | Weekly during development | Load testing (k6), APM tools |
| Security | Security scans, penetration testing | Week 8 (Security Hardening) | OWASP ZAP, SonarQube |
| Usability | User testing, feedback, task completion | Week 15 (User Testing) | User surveys, usability testing |
| Reliability | Uptime, error rates, MTBF | Weekly monitoring | Monitoring dashboards |
| Scalability | Load testing, resource scaling | Week 14 (Performance Testing) | Load testing, Kubernetes HPA |
| Maintainability | Code coverage, complexity metrics | Weekly CI/CD | SonarQube, code coverage tools |
| Portability | Environment compatibility | Week 12 (Staging) | Environment testing |
| Compliance | Audit checks, regulatory review | Week 15 (Documentation) | Self-audit, team review |

---

**End of Part 6**

---