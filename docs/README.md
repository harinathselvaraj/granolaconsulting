# Granola / HoneyGold documentation

Last updated: June 2026

## Start here

| Doc | What it covers |
|-----|----------------|
| [Project structure](project-structure.md) | Two-repo layout, folders, domains, data flow |
| [Deployment](deployment.md) | Vercel (frontends) + AWS (Starter gateway, CDK, hotfixes) |
| [Development](development.md) | Local dev, env vars, common tasks |
| [Hosting & DNS](hosting.md) | Domains, Cloudflare, legacy S3 notes |

## HoneyGold backend (nested repo)

The AWS/Docker backend lives in `honeygold/` with its own git history:

- **GitHub:** https://github.com/harinathselvaraj/honeygold
- **Runbook:** `honeygold/docs/developer-runbook.md`
- **CDK:** `honeygold/infra/aws/cdk/README.md`

## Product & architecture notes

| Doc | Topic |
|-----|--------|
| [honeygold-onboarding.md](honeygold-onboarding.md) | Starter/Business onboarding flows |
| [honeygold-starter-multitenancy-checklist.md](honeygold-starter-multitenancy-checklist.md) | Shared-pool tenancy checklist |
| [honeygold-cognito-google.md](honeygold-cognito-google.md) | Google sign-in / Cognito |
| [honeygold-stripe-billing.md](honeygold-stripe-billing.md) | Business billing |
| [honeygold-aws-hosting-costs.md](honeygold-aws-hosting-costs.md) | AWS cost notes |
| [honeygold-bi-comparison.md](honeygold-bi-comparison.md) | BI positioning |
