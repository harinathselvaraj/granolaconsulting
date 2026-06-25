# Local development

## Prerequisites

| Tool | Used for |
|------|----------|
| Node.js 20+ | Vercel apps, CDK, admin SPA |
| Docker Desktop | HoneyGold Starter local stack |
| AWS CLI v2 | CDK deploy, e2e against prod |
| Vercel CLI (optional) | Manual frontend deploys |

## Frontends (monorepo)

```bash
# Marketing — http://localhost:8000
cd apps/website && npm install && npm run dev

# Product app — http://localhost:8001
cd apps/honeygold && npm install && npm run dev

# Admin console — http://localhost:5173
cd apps/admin && npm install && npm run dev
```

Copy `apps/admin/.env.example` → `apps/admin/.env.local` for local admin API/Cognito values.

### Editing content

| What | File |
|------|------|
| Products, blog, pricing | `apps/website/public/js/custom.js` |
| Sign-in flow | `apps/honeygold/public/js/honeygold-signin.js` |
| Onboard wizard | `apps/honeygold/public/js/honeygold-onboard.js` |

Product app `sign-in.html` points at **production** AWS URLs by default. For local backend testing, temporarily override `window.HG_*` globals or use the HoneyGold local stack below.

---

## HoneyGold backend (local Starter stack)

Full stack runs from the **nested `honeygold/` repo**:

```bash
cd honeygold
cp .env.example .env          # if present
./scripts/hg-starter-local.sh up
./scripts/hg-starter-local.sh verify
```

Entry: **http://localhost:8080**

| Path | Service |
|------|---------|
| `/` | Marketing stub |
| `/app/` | starter-gateway |
| `/v1/` | local-control-plane |
| `/admin/` | admin-console (legacy) |

Teardown:

```bash
./scripts/hg-starter-local.sh down
```

Details: `honeygold/docs/developer-runbook.md`, `honeygold/docs/starter-local-dev.md`.

---

## CDK (typecheck / synth)

```bash
cd honeygold/infra/aws/cdk
npm install
npm run build
npm run synth
npm run test:email      # email template unit tests
npm run test:starter
```

---

## E2E tests

From `honeygold/e2e/`:

```bash
npm install
npx playwright test --config playwright.local.config.ts   # against docker stack
npx playwright test --config playwright.prod.config.ts    # against prod (careful)
```

---

## Common tasks

### Change welcome email links or copy

1. Edit `honeygold/infra/aws/cdk/lambdas/lib/email-templates.ts`
2. `npm run build && node --test test/email-templates.test.mjs`
3. Commit/push `honeygold` repo
4. Deploy `SendWelcomeEmailFn` + `ProvisionStarterTenantFn` (CDK or Lambda zip)

### Change onboarding progress UI

| Surface | File |
|---------|------|
| Gateway (`honeygold.granolaconsulting.com`) | `honeygold/apps/starter-gateway/onboarding_page.py` |
| Vercel (`app.granolaconsulting.com/onboard`) | `apps/honeygold/public/js/honeygold-onboard.js` |

Gateway: `rollout-gateway-only.sh`. Vercel: push monorepo `main`.

### Add / remove Starter tenant (ops)

```bash
cd honeygold/infra/aws/cdk
./scripts/delete-shared-rbac-tenant.sh <tenantId>
```

See admin console at `admin.granolaconsulting.com` for tenant status.

### Refresh admin API URL after CDK deploy

```bash
aws cloudformation describe-stacks --stack-name HoneyGoldProvisioningControlStack \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='ProvisioningApiUrl'].OutputValue" --output text
```

Update Vercel env `VITE_ADMIN_API_BASE` and redeploy admin.

---

## IDE / Cursor notes

- Monorepo `.gitignore` excludes `/honeygold/` — open `honeygold/` as part of the workspace but commit in that nested repo.
- Deploy rules for marketing: `.cursor/rules/deploy-granola-website.mdc` (Vercel, not S3).
