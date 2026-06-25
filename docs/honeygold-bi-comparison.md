# BI tools vs HoneyGold — comparison tables

**Purpose:** Position **HoneyGold** (open-source Apache Superset–based, customizable, white-label reporting with embedded chat; LLM billed on usage) against common BI options for **SMB / mid-market** buyers.

**Important:** Dollar figures below are **summaries for planning only**. Vendor pricing, bundles, and regional taxes change frequently. Always confirm on official pricing pages or quotes before publishing this externally.

**Sources:** Microsoft Power BI pricing page; Metabase pricing reference; AWS QuickSight pricing summaries; industry-standard summaries for quote-only vendors (Tableau, Looker, Qlik). Last structured for internal use **May 2026**.

---

## Table 1 — Pricing & licensing at a glance

| Product | Typical deployment | How you usually pay | Published/list notes (USD, indicative) | Trial / free tier |
|--------|---------------------|---------------------|----------------------------------------|-------------------|
| **HoneyGold** | Your cloud or customer-hosted; Superset core | Your packaging (e.g. flat + seats + LLM meter) | **You set** — emphasize predictable BI seats vs usage-based LLM | Your policy |
| **Apache Superset** (upstream) | Self-hosted or managed (e.g. Preset, DIY) | Infra + ops time; OSS license free | Software: **$0** (Apache 2.0); hosted offerings vary | OSS — no vendor trial |
| **Metabase** | Cloud or self-hosted | Per-user cloud tiers + optional metered AI/transforms | Open source: **$0** (AGPL self-host). Cloud **Starter** from ~**$100/mo** + per-user; **Pro** from ~**$575/mo** + per-user (see [metabase.com/pricing](https://www.metabase.com/pricing)). **Enterprise** custom (~**$20k+/yr** typical floor cited) | Cloud trials on paid tiers |
| **Microsoft Power BI** | Microsoft cloud / Fabric ecosystem | Per user/month (annual); Embedded/capacity separate | **Pro** ~**$14**/user/mo (annual); **Premium per user** ~**$24**/user/mo (annual); **Embedded**/Fabric capacity: variable ([Power BI pricing](https://www.microsoft.com/en-us/power-platform/products/power-bi/pricing)) | Free Fabric account (limited sharing) |
| **Tableau Cloud** | Salesforce-hosted | Per-role seat, annual | Common public framing: **Creator** ~**$75**/user/mo, **Explorer** ~**$42**, **Viewer** ~**$15** — **confirm on quote** ([Tableau pricing](https://www.tableau.com/pricing)) | Time-limited trials |
| **Looker (Google Cloud)** | GCP-hosted | Platform edition + user types; annual | **Quote-only**; editions include caps on API calls and included developer/standard users ([Looker pricing](https://cloud.google.com/looker/pricing)) | Through Google sales/partners |
| **Amazon QuickSight** | AWS | Per user and/or session capacity; optional Gen BI roles | Often cited: **Reader** ~**$3**/user/mo, **Author** ~**$24**/user/mo; **Reader Pro / Author Pro** higher for generative features; possible account monthly minimums when certain features on ([QuickSight pricing](https://aws.amazon.com/quicksight/pricing/)) | AWS Free Tier constraints |
| **Qlik Cloud** | Qlik SaaS | Tier/capacity bundles (users + data capacity) | Frequently summarized tiers in **hundreds–thousands USD/month** by bundle — **verify current tiers** ([Qlik pricing](https://www.qlik.com/us/pricing)) | Vendor trials |

---

## Table 2 — Feature & capability matrix

Legend: **●** strong / first-class · **◐** partial / add-on / tier-dependent · **○** limited or not focus · **—** varies by edition (check vendor)

| Dimension | HoneyGold | Superset (OSS) | Metabase | Power BI | Tableau | Looker | QuickSight | Qlik Cloud |
|-----------|-----------|----------------|----------|----------|---------|--------|------------|------------|
| **Core model** | Superset fork + your UX/features | Modern OSS BI web app | Open-core BI + cloud commercial | Microsoft analytics stack | Visual analytics + enterprise governance | Modeled analytics (LookML) + GCP | AWS-native BI | Associative engine + SaaS tiers |
| **Open-source core** | ● (Superset lineage) | ● Apache 2.0 | ◐ AGPL OSS + paid features | ○ | ○ | ○ | ○ | ○ |
| **White-label / your logo** | ● (your product) | ◐ DIY branding | ◐ Pro+ embedding branding | ◐ Embedded / partner scenarios | ◐ | ◐ embed | ◐ | ◐ |
| **Embedded analytics** | ● (your packaging) | ◐ Superset embedded apps | ◐ Paid tiers for full SDK / white-label | ● Embedded + Fabric paths | ● | ● | ● | ● |
| **Broad DB connectivity** | ● (Superset connectors + your additions) | ● Many connectors | ● 20+ listed | ● Very broad Microsoft + generic | ● Broad | ● Warehouse-centric | ● AWS-optimized + common | ● Strong enterprise connectors |
| **Live / near-real-time** | ● (position clearly: live SQL vs CDC/stream) | ◐ SQL/live queries; streaming varies | ◐ | ◐ Refresh limits by SKU | ◐ | ◐ | ◐ | ◐ |
| **Self-service dashboards** | ● | ● | ● | ● | ● | ◐ LookML often central | ● | ● |
| **Semantic / metrics layer** | ◐ Superset datasets/metrics evolution | ◐ | ◐ Models / glossary in paid tiers | ◐ Datasets, datamarts (tiered) | ◐ | ● LookML | ◐ Topics/Q | ◐ |
| **Row-level security** | ● (Superset RLS patterns) | ● | ● Paid tiers | ● | ● | ● | ● | ● |
| **SSO / enterprise auth** | ● (your deployment) | ◐ DIY / plugins | ● Paid tiers | ● | ● | ● | ● | ● |
| **Collaboration chat in-app** | ● Default widget (your story) | ○ | ◐ Metabot / AI features | ◐ Teams + Copilot ecosystem | ◐ Slack integrations | ◐ | ◐ Q / Gen BI | ◐ |
| **AI / NL-to-SQL or insights** | ◐ LLM usage-based add-on | ◐ Third-party / DIY | ◐ BYOK or metered AI service | ◐ Copilot / Fabric (entitlements) | ◐ Agent / Pulse (tiered) | ◐ | ◐ Q / Author Pro SKUs | ◐ |
| **Excel-heavy analyst UX** | ◐ | ◐ | ◐ | ● | ● | ○ | ◐ | ◐ |
| **Lock-in / cloud** | ◐ You control hosting | ◐ Self-host freedom | ◐ Cloud or commercial license | ● Microsoft ecosystem | ● Salesforce cloud | ● GCP alignment | ● AWS alignment | ● Qlik SaaS |

---

## Table 3 — SMB positioning — “when HoneyGold wins the conversation”

| Buyer situation | Lean toward | Why |
|-----------------|------------|-----|
| Wants **vendor-neutral**, deploy **own VPC**, **white-label** customer reporting | **HoneyGold** vs proprietary SaaS-only | Full branding + deployment control |
| **Per-seat costs** scale badly for many viewers | **HoneyGold** / **Superset self-host** vs Tableau Viewer grids | Model viewers + infra instead of only SaaS seats |
| Already **all-in Microsoft 365 + Fabric** | **Power BI** | Integration and procurement simplicity |
| Already **AWS data lake + IAM** | **QuickSight** | Native IAM, data source proximity |
| Needs **central semantic model** owned by analytics engineering | **Looker** | LookML workflow |
| Wants **fastest time-to-first-dashboard** with minimal ops | **Metabase Cloud** or **Power BI** | Managed polish vs spreadsheet familiarity |
| Needs **associative exploration** across many tables without strict SQL | **Qlik** | Different interaction model |

---

## Suggested HoneyGold footnotes for external marketing

1. **Apache Superset** is the upstream project; HoneyGold should spell out **what you add** (white-label defaults, realtime connectors, embedded chat, SLAs, managed hosting option if any).
2. **LLM:** Compare openly to **Metabase AI metering**, **QuickSight Q / Author Pro**, and **Fabric Copilot** — all either bundled at premium tiers or metered; your **usage-based LLM** is a transparent SMB-friendly story if quotas/caches are clear.
3. Re-run dollar columns quarterly from primary sources before putting this on a public pricing page.

---

## AWS hosting cost scenarios (Fargate + RDS metadata)

Indicative **compute / storage / ALB** ranges for SMB-shaped deployments are documented separately:

- **[honeygold-aws-hosting-costs.md](./honeygold-aws-hosting-costs.md)**

---

## Primary references

- [Microsoft Power BI pricing](https://www.microsoft.com/en-us/power-platform/products/power-bi/pricing)
- [Metabase pricing](https://www.metabase.com/pricing/)
- [Amazon QuickSight pricing](https://aws.amazon.com/quicksight/pricing/)
- [Google Looker pricing](https://cloud.google.com/looker/pricing)
- [Tableau pricing](https://www.tableau.com/pricing)
- [Qlik pricing](https://www.qlik.com/us/pricing)
- [Apache Superset](https://superset.apache.org/)
