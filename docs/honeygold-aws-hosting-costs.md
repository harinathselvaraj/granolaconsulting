# HoneyGold on AWS — indicative hosting costs (Fargate + PostgreSQL metadata)

Use this page as **copy for marketing or sales**, with the disclaimers below. Numbers are **order-of-magnitude estimates** for **US East (N. Virginia)**–style pricing; your region, discounts, and architecture choices will change totals.

---

## Disclaimers (publish near any pricing table)

- AWS bills **per second** (Fargate), **per hour** (RDS instances), **per GB-month** (storage), plus **data transfer**, load balancer capacity units, NAT gateways, IPv4 addresses, logs, backups, etc.
- **Official sources:** [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/), [RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/), [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/pricing/), [AWS Pricing Calculator](https://calculator.aws/).
- **Not included here:** usage of **customer data warehouses** (Athena, Redshift, RDS data endpoints), **LLM API** usage (your product add-on), third-party SaaS, Premium Support, Route 53 beyond free tier, large-scale NAT egress, multi-region DR.

---

## 1. How Fargate compute is priced (Linux / x86, US East example)

From AWS’s published **per-second** rates for **Linux/X86** in **US East (N. Virginia)** (see examples on the [Fargate pricing page](https://aws.amazon.com/fargate/pricing/)):


| Component  | Approx. rate                | Equivalent per hour (× 3600 s) |
| ---------- | --------------------------- | ------------------------------ |
| **vCPU**   | ~$0.000011244 / vCPU-second | ~**$0.0405** / vCPU-hour       |
| **Memory** | ~$0.000001235 / GB-second   | ~**$0.00445** / GB-hour        |


**Monthly formula (one task, 24×7, ~730 h/month):**

`Monthly Fargate ≈ 730 × ( (vCPU × $0.0405) + (memory_GB × $0.00445) )`

**Graviton (Linux/ARM)** Fargate is typically **~20% lower** than x86 for the same task size—worth modeling if your images support arm64.

---

## 2. Example Fargate task sizes (single task, always on)


| Profile                  | Task shape     | Rough Fargate compute/month (x86, us-east-1) |
| ------------------------ | -------------- | -------------------------------------------- |
| **Lean / pilot**         | 0.5 vCPU, 1 GB | ~**$17–18**                                  |
| **Small team BI**        | 1 vCPU, 2 GB   | ~**$36–37**                                  |
| **Heavier UI + workers** | 2 vCPU, 4 GB   | ~**$72–74**                                  |


To run **two tasks** for availability (rolling deploys / AZ redundancy), **double** the Fargate compute line (unless you use smaller tasks behind autoscaling with low steady minimum).

*Ephemeral disk:* **20 GB included** per task; extra GB is cheap—usually not material for metadata-only apps unless you raise disk above defaults.

---

## 3. PostgreSQL for **metadata only** (RDS examples)

Superset/HoneyGold-style apps usually keep **dashboards, users, permissions, chart defs** in Postgres; **large analytical data stays in your warehouses**. That keeps metadata DB **small**.

### RDS PostgreSQL (Graviton **db.t4g** family, **on-demand**, single-AZ — illustrative)


| Tier       | Instance                                | ~Compute $/month (730 h) | Storage (gp3) example | ~Storage $/month |
| ---------- | --------------------------------------- | ------------------------ | --------------------- | ---------------- |
| **Pilot**  | db.t4g.micro (~$0.016/hr class rates)   | ~**$12**                 | 20 GB gp3             | ~**$2–3**†       |
| **SMB**    | db.t4g.small (~$0.032/hr class rates)   | ~**$23**                 | 50 GB gp3             | ~**$5–7**†       |
| **Growth** | db.t4g.medium or fixed performance need | ~**$46+**                | 100 GB gp3            | ~**$11–13**†     |


† **gp3** volumes are often on the order of **~$0.08–0.12 / GB-month** depending on region and provisioned IOPS/throughput options—confirm in [RDS pricing](https://aws.amazon.com/rds/postgresql/pricing/) for your region.

**Optional costs:**

- **Multi-AZ RDS:** roughly **~2×** the instance portion (plus storage as configured).
- **Backups:** automated backup storage often has **free allowance tied to DB size**; long retention or extra copies add cost.
- **Aurora PostgreSQL / Aurora Serverless v2:** alternative if you want cluster features or scale-to-zero patterns—**pricing model differs**; use the Pricing Calculator.

---

## 4. Typical “minimum production-shaped” AWS bill components


| Line item                                              | Role                     | Ballpark (low traffic SMB)                                     |
| ------------------------------------------------------ | ------------------------ | -------------------------------------------------------------- |
| **Fargate**                                            | HoneyGold app containers | **$35–150+/mo** (1–2 tasks × size)                             |
| **RDS PostgreSQL**                                     | Metadata                 | **$15–80+/mo** (instance + gp3)                                |
| **Application Load Balancer**                          | HTTPS to ECS             | **~$20–45+/mo** fixed + LCUs‡                                  |
| **ECR**                                                | Container images         | Usually **$1–5/mo** at small scale                             |
| **CloudWatch Logs**                                    | App logs                 | **~$5–25/mo** if retention moderate                            |
| **Secrets Manager**                                    | DB creds, keys           | **~$1–2/mo** + API calls                                       |
| **NAT Gateway** (if private subnets + Internet egress) | Outbound Internet        | **~$32+/mo per NAT** + GB egress — **often the surprise line** |


‡ LCU charges rise with connections, bytes, and rule evaluations—model with Calculator.

**IPv4:** AWS charges for **public IPv4** addresses in many setups ([VPC pricing](https://aws.amazon.com/vpc/pricing/))—add **a few dollars per address per month** where applicable.

---

## 5. Three reference stacks (website-friendly scenarios)

All assume **single region**, **Linux/x86 Fargate**, **single-AZ RDS**, **one ALB**, **no NAT** (or NAT called out separately). **Rounded** for readability.

### A) Pilot / proof-of-concept


| Item                   | Assumption               | ~Monthly    |
| ---------------------- | ------------------------ | ----------- |
| Fargate                | 1× (0.5 vCPU, 1 GB)      | **~$18**    |
| RDS                    | db.t4g.micro + 20 GB gp3 | **~$15**    |
| ALB                    | Low usage                | **~$22**    |
| Misc                   | Logs, ECR, secrets       | **~$10**    |
| **Subtotal AWS infra** |                          | **~$65–75** |


### B) SMB production (modest concurrency)


| Item                   | Assumption               | ~Monthly      |
| ---------------------- | ------------------------ | ------------- |
| Fargate                | 2× (1 vCPU, 2 GB) for HA | **~$72**      |
| RDS                    | db.t4g.small + 50 GB gp3 | **~$28–30**   |
| ALB                    | Moderate                 | **~$28–40**   |
| Misc                   | Logs, ECR, secrets       | **~$15**      |
| **Subtotal AWS infra** |                          | **~$145–160** |


### C) Heavier usage / larger tenant


| Item                   | Assumption                 | ~Monthly      |
| ---------------------- | -------------------------- | ------------- |
| Fargate                | 2× (2 vCPU, 4 GB)          | **~$145**     |
| RDS                    | db.t4g.medium + 100 GB gp3 | **~$58–65**   |
| ALB                    | Steadier traffic           | **~$40–60**   |
| Misc                   | Logs, ECR, secrets         | **~$25**      |
| **Subtotal AWS infra** |                            | **~$270–295** |


**Add if you use NAT Gateway:** **+$32+/mo per NAT** (plus data processing)—many teams use **VPC endpoints** for AWS APIs (ECR, Logs, Secrets) to reduce NAT reliance.

---

## 6. What to say about **compute vs storage**

- **Compute (Fargate):** scales with **task size × task count × hours running**. Autoscaling **off-hours** down saves money but needs architecture support.
- **Storage (RDS):** scales with **provisioned volume size + IOPS/throughput choices**; metadata DBs often stay **tens of GB**, not terabytes.
- **Query/analytics cost:** running heavy SQL against **Redshift, Athena, RDS replicas**, etc. is **separate** from HoneyGold’s metadata footprint—price those warehouses on their own pages.

---

## 7. Suggested website wording (short)

> **Hosting footprint:** HoneyGold runs as containers on **AWS Fargate** with **PostgreSQL** (for example **Amazon RDS**) for application metadata. For many SMB deployments, **AWS infrastructure often falls in roughly the low tens to low hundreds of dollars per month** before your analytics warehouses and optional AI usage—exact cost depends on region, high availability choices, and traffic. Use the **[AWS Pricing Calculator](https://calculator.aws/)** or contact us for a reference architecture tailored to your tenant count and SLAs.

---

## 8. Related doc

- BI positioning / comparisons: [honeygold-bi-comparison.md](./honeygold-bi-comparison.md)

---

*Document version: May 2026. Re-validate Fargate and RDS rates before publishing final marketing figures.*