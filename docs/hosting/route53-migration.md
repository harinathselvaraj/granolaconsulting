# granolaconsulting.com — Cloudflare → Route53 + CloudFront

Mirrors **paytube.ie** (Route53 zone + CloudFront → S3 website origin).

## Reference (paytube.ie)

| Item | Value |
|------|--------|
| Route53 zone | `Z06683853KBR58H5HFTK2` |
| CloudFront | `E2M32X8K397HTJ` → `d3khdo8yzavxra.cloudfront.net` |
| Origin | `www.paytube.ie.s3-website-eu-west-1.amazonaws.com` |
| Apex | Route53 **A alias** → `www.paytube.ie` (same zone) |
| WWW | Route53 **A alias** → CloudFront (`Z2FDTNDATAQYW2`) |

## granolaconsulting.com (AWS)

| Item | Value |
|------|--------|
| Route53 zone | `Z0356625CW47RH3CK5NM` |
| S3 bucket | `www.granolaconsulting.com` (eu-west-1 website endpoint) |
| ACM cert (us-east-1) | `arn:aws:acm:us-east-1:214871066309:certificate/f1394601-352a-4e5c-bf63-77b3a3d0cd30` |
| Setup script | `createdesign_websites/setup-granolaconsulting-route53.sh` |

## Step 1 — ACM validation (while still on Cloudflare NS)

Public DNS still uses Cloudflare nameservers, so ACM must see validation CNAMEs **in Cloudflare** (or you switch NS first).

Add these **DNS only** (grey cloud) CNAME records in Cloudflare:

| Name | Target |
|------|--------|
| `_380b47b1ed685ac2bdfb6b1265f075d4` | `_209983da4a3fcad12c4a7dd1da74a603.jkddzztszm.acm-validations.aws` |
| `_61526794f2a4d0e8ca7e33d4b8e19ad6.www` | `_c02917c2a9da4e4b711252fb913e8725.jkddzztszm.acm-validations.aws` |

Wait until ACM status is **ISSUED** (AWS Console → Certificate Manager → us-east-1).

The same records are already in Route53 for after the NS cutover.

## Step 2 — Create CloudFront + Route53 website records

```bash
cd ~/Documents/createdesign_websites
export CERT_ARN=arn:aws:acm:us-east-1:214871066309:certificate/f1394601-352a-4e5c-bf63-77b3a3d0cd30
bash setup-granolaconsulting-route53.sh
```

This creates a distribution (like paytube), sets:

- `www.granolaconsulting.com` → CloudFront (A alias)
- `granolaconsulting.com` → `www` (A alias, apex → www)
- TXT / DMARC / DKIM (migrated from Cloudflare)

## Step 3 — Delegate DNS to Route53

At your **domain registrar** (where NS are set today), replace Cloudflare nameservers:

```
desi.ns.cloudflare.com
kai.ns.cloudflare.com
```

with Route53 delegation (run to list current values):

```bash
aws route53 get-hosted-zone --id Z0356625CW47RH3CK5NM \
  --query 'DelegationSet.NameServers' --output text
```

Typical set:

- `ns-605.awsdns-11.net`
- `ns-1352.awsdns-41.org`
- `ns-1996.awsdns-57.co.uk`
- `ns-84.awsdns-10.com`

Propagation can take up to 48 hours (often &lt; 1 hour).

## Step 4 — Cloudflare cleanup

After NS propagate:

1. Remove proxied website CNAMEs (`www`, apex) from Cloudflare (optional if zone inactive).
2. Remove apex → www **Redirect rule** (Route53 apex alias handles www).
3. Update `honeygold/cloudflare-dns` API token if you still use Cloudflare for sandbox CNAMEs only.

## Records migrated from Cloudflare

| Type | Name | Notes |
|------|------|--------|
| TXT | `granolaconsulting.com` | SPF (`-all` + Google include), Google site verification, UUID token |
| TXT | `_dmarc` | `p=reject` |
| TXT | `default._domainkey` | DKIM placeholder `v=DKIM1; p=` |

**Website:** Cloudflare proxied CNAMEs → **Route53 A aliases** → CloudFront → S3 (no orange-cloud proxy).

## HoneyGold sandboxes

Tenant hostnames (`{tenant}-honeygold.granolaconsulting.com`, Starter pool `honeygold.granolaconsulting.com`) are still created via **Cloudflare API** in `FinalizeJob` (sandboxes only). Moving those to Route53 requires a separate change (ALB alias records). Plan that after the marketing site cutover.

## Verify

```bash
dig NS granolaconsulting.com +short
dig A www.granolaconsulting.com +short
curl -sI https://www.granolaconsulting.com | head -5
```
