# Granola Consulting Website

Static website for `www.granolaconsulting.com`.

## Structure

- **Pages**: `index.html`, `products.html`, `profile.html`, `contact.html`, `blogs.html`, `blog.html`
- **Product detail (dynamic)**: `product.html`
  - Renders different products based on the `product` query parameter (e.g. `product.html?product=honeygold`)
  - Content is populated by `js/custom.js` (`PRODUCT_DETAILS`, `loadProductDetail()`)
- **Styles**: `css/style.css`
- **Scripts**: `js/custom.js` + other JS utilities

## Product URLs

Examples:

- `https://www.granolaconsulting.com/product.html?product=honeygold`
- `https://www.granolaconsulting.com/product.html?product=cinnamon`

`js/custom.js` also accepts legacy aliases `name` and `project` for the slug query parameter.

HTML, CSS, and local JS use **paths relative to each page** (for example `css/style.css`, `js/custom.js`, `images/...`) so the site works when opened from disk as `file:///path/to/.../product.html?product=honeygold` **as long as the page lives next to the `css/`, `js/`, and `images/` folders**.

jQuery is loaded from `code.jquery.com`; you need a network connection for that script (and for Google Fonts links) unless you host a local copy and point the script tags at it.

Optional: you can still preview over HTTP with `python3 -m http.server` from the site folder and open `http://localhost:8000/product.html?product=honeygold`.

## Production hosting (Route53 + CloudFront + S3)

The site is moving from **Cloudflare DNS/proxy** to **AWS Route53 + CloudFront** (same pattern as **paytube.ie**). See **[docs/hosting/route53-migration.md](docs/hosting/route53-migration.md)** for cutover steps, ACM validation CNAMEs, and nameserver delegation.

Legacy Cloudflare notes (redirect rule + proxied CNAMEs) are below for reference during migration.

### Redirect: apex → `www`

- **Rule name:** Redirect from root to WWW  
- **Match:** wildcard URL `https://granolaconsulting.com/*`  
- **Action:** `**301` Permanent Redirect** to `https://www.granolaconsulting.com/${1}` (path preserved via `${1}`)  
- **Query string:** preserved

So `https://granolaconsulting.com/anything?x=1` becomes `https://www.granolaconsulting.com/anything?x=1`.

Cloudflare Single Redirect rule: apex domain to www

### DNS (summary)

Both website CNAMEs are **Proxied** (orange cloud) through Cloudflare.


| Type  | Name                    | Purpose (as configured)                                        |
| ----- | ----------------------- | -------------------------------------------------------------- |
| CNAME | `granolaconsulting.com` | Points to `**www.granolaconsulting.com`** (apex handled here)  |
| CNAME | `www`                   | Points to `**granolaconsulting.com.s3-…**` (static site on S3) |


Additional **TXT** records (shown as **DNS only** in Cloudflare):

- `**granolaconsulting.com`:** SPF `v=spf1 -all` (no mail send from this zone)  
- `**_dmarc`:** DMARC with `p=reject`  
- `***._domainkey`:** DKIM placeholder (`v=DKIM1; p=`)

DNS mode in the screenshot: **Full**.

Cloudflare DNS records for granolaconsulting.com

## Editing products

Product copy is in `js/custom.js` under `PRODUCT_DETAILS` (name/subtitle/intro/feature cards).