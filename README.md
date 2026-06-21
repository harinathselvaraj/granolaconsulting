# Granola Consulting — Monorepo

Monorepo for `granolaconsulting.com` (marketing website) and the HoneyGold product app (`app.granolaconsulting.com`), hosted on Vercel with automatic deployments from this repo.

## Structure

```
apps/
  website/          → granolaconsulting.com (marketing site)
    public/         ← HTML pages, CSS, JS, images, fonts, downloads
    vercel.json     ← clean URLs, rewrites, 301 redirects
    package.json
  honeygold/        → app.granolaconsulting.com (HoneyGold product app)
    public/         ← sign-in, onboard, privacy, terms, sandbox pages
    vercel.json     ← clean URLs, legacy redirects
    package.json
honeygold/          → HoneyGold backend product (Docker / AWS)
docs/               → hosting and ops documentation
```

## Apps

### `apps/website` — Marketing site

**Domain:** `www.granolaconsulting.com` · `granolaconsulting.com`  
**Vercel project:** `granola-website`

| URL | File |
|-----|------|
| `/` | `index.html` |
| `/about` | `about.html` |
| `/contact` | `contact.html` |
| `/products` | `products.html` |
| `/products/:slug` | `product.html` (served via Vercel rewrite) |
| `/blog` | `blog/index.html` |
| `/blog/:slug` | `blog.html` (served via Vercel rewrite) |
| `/services` | `services.html` |

`cleanUrls: true` removes `.html` extensions. All legacy `.html` URLs (e.g. `/profile.html`, `/blogs.html`) 301-redirect to their new slug equivalents.

Product and blog content is loaded dynamically from `js/custom.js` (`PRODUCT_DETAILS`, `BLOG_POSTS`). The slug is read from the URL path (`/products/honeygold`) with fallback to query param (`?product=honeygold`) for backwards compatibility.

### `apps/honeygold` — HoneyGold product app

**Domain:** `app.granolaconsulting.com`  
**Vercel project:** `granola-honeygold`

| URL | File |
|-----|------|
| `/sign-in` | `sign-in.html` |
| `/login` | `login.html` |
| `/onboard` | `onboard.html` |
| `/privacy-policy` | `privacy-policy.html` |
| `/terms` | `terms.html` |
| `/sandbox` | `sandbox.html` |
| `/checkout-success` | `checkout-success.html` |
| `/enterprise-thanks` | `enterprise-thanks.html` |

## Local development

```bash
# Marketing site on http://localhost:8000
cd apps/website && npm run dev

# HoneyGold app on http://localhost:8001
cd apps/honeygold && npm run dev
```

## Deployment

Both apps deploy automatically to Vercel on every push to `main`:

| App | Vercel project | Root directory |
|-----|---------------|----------------|
| Marketing | `granola-website` | `apps/website` |
| HoneyGold | `granola-honeygold` | `apps/honeygold` |

Manual deploy (if needed):
```bash
cd apps/website  && npx vercel --prod
cd apps/honeygold && npx vercel --prod
```

## DNS (Cloudflare)

All three records must be set to **DNS only** (grey cloud) in Cloudflare:

| Type | Name | Value |
|------|------|-------|
| A | `@` (apex) | `76.76.21.21` |
| A | `www` | `76.76.21.21` |
| A | `app` | `76.76.21.21` |

Vercel provisions SSL automatically once the A records resolve.

## Editing content

- **Product pages:** `apps/website/public/js/custom.js` → `PRODUCT_DETAILS` object
- **Blog posts:** `apps/website/public/js/custom.js` → `BLOG_POSTS` array
- **HoneyGold sign-in logic:** `apps/honeygold/public/js/honeygold-signin.js`
- **HoneyGold onboarding:** `apps/honeygold/public/js/honeygold-onboard.js`
- **Sitemap:** `apps/website/public/sitemap.xml`
