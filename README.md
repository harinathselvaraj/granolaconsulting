# Granola Consulting — Monorepo

Marketing site, HoneyGold product app, and admin console for [Granola Consulting](https://www.granolaconsulting.com). HoneyGold analytics backend (AWS) lives in a **nested repo** under `honeygold/`.

## Repositories

| Repo | GitHub | Role |
|------|--------|------|
| **This monorepo** | [granolaconsulting](https://github.com/harinathselvaraj/granolaconsulting) | Vercel frontends (`apps/*`) |
| **HoneyGold backend** | [honeygold](https://github.com/harinathselvaraj/honeygold) | ECS gateway, Superset, CDK, MCP (`honeygold/`) |

## Live sites

| Domain | App folder | Platform |
|--------|------------|----------|
| [granolaconsulting.com](https://www.granolaconsulting.com) | `apps/website` | Vercel |
| [app.granolaconsulting.com](https://app.granolaconsulting.com) | `apps/honeygold` | Vercel |
| [admin.granolaconsulting.com](https://admin.granolaconsulting.com) | `apps/admin` | Vercel |
| [honeygold.granolaconsulting.com](https://honeygold.granolaconsulting.com) | `honeygold/apps/starter-gateway` | AWS ECS |

## Documentation

| Doc | Description |
|-----|-------------|
| [**docs/project-structure.md**](docs/project-structure.md) | Full folder layout, domains, request flow |
| [**docs/deployment.md**](docs/deployment.md) | Vercel + AWS deploy steps |
| [**docs/development.md**](docs/development.md) | Local dev, common tasks |
| [**docs/hosting.md**](docs/hosting.md) | DNS, hosting topology |
| [**docs/README.md**](docs/README.md) | Index of all docs |
| [**honeygold/docs/developer-runbook.md**](honeygold/docs/developer-runbook.md) | Backend runbook, CDK, e2e |

## Quick start (frontends)

```bash
cd apps/website  && npm install && npm run dev   # :8000
cd apps/honeygold && npm install && npm run dev   # :8001
cd apps/admin    && npm install && npm run dev   # :5173
```

## Quick start (HoneyGold local stack)

```bash
cd honeygold
./scripts/hg-starter-local.sh up
# → http://localhost:8080
```

## Deploy cheat sheet

```bash
# Frontends — push main (auto Vercel) or:
cd apps/website  && npx vercel --prod
cd apps/admin    && npx vercel --prod

# HoneyGold backend — commit in honeygold/, then:
cd honeygold/infra/aws/cdk
npm run deploy:starter-pool              # full AWS stack
bash scripts/rollout-gateway-only.sh   # gateway hotfix
```

See [**docs/deployment.md**](docs/deployment.md) for full procedures.

## Workspace structure

```
apps/website/     → marketing
apps/honeygold/   → sign-in, onboard (Vercel)
apps/admin/       → admin console (Vite)
docs/             → documentation (this repo)
honeygold/        → backend (separate git — github.com/harinathselvaraj/honeygold)
```

## Editing content

- **Marketing:** `apps/website/public/js/custom.js`
- **HoneyGold sign-in:** `apps/honeygold/public/js/honeygold-signin.js`
- **HoneyGold onboard:** `apps/honeygold/public/js/honeygold-onboard.js`
- **Welcome emails:** `honeygold/infra/aws/cdk/lambdas/lib/email-templates.ts`
