# Cost Analysis Table: Zero-Cost Infrastructure

## Executive Summary

This document provides a comprehensive cost analysis for the 16-week microservices project. The infrastructure leverages free tiers and promotional credits from major cloud providers, achieving an effective cost of $0 for the development and demonstration phases.

---

## Infrastructure Cost Breakdown

| Component Category | Service Provider | Free Tier Specification | Validity Period | 16-Week Cost |
|:-------------------|:-----------------|:------------------------|:----------------|:-------------|
| **Compute (VM)** | Google Cloud Platform | f1-micro instance: 0.2 vCPU, 0.6 GB RAM, 30 GB HDD | Always Free (within limits) | $0 |
| **Compute (VM)** | AWS / Azure | EC2 t2.micro (AWS) or B1S (Azure): 1 vCPU, 1 GB RAM | 12 months | $0 |
| **Compute (VM)** | DigitalOcean / Vultr | $200 - $250 promotional credits | 30-60 days | $0 |
| **Managed Database** | Supabase | PostgreSQL: 500 MB storage, authentication, realtime features | Always Free (within limits) | $0 |
| **Managed Cache** | Upstash | Redis: 10,000 commands per day | Always Free (within limits) | $0 |
| **Search Engine** | Bonsai / Elastic Cloud | Elasticsearch: 1 GB cluster | Always Free (within limits) | $0 |
| **Message Broker** | Confluent Cloud | Kafka: Basic tier with limited throughput | Always Free (within limits) | $0 |
| **Object Storage** | Cloudflare R2 | 10 GB storage, unlimited egress (no bandwidth charges) | Always Free (within limits) | $0 |
| **Container Registry** | GitHub Container Registry | Unlimited public repositories | Always Free | $0 |
| **CI/CD Pipeline** | GitHub Actions | 2,000 free minutes/month (private repos), unlimited (public repos) | Always Free (within limits) | $0 |
| **Monitoring Stack** | Grafana Cloud | 10,000 Prometheus metrics, 50 GB logs, 50 GB traces/month | Always Free (within limits) | $0 |
| **AI Services (LLM)** | OpenAI / Google Gemini | OpenAI: $5 free credits; Gemini: ~60 requests/minute free | Promotional / Limited | $0 |
| **Domain / Tunnel** | Cloudflare Tunnel | Secure public exposure without public IP or paid domain | Always Free | $0 |
| **Application Hosting** | Fly.io / Railway | Fly.io: 3 shared VMs; Railway: $5 free credit | Always Free / Promotional | $0 |

---

## Total Estimated Cost

**$0.00 USD** for the entire 16-week project lifecycle, including development, testing, staging, and demonstration phases.

---

## Cost Optimization Strategies

### 1. Free Tier Utilization
Deploy foundational services using Always Free tiers (GCP f1-micro, Supabase, Upstash) to eliminate recurring infrastructure costs throughout the project duration.

### 2. Promotional Credits
Leverage trial credits from AWS, Azure, DigitalOcean, or Vultr for additional compute resources when the Always Free tier is insufficient for specific workloads.

### 3. Egress Cost Avoidance
Utilize Cloudflare R2 for object storage, which provides free data transfer (egress), preventing bandwidth costs that commonly accrue with other storage providers.

### 4. AI API Cost Management
Use Gemini's free tier for LLM operations and manage OpenAI credits strategically to avoid exceeding the promotional limit.

### 5. Containerized Deployment
Package all services using Docker and deploy to Fly.io or Railway, which provide sufficient free resources for demonstration purposes.

---

## Infrastructure Architecture Notes

- **Compute Distribution**: Each microservice can run on separate free-tier VMs or be containerized and deployed on Fly.io's 3 free VMs.
- **Database**: Supabase PostgreSQL serves as the primary data store for all services (database-per-service pattern).
- **Cache Layer**: Upstash Redis handles caching and rate limiting.
- **Event Bus**: Confluent Cloud Kafka manages asynchronous communication between services.
- **Search Index**: Bonsai Elasticsearch provides full-text search capabilities with Vietnamese language support.
- **Storage**: Cloudflare R2 stores CV files and user avatars.
- **CI/CD**: GitHub Actions automates build, test, and deployment workflows.
- **Monitoring**: Grafana Cloud provides observability with minimal configuration overhead.

---

## Risk Considerations

| Risk | Mitigation |
|:-----|:-----------|
| Free tier resource exhaustion | Monitor usage metrics; upgrade only if necessary |
| Promotional credits expiration | Prioritize Always Free services; credits used only for short-term needs |
| API rate limiting (AI services) | Implement caching and rate limiting; use Gemini for high-volume requests |
| Data persistence across service restarts | Use managed services (Supabase, Upstash) to ensure data durability |

---

## Conclusion

The proposed infrastructure design achieves **zero operational cost** while maintaining the technical requirements for a production-grade microservices architecture. All services are selected based on their free tier availability and are sufficient to support development, testing, and demonstration for the 16-week project timeline.