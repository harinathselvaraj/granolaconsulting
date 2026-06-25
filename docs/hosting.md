# Hosting & deployment

Last updated: June 2026

> **See also:** [deployment.md](deployment.md) (full deploy procedures) · [project-structure.md](project-structure.md) (architecture)

## Overview

| Host | Platform | Repo path | Deploy |
|------|----------|-----------|--------|
| `www.granolaconsulting.com`, `granolaconsulting.com` | **Vercel** | `apps/website` | Auto on `main`, or `npx vercel --prod` |
| `app.granolaconsulting.com` | **Vercel** | `apps/honeygold` | Auto on `main`, or `npx vercel --prod` |
| `admin.granolaconsulting.com` | **Vercel** | `apps/admin` | Auto on `main`, or `npx vercel --prod` |
| `honeygold.granolaconsulting.com` | **AWS** (ECS ALB) | `honeygold/` CDK | `npm run deploy:starter-pool` in `honeygold/infra/aws/cdk` |

The marketing site, product app, and admin console **no longer** use S3 static website hosting.

---

## Vercel — marketing & product app

### Projects

- **granola-website** → `apps/website` → apex + `www`
- **granola-admin** → `apps/admin` → `admin`

### Local dev

```bash
cd apps/website  && npm run dev   # http://localhost:8000
cd apps/honeygold && npm run dev   # http://localhost:8001
cd apps/admin    && npm run dev   # http://localhost:5173
```

### Production deploy

```bash
cd apps/website  && npx vercel --prod
cd apps/honeygold && npx vercel --prod
cd apps/admin    && npx vercel --prod
```

Set `VITE_*` env vars on the Vercel **granola-admin** project (see `apps/admin/.env.example`). After CDK deploy, refresh `VITE_ADMIN_API_BASE` from `HoneyGoldProvisioningControlStack` → `ProvisioningApiUrl` (use `/v1` base, not `/v1/v1`).

### Cloudflare DNS (Vercel)

Set to **DNS only** (grey cloud). Vercel provisions SSL.

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| A | `www` | `76.76.21.21` |
| A | `app` | `76.76.21.21` |
| A | `admin` | `76.76.21.21` |

---

## AWS — HoneyGold Starter gateway

`honeygold.granolaconsulting.com` points at the **Application Load Balancer** for the shared Starter pool (`HoneyGoldSharedPoolStack`).

### Cloudflare DNS

| Type | Name | Target |
|------|------|--------|
| CNAME | `honeygold` | `StarterPoolAlbDns` from CloudFormation |

Current ALB (eu-west-1, June 2026):

```
HoneyG-Gatew-QgWJDK9AWsKS-718929194.eu-west-1.elb.amazonaws.com
```

Refresh after redeploy:

```bash
aws cloudformation describe-stacks --stack-name HoneyGoldSharedPoolStack --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='StarterPoolAlbDns'].OutputValue" --output text
```

Use **DNS only** (grey cloud) unless you intentionally proxy through Cloudflare (may affect WebSockets / long-lived Superset sessions).

### CDK deploy (eu-west-1)

```bash
cd honeygold/infra/aws/cdk
npm run deploy:starter-pool          # full stack (first time or major changes)
npm run deploy:shared-pool           # gateway / MCP router only
npm run deploy:control               # provisioning Lambdas / API Gateway
```

If DynamoDB/S3 already exist outside CloudFormation, scripts use `-c adoptExistingStorage=true` (see `scripts/deploy-starter-pool.sh`).

### Wire product app to live AWS

HoneyGold sign-in/onboard pages embed API URLs in inline `<script>` blocks in `apps/honeygold/public/`. After Cognito or gateway changes, update from stack outputs:

```bash
cd honeygold
./scripts/sync-marketing-signin-config.sh    # print values
```

Then edit `apps/honeygold/public/sign-in.html` (and `onboard.html` if needed), commit, and redeploy Vercel (`apps/honeygold`).

Key values:

- `HG_SHARED_APP_URL` → `https://honeygold.granolaconsulting.com`
- `HG_ONBOARD_API_BASE` → `https://honeygold.granolaconsulting.com/api/v1`
- `HG_ENROLL_API_URL` → `https://honeygold.granolaconsulting.com/api/v1/accounts/enroll`
- `HG_COGNITO_*` → from `HoneyGoldCognitoStarterStack` outputs

---

## Legacy (retired)

| Item | Status |
|------|--------|
| `s3://www.granolaconsulting.com/` | Retired for marketing site |
| `s3://admin.granolaconsulting.com/` | Retired — use Vercel `apps/admin` |
| `createdesign_websites/copy_website_files_to_s3.sh` | Retired |
| `honeygold/scripts/deploy-marketing-site.sh` | S3-based; use Vercel deploy + config sync above |

---

## Content editing

| What | Where |
|------|-------|
| Product pages, blog, pricing copy | `apps/website/public/js/custom.js` |
| HoneyGold sign-in | `apps/honeygold/public/js/honeygold-signin.js` |
| HoneyGold onboard | `apps/honeygold/public/js/honeygold-onboard.js` |
| Sitemap | `apps/website/public/sitemap.xml` |
