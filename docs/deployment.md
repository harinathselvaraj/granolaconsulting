# Deployment guide

Last updated: June 2026 · Region: **eu-west-1** · AWS profile: typically `default`

## Quick reference

| Target | Trigger | Command |
|--------|---------|---------|
| Marketing site | Push `granolaconsulting` `main` | Auto Vercel, or `cd apps/website && npx vercel --prod` |
| Product app | Push `granolaconsulting` `main` | Auto Vercel, or see [Vercel honeygold](#vercel-granola-honeygold) below |
| Admin console | Push `granolaconsulting` `main` | Auto Vercel, or `cd apps/admin && npx vercel --prod` |
| Starter gateway | Push `honeygold` `main` + image deploy | `honeygold/infra/aws/cdk/scripts/rollout-gateway-only.sh` |
| CDK stacks | Manual | `cd honeygold/infra/aws/cdk && npm run deploy:*` |

**Do not use** legacy S3 deploy (`createdesign_websites/copy_website_files_to_s3.sh`) for marketing or product apps.

---

## Git workflow

### Monorepo (frontends)

```bash
cd www.granolaconsulting.com
git checkout main
git pull
# edit apps/website, apps/honeygold, or apps/admin
git add …
git commit -m "…"
git push origin main    # triggers Vercel for linked projects
```

### HoneyGold backend

```bash
cd www.granolaconsulting.com/honeygold
git checkout main
git pull
# edit gateway, CDK, MCP, etc.
git add …
git commit -m "…"
git push origin main
# then deploy AWS artifacts (below) — git push alone does not update ECS
```

---

## Vercel

### Projects

| Vercel project | Domain | Root directory (dashboard setting) |
|----------------|--------|----------------------------------|
| `granola-website` | `www.granolaconsulting.com` | `apps/website` |
| `granola-honeygold` | `app.granolaconsulting.com` | `apps/honeygold` |
| `granola-admin` | `admin.granolaconsulting.com` | `apps/admin` |

### Manual deploy (per app)

From each app directory (simplest):

```bash
cd apps/website  && npx vercel --prod
cd apps/admin    && npx vercel --prod
```

### Vercel `granola-honeygold`

The project root is `apps/honeygold` **relative to the monorepo root**. Running `npx vercel --prod` from inside `apps/honeygold` can fail (doubled path). Deploy from repo root:

```bash
cd www.granolaconsulting.com
cp -r apps/honeygold/.vercel .vercel
npx vercel deploy --prod --archive=tgz --yes
rm -rf .vercel
```

Or rely on **Git integration** after pushing to `main`.

### Admin env vars (Vercel dashboard)

Set on project **granola-admin** (see `apps/admin/.env.example`):

| Variable | Source |
|----------|--------|
| `VITE_ADMIN_API_BASE` | `HoneyGoldProvisioningControlStack` → `ProvisioningApiUrl` (use `…/v1`, not `…/v1/v1`) |
| `VITE_COGNITO_DOMAIN` | `HoneyGoldCognitoStarterStack` output |
| `VITE_COGNITO_CLIENT_ID` | Admin app client ID |
| `VITE_COGNITO_REGION` | `eu-west-1` |
| `VITE_COGNITO_REDIRECT_URI` | `https://admin.granolaconsulting.com/` |

Refresh after CDK deploy:

```bash
aws cloudformation describe-stacks --stack-name HoneyGoldProvisioningControlStack \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='ProvisioningApiUrl'].OutputValue" --output text
```

### Cloudflare DNS (Vercel hosts)

**DNS only** (grey cloud). Vercel provisions SSL.

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| A | `www` | `76.76.21.21` |
| A | `app` | `76.76.21.21` |
| A | `admin` | `76.76.21.21` |

---

## AWS — HoneyGold Starter

### Prerequisites

```bash
aws sso login   # or ensure AWS_PROFILE=default
export AWS_REGION=eu-west-1
cd honeygold/infra/aws/cdk
npm install
npm run build
```

### Full / ordered deploy

```bash
cd honeygold/infra/aws/cdk

npm run deploy:starter-pool      # secrets → storage → foundation → cognito → shared pool + control
npm run deploy:shared-pool       # gateway + MCP + Superset only (after first full deploy)
npm run deploy:control           # provisioning Lambdas / API Gateway only
```

Wrapper scripts live in `honeygold/infra/aws/cdk/scripts/`. Use `-c adoptExistingStorage=true` when DynamoDB/S3 pre-exist (see `deploy-starter-pool.sh`).

### Hotfix deploys (no full CDK)

Use when CDK stack deploy is blocked but you need new container/Lambda code live:

| Script | Updates |
|--------|---------|
| `scripts/rollout-gateway-only.sh` | Gateway ECS image (onboarding UI, auth, API proxy) |
| `scripts/rollout-shared-superset-only.sh` | Shared Superset ECS task |
| `scripts/rollout-mcp-starter-tools.sh` | MCP router + sidecar |

**Current ECS names** (refresh after stack recreate):

```bash
# Cluster
HoneyGoldSharedPoolStack-ClusterEB0386A7-1OwOHq0pFSTH

# Gateway service
HoneyGoldSharedPoolStack-GatewayService794C6FF6-glSinwSuJGEj
```

Override via env: `HG_ECS_CLUSTER`, `HG_GATEWAY_SERVICE`.

### Lambda-only updates

When `HoneyGoldProvisioningControlStack` deploy fails (e.g. missing exports), update individual functions:

```bash
cd honeygold/infra/aws/cdk
npm run build && npx cdk synth HoneyGoldProvisioningControlStack
# find asset hash in cdk.out/HoneyGoldProvisioningControlStack.template.json
# zip index.mjs and aws lambda update-function-code …
```

Functions include: `SendWelcomeEmailFn`, `ProvisionStarterTenantFn`, `EnrollAccountFn`, admin APIs.

### Gateway DNS

| Type | Name | Target |
|------|------|--------|
| CNAME | `honeygold` | `StarterPoolAlbDns` from `HoneyGoldSharedPoolStack` |

```bash
aws cloudformation describe-stacks --stack-name HoneyGoldSharedPoolStack --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='StarterPoolAlbDns'].OutputValue" --output text
```

Use **DNS only** in Cloudflare (grey cloud).

---

## Wire frontends to AWS

After Cognito or API changes, update **product app** globals in:

- `apps/honeygold/public/sign-in.html`
- `apps/honeygold/public/onboard.html` (if used)

Print reference values:

```bash
cd honeygold
./scripts/sync-marketing-signin-config.sh
```

Typical production values:

| Global | Example |
|--------|---------|
| `HG_SHARED_APP_URL` | `https://honeygold.granolaconsulting.com` |
| `HG_ONBOARD_API_BASE` | `https://honeygold.granolaconsulting.com/api/v1` |
| `HG_ENROLL_API_URL` | `https://honeygold.granolaconsulting.com/api/v1/accounts/enroll` |
| `HG_COGNITO_DOMAIN` | `https://honeygold-starter.auth.eu-west-1.amazoncognito.com` |
| `HG_COGNITO_CLIENT_ID` | from Cognito stack (Starter **user** client, not admin) |

Then commit monorepo and deploy Vercel (`apps/honeygold`).

---

## Post-deploy checks

```bash
# Vercel apps
curl -sI https://www.granolaconsulting.com | head -1
curl -sI https://app.granolaconsulting.com/sign-in | head -1
curl -sI https://admin.granolaconsulting.com | head -1

# Gateway
curl -sI https://honeygold.granolaconsulting.com/auth/google | head -1

# Provisioning API (via gateway)
curl -sI https://honeygold.granolaconsulting.com/api/v1/health 2>/dev/null | head -1
```

E2E (from `honeygold/`):

```bash
cd honeygold/e2e
npm install
npx playwright test --config playwright.prod.config.ts   # prod smoke (needs creds)
```

---

## Legacy (retired)

| Item | Replacement |
|------|-------------|
| `s3://www.granolaconsulting.com/` | Vercel `apps/website` |
| `s3://admin.granolaconsulting.com/` | Vercel `apps/admin` |
| `createdesign_websites/copy_website_files_to_s3.sh` | Vercel deploy |
| `honeygold/scripts/deploy-marketing-site.sh` | Vercel + `sync-marketing-signin-config.sh` |
