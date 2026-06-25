# HoneyGold Starter — shared Superset multi-tenancy checklist

This document is the **implementation checklist** for **Starter** tenants on the **shared HoneyGold pool**: one Superset deployment, one Superset metadata database, **per-tenant upload schema** in Postgres, and **RBAC** so tenants cannot see each other’s dashboards, charts, datasets, or database connections.

**Related:** [HoneyGold onboarding delivery plan](./honeygold-onboarding.md) · [AWS hosting costs](./honeygold-aws-hosting-costs.md) · [BI comparison](./honeygold-bi-comparison.md)

**Frontend entry points:** `honeygold-signin.html` → `POST /v1/accounts/enroll` · optional profile wizard `honeygold-onboard.html?plan=starter&tenantId=…` → `POST /v1/tenants/{tenantId}/onboarding`

---

## Architecture summary

| Layer | Starter (shared pool) | Business / Enterprise |
| ----- | --------------------- | --------------------- |
| **Superset compute** | Shared ECS Fargate service(s) | Dedicated ECS per tenant |
| **Superset metadata** | **One** RDS Postgres (all tenants) | Dedicated RDS per tenant |
| **Business / upload data** | Per-tenant schema in uploads Postgres (+ BYO warehouse) | Tenant-scoped DB / customer warehouse |
| **Isolation mechanism** | RBAC + DB grants + ownership (not separate metadata schemas) | Physical stack separation |

**Important:** A **separate schema per tenant in the analytics/uploads database** isolates **tables users query**. It does **not** isolate Superset **metadata objects** (dashboards, charts, dataset definitions). Those live in the shared metadata DB and require **roles and permissions**.

---

## A. Prerequisites (do once)

- [ ] **Shared Superset** on ECS Fargate (Starter does **not** get a dedicated task per signup)
- [ ] **One RDS Postgres** — Superset metadata (`SQLALCHEMY_DATABASE_URI`)
- [ ] **One RDS Postgres** (or separate database on same instance) — **File Uploads** store
- [ ] **Control plane** (Lambda/API in HoneyGold repo) runs provisioning on enroll
- [ ] **Superset service account** for REST API (create users, roles, databases, permissions)
- [ ] **IdP mapping**: every user has stable `tenant_id` (Cognito custom attribute or claim)
- [ ] **Secrets Manager** for per-tenant upload DB credentials
- [ ] **Quotas defined**: max upload GB, max file size, SQL Lab on/off, max BYO DB connections per tenant
- [ ] **Cost tags**: `tenant_id`, `plan=starter` on shared pool resources

---

## B. Superset baseline config (do once)

- [ ] Pin Superset image version; run `superset db upgrade` on metadata DB at deploy
- [ ] Create **minimal template role** for cloning (not Admin, not broad Gamma)
- [ ] Disable or restrict globally for Starter:
  - [ ] **SQL Lab** (recommended off initially)
  - [ ] **Publish dashboard to all users**
  - [ ] **Admin / Security** menus for tenant users
- [ ] Enable **CSV upload** if using Preset-style file uploads
- [ ] Configure **OAuth / FAB** so `tenant_id` is available on the session user
- [ ] (Recommended) **CustomSecurityManager** to filter list APIs by tenant (defense in depth)
- [ ] Document **BYO warehouse** policy: user-created connections must be tagged and permission-scoped

---

## C. Per-tenant signup — Postgres (File Uploads DB)

For each new `tenant_id` (e.g. `acme-a1b2c3` from enroll API):

- [ ] `CREATE SCHEMA uploads_<tenant_id>;`
- [ ] `CREATE ROLE hg_<tenant_id>_rw LOGIN PASSWORD '…';`
- [ ] Grants:
  - [ ] `GRANT USAGE, CREATE ON SCHEMA uploads_<tenant_id> TO hg_<tenant_id>_rw;`
  - [ ] `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA uploads_<tenant_id> TO hg_<tenant_id>_rw;`
  - [ ] `ALTER DEFAULT PRIVILEGES …` for future tables in schema
  - [ ] **No** grants on other schemas
- [ ] Store credentials: `honeygold/tenants/<tenant_id>/uploads-db` in Secrets Manager
- [ ] Insert control-plane record: `tenant_id`, schema name, role name, quotas, `created_at`

**Naming convention**

| Artifact | Pattern | Example |
| -------- | ------- | ------- |
| Schema | `uploads_<tenant_id>` | `uploads_acme-a1b2c3` |
| DB role | `hg_<tenant_id>_rw` | `hg_acme-a1b2c3_rw` |
| Superset role | `Tenant_<tenant_id>` | `Tenant_acme-a1b2c3` |
| Superset DB connection name | `File Uploads (<tenant_id>)` | `File Uploads (acme-a1b2c3)` |

---

## D. Per-tenant signup — Superset metadata (RBAC)

Run via Superset REST API (order matters):

### 1. Role

- [ ] `POST` create role `Tenant_<tenant_id>` (clone from minimal template)
- [ ] Confirm role has **no** `all_database_access`, `all_datasource_access`, `all_dashboard_access`, admin permissions

### 2. User

- [ ] Create Superset user (email from Cognito / enroll)
- [ ] Assign **only** `Tenant_<tenant_id>` (+ `Public` only if required for login and adds no data access)

### 3. File Uploads database connection

- [ ] Create Database `File Uploads (<tenant_id>)` with tenant role credentials
- [ ] Connection targets uploads Postgres; schema = `uploads_<tenant_id>`
- [ ] Grant role: `database_access` on **this** Database id only

### 4. Optional seed content

- [ ] Welcome dashboard owned by tenant user, **not** globally published
- [ ] Or clone from template dashboards with ownership transfer

### 5. MCP / HoneyGold app (if applicable)

- [ ] Issue MCP API key bound to `tenant_id`
- [ ] Set `mcpCallsPerMonth` / tool allowlist on tenant record (see onboarding doc)

---

## E. File upload flow (Preset-style UI)

When user uploads CSV in Superset:

- [ ] **Database** dropdown shows only `File Uploads (<tenant_id>)` (RBAC)
- [ ] **Schema** defaults to `uploads_<tenant_id>` (hide or lock in UI)
- [ ] Validate **table name** (safe charset, max length)
- [ ] After upload: register dataset; grant `datasource_access` to `Tenant_<tenant_id>` only; set owner = user
- [ ] Enforce quotas in control plane before accepting upload:
  - [ ] Total GB per tenant
  - [ ] Max file size / rows
  - [ ] Uploads per day

---

## F. BYO data warehouse (user-created connections)

Starter users may connect their own warehouse (Snowflake, BigQuery, Postgres, etc.):

- [ ] Allow connection creation only for users with `Tenant_<tenant_id>` role
- [ ] On create (hook, webhook, or periodic reconciler):
  - [ ] Store `tenant_id` in connection `extra` JSON
  - [ ] Grant `database_access` on that connection **only** to `Tenant_<tenant_id>`
- [ ] Reject or delete connections without `tenant_id` / created outside policy
- [ ] **Costs** of warehouse queries are borne by the customer (not HoneyGold infra)

---

## G. Charts & dashboards (user-created)

- [ ] New dashboards/charts **owned** by tenant user (not shared admin)
- [ ] **Published** = false unless explicitly shared inside tenant
- [ ] Datasets referenced must be in tenant’s permission set
- [ ] Regression test: Tenant A cannot open Tenant B dashboard URL

---

## H. Isolation verification (per tenant + CI)

Sign in as **Tenant A**:

- [ ] **Data → Databases**: only File Uploads (A) + A’s BYO connections
- [ ] **Data → Datasets**: no Tenant B names in list/search
- [ ] **Dashboards / Charts**: only A’s objects
- [ ] **SQL Lab** (if enabled): cannot query other schemas
- [ ] `GET /api/v1/dashboard/` returns no foreign tenant ids
- [ ] Upload table in A’s schema: invisible to Tenant B user

Repeat as **Tenant B**. Automate smoke tests on each control-plane deploy.

---

## I. Control plane API mapping (HoneyGold repo)

Align implementation with marketing-site flows:

### `POST /v1/accounts/enroll` (instant Starter)

**Request** (from `js/honeygold-signin.js`):

```json
{ "plan": "starter", "idToken": "<cognito-google-jwt>" }
```

**Response** (extend as needed):

```json
{
  "tenantId": "acme-a1b2c3",
  "status": "PROVISIONING",
  "provisioning": true,
  "appUrl": "https://app.honeygold.granolaconsulting.com/t/acme-a1b2c3",
  "apiKey": "hg_…"
}
```

**Server-side steps on enroll:**

1. Validate `idToken`; derive `email`, `tenant_id` (new or existing)
2. Postgres: schema + role + grants (section C)
3. Secrets Manager: write upload DB creds
4. Superset API: role → user → Database → permissions (section D)
5. DynamoDB: tenant record + MCP key
6. Return `appUrl`; frontend may poll until `READY`

### `POST /v1/tenants/{tenantId}/onboarding` (profile wizard)

**Request** (from `js/honeygold-onboard.js`):

```json
{
  "idToken": "…",
  "companyName": "Acme Ltd",
  "companyEmail": "ops@acme.com",
  "phone": "+353…",
  "occupation": "Analyst",
  "jobTitle": "Head of Data",
  "teamSize": "1-10",
  "primaryUseCase": "…"
}
```

- [ ] Persist profile on tenant record (billing, support, analytics)
- [ ] Does **not** require new ECS/RDS for Starter

### `GET /v1/tenants/{tenantId}/status` or shared-pool `workspace-status`

- [ ] Return `status`: `PROVISIONING` | `READY` | `FAILED`
- [ ] Optional `steps` for UI (lighter than Business CDK steps):

| Step key | Label (Starter UI) |
| -------- | ------------------ |
| `validating` | Validating your account |
| `provisioning_database` | Provisioning database schemas |
| `deploying_application` | Deploying Superset workspace |
| `health_checks` | Running health checks |
| `ready` | Finalizing your workspace |

---

## J. Starter provisioning script outline (pseudocode)

```text
function provisionStarterTenant(tenantId, email, idTokenClaims):
  assert sharedPoolReady()

  # Data plane
  pgAdmin.createSchema("uploads_" + tenantId)
  pgAdmin.createRole("hg_" + tenantId + "_rw", schema)
  secrets.put("honeygold/tenants/" + tenantId + "/uploads-db", creds)

  # Superset metadata plane
  superset.createRole("Tenant_" + tenantId, template="starter_tenant_template")
  superset.createUser(email, roles=["Tenant_" + tenantId])
  dbId = superset.createDatabase("File Uploads (" + tenantId + ")", creds, schema)
  superset.grantDatabaseAccess("Tenant_" + tenantId, dbId)

  # Control plane
  ddb.putTenant({ tenantId, plan: "starter", uploadSchema, supersetRole, quotas })
  apiKey = mcp.issueKey(tenantId)

  return { tenantId, appUrl, apiKey, status: "READY" }
```

---

## K. Operations & safety

- [ ] **Upgrades**: one Superset image + one metadata migration per release (not per tenant)
- [ ] **Backups**: metadata RDS + uploads RDS daily
- [ ] **Audit**: connection creates, uploads, role grants, enroll events
- [ ] **Offboarding**: disable user → revoke role → retention → optional `DROP SCHEMA`
- [ ] **Abuse**: rate limits on enroll, upload, API; optional malware scan on CSV
- [ ] **Monitoring**: shared ECS CPU/memory; uploads DB size by schema; Cost Explorer by tag

---

## L. What not to do

- [ ] Do **not** provision dedicated ECS/RDS per Starter signup (Business tier only)
- [ ] Do **not** assume warehouse schema isolation replaces Superset RBAC
- [ ] Do **not** use one shared “File Uploads” Superset connection for all tenants
- [ ] Do **not** leave broad Gamma-style permissions on tenant roles
- [ ] Do **not** rely on separate metadata DB schemas per tenant without custom Superset code (unsupported)

---

## M. Progress checklist (engineering)

### Marketing site (this repo)

- [x] Starter sign-in + enroll UI (`honeygold-signin.html`, `js/honeygold-signin.js`)
- [x] Starter profile wizard (`honeygold-onboard.html` starter mode, `js/honeygold-onboard.js`)
- [x] Shared-pool provisioning step labels in UI
- [ ] Link onboarding doc from Phase 2 control-plane PRs

### HoneyGold control plane (HoneyGold repo)

- [ ] `POST /v1/accounts/enroll` implements sections C + D
- [ ] Idempotent re-enroll for same email / tenant
- [ ] `POST /v1/tenants/{tenantId}/onboarding` persists profile only
- [ ] Quota enforcement for uploads
- [ ] BYO connection tagging + permission reconciler
- [ ] CustomSecurityManager deployed on shared Superset image
- [ ] Automated isolation tests (section H)

### Infra

- [ ] `HoneyGoldSharedPoolStack`: shared ECS + metadata RDS + uploads RDS
- [ ] No per-tenant CDK deploy on Starter path
- [ ] Business path unchanged (dedicated stack per job)

---

*Last updated: 2026-06-02*
