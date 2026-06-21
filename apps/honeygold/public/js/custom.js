/* Author: Granola Consulting */

var SITE_ORIGIN = "https://www.granolaconsulting.com"

function getQueryParam(paramName) {
    var q = window.location.search.substring(1)
    if (!q) {
        return null
    }
    var pairs = q.split("&")
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=")
        var key = decodeURIComponent(pair[0] || "")
        if (key === paramName) {
            return pair.length > 1 ? decodeURIComponent(pair[1].replace(/\+/g, " ")) : ""
        }
    }
    return null
}

/**
 * Relative paths for injected images so they work from `file://` and over HTTP.
 */
function siteAssetPath(relativePath) {
    return String(relativePath || "").replace(/^\//, "")
}

/** URL for a product detail page (same locally and on the server). */
function productDetailHref(slug) {
    var s = String(slug || "").toLowerCase()
    return "product.html?product=" + encodeURIComponent(s)
}

/** Canonical absolute URL for the product (share cards, link previews). */
function canonicalProductUrl(slug) {
    return SITE_ORIGIN + "/product.html?product=" + encodeURIComponent(String(slug).toLowerCase())
}

function linkedInShareHrefForProduct(slug) {
    return "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(canonicalProductUrl(slug))
}

function isSocialPreviewCrawler() {
    var ua = String(navigator.userAgent || "")
    return /LinkedInBot|facebookexternalhit|Facebot|Twitterbot|Slackbot|Pinterest|WhatsApp|TelegramBot|Discordbot|Googlebot|bingbot|Applebot/i.test(ua)
}

function updateLinkedInShareLinks(slug) {
    if (!slug) {
        return
    }
    var href = linkedInShareHrefForProduct(slug)
    var shareLinks = document.querySelectorAll(".linkedin-share-link")
    for (var k = 0; k < shareLinks.length; k++) {
        shareLinks[k].setAttribute("href", href)
    }
}

function canonicalBlogUrl(slug) {
    return SITE_ORIGIN + "/blog.html?name=" + encodeURIComponent(String(slug || "").toLowerCase())
}

function canonicalServiceUrl(slug) {
    return SITE_ORIGIN + "/service.html?name=" + encodeURIComponent(String(slug || "").toLowerCase())
}

function setCanonicalUrl(href) {
    var el = document.querySelector('link[rel="canonical"]')
    if (!el) {
        el = document.createElement("link")
        el.setAttribute("rel", "canonical")
        document.head.appendChild(el)
    }
    el.setAttribute("href", href)
}

function setMetaName(name, content) {
    if (!name || content == null || content === "") {
        return
    }
    var el = document.querySelector('meta[name="' + name.replace(/"/g, "") + '"]')
    if (!el) {
        el = document.createElement("meta")
        el.setAttribute("name", name)
        document.head.appendChild(el)
    }
    el.setAttribute("content", String(content))
}

function setMetaProperty(property, content) {
    if (!property || content == null || content === "") {
        return
    }
    var sel = 'meta[property="' + property.replace(/"/g, "") + '"]'
    var el = document.querySelector(sel)
    if (!el) {
        el = document.createElement("meta")
        el.setAttribute("property", property)
        document.head.appendChild(el)
    }
    el.setAttribute("content", String(content))
}

function setTwitterMeta(name, content) {
    if (!name || content == null || content === "") {
        return
    }
    var el = document.querySelector('meta[name="' + name.replace(/"/g, "") + '"]')
    if (!el) {
        el = document.createElement("meta")
        el.setAttribute("name", name)
        document.head.appendChild(el)
    }
    el.setAttribute("content", String(content))
}

function setJsonLdScript(id, jsonObject) {
    var sid = id || "granola-jsonld"
    var el = document.getElementById(sid)
    var text = JSON.stringify(jsonObject)
    if (!el) {
        el = document.createElement("script")
        el.type = "application/ld+json"
        el.id = sid
        document.head.appendChild(el)
    }
    el.textContent = text
}

function absoluteUrlFromSite(pathOrUrl) {
    var s = String(pathOrUrl || "")
    if (/^https?:\/\//i.test(s)) {
        return s
    }
    if (s.indexOf("//") === 0) {
        return "https:" + s
    }
    var p = s.replace(/^\//, "")
    return SITE_ORIGIN + "/" + p
}

function applySocialMetaForPage(opts) {
    var o = opts || {}
    var url = o.url || SITE_ORIGIN + "/"
    var title = o.title || "Granola Consulting"
    var description = o.description || ""
    var image = o.image ? absoluteUrlFromSite(o.image) : ""

    setMetaName("description", description)
    setMetaProperty("og:site_name", "Granola Consulting")
    setMetaProperty("og:type", o.type || "website")
    setMetaProperty("og:url", url)
    setMetaProperty("og:title", title)
    setMetaProperty("og:description", description)
    if (image) {
        setMetaProperty("og:image", image)
    }
    setTwitterMeta("twitter:card", image ? "summary_large_image" : "summary")
    setTwitterMeta("twitter:title", title)
    setTwitterMeta("twitter:description", description)
    if (image) {
        setTwitterMeta("twitter:image", image)
    }
}

/** Slug from `?product=`, `?name=`, or `?project=` query parameters. */
function getProductSlugFromUrl() {
    var q = getQueryParam("product") || getQueryParam("name") || getQueryParam("project")
    return q ? String(q).toLowerCase() : ""
}

function escapeHtml(str) {
    if (str == null || str === "") {
        return ""
    }
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

var PRODUCT_CARD_IMAGE_SIZES = "(max-width: 768px) 100vw, 680px"
var BLOG_CARD_IMAGE_SIZES = "(max-width: 768px) 100vw, 25vw"

function responsiveWebpImg(basePath, alt, width, height, opts) {
    var options = opts || {}
    var lazy = options.lazy !== false
    var lazyAttr = lazy ? ' loading="lazy" decoding="async"' : ""
    var sizes = options.sizes || PRODUCT_CARD_IMAGE_SIZES
    var base = siteAssetPath(basePath)
    return '<img width="' + width + '" height="' + height + '"' +
        ' src="' + base + '-800w.webp"' +
        ' srcset="' + base + '-400w.webp 400w, ' + base + '-800w.webp 800w"' +
        ' sizes="' + sizes + '"' +
        ' alt="' + escapeHtml(alt) + '"' + lazyAttr + " />"
}

function honeyGoldProductCardImg(alt) {
    var base = siteAssetPath("images/honeygold/honeygold_ai_chat")
    return '<img width="640" height="343"' +
        ' src="' + base + '-1400w.png"' +
        ' srcset="' + base + '-800w.webp 800w, ' + base + '-1400w.png 1400w"' +
        ' sizes="' + PRODUCT_CARD_IMAGE_SIZES + '"' +
        ' alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async" />'
}

function productCardImg(item) {
    if (item && item.slug === "honeygold") {
        return honeyGoldProductCardImg(item.title || "HoneyGold")
    }
    return responsiveWebpImg(item.imageBase, item.title, 640, 343)
}

function blogPostImg(imagePath, alt, width, height, opts) {
    var path = String(imagePath || "")
    if (/\.(png|jpe?g|gif|webp)$/i.test(path)) {
        var options = opts || {}
        var lazy = options.lazy !== false
        var lazyAttr = lazy ? ' loading="lazy" decoding="async"' : ""
        return '<img width="' + width + '" height="' + height + '"' +
            ' src="' + siteAssetPath(path) + '"' +
            ' alt="' + escapeHtml(alt) + '"' + lazyAttr + " />"
    }
    return responsiveWebpImg(path, alt, width, height, Object.assign({ sizes: BLOG_CARD_IMAGE_SIZES }, opts || {}))
}

function initCardMatchHeights() {
    if (!window.jQuery || !jQuery.fn.matchHeight) {
        return
    }
    if (document.getElementById("work-cards")) {
        jQuery("#work-cards .pod-text").matchHeight({ remove: true })
        jQuery("#work-cards .pod-text").matchHeight({ byRow: true })
    }
    if (document.getElementById("blog-cards")) {
        jQuery("#blog-cards .pod-text").matchHeight({ remove: true })
        jQuery("#blog-cards .pod-text").matchHeight({ byRow: true })
    }
}

var PRODUCT_CATALOG = [
    {
        slug: "honeygold",
        title: "HoneyGold",
        imageBase: "images/honeygold/honeygold_ai_chat",
        description: "Performance Intelligence: ask-your-business analytics, daily executive summaries, and early signals before KPIs drift.",
        url: "/products/honeygold",
        size: "grid-6 m-grid-6 s-grid-12 work-pod medium post"
    },
    {
        slug: "cinnamon",
        title: "Cinnamon",
        imageBase: "images/products/cinnamon-bg",
        description: "Personalized Matching & Recommendations: preference profiles and predictive notifications that stay relevant, not noisy.",
        url: "/products/cinnamon",
        size: "grid-6 m-grid-6 s-grid-12 work-pod medium post"
    },
    {
        slug: "berry",
        title: "Berry",
        imageBase: "images/products/berry-bg",
        description: "Computer Vision Inspection: automated visual checks, defect detection, and data capture from photos and documents.",
        url: "/products/berry",
        size: "grid-6 m-grid-6 s-grid-12 work-pod medium"
    },
    {
        slug: "slate",
        title: "Slate",
        imageBase: "images/products/slate-bg",
        description: "Predictive Pricing & Optimization: forecast outcomes, estimate ranges, and optimize thresholds using your historical signals.",
        url: "/products/slate",
        size: "grid-6 m-grid-6 s-grid-12 work-pod medium"
    },
    {
        slug: "tealsprout",
        title: "TealSprout",
        imageBase: "images/products/tealsprout-bg",
        description: "Compliance & Risk Automation: identity checks, screening workflows, and audit trails that are reviewable and traceable.",
        url: "/products/tealsprout",
        size: "grid-6 m-grid-6 s-grid-12 work-pod medium"
    },
    {
        slug: "oatmilk",
        title: "OatMilk",
        imageBase: "images/products/oatmilk-bg",
        description: "Bespoke Software Development & Maintenance: scoped builds, integrations, and ongoing support with clear ownership and SLAs.",
        url: "/products/oatmilk",
        size: "grid-6 m-grid-6 s-grid-12 work-pod medium"
    }
]

var BLOG_ORDER = [
    "honeygold-mcp-claude-desktop",
    "automate-business-reporting-llms",
    "gen-ai-enterprise-pilots-that-scale",
    "rag-grounding-trustworthy-answers",
    "llm-automation-guardrails"
]

var BLOG_POSTS = {
    "honeygold-mcp-claude-desktop": {
        "title": "Connect HoneyGold to Claude Desktop in 5 minutes",
        "date": "June 2026",
        "image": "images/honeygold_reporting.png",
        "description": "Install the HoneyGold .mcpb connector, paste your welcome-email API key, and ask Claude governed analytics questions — with a step-by-step video walkthrough.",
        "body": "<p>What if Claude could explore your dashboards, validate SQL, and answer data questions without opening another tab? This guide follows the same steps as our setup video and the <strong>welcome email</strong> you receive after Starter sign-up.</p><section class=\"blog-section\"><h2>Watch the walkthrough</h2><p>Prefer video? Follow along on YouTube (about 5 minutes). The thumbnail opens the full walkthrough in a new tab.</p><div class=\"blog-video\"><a href=\"https://www.youtube.com/watch?v=ns6wg0YTGbk\" rel=\"noopener noreferrer\" target=\"_blank\"><img src=\"https://img.youtube.com/vi/ns6wg0YTGbk/hqdefault.jpg\" alt=\"Connect Claude Desktop to HoneyGold Analytics\" width=\"720\" height=\"405\" loading=\"lazy\" decoding=\"async\"/><span class=\"blog-video-play\">▶ Watch on YouTube · 5 min setup</span></a></div></section><section class=\"blog-section\"><h2>What you need</h2><ul><li>A <strong>HoneyGold Starter</strong> account — <a href=\"/sign-in?product=honeygold&amp;plan=starter\">sign in with Google</a> (free, one user).</li><li><a href=\"https://claude.ai/download\" rel=\"noopener noreferrer\" target=\"_blank\">Claude Desktop</a> installed. You pay <strong>Anthropic</strong> for Claude; HoneyGold meters governed data access separately.</li><li>Your <strong>welcome email</strong> with workspace URL, <strong>MCP API key</strong> (<code>hg_…</code>), and connector download link.</li></ul><p>New sign-ups: the key arrives by email while your workspace provisions (usually 2–5 minutes). Returning users may also see the key on the <a href=\"/sign-in?product=honeygold&amp;plan=starter\">sign-in success screen</a>.</p></section><section class=\"blog-section blog-callout\"><h2>Credentials from your welcome email</h2><p>Collect these two values before opening Claude:</p><ul><li><strong>HoneyGold Base URL:</strong> <code>https://honeygold.granolaconsulting.com</code> (no trailing slash). Your personal workspace link opens the UI; the connector always uses this base URL.</li><li><strong>MCP API key:</strong> copy the full key from the block labelled <em>MCP API key (Claude Desktop connector)</em>. Treat it like a password — one key per Starter user.</li></ul></section><section class=\"blog-section\"><h2>Install the HoneyGold connector</h2><p>Use the official <strong>.mcpb</strong> extension (same file linked in your welcome email). No JSON config or remote URL setup.</p><div class=\"blog-download\"><a href=\"downloads/honeygold-analytics.mcpb\" class=\"view-more-btn\">Download HoneyGold connector (.mcpb)</a></div><ol><li>Install <a href=\"https://claude.ai/download\" rel=\"noopener noreferrer\" target=\"_blank\">Claude Desktop</a> if needed.</li><li>In Claude Desktop: <strong>Settings → Extensions → Advanced settings → Install Extension…</strong> and select <code>honeygold-analytics.mcpb</code>.</li><li>Enter <strong>HoneyGold Base URL</strong> <code>https://honeygold.granolaconsulting.com</code> and paste your <strong>MCP API key</strong>.</li><li>Open <strong>HoneyGold Analytics</strong> and toggle from <strong>Disabled</strong> to <strong>Enabled</strong>.</li><li>Under <strong>Tool permissions</strong>, choose <strong>Always allow</strong>.</li><li><strong>Restart Claude Desktop</strong>.</li></ol><p class=\"blog-note\"><strong>Do not</strong> use <strong>Connectors → Add custom connector</strong> with a remote HTTP URL. HoneyGold requires the local extension — not an HTTP <code>url</code> in <code>claude_desktop_config.json</code>.</p></section><section class=\"blog-section\"><h2>Verify the connection</h2><ol><li>Start a new chat in Claude Desktop.</li><li>Confirm HoneyGold tools appear — for example <em>honeygold_discover_analytics</em>.</li><li>Ask a plain-language question: <em>What dashboards are in my HoneyGold workspace?</em> or <em>Show sales by product line from the demo dataset.</em></li><li>Claude should return chart or SQL-grounded answers from your governed metrics.</li></ol></section><section class=\"blog-section\"><h2>Tips and troubleshooting</h2><ul><li><strong>200 MCP tool calls/month</strong> on Starter — prefer focused questions over long tool chains.</li><li><strong>Read-only tools</strong> on Starter; write actions need <a href=\"product.html?product=honeygold#hg-product-pricing-plans\">Business</a>.</li><li><strong>One key per user.</strong> Contact <a href=\"mailto:hello@granolaconsulting.com\">hello@granolaconsulting.com</a> if a key is exposed.</li><li>If tools do not load: confirm the extension is <strong>Enabled</strong>, base URL has no trailing slash, and <code>honeygold.granolaconsulting.com</code> is reachable.</li><li>Check spam if the welcome email has not arrived within a few minutes.</li></ul></section><section class=\"blog-section\"><h2>Upgrade path</h2><p>Need a dedicated AWS environment, SSO, or higher MCP limits? See <a href=\"product.html?product=honeygold#hg-product-pricing-plans\">HoneyGold plans</a> or <a href=\"/onboard?product=honeygold&amp;plan=business\">start Business onboarding</a>. Questions: <a href=\"mailto:hello@granolaconsulting.com\">hello@granolaconsulting.com</a>.</p></section>"
    },
    "automate-business-reporting-llms": {
        "title": "How to automate business reporting with LLMs",
        "date": "April 2026",
        "image": "images/blog/automate-business-reporting-llms",
        "description": "Turn structured exports into polished draft narratives and executive-ready summaries; route every change through review so speed and consistency stay balanced.",
        "body": "<h2>Start from data your teams already trust</h2><p>Automated reporting works best when the LLM receives clean, versioned inputs: warehouse exports, finance close packages, or BI extracts with stable field names. Define the canonical metrics and dimensions once, then generate natural-language commentary and section drafts from the same tables humans already reconcile.</p><h2>Design for review, not full autonomy</h2><p>Use the model to produce first-pass narratives, variance explanations, and email-ready summaries while routing every publish through a short approval path. Store prompts, source row hashes, and model versions so auditors can trace what changed between drafts.</p><h2>Operational tips</h2><p>Schedule generation after ETL completes, cap token use per report, and keep a human editor focused on judgment calls - wording tone, forward-looking language, and exceptions the data alone cannot justify.</p>"
    },
    "gen-ai-enterprise-pilots-that-scale": {
        "title": "Gen AI in the enterprise: pilots that scale",
        "date": "March 2026",
        "image": "images/blog/gen-ai-enterprise-pilots-that-scale",
        "description": "Start with Gen AI use cases that move real metrics, prove value with adoption and cost data, then scale winners into governed production with budgets and owners.",
        "body": "<h2>Pick problems with measurable before-and-after</h2><p>Strong pilots tie to cycle time, conversion, ticket volume, or cost per case, not generic “productivity.” Narrow scope, instrument baseline KPIs, and agree up front what would count as success or failure at ninety days.</p><h2>From demo to production</h2><p>Production needs identity, data access boundaries, rate limits, and an owner who can change prompts and eval suites without a full redeploy. Treat prompts and tools as configuration with version control, not one-off scripts in a notebook.</p><h2>Governance that helps velocity</h2><p>Lightweight risk tiers (public copy vs. PII vs. regulated advice) let most teams ship quickly while routing the sensitive flows through extra review. Revisit the tier list quarterly as models and regulators evolve.</p>"
    },
    "rag-grounding-trustworthy-answers": {
        "title": "RAG, grounding, and trustworthy answers",
        "date": "February 2026",
        "image": "images/blog/rag-grounding-trustworthy-answers",
        "description": "Invest in retrieval, chunking, and grounding, not only larger models, so answers trace to real policies, documents, and KPIs and risky hallucinations fall.",
        "body": "<h2>Retrieval is the product</h2><p>For internal Q&amp;A, support, and compliance assistants, the quality of chunks and metadata usually matters more than swapping to a larger foundation model. Invest in ingestion pipelines, deduplication, and clear titles so the retriever surfaces the right passage the first time.</p><h2>Ground answers in citations</h2><p>Ask the model to quote or summarize only from retrieved text, and surface those references in the UI. When retrieval confidence is low, fall back to search results or a human handoff instead of guessing.</p><h2>Evaluation loops</h2><p>Maintain a small golden set of real questions with expected citations and acceptable paraphrases. Regress that set whenever you change chunking, embeddings, or models so quality does not drift silently.</p>"
    },
    "llm-automation-guardrails": {
        "title": "LLM automation and responsible guardrails",
        "date": "January 2026",
        "image": "images/blog/llm-automation-guardrails",
        "description": "Pair LLM automation with access control, audit logs, and human checkpoints in regulated flows so work stays private, traceable, and explainable end to end.",
        "body": "<h2>Least privilege for models and tools</h2><p>Agents should use the same role-based access as people: scoped APIs, row-level security, and no silent elevation. If a workflow needs broader data, split it into a human-approved sub-step rather than giving the bot blanket read access.</p><h2>Logging and replay</h2><p>Record inputs, tool calls, outputs, and policy decisions (allow, block, escalate) for customer-facing and regulated flows. Retention and redaction rules should match your privacy program, not every log needs raw transcripts forever.</p><h2>Human checkpoints</h2><p>Use people for edge cases, high-stakes wording, and anything that could affect safety or fairness. Make escalation cheap: one-click handoff, full context bundle, and clear SLA so operators trust the automation.</p>"
    }
}

// List Blogs
function listBlogs() {
    var list = document.getElementById("blog-cards")
    if (!list) {
        return
    }
    var maxPosts = list.getAttribute("data-max-posts")
    maxPosts = maxPosts ? parseInt(maxPosts, 10) : BLOG_ORDER.length
    if (isNaN(maxPosts) || maxPosts < 1) {
        maxPosts = BLOG_ORDER.length
    }
    list.innerHTML = ""
    for (var i = 0; i < BLOG_ORDER.length && i < maxPosts; i++) {
        var slug = BLOG_ORDER[i]
        var post = BLOG_POSTS[slug]
        if (!post) {
            continue
        }
        var url = "blog.html?name=" + encodeURIComponent(slug)
        var title = post.title
        var date = post.date
        var description = post.description
        var imageBase = post.image

        var blog_template = `    
    <li class="grid-3 m-grid-6 s-grid-12 work-pod journal post">
        <a href="${url}" title="${escapeHtml(title)}">
            <div class="grid-12 work-pod-thumb">
                ${blogPostImg(imageBase, title, 640, 442)}
            </div>
            <div class="grid-12 pod-text">
                <div class="date">${date}</div>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(description)}</p>
            </div>
            <div class="grid-12 work-more">
                <div class="work-more-link flip up">
                    <figure class="rollover cube">
                        <img src="images/more-dark.svg" width="26" height="26" class="front" alt="" aria-hidden="true">
                        <img src="images/more-over.svg" width="26" height="26" class="back" alt="" aria-hidden="true">
                    </figure>
                </div>
            </div>
        </a>
    </li>`
        list.innerHTML += blog_template
    }
    initCardMatchHeights()
}

function loadBlogDetail() {
    var slug = getQueryParam("name")
    if (!slug) {
        window.location.href = "blogs.html"
        return
    }
    var post = BLOG_POSTS[slug]
    if (!post) {
        window.location.href = "blogs.html"
        return
    }

    document.title = post.title + " - Granola Consulting"

    var blogUrl = canonicalBlogUrl(slug)
    setCanonicalUrl(blogUrl)
    applySocialMetaForPage({
        url: blogUrl,
        title: post.title + " | Granola Consulting",
        description: post.description,
        image: post.image,
        type: "article"
    })
    setJsonLdScript("granola-blog-jsonld", {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        image: absoluteUrlFromSite(post.image),
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": blogUrl
        }
    })

    var titleWrap = document.getElementsByClassName("blog-entry-title")[0]
    var dateEl = document.getElementsByClassName("blog-entry-date")[0]
    var leadEl = document.getElementsByClassName("blog-entry-lead")[0]
    var featuredEl = document.getElementsByClassName("blog-featured")[0]
    var contentEl = document.getElementsByClassName("blog-entry-content")[0]

    if (titleWrap) {
        titleWrap.innerHTML = '<h1 class="entry-title">' + post.title + "</h1>"
    }
    if (dateEl) {
        dateEl.textContent = post.date
    }
    if (leadEl) {
        leadEl.textContent = post.description
    }
    if (featuredEl) {
        featuredEl.innerHTML = blogPostImg(post.image, post.title, 920, 600, { lazy: false })
    }
    if (contentEl) {
        contentEl.innerHTML = post.body
    }

    renderOtherBlogs(slug)
}

function renderOtherBlogs(activeSlug) {
    var wrap = document.getElementsByClassName("other-blogs")[0]
    if (!wrap) {
        return
    }

    var current = String(activeSlug || "").toLowerCase()
    var picks = []

    // Prefer next 3 in the blog order (excluding current)
    var idx = BLOG_ORDER.indexOf(current)
    if (idx === -1) {
        idx = 0
    }
    for (var i = 1; i <= BLOG_ORDER.length; i++) {
        var s = BLOG_ORDER[(idx + i) % BLOG_ORDER.length]
        if (s && s !== current) {
            picks.push(s)
        }
        if (picks.length >= 3) {
            break
        }
    }

    var html = ""
    html += "<div class=\"related-posts\">"
    html += "<h1 class=\"entry-title\">Other blogs</h1>"
    html += "<hr/>"
    html += "<ul>"
    for (var k = 0; k < picks.length; k++) {
        var slug = picks[k]
        var post = BLOG_POSTS[slug]
        if (!post) continue
        var href = "blog.html?name=" + encodeURIComponent(slug)
        html += `
          <li class="grid-4 m-grid-6 s-grid-12 work-pod journal post">
            <a href="${href}" title="${escapeHtml(post.title)}">
              <div class="grid-12 work-pod-thumb">
                ${blogPostImg(post.image, post.title, 640, 442)}
              </div>
              <div class="grid-12 pod-text">
                <div class="date">${escapeHtml(post.date || "")}</div>
                <h2>${escapeHtml(post.title)}</h2>
                <p>${escapeHtml(post.description || "")}</p>
              </div>
              <div class="grid-12 work-more">
                <div class="work-more-link flip up">
                  <figure class="rollover cube">
                    <img src="images/more-dark.svg" width="26" height="26" class="front">
                    <img src="images/more-over.svg" width="26" height="26" class="back">
                  </figure>
                </div>
              </div>
            </a>
          </li>
        `
    }
    html += "</ul></div>"
    wrap.innerHTML = html

    if (window.jQuery && jQuery.fn.matchHeight) {
        jQuery(".other-blogs .pod-text").matchHeight({ remove: true })
        jQuery(".other-blogs .pod-text").matchHeight({ byRow: true })
    }
}

var SERVICE_POSTS = {
    "brand-identity": {
        "title": "Brand Identity",
        "tagline": "Visual systems, narrative, and campaigns, accelerated with AI-assisted exploration while your strategists and designers stay in the loop.",
        "image": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=920&h=600&fit=crop",
        "sections": [
            {
                "title": "Design and Content Development",
                "body": "<p>We pair mood boards, layout systems, and copy decks with LLM-assisted variants and tone checks so you see more credible directions in the first week, not a blank page. Humans curate the shortlist; models handle volume, translation drafts, and accessibility passes on alt text and contrast notes.</p>"
            },
            {
                "title": "Brand Development",
                "body": "<p>Positioning workshops stay human-led, while AI helps stress-test naming, taglines, and manifestos against competitor language and search intent. The outcome is a tighter story architecture you can ship across markets without losing a single source of truth.</p>"
            },
            {
                "title": "Digital Marketing Content",
                "body": "<p>From social snippets to landing hero copy, we orchestrate prompts, brand guardrails, and approval workflows so creative teams scale output without diluting voice. Performance data feeds back into briefs so the next generation of assets learns what actually converted.</p>"
            },
            {
                "title": "Illustration",
                "body": "<p>Custom illustration still starts with art direction and sketch discipline; generative tools accelerate exploration, color studies, and pattern fills under explicit style guides. Final delivery remains illustrator-reviewed for brand fit and print or motion technical specs.</p>"
            }
        ]
    },
    "website-design": {
        "title": "Website Design",
        "tagline": "Responsive, conversion-aware sites where UX research, component libraries, and AI copilots shorten build cycles without skipping craft.",
        "image": "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=920&h=600&fit=crop",
        "sections": [
            {
                "title": "Responsive Websites",
                "body": "<p>We prototype breakpoints faster by generating structured content samples and edge-case copy, then validate with real devices and analytics. LLMs draft meta descriptions, schema hints, and internal link suggestions your editors can approve in one pass.</p>"
            },
            {
                "title": "Product Landing Websites",
                "body": "<p>Launch pages benefit from rapid headline and CTA experiments: models propose variants grounded in your value props, while we measure lift and lock the winners. The stack stays lightweight so product marketing can iterate without filing a full dev ticket every time.</p>"
            },
            {
                "title": "UX Design & Development",
                "body": "<p>User flows, wireframes, and accessibility annotations are still designer-owned; AI assists with heuristic critiques, survey summarization, and test-session notes so insights land in Figma the same day. Developers get component specs and copy in sync, cutting rework.</p>"
            },
            {
                "title": "Ecommerce Websites",
                "body": "<p>Catalog ingestion, attribute cleanup, and SEO-friendly descriptions scale with retrieval-aware LLM pipelines tied to your PIM. Checkout and merchandising UX remain handcrafted, with models handling bulk seasonal refreshes and promo microcopy under strict guardrails.</p>"
            }
        ]
    },
    "software-development": {
        "title": "Software Development",
        "tagline": "Web, mobile, and business applications built with modern stacks. Developers use AI for speed on boilerplate, tests, and docs while security reviews stay mandatory.",
        "image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=920&h=600&fit=crop",
        "sections": [
            {
                "title": "Web Apps",
                "body": "<p>We ship SPA and SSR experiences with CI pipelines where copilots draft components and unit tests that engineers refine. Architecture, threat modeling, and performance budgets are never delegated. AI accelerates execution, not accountability.</p>"
            },
            {
                "title": "Android & iOS Apps",
                "body": "<p>Native and cross-platform releases lean on AI for localization, release-note drafting, and crash-log clustering so your backlog stays prioritized. UI motion and platform guidelines still get senior mobile craft time.</p>"
            },
            {
                "title": "CRM Apps",
                "body": "<p>Custom CRM views, automations, and forecasting hooks integrate with your data model; LLMs summarize pipeline commentary and suggest next-best actions sales leaders can accept or edit. Every suggestion is permission-scoped to the sales rep's territory.</p>"
            },
            {
                "title": "Payment Gateway Integration",
                "body": "<p>PCI-sensitive paths are implemented to spec with audited libraries. Outside the vault, AI helps reconcile settlement anomalies and customer comms templates while humans sign off on anything regulatory.</p>"
            },
            {
                "title": "API Integration",
                "body": "<p>We map partner APIs, error budgets, and retry policies first, then use assistants to stub clients, generate contract tests, and keep OpenAPI docs fresh as endpoints evolve. That keeps integrations maintainable when vendors ship breaking changes.</p>"
            },
            {
                "title": "Content Management System",
                "body": "<p>Headless or traditional CMS setups include editor-friendly guardrails, preview workflows, and optional Gen AI panels for structured fields (summaries, FAQs) with publish gates. Your content team moves faster without bypassing brand or legal review.</p>"
            }
        ]
    },
    "marketing-communications": {
        "title": "Marketing & Communications",
        "tagline": "Omnichannel programs where measurement, creative velocity, and responsible AI amplification work together, not as a substitute for strategy.",
        "image": "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=920&h=600&q=75",
        "sections": [
            {
                "title": "Email & SMS Campaigns",
                "body": "<p>Lifecycle journeys stay mapped to segments and consent records; LLMs help draft personalized variants, subject-line matrices, and send-time experiments analysts can score. Deliverability monitoring and suppression logic remain automated but human-audited.</p>"
            },
            {
                "title": "Social Media Content & Design",
                "body": "<p>Creative teams set visual templates and voice rules, then scale platform-native posts with AI-assisted resizing, caption batches, and trend summaries. Community managers get suggested replies for FAQs, always editable before anything goes public.</p>"
            },
            {
                "title": "Search Engine Optimization",
                "body": "<p>Technical SEO fixes, structured data, and content clusters are prioritized from crawl data; models assist with gap analysis, outline drafts, and internal linking maps strategists validate. Rankings still depend on quality and authority. We do not chase spammy shortcuts.</p>"
            },
            {
                "title": "Paid Google & Social Media Ads",
                "body": "<p>Media buyers define audiences and caps; AI proposes creative rotations, negative-keyword mining, and post-click copy tests within your compliance dictionary. Reporting narratives auto-summarize spend pacing so stakeholders see the story, not only the spreadsheet.</p>"
            }
        ]
    },
    "event-management": {
        "title": "Event Management",
        "tagline": "Corporate experiences where logistics stay meticulous and AI removes friction. Schedules, speaker support, and attendee comms scale without losing the human welcome.",
        "image": "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=920&h=600&q=75",
        "sections": [
            {
                "title": "Corporate Festivals",
                "body": "<p>Large footprints need vendor coordination, crowd flow, and brand activations. We use AI to draft run-of-show drafts, staffing matrices, and multilingual signage while producers own safety and sponsor promises on site.</p>"
            },
            {
                "title": "Conferences",
                "body": "<p>Speaker onboarding, session abstracts, and attendee Q&amp;A routing benefit from LLM summarization and chatbots trained only on approved FAQs. Stage design and AV cues remain in expert hands; bots never improvise policy answers.</p>"
            },
            {
                "title": "Product Launches",
                "body": "<p>Countdown communications, press kits, and demo scripts iterate quickly with AI-assisted rewrites keyed to positioning docs. Launch-day war rooms get live note synthesis so marketing and product align on messaging pivots in minutes.</p>"
            },
            {
                "title": "Summer Parties",
                "body": "<p>Even celebratory events need budgets, playlists, and photo releases handled cleanly. Creative concepts and vendor shortlists expand faster with mood-driven references; your team picks the vibe, we handle contracts and contingency planning.</p>"
            }
        ]
    }
}

function loadServiceDetail() {
    var slug = getQueryParam("name")
    if (!slug) {
        window.location.href = "profile.html#services"
        return
    }
    var svc = SERVICE_POSTS[slug]
    if (!svc) {
        window.location.href = "profile.html#services"
        return
    }

    document.title = svc.title + " - Services | Granola Consulting"

    var svcUrl = canonicalServiceUrl(String(slug).toLowerCase())
    setCanonicalUrl(svcUrl)
    applySocialMetaForPage({
        url: svcUrl,
        title: svc.title + " | Granola Consulting",
        description: svc.tagline,
        image: svc.image,
        type: "article"
    })

    var titleWrap = document.getElementsByClassName("service-entry-title")[0]
    var leadEl = document.getElementsByClassName("service-entry-lead")[0]
    var featuredEl = document.getElementsByClassName("service-featured")[0]
    var sectionsEl = document.getElementsByClassName("service-sections")[0]

    if (titleWrap) {
        titleWrap.innerHTML = '<h1 class="entry-title">' + escapeHtml(svc.title) + "</h1>"
    }
    if (leadEl) {
        leadEl.textContent = svc.tagline
    }
    if (featuredEl) {
        featuredEl.innerHTML = '<img src="' + svc.image + '" alt="" width="920" height="600" />'
    }
    if (sectionsEl) {
        var html = ""
        for (var i = 0; i < svc.sections.length; i++) {
            var sec = svc.sections[i]
            html += '<article class="services service-area"><h2>' + escapeHtml(sec.title) + "</h2>" + sec.body + "</article>"
        }
        sectionsEl.innerHTML = html
    }
}

// List Products
function listProducts() {
    var list = document.getElementById("work-cards")
    if (!list || list.children.length > 0) {
        return
    }

    for (var i = 0; i < PRODUCT_CATALOG.length; i++) {
        var item = PRODUCT_CATALOG[i]
        var card = `
            <li class="${item.size} product product-${escapeHtml(item.slug)}">
                <a href="${item.url}" title="${escapeHtml(item.title)}">
                    <div class="grid-12 work-pod-thumb">
                        ${productCardImg(item)}
                    </div>
                    <div class="grid-12 pod-text">
                        <h2>${escapeHtml(item.title)}</h2>
                        <p>${escapeHtml(item.description)}</p>
                    </div>
                    <div class="grid-12 work-more">
                        <div class="work-more-link flip up">
                            <figure class="rollover cube">
                                <img src="images/more.svg" width="26" height="26" class="front" alt="" aria-hidden="true">
                                <img src="images/more-over.svg" width="26" height="26" class="back" alt="" aria-hidden="true">
                            </figure>
                        </div>
                    </div>
                </a>
            </li>
        `
        list.innerHTML += card
    }

    initCardMatchHeights()
}

// Backwards compatibility (if any page still calls listWorks)
function listWorks() {
    listProducts()
}

// Load footer content
function loadFooter() {
    var footer = document.getElementsByClassName("site-footer")[0]
    if (!footer || footer.children.length > 0) {
        return
    }
    var content = `
            <div class="footer-content">
            <hr/>
            <h2><a href="mailto:hello@granolaconsulting.com" target="_blank">hello@granolaconsulting.com</a><!-- | Dogpatch Labs, The CHQ Building, Custom House Quay, Dublin, Ireland --></h2>
            <h3>© 2025 Granola Consulting. All rights reserved</h3>
        </div>
        <div class="footer-mobile">
            <hr/>
            <h2><a href="mailto:hello@granolaconsulting.com" target="_blank">hello@granolaconsulting.com</a><!--<br/>
                Dogpatch Labs, The CHQ Building, Custom House Quay, Dublin, Ireland--></h2>
            <h3>© 2025 Granola Consulting. All rights reserved</h3>
        </div>
    `
    footer.innerHTML = content
}

// Load mini logo
function loadMiniLogo() {
    var logo = document.getElementsByClassName("logo")[0]
    if (!logo || logo.children.length > 0) {
        return
    }
    logo.innerHTML = '<img src="' + siteAssetPath("images/granola_logo_mini.svg") + '" alt="Granola Consulting" width="120" height="30" decoding="async">'
}

var PRODUCT_DETAILS = {
    "honeygold": {
        "name": "HoneyGold",
        "subtitle": "Performance Intelligence",
        "overview": "Ask-your-business analytics, daily executive summaries, and early signals before KPIs drift.",
        "heroConversion": {
            "headline": "Ask your business questions in plain English, and get governed answers, not another dashboard hunt.",
            "subhead": "Start free on a shared environment, or deploy a dedicated AWS stack for your team. Use Claude Desktop with the HoneyGold MCP connector. You pay Anthropic for Claude; we govern data access.",
            "bullets": [
                "Claude Desktop + HoneyGold MCP for dashboards, datasets, and governed metrics",
                "Executive summaries and anomaly alerts in Superset when you want operational views, not only chat",
                "Business tier: dedicated ECS + RDS per customer; SSO and team seats included"
            ],
            "trustLine": "Free Starter · 1 user · Google sign-in · No credit card",
            "pricingStrip": [
                { "label": "Starter", "price": "Free forever", "href": "/sign-in?plan=starter" },
                { "label": "Business", "price": "from €699/mo*", "href": "#hg-product-pricing-plans" },
                { "label": "Enterprise", "price": "Contact us", "href": "/onboard?product=honeygold&plan=enterprise" }
            ],
            "primaryCta": { "label": "Start free with Google", "href": "/sign-in?plan=starter" },
            "secondaryCta": { "label": "See plans & pricing", "href": "#hg-product-pricing-plans" }
        },
        "heroGallery": [
            {
                "src": "images/honeygold/honeygold_ai_chat.png",
                "alt": "HoneyGold AI chat: ask-your-business analytics"
            },
            {
                "src": "images/honeygold/honeygold_dashboard.png",
                "alt": "HoneyGold performance dashboard"
            },
            {
                "src": "images/honeygold/honeygold_admin.png",
                "alt": "HoneyGold admin and configuration"
            }
        ],
        "platformExtraImage": {
            "src": "images/honeygold_claude_integration.png",
            "alt": "HoneyGold Claude Desktop MCP integration"
        },
        "intro": [
            "HoneyGold is Granola performance intelligence for the KPIs your team already trusts: it turns dashboards into concise answers, daily briefings, and early drift signals executives can brief from.",
            "It anchors on dimensional breakdowns, credible variance, and driver context tied to curated metric definitions, not ad hoc spreadsheet hunts that never quite reconcile.",
            "AI powers the conversational surface: natural-language questions, auto-generated summaries, and plain-language anomaly notes that cite the slices, thresholds, and rules behind each highlight.",
            "Retrieval-style grounding and deterministic policies keep outputs tied to approved warehouses, extracts, or governed views; you own segments, lineage expectations, and access boundaries.",
            "The aim is faster alignment between data stewards and decision-makers: less time reconciling charts, more time deciding what to do next while humans stay accountable for the guardrails."
        ],
        "featureCards": [
            {
                "title": "Ask-Your-Business Q&A",
                "body": "Stop hunting through spreadsheets and dashboards. Ask plain-language questions and get concise answers grounded in your trusted KPIs and definitions. HoneyGold can break down results by region, product, channel, or time window. Every answer is designed to be decision-ready, not just a number."
            },
            {
                "title": "Daily Exec Summaries",
                "body": "Start the day with a short, structured summary of what changed and why. HoneyGold compiles the most important movements across revenue, operations, and customer signals. Summaries are consistent in tone and format, so leadership can scan quickly. You keep control over what gets highlighted and who receives it."
            },
            {
                "title": "KPI Anomaly Alerts",
                "body": "Catch unexpected shifts early, before they become costly surprises. HoneyGold monitors agreed metrics and flags unusual movement with clear context. Alerts focus on relevance, not noise, by using thresholds and business rules you define. Teams get notified with the “so what” and suggested next checks."
            },
            {
                "title": "Driver Analysis & Recommendations",
                "body": "When a KPI moves, HoneyGold helps pinpoint the likely drivers behind the change. It surfaces contributing segments and explains the impact in plain language. Recommendations are practical and framed as options, not autopilot decisions. This helps teams move from reporting to action faster."
            },
            {
                "title": "Signal Dashboards",
                "body": "Turn raw metrics into a small set of signals your team can actually run. HoneyGold highlights leading indicators, not just lagging outcomes, so you can intervene earlier. Dashboards stay lightweight and aligned to the business questions that matter. You can iterate signals as strategy and targets evolve."
            },
            {
                "title": "Decision-Ready Narratives",
                "body": "Numbers are only useful when they tell a clear story. HoneyGold converts changes, variance, and context into short narratives you can paste into emails or board packs. Each narrative stays grounded in the same data your team reconciles. The result is faster alignment and fewer “what does this mean?” meetings."
            }
        ],
        "sections": [
            {
                "title": "What it does",
                "bullets": [
                    "Natural-language Q&A over your KPIs and operational data",
                    "Automated executive summaries delivered on a schedule",
                    "Early-warning alerts with drivers and recommended actions"
                ]
            },
            {
                "title": "Typical inputs",
                "bullets": ["Warehouse tables or exports", "CRM and support metrics", "Finance and ops reporting feeds"]
            },
            {
                "title": "Outputs",
                "bullets": ["Daily/weekly summaries", "Alerting and signal dashboards", "Decision-ready narratives with context"]
            }
        ],
        "pricingTables": {
            "title": "Plans & hosted infrastructure",
            "lead": "Starter runs on a shared HoneyGold pool (free, one user). Business and Enterprise get a dedicated ECS Fargate service and PostgreSQL metadata database per customer. Use Claude Desktop with the HoneyGold MCP connector on any tier. You pay Anthropic for Claude; HoneyGold meters governed data access via MCP.",
            "pricingContrast": {
                "title": "Infrastructure-first pricing vs traditional BI",
                "body": "Tableau Cloud and Microsoft Power BI typically charge per viewer or per user role. HoneyGold Business is priced around dedicated infrastructure and team seats; broad read access is available without a per-seat tax via our Unlimited viewers pack."
            },
            "comparison": {
                "columns": ["", "Starter", "Business", "Enterprise"],
                "rows": [
                    ["Starting at", "Free forever", "€699 / mo* · €7,549 / yr ex VAT", "Contact us"],
                    ["Infrastructure", "Shared pool", "Dedicated ECS + RDS per tenant", "Dedicated ECS + RDS · multi-region available"],
                    ["Compute", "Shared pool (fair use)", "2 vCPU · 4 GB RAM (M tier)", "Custom"],
                    ["Users included", "1 creator", "8 creators, 50 viewers", "Custom"],
                    ["AI access (Claude Desktop + MCP)", "200 MCP tool calls / mo", "5,000 MCP tool calls / mo", "Custom (usage-based)"],
                    ["MCP tools", "Read-only (dashboards, datasets, charts)", "Read-only + governed query (roadmap)", "Full surface + custom connectors"],
                    ["Metadata storage included", "Demo dataset", "100 GB", "Custom"],
                    ["File upload storage", "2 GB", "50 GB", "Custom"],
                    ["Data egress included", "50 GB / mo", "500 GB / mo", "Custom"],
                    ["Data ingress included", "25 GB / mo", "250 GB / mo", "Custom"],
                    ["SSO (SAML / OIDC)", "Not included", "Included", "Included"],
                    ["SCIM user provisioning", "Not included", "Add-on / on request", "Included"],
                    ["Data residency", "EU shared pool", "EU default region", "Region choice + multi-region"],
                    ["Uptime SLA", "Best effort", "Best effort", "Contractual SLA"],
                    ["Optional HA second task", "Not included", "+ €89 / mo", "Negotiated"],
                    ["Custom logo", "Not included", "Included", "Included"],
                    ["Embedded analytics (your product)", "Not included", "Add-on", "Included"],
                    ["Support", "Community, docs & email (best effort)", "Named contact · business-hours email · onboarding call", "Dedicated CSM · SLA · private channel · quarterly reviews"]
                ]
            },
            "addons": {
                "title": "Usage-based add-ons",
                "subtitle": "Metered items appear on your invoice and in the tenant console. MCP call packs (optional) extend your monthly HoneyGold connector allowance, not model tokens.",
                "columns": ["Add-on", "Starter", "Business"],
                "rows": [
                    ["Unlimited viewers pack / month", "—", "€349 flat"],
                    ["Extra viewer seat / month (if not on unlimited pack)", "—", "€8"],
                    ["Extra creator seat / month", "—", "€20"],
                    ["Additional metadata storage (per GB / month)", "—", "€0.30"],
                    ["Additional file upload storage (per GB / month)", "—", "€0.25"],
                    ["Additional data egress (per GB)", "—", "€0.12"],
                    ["Extra MCP tool calls pack (optional)", "Contact us", "Contact us"],
                    ["Compute tier upgrade (M → L: 4 vCPU · 8 GB)", "—", "See invoice adjustment"]
                ]
            },
            "professionalServices": {
                "title": "Professional services & Analyst on Demand",
                "showRates": false,
                "lead": "Platform support covers hosting, access, and the MCP connector. When you need hands-on analytics (migrating existing reports, modelling KPIs, or fractional analyst time), Granola's data team works alongside your HoneyGold tenant on a clear hourly or fixed-fee basis.",
                "packages": [
                    {
                        "name": "Migration & port-over",
                        "bestFor": "Leaving Tableau, Power BI, Looker, or Excel-heavy reporting",
                        "body": "Discovery call, inventory of dashboards and metrics, pilot rebuild of 1–3 reports, then phased cutover with KPI parity checks. We map datasets, permissions, and row-level security into HoneyGold.",
                        "bullets": [
                            "Sources: Tableau workbooks, Power BI reports, Looker explores, Excel/Sheets pipelines",
                            "Deliverables: parity matrix, dataset mapping, RLS recreation, user training"
                        ],
                        "pricing": "From €8,000 fixed fee",
                        "pricingNote": "Scoped after discovery; small environments often €8k–€18k. Warehouse ETL rebuilds quoted separately.",
                        "ctaLabel": "Book migration discovery",
                        "ctaHref": "mailto:hello@granolaconsulting.com?subject=HoneyGold%20migration%20discovery"
                    },
                    {
                        "name": "Launch onboarding",
                        "bestFor": "New Business customers without a dedicated analytics lead",
                        "body": "Warehouse connection, permissions and SSO walkthrough, first three dashboards, and Claude Desktop MCP setup for your team.",
                        "bullets": [
                            "About 20–30 hours of working sessions tailored to your schedule",
                            "Training on HoneyGold concepts, metrics, and governed MCP usage"
                        ],
                        "pricing": "€4,500–€7,500 packaged",
                        "pricingNote": "One-time engagement; platform subscription billed separately.",
                        "ctaLabel": "Discuss launch package",
                        "ctaHref": "mailto:hello@granolaconsulting.com?subject=HoneyGold%20launch%20onboarding%20package"
                    },
                    {
                        "name": "Analyst on Demand",
                        "bestFor": "Ongoing bursts: new dashboards, SQL and metrics, exec narratives, MCP workflows",
                        "body": "Prepaid hour blocks with a senior analyst or architect. Europe/Dublin business hours, remote workshops, billed in 15-minute increments.",
                        "bullets": [
                            "Dashboard builds, KPI definitions, and decision-ready narratives",
                            "Claude Desktop + HoneyGold MCP workflow design for your team"
                        ],
                        "pricing": "From €165 / hour",
                        "pricingNote": "10-hour pack from €1,550. Retainer blocks available for Enterprise.",
                        "ctaLabel": "Request hour pack",
                        "ctaHref": "mailto:hello@granolaconsulting.com?subject=HoneyGold%20Analyst%20on%20Demand"
                    }
                ],
                "footnotes": [
                    "Professional services are billed separately from HoneyGold platform fees. Migration projects are fixed-fee after a written scope; Analyst on Demand is invoiced in 15-minute increments with a one-hour minimum per session.",
                    "Services cover analytics and HoneyGold configuration, not unlimited platform support (see Support row above). Anthropic/Claude and warehouse usage remain your cost.",
                    "Warehouse ETL rebuilds and bespoke engineering are available via OatMilk (Granola engineering). Ask if your project spans both."
                ],
                "secondaryCta": {
                    "label": "Explore OatMilk engineering",
                    "href": "product.html?product=oatmilk"
                }
            },
            "pricingPilot": {
                "title": "Start free on Starter",
                "body": "Sign in with Google and connect Claude Desktop to HoneyGold MCP in minutes. One user, shared infrastructure, 200 MCP tool calls per month on read-only analytics tools. Upgrade to Business for a dedicated environment and higher MCP limits.",
                "fee": "",
                "ctaLabel": "Start free with Google",
                "href": "/sign-in?plan=starter"
            },
            "educationPlan": {
                "body": "Universities and research labs: Starter stays free for teaching; Business plans from 25% off with a valid institutional email. Classroom cohorts and lab sandboxes welcome.",
                "ctaLabel": "Ask about university pricing",
                "ctaHref": "mailto:hello@granolaconsulting.com?subject=HoneyGold%20university%20pricing"
            },
            "footnotes": [
                "All prices in EUR. VAT and other applicable taxes are added at checkout or on invoice where required.",
                "* Business monthly or annual billing. Annual price (€7,549 / yr) is 10% below 12× monthly, ex VAT. Minimum annual commitment recommended. Dedicated networking choices (e.g., NAT-heavy VPCs) may adjust platform fees.",
                "SCIM user provisioning is included on Enterprise. Business includes SSO (SAML/OIDC) only; SCIM is available as an add-on or on annual contracts.",
                "Enterprise compute, seats, MCP, storage, and data transfer are scoped to your usage and quoted on your order form, billed based on agreed entitlements and metered overages.",
                "Metadata storage covers dashboards, charts, users, and permissions. File upload storage is for CSV/Parquet uploaded into HoneyGold, not your warehouse.",
                "Data egress and ingress apply to traffic through HoneyGold (UI, exports, MCP/API). Warehouse query and storage costs stay with your data provider.",
                "MCP tool calls: each Claude Desktop tool invocation to your HoneyGold tenant counts toward your monthly allowance. Anthropic bills Claude separately.",
                "Business M-tier compute (2 vCPU · 4 GB) is sized for typical SMB concurrency; heavy SQL Lab or many simultaneous viewers may need an L-tier upgrade.",
                "Unlimited viewers pack: fair-use policy applies (concurrent sessions and rate limits).",
                "Starter support is best-effort with no published response time. Business support is business-hours (Europe/Dublin, Mon–Fri); typical non-critical response within 2 business days.",
                "Business named contact owns onboarding and renewals, not a 24×7 duty roster. Enterprise SLA targets (uptime and response) are defined in your MSA or order form.",
                "Support covers the HoneyGold platform (hosting, access, MCP connector), not unlimited data modelling consulting or third-party Claude/warehouse fees. Hands-on analytics help is available under Professional services & Analyst on Demand below.",
                "Bring-your-own cloud remains available for regulated clients; pricing shifts to management fee + passthrough.",
                "University & research pricing: 25% discount on Business applies to qualifying institutions (annual billing); verify with an official .edu or institutional email. Starter remains free for individual students and faculty exploring HoneyGold."
            ]
        },
        "pricingGuide": {
            "title": "What every plan includes & how to choose a tier",
            "includedTitle": "Included with every HoneyGold tenant",
            "includedBullets": [
                "HoneyGold MCP connector for Claude Desktop: query governed dashboards, datasets, and metrics with your own Anthropic subscription.",
                "Superset-backed analytics with tenant-scoped access; Business+ runs on dedicated AWS ECS and RDS for metadata.",
                "MCP usage visibility in the tenant console: calls used this month, remaining allowance, and top tools.",
                "Governed connection to approved analytics sources on paid tiers; outputs stay tied to curated KPI definitions you control.",
                "Starter: community, docs, and best-effort email. Business: named contact and business-hours support. Enterprise: dedicated CSM, contractual SLA, and quarterly reviews.",
                "Security baseline: encryption in transit, tenant isolation, configurable access boundaries. Confirm details during procurement."
            ],
            "tiersTitle": "Good starting points by stage",
            "tierPicks": [
                {
                    "name": "Starter",
                    "body": "Solo analyst or founder: free forever, Google sign-in, shared pool, 1 creator, 200 MCP calls/month, 50 GB egress. Install the HoneyGold connector in Claude Desktop and explore with the demo dataset."
                },
                {
                    "name": "Business",
                    "body": "A dedicated environment for a growing analytics team. SSO, 8 builders, 50 readers, Claude MCP, and self-serve. Checkout online; dedicated stack provisions in ~10–20 minutes."
                },
                {
                    "name": "Enterprise",
                    "body": "For larger organizations. More compute, SCIM, embedded analytics, SLAs, and custom infrastructure and contracts. Contact us for procurement and residency."
                }
            ],
            "closing": "Start free with Google on Starter, or contact us for Business and Enterprise. We will map traffic, identity, and warehouse patterns before annual billing."
        }
    },
    "cinnamon": {
        "name": "Cinnamon",
        "subtitle": "Personalized Matching & Recommendations",
        "overview": "Preference profiles and predictive notifications that stay relevant, not noisy.",
        "intro": [
            "Cinnamon is Granola personalization for relevance: it builds preference profiles, ranks next-best items or actions, and sends timely nuggets that reflect what people actually engage with.",
            "It aligns marketing, product, and operations around one coherence model instead of brittle rulesets duplicated in email, onsite, and support tools.",
            "Machine learning scores candidates from behaviour, catalog metadata, guardrails you set, while controlled experiments quantify lift, not gut feel.",
            "AI-assisted copy and channel selection tighten message tone while frequency caps prevent fatigue; uplift is measured cleanly against cohorts.",
            "Analyst-friendly transparency (segment snapshots, exclusions, freshness windows) helps teams steer what the models optimize without sacrificing safety or brand voice."
        ],
        "featureCards": [
            {
                "title": "Preference Profiles",
                "body": "Cinnamon learns what each user or account cares about from real behaviour and history. Profiles stay explainable so teams can see why something was recommended. You can include business rules, exclusions, and freshness controls to keep relevance high. Profiles continuously improve as new signals arrive."
            },
            {
                "title": "Next-Best Recommendations",
                "body": "Deliver recommendations that feel timely and useful, not random. Cinnamon ranks items, content, or actions based on predicted value and user intent. It supports multiple objectives such as conversion, retention, or margin. Recommendations can be served in-app, by email, or through your existing channels."
            },
            {
                "title": "Personalized Notifications",
                "body": "Replace generic blasts with targeted nudges that respect attention. Cinnamon triggers messages when a strong match appears, or when timing is right. Notification frequency and channels are configurable so teams avoid over-messaging. Every notification is designed to be helpful, not promotional noise."
            },
            {
                "title": "Experiment-Ready Targeting",
                "body": "Personalization should be measurable, not just “it feels better.” Cinnamon supports A/B testing and holdouts so you can prove impact. Targeting can be tuned by segment, lifecycle stage, or intent. This makes it easier to scale what works and retire what does not."
            },
            {
                "title": "Ranking & Relevance Tuning",
                "body": "Different teams optimize for different outcomes. Cinnamon lets you tune ranking signals and weightings without rebuilding the whole system. Add constraints like diversity, fairness, or inventory availability to keep results realistic. This gives you a controllable recommendation engine rather than a black box."
            },
            {
                "title": "Control Groups & Measurement",
                "body": "Cinnamon includes measurement hooks so you can track lift over a baseline. Control groups help isolate personalization impact from seasonality and marketing noise. Reporting shows engagement, conversion, and downstream outcomes. You get confidence to invest further because value is clearly evidenced."
            }
        ],
        "sections": [
            {
                "title": "What it does",
                "bullets": [
                    "Builds preference profiles from behaviour and history",
                    "Ranks next-best items, content, or actions",
                    "Sends targeted notifications with configurable guardrails"
                ]
            }
        ]
    },
    "berry": {
        "name": "Berry",
        "subtitle": "Computer Vision Inspection",
        "overview": "Automated visual checks, defect detection, and data capture from photos and documents.",
        "intro": [
            "Berry is Granola computer vision for real-world imagery: QC, resale grading, catalogue enrichment, anything where a photo replaces a clipboard walk-around.",
            "Deep networks localize defects or damage modes you care about, score confidence continuously, and hand borderline captures to reviewers before they hit downstream systems.",
            "When labels, serials, or scribbles matter, OCR plus layout parsing turns pixels into validated fields ready for ERP, PLM, or ticketing APIs.",
            "AI shrinks repetitive eyeballing so specialists focus on ambiguous cases; calibration feedback tightens models without pausing production lines.",
            "Every prediction ships with rationale overlays and audit trails so operations trust automation when regulators or partners ask how a decision was made."
        ],
        "featureCards": [
            {
                "title": "Visual Inspection Automation",
                "body": "Berry speeds up inspection by analyzing images the moment they are captured. It standardizes checks so quality does not vary by operator or shift. Results are returned quickly so intake and processing keep moving. Your team can focus on edge cases instead of repetitive grading."
            },
            {
                "title": "Defect / Damage Detection",
                "body": "Berry identifies visible issues such as scratches, dents, or defects from photos. Findings can be tagged, summarized, and routed to the right workflow step. Confidence thresholds are configurable so you control how strict detection should be. This reduces missed issues and improves consistency."
            },
            {
                "title": "Spec Extraction from Photos",
                "body": "Berry can capture structured data from images and documents, reducing manual entry. It extracts key fields and formats them to match your systems. This improves accuracy and speeds up onboarding or listing workflows. Where uncertainty is high, Berry flags the item for quick human validation."
            },
            {
                "title": "Quality Scoring & Review Queue",
                "body": "Not every item needs the same level of human attention. Berry assigns a quality score and sends only the uncertain or high-risk cases to review. Review queues include the context needed to decide quickly. This approach keeps throughput high while protecting accuracy."
            },
            {
                "title": "Intake Photo Guidance",
                "body": "Better photos produce better automation. Berry can guide capture with simple rules such as required angles, lighting, or minimum resolution. This reduces rework and improves detection reliability. Teams get a repeatable intake standard across locations."
            },
            {
                "title": "Exception Handling Workflows",
                "body": "Real-world imagery is messy, so exceptions are expected. Berry routes edge cases into clear, auditable workflows. Operators can correct outputs and feed improvements back into the system. Over time, exception volume drops and accuracy increases without disrupting operations."
            }
        ],
        "sections": [
            {
                "title": "What it does",
                "bullets": [
                    "Detects defects or damage from intake photos",
                    "Extracts key fields from images and documents",
                    "Routes edge cases into a human review queue"
                ]
            }
        ]
    },
    "slate": {
        "name": "Slate",
        "subtitle": "Predictive Pricing & Optimization",
        "overview": "Forecast outcomes, estimate ranges, and optimize thresholds using your historical signals.",
        "intro": [
            "Slate is Granola predictive optimization: it estimates outcomes, ranges, and scenario trade-offs from your historical demand, supply, and pricing traces plus the market signals you choose to ingest.",
            "Instead of brittle point forecasts, Slate highlights bands, probabilities, and sensitivity so planners can reason about uncertainty when inventory or margin goals conflict.",
            "Gradient-boosted and temporal models pair with explainable drivers (seasonality, cohorts, elasticity hints) so humans see why a recommendation emerged.",
            "AI accelerates scenario sweeps (price moves, timing shifts, campaign levers) while guardrails keep decisions inside policy, brand, and regulatory comfort zones.",
            "Backtesting and monitoring tie production performance to training assumptions, so models earn trust and stay maintainable as markets move."
        ],
        "featureCards": [
            {
                "title": "Forecasts & Value Ranges",
                "body": "Slate predicts likely outcomes and provides value ranges rather than a single brittle number. Ranges help teams plan with uncertainty in mind. Forecasts can incorporate internal history and external market signals. This supports better decisions across pricing, inventory, and timing."
            },
            {
                "title": "Reserve / Threshold Optimization",
                "body": "Optimization is a balancing act between risk and upside. Slate helps set thresholds that align with your goals, such as sell-through, margin, or speed. It supports guardrails so pricing remains aligned with policy and brand. Teams can adjust strategy while keeping the system consistent."
            },
            {
                "title": "Sell-Through Probability",
                "body": "Slate estimates the likelihood of success for an item, offer, or campaign. Probabilities help prioritize effort and reduce wasted cycles. You can use this to choose when to retry, reprice, or route to a different channel. It turns intuition into an evidence-based process."
            },
            {
                "title": "Market Signal Monitoring",
                "body": "Slate watches relevant signals that can affect demand and pricing. This can include supply shifts, seasonality, or competitor movements. Alerts highlight what changed and how it may impact outcomes. Teams stay proactive rather than reacting after the fact."
            },
            {
                "title": "Scenario Planning",
                "body": "Different choices lead to different outcomes. Slate supports scenario comparisons so teams can evaluate trade-offs clearly. You can model “if we change price by X” or “if we shift timing by Y.” This makes pricing and planning discussions faster and more grounded."
            },
            {
                "title": "Performance Backtesting",
                "body": "Slate helps validate models against historical data to ensure they hold up. Backtesting surfaces when a strategy would have helped or harmed outcomes. This builds trust with stakeholders and reduces surprises in production. Over time, it supports continuous improvement rather than one-off modeling."
            }
        ],
        "sections": [
            {
                "title": "What it does",
                "bullets": [
                    "Forecasts outcomes and value ranges",
                    "Optimizes thresholds and timing with scenario analysis",
                    "Monitors market signals to reduce surprises"
                ]
            }
        ]
    },
    "tealsprout": {
        "name": "TealSprout",
        "subtitle": "Compliance & Risk Automation",
        "overview": "Identity checks, screening workflows, and audit trails that are reviewable and traceable.",
        "intro": [
            "TealSprout is Granola compliance automation: identity proofing, policy checks, watchlist screening, and reviewer escalations stitched into one auditable workflow.",
            "Structured rules plus natural-language policy packs keep decisions consistent when regulations or internal guidance change, with no more tribal PDF interpretation.",
            "Language models help normalize messy intake documents, extract entities, and draft analyst-facing rationales while deterministic scoring enforces non-negotiable thresholds.",
            "Every step records evidence links, model or ruleset versions, and human overrides so examiners see the same story your operators saw.",
            "AI speeds routine reviews but never silently auto-approves high-risk paths; humans stay on the hook with SLAs, queues, and packaged evidence bundles."
        ],
        "featureCards": [
            {
                "title": "ID + KYC/AML Automation",
                "body": "TealSprout streamlines onboarding and verification by automating standard checks. It reduces manual processing time while keeping review steps clear. Workflows can be aligned to your risk tiers and policies. Teams spend less time on admin and more time on exceptions that matter."
            },
            {
                "title": "Policy-Grounded Checks",
                "body": "Compliance needs consistency. TealSprout applies checks grounded in your policies, guidance, and approved sources. When rules change, you can update the system without rebuilding everything. This keeps decisions defensible and aligned with governance."
            },
            {
                "title": "Audit Trails & Reporting",
                "body": "Every decision should be traceable. TealSprout records inputs, checks performed, outputs, and reviewer actions. Reports are structured to support internal review and external audits. This makes compliance faster without sacrificing accountability."
            },
            {
                "title": "Escalations & Approvals",
                "body": "High-risk cases should never be silently automated. TealSprout escalates exceptions with full context so reviewers can decide quickly. Approval steps can route to the right role with clear SLAs. This keeps workflows safe while maintaining speed."
            },
            {
                "title": "Watchlist Screening",
                "body": "TealSprout supports screening against relevant lists and risk signals. Screening outcomes are captured with timestamps and evidence links. You control match thresholds to balance sensitivity and false positives. This reduces missed risk without overwhelming teams."
            },
            {
                "title": "Evidence Bundles",
                "body": "When you need to justify a decision, you want everything in one place. TealSprout compiles evidence bundles that include checks, references, and reviewer notes. Bundles are shareable internally and easy to archive. This cuts down the time spent gathering proof after the fact."
            }
        ],
        "sections": [
            {
                "title": "What it does",
                "bullets": [
                    "Automates KYC/AML checks and screening steps",
                    "Keeps evidence trails and generates audit-ready logs",
                    "Escalates exceptions for approvals with full context"
                ]
            }
        ]
    },
    "oatmilk": {
        "name": "OatMilk",
        "subtitle": "Bespoke Software Development & Maintenance",
        "overview": "Scoped builds, integrations, and ongoing support with clear ownership and SLAs.",
        "intro": [
            "OatMilk is Granola engineering for shipping and sustaining serious software: bespoke services, integrations, and long-run maintenance around the AI modules you adopt.",
            "We wire data planes, auth, and observability so models, rules engines, and human workflows behave like one product, not a science project duct-taped to legacy batch jobs.",
            "When AI fits, we implement retrieval layers, feature stores, evaluation harnesses, and deployment pipelines with the same rigor as any tier-one service stack.",
            "Quality means tests, performance budgets, security reviews, and documentation your internal teams can inherit without reverse-engineering prompts at 2 a.m.",
            "In short: OatMilk keeps the human-AI stack reliable, measurable, and operable long after the first launch milestone."
        ],
        "featureCards": [
            {
                "title": "Bespoke Software Builds",
                "body": "OatMilk delivers production-grade software tailored to your workflows and systems. We build the right thing first by clarifying scope, success metrics, and ownership. Delivery is iterative, with clear checkpoints and demos. The goal is software that fits your business, not a generic template."
            },
            {
                "title": "Integrations & Automation",
                "body": "AI products need clean connections to data and tools. OatMilk integrates APIs, databases, and third-party platforms with resilient error handling. Automations are designed to be observable and maintainable. This reduces manual work while keeping control and auditability."
            },
            {
                "title": "Maintenance & Support",
                "body": "Shipping is only the start. OatMilk provides ongoing maintenance, bug fixes, and improvements with predictable support. We keep dependencies updated and monitor for issues before they escalate. Support is structured so your team always knows what is happening and why."
            },
            {
                "title": "Security + Reliability Upgrades",
                "body": "As systems scale, the risks change. OatMilk hardens authentication, access control, and data boundaries. Reliability work focuses on uptime, backups, and failure recovery. This keeps your platform safe and dependable as usage grows."
            },
            {
                "title": "Performance Optimisation",
                "body": "Slow systems kill adoption. OatMilk improves performance through profiling, caching, and smarter data flows. We focus on the bottlenecks that matter most to users. The result is faster experiences with less infrastructure waste."
            },
            {
                "title": "Documentation & Handover",
                "body": "A product is only as sustainable as its documentation. OatMilk produces clear handover notes, runbooks, and system diagrams. We also document key decisions and trade-offs so future changes stay safe. This makes it easier for internal teams to operate and extend the work."
            }
        ],
        "sections": [
            {
                "title": "What it does",
                "bullets": [
                    "Builds bespoke web and backend systems around your products",
                    "Integrates data sources, tools, and automation workflows",
                    "Maintains and improves reliability, security, and performance"
                ]
            }
        ]
    }
}

var PRODUCT_ORDER = ["honeygold", "cinnamon", "berry", "slate", "tealsprout", "oatmilk"]

var PRODUCT_SIMILAR = {
    "honeygold": ["slate", "cinnamon", "tealsprout"],
    "cinnamon": ["honeygold", "slate", "berry"],
    "berry": ["cinnamon", "oatmilk", "tealsprout"],
    "slate": ["honeygold", "cinnamon", "tealsprout"],
    "tealsprout": ["honeygold", "slate", "oatmilk"],
    "oatmilk": ["berry", "tealsprout", "honeygold"]
}

/** Default card/OG image for a product slug. */
function defaultProductImagePath(slug) {
    if (slug === "honeygold") {
        return "images/honeygold/honeygold_ai_chat.png"
    }
    return "images/products/" + encodeURIComponent(slug) + "-bg.jpg"
}

function getProductHeroImagePathForSlug(slug, product) {
    var gallery = product && product.heroGallery
    if (gallery && gallery.length) {
        return gallery[0].src
    }
    return defaultProductImagePath(slug)
}

function buildHoneyGoldGuideHtml(product) {
    var pt = product && product.pricingTables
    if (!pt || !pt.comparison || !pt.comparison.rows || !pt.comparison.rows.length) {
        return ""
    }
    var g = product.pricingGuide || {}
    var title = g.title || "What every plan includes & how to choose a tier"
    var incTitle = g.includedTitle || "Included with every paid HoneyGold tenant"
    var tierTitle = g.tiersTitle || "Good starting points by stage"
    var bullets = g.includedBullets
    if (!bullets || !bullets.length) {
        bullets = [
            "Dedicated AWS ECS Fargate and RDS PostgreSQL for HoneyGold metadata, scaled separately from your warehouse.",
            "Governed analytics connectivity and outputs grounded in your metric definitions.",
            "AI and chat allowances per plan; overages billed as in the add-ons table.",
            "Support and response targets that scale with the tier you choose."
        ]
    }
    var picks = g.tierPicks
    if (!picks || !picks.length) {
        picks = [
            { name: "Starter", body: "Pilot or single-team rollout with light traffic." },
            { name: "Professional", body: "Default production tier for most growing teams." },
            { name: "Business or Enterprise", body: "Higher concurrency, HA, embedded analytics, or custom terms." }
        ]
    }
    var closing = g.closing || ""

    var html = ""
    html += '<div class="inner">'
    html += '<section class="hg-pricing-panel hg-pricing-guide" aria-labelledby="hg-pricing-guide-heading">'
    html += '<h2 id="hg-pricing-guide-heading" class="hg-pricing-title">' + escapeHtml(title) + "</h2>"
    html += '<div class="hg-pricing-guide-grid">'
    html += '<div class="hg-pricing-guide-col">'
    html += '<h3 class="hg-pricing-guide-sub">' + escapeHtml(incTitle) + "</h3>"
    html += '<ul class="hg-pricing-guide-list">'
    for (var b = 0; b < bullets.length; b++) {
        html += "<li>" + escapeHtml(bullets[b]) + "</li>"
    }
    html += "</ul></div>"
    html += '<div class="hg-pricing-guide-col">'
    html += '<h3 class="hg-pricing-guide-sub">' + escapeHtml(tierTitle) + "</h3>"
    html += '<div class="hg-pricing-tier-picks">'
    for (var t = 0; t < picks.length; t++) {
        var p = picks[t] || {}
        var nm = p.name || "Tier"
        var bd = p.body || ""
        html += '<div class="hg-pricing-tier-card">'
        html += '<h4 class="hg-pricing-tier-name">' + escapeHtml(nm) + "</h4>"
        html += '<p class="hg-pricing-tier-body">' + escapeHtml(bd) + "</p>"
        html += "</div>"
    }
    html += "</div></div></div>"
    if (closing) {
        html += '<p class="hg-pricing-guide-closing">' + escapeHtml(closing) + "</p>"
    }
    html += "</section></div>"
    return html
}

function buildHoneyGoldProfessionalServicesHtml(pt) {
    var ps = pt && pt.professionalServices
    if (!ps || !ps.packages || !ps.packages.length) {
        return ""
    }
    var html = ""
    html += '<div class="inner">'
    html += '<section class="hg-pricing-panel hg-pricing-services" aria-labelledby="hg-pricing-services-heading">'
    html += '<h2 id="hg-pricing-services-heading" class="hg-pricing-title">' + escapeHtml(ps.title || "Professional services") + "</h2>"
    if (ps.lead) {
        html += '<p class="hg-pricing-lead">' + escapeHtml(ps.lead) + "</p>"
    }
    html += '<div class="hg-pricing-services-grid">'
    for (var i = 0; i < ps.packages.length; i++) {
        var pkg = ps.packages[i] || {}
        html += '<article class="hg-pricing-service-card">'
        html += '<div class="hg-pricing-service-card-head">'
        if (pkg.bestFor) {
            html +=
                '<p class="hg-pricing-service-bestfor"><span class="hg-pricing-service-bestfor-label">Best for</span><span class="hg-pricing-service-bestfor-text">' +
                escapeHtml(pkg.bestFor) +
                "</span></p>"
        }
        html += '<h3 class="hg-pricing-service-name">' + escapeHtml(pkg.name || "Service") + "</h3>"
        html += "</div>"
        if (pkg.body) {
            html += '<p class="hg-pricing-service-body">' + escapeHtml(pkg.body) + "</p>"
        }
        var bullets = pkg.bullets
        if (bullets && bullets.length) {
            html += '<ul class="hg-pricing-service-bullets">'
            for (var b = 0; b < bullets.length; b++) {
                html += "<li>" + escapeHtml(bullets[b]) + "</li>"
            }
            html += "</ul>"
        }
        if (ps.showRates) {
            if (pkg.pricing) {
                html += '<p class="hg-pricing-service-price">' + escapeHtml(pkg.pricing) + "</p>"
            }
            if (pkg.pricingNote) {
                html += '<p class="hg-pricing-service-price-note">' + escapeHtml(pkg.pricingNote) + "</p>"
            }
        }
        if (pkg.ctaLabel && pkg.ctaHref) {
            var svcHref = pkg.ctaHref
            if (svcHref.indexOf("mailto:") !== 0 && svcHref.charAt(0) !== "#") {
                svcHref = siteAssetPath(svcHref)
            }
            html +=
                '<p class="hg-pricing-service-cta"><a href="' +
                escapeHtml(svcHref) +
                '" class="view-more-btn hg-pricing-service-btn">' +
                escapeHtml(pkg.ctaLabel) +
                "</a></p>"
        }
        html += "</article>"
    }
    html += "</div>"
    var svcNotes = ps.footnotes || []
    if (svcNotes.length) {
        html += '<ul class="hg-pricing-footnotes hg-pricing-services-footnotes">'
        for (var n = 0; n < svcNotes.length; n++) {
            html += "<li>" + escapeHtml(svcNotes[n]) + "</li>"
        }
        html += "</ul>"
    }
    if (ps.secondaryCta && ps.secondaryCta.label && ps.secondaryCta.href) {
        var secHref = siteAssetPath(ps.secondaryCta.href)
        html +=
            '<p class="hg-pricing-services-secondary"><a href="' +
            escapeHtml(secHref) +
            '" class="view-more-btn hg-pricing-service-btn hg-pricing-services-secondary-btn">' +
            escapeHtml(ps.secondaryCta.label) +
            "</a></p>"
    }
    html += "</section></div>"
    return html
}

function buildHoneyGoldEducationCalloutHtml(pt) {
    var edu = pt && pt.educationPlan
    if (!edu || !edu.body) {
        return ""
    }
    var html = '<aside class="hg-pricing-education-callout" aria-label="University and research pricing">'
    html += '<p class="hg-pricing-education-callout-text">' + escapeHtml(edu.body)
    if (edu.ctaLabel && edu.ctaHref) {
        var eduHref = edu.ctaHref
        if (eduHref.indexOf("mailto:") !== 0 && eduHref.charAt(0) !== "#") {
            eduHref = siteAssetPath(eduHref)
        }
        html +=
            ' <a href="' +
            escapeHtml(eduHref) +
            '" class="hg-pricing-education-callout-link">' +
            escapeHtml(edu.ctaLabel) +
            "</a>"
    }
    html += "</p></aside>"
    return html
}

function buildHoneyGoldPricingPlansExtrasHtml(pt) {
    if (!pt) {
        return ""
    }
    var html = ""
    var contrast = pt.pricingContrast
    if (contrast && contrast.body) {
        html += '<div class="hg-pricing-contrast">'
        if (contrast.title) {
            html += '<h3 class="hg-pricing-contrast-title">' + escapeHtml(contrast.title) + "</h3>"
        }
        html += '<p class="hg-pricing-contrast-body">' + escapeHtml(contrast.body) + "</p>"
        html += "</div>"
    }
    var pilot = pt.pricingPilot
    if (pilot && pilot.body) {
        html += '<aside class="hg-pricing-pilot-banner" aria-labelledby="hg-pricing-pilot-heading">'
        html += '<h3 id="hg-pricing-pilot-heading" class="hg-pricing-pilot-title">' + escapeHtml(pilot.title || "14-day sandbox pilot") + "</h3>"
        html += '<p class="hg-pricing-pilot-body">' + escapeHtml(pilot.body) + "</p>"
        if (pilot.fee) {
            html += '<p class="hg-pricing-pilot-fee">' + escapeHtml(pilot.fee) + "</p>"
        }
        html +=
            '<p class="hg-pricing-pilot-cta"><a href="' +
            escapeHtml(pilot.href || honeyGoldSignInHref("starter")) +
            '" class="view-more-btn hg-pricing-sandbox-cta">' +
            escapeHtml(pilot.ctaLabel || "Start free with Google") +
            "</a></p>"
        html += "</aside>"
    }
    return html
}

function buildHoneyGoldPricingTokenHtml(pt) {
    if (!pt) {
        return ""
    }
    var tok = pt.tokenTransparency
    if (!tok || !tok.paragraphs || !tok.paragraphs.length) {
        return ""
    }
    var html = '<div class="hg-pricing-token-box" aria-labelledby="hg-pricing-token-heading">'
    html += '<h3 id="hg-pricing-token-heading" class="hg-pricing-token-title">' + escapeHtml(tok.title || "AI token allowances") + "</h3>"
    for (var tp = 0; tp < tok.paragraphs.length; tp++) {
        html += '<p class="hg-pricing-token-p">' + escapeHtml(tok.paragraphs[tp]) + "</p>"
    }
    html += "</div>"
    return html
}

/** Map plan column label to a stable query param for contact links (e.g. Starter → starter). */
function honeyGoldPlanParamFromLabel(label) {
    var s = String(label || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    return s || "plan"
}

/** Onboarding URL with optional plan pre-select (HoneyGold hosted SaaS). */
function honeyGoldOnboardHref(planParam) {
    var href = "/onboard?product=honeygold"
    if (planParam) {
        href += "&plan=" + encodeURIComponent(planParam)
    }
    return href
}

/** Google sign-in for Starter (instant enroll on shared pool). */
function honeyGoldSignInHref(planParam) {
    var href = "/sign-in?product=honeygold"
    if (planParam) {
        href += "&plan=" + encodeURIComponent(planParam)
    }
    return href
}

/** @deprecated Use honeyGoldSignInHref (redirects to sign-in). */
function honeyGoldSandboxHref() {
    return honeyGoldSignInHref("starter")
}

function buildHoneyGoldPricingSlots(product) {
    var empty = { plans: "", addons: "", services: "" }
    var pt = product && product.pricingTables
    if (!pt || !pt.comparison || !pt.comparison.rows || !pt.comparison.rows.length) {
        return empty
    }

    var plans = ""
    plans += '<div class="inner">'
    plans += '<section class="hg-pricing-panel" aria-labelledby="hg-pricing-heading">'
    plans += '<h2 id="hg-pricing-heading" class="hg-pricing-title">' + escapeHtml(pt.title || "Plans & pricing") + "</h2>"
    if (pt.lead) {
        plans += '<p class="hg-pricing-lead">' + escapeHtml(pt.lead) + "</p>"
    }
    plans += buildHoneyGoldPricingPlansExtrasHtml(pt)

    var comp = pt.comparison
    var cols = comp.columns || []
    plans += '<div class="hg-pricing-scroll">'
    plans += '<table class="hg-pricing-table hg-pricing-table--comparison"><thead><tr>'
    for (var h = 0; h < cols.length; h++) {
        var scope = h === 0 ? ' scope="col"' : ""
        plans += "<th" + scope + ">" + escapeHtml(cols[h]) + "</th>"
    }
    plans += "</tr></thead><tbody>"
    for (var r = 0; r < comp.rows.length; r++) {
        var row = comp.rows[r]
        plans += "<tr>"
        for (var c = 0; c < row.length; c++) {
            var tag = c === 0 ? "th" : "td"
            var sc = c === 0 ? ' scope="row"' : ""
            plans += "<" + tag + sc + ">" + escapeHtml(row[c]) + "</" + tag + ">"
        }
        plans += "</tr>"
    }
    plans += "</tbody><tfoot><tr>"
    plans += '<th scope="row" class="hg-pricing-cta-row-label"><span class="screen-reader-text">Get started</span></th>'
    for (var ft = 1; ft < cols.length; ft++) {
        var planLabel = cols[ft]
        var planParam = honeyGoldPlanParamFromLabel(planLabel)
        var ctaLabel = "Get started"
        var ctaHref = honeyGoldOnboardHref(planParam)
        if (planParam === "enterprise") {
            ctaLabel = "Contact us"
        } else if (planParam === "starter") {
            ctaLabel = "Start free with Google"
            ctaHref = honeyGoldSignInHref("starter")
        }
        plans +=
            '<td class="hg-pricing-cta-cell"><a href="' +
            escapeHtml(ctaHref) +
            '" class="view-more-btn hg-pricing-get-started">' +
            escapeHtml(ctaLabel) +
            "</a></td>"
    }
    plans += "</tr></tfoot></table></div>"
    plans += buildHoneyGoldEducationCalloutHtml(pt)
    plans += "</section></div>"

    var addons = ""
    addons += '<div class="inner">'
    addons += '<section class="hg-pricing-panel" aria-labelledby="hg-pricing-addons-heading">'
    var add = pt.addons
    if (add && add.rows && add.rows.length) {
        addons += '<h2 id="hg-pricing-addons-heading" class="hg-pricing-title">' + escapeHtml(add.title || "Usage-based add-ons") + "</h2>"
        if (add.subtitle) {
            addons += '<p class="hg-pricing-lead">' + escapeHtml(add.subtitle) + "</p>"
        }
        var acols = add.columns || []
        addons += '<div class="hg-pricing-scroll">'
        addons += '<table class="hg-pricing-table hg-pricing-table--addons"><thead><tr>'
        for (var ah = 0; ah < acols.length; ah++) {
            addons += "<th>" + escapeHtml(acols[ah]) + "</th>"
        }
        addons += "</tr></thead><tbody>"
        for (var ar = 0; ar < add.rows.length; ar++) {
            var arow = add.rows[ar]
            addons += "<tr>"
            for (var ac = 0; ac < arow.length; ac++) {
                var atag = ac === 0 ? "th" : "td"
                var asc = ac === 0 ? ' scope="row"' : ""
                addons += "<" + atag + asc + ">" + escapeHtml(arow[ac]) + "</" + atag + ">"
            }
            addons += "</tr>"
        }
        addons += "</tbody><tfoot><tr>"
        addons += '<th scope="row" class="hg-pricing-cta-row-label"><span class="screen-reader-text">Get started</span></th>'
        for (var aft = 1; aft < acols.length; aft++) {
            var aPlanLabel = acols[aft]
            var aPlanParam = honeyGoldPlanParamFromLabel(aPlanLabel)
            var aCtaLabel = "Get started"
            var aCtaHref = honeyGoldOnboardHref(aPlanParam)
            if (aPlanParam === "enterprise") {
                aCtaLabel = "Contact us"
            } else if (aPlanParam === "starter") {
                aCtaLabel = "Start free"
                aCtaHref = honeyGoldSignInHref("starter")
            }
            addons +=
                '<td class="hg-pricing-cta-cell"><a href="' +
                aCtaHref +
                '" class="view-more-btn hg-pricing-get-started">' +
                escapeHtml(aCtaLabel) +
                "</a></td>"
        }
        addons += "</tr></tfoot></table></div>"
    }

    var notes = pt.footnotes || []
    if (notes.length) {
        addons += '<ul class="hg-pricing-footnotes">'
        for (var n = 0; n < notes.length; n++) {
            addons += "<li>" + escapeHtml(notes[n]) + "</li>"
        }
        addons += "</ul>"
    }

    addons += "</section></div>"

    var services = buildHoneyGoldProfessionalServicesHtml(pt)

    return { plans: plans, addons: addons, services: services }
}

function scrollToProductHashAnchor() {
    var hash = window.location.hash
    if (!hash || hash.length < 2) {
        return
    }
    var id = hash.slice(1)
    window.setTimeout(function () {
        var el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, 150)
}

function applyHoneyGoldPricingRegions(product) {
    var plansEl = document.getElementById("hg-product-pricing-plans")
    var addonsEl = document.getElementById("hg-product-pricing-addons")
    var servicesEl = document.getElementById("hg-product-pricing-services")
    var guideEl = document.getElementById("hg-product-pricing-guide")
    if (!plansEl || !addonsEl) {
        return
    }
    var slots = buildHoneyGoldPricingSlots(product)
    plansEl.innerHTML = slots.plans || ""
    addonsEl.innerHTML = slots.addons || ""
    if (servicesEl) {
        servicesEl.innerHTML = slots.services || ""
        servicesEl.hidden = !slots.services
    }
    plansEl.hidden = !slots.plans
    addonsEl.hidden = !slots.addons
    if (guideEl) {
        var guideHtml = buildHoneyGoldGuideHtml(product)
        guideEl.innerHTML = guideHtml || ""
        guideEl.hidden = !guideHtml
    }
}

function buildHoneyGoldConversionHeroHtml(product) {
    var hc = product && product.heroConversion
    if (!hc) {
        return ""
    }
    var primary = hc.primaryCta || {}
    var secondary = hc.secondaryCta || {}
    var primaryHref = siteAssetPath(primary.href || honeyGoldSignInHref("starter"))
    var secondaryHref = secondary.href || "#hg-product-pricing-plans"
    if (secondaryHref.charAt(0) === "#") {
        secondaryHref = productDetailHref("honeygold") + secondaryHref
    } else {
        secondaryHref = siteAssetPath(secondaryHref)
    }
    var plansFeaturesHref = productDetailHref("honeygold") + "#hg-product-pricing-plans"

    var gallery = product.heroGallery || []
    var heroImg = hc.heroImage || gallery[0] || {}
    var imgSrc = siteAssetPath(heroImg.src || "images/honeygold/honeygold_ai_chat.png")
    var imgAlt = escapeHtml(heroImg.alt || "HoneyGold AI chat: ask-your-business analytics")

    var html = '<div class="hg-product-conversion-inner">'
    html += '<div class="hg-product-conversion-grid">'
    html += (
        '<div class="hg-product-conversion-visual"><figure class="hg-product-conversion-figure"><img src="'
        + imgSrc
        + '" alt="'
        + imgAlt
        + '" /></figure></div>'
    )
    html += '<div class="hg-product-conversion-copy">'
    if (hc.eyebrow) {
        html += '<p class="hg-product-conversion-eyebrow">' + escapeHtml(hc.eyebrow) + "</p>"
    }
    if (hc.headline) {
        html += '<h2 class="hg-product-conversion-headline">' + escapeHtml(hc.headline) + "</h2>"
    }
    if (hc.subhead) {
        html += '<p class="hg-product-conversion-subhead">' + escapeHtml(hc.subhead) + "</p>"
    }
    var bullets = hc.bullets || []
    if (bullets.length) {
        html += '<ul class="hg-product-conversion-bullets">'
        for (var b = 0; b < bullets.length; b++) {
            html += "<li>" + escapeHtml(bullets[b]) + "</li>"
        }
        html += "</ul>"
    }
    html += '<div class="hg-product-conversion-ctas">'
    html +=
        '<a href="' +
        escapeHtml(primaryHref) +
        '" class="view-more-btn hg-product-cta-primary">' +
        escapeHtml(primary.label || "Start free with Google") +
        "</a>"
    html +=
        '<a href="' +
        escapeHtml(secondaryHref) +
        '" class="view-more-btn hg-product-cta-secondary">' +
        escapeHtml(secondary.label || "See plans & pricing") +
        "</a>"
    html += "</div>"
    if (hc.trustLine) {
        html += '<p class="hg-product-conversion-trust">' + escapeHtml(hc.trustLine) + "</p>"
    }
    html += "</div>"
    html += "</div>"
    var strip = hc.pricingStrip || []
    if (strip.length) {
        html += '<div class="hg-product-conversion-plans">'
        html += '<nav class="hg-product-pricing-strip hg-product-pricing-strip--inline" aria-label="Plan starting points">'
        for (var s = 0; s < strip.length; s++) {
            var item = strip[s] || {}
            var itemHref = item.href || "#hg-product-pricing-plans"
            if (itemHref.charAt(0) === "#") {
                itemHref = productDetailHref("honeygold") + itemHref
            } else {
                itemHref = siteAssetPath(itemHref)
            }
            html +=
                '<a class="hg-product-pricing-strip__item" href="' +
                escapeHtml(itemHref) +
                '"><span class="hg-product-pricing-strip__label">' +
                escapeHtml(item.label || "") +
                '</span><span class="hg-product-pricing-strip__price">' +
                escapeHtml(item.price || "") +
                "</span></a>"
        }
        html += "</nav>"
        html += (
            '<p class="hg-product-pricing-strip-more"><a href="'
            + escapeHtml(plansFeaturesHref)
            + '" class="hg-product-see-plan-features">See plan features</a></p>'
        )
        html += "</div>"
    }
    html += "</div>"
    return html
}

function applyHoneyGoldConversionHero(product) {
    var el = document.getElementById("hg-product-conversion")
    if (!el) {
        return
    }
    var html = buildHoneyGoldConversionHeroHtml(product)
    el.innerHTML = html || ""
    el.hidden = !html
}

function reorderHoneyGoldProductLayout() {
    var page = document.getElementById("page")
    var insertBefore =
        document.getElementById("product-detail-other-products") || (page && page.querySelector(".push"))
    if (!page || !insertBefore) {
        return
    }
    var features = document.getElementById("hg-product-features")
    var firstPricing = document.getElementById("hg-product-pricing-plans")
    if (features && features.parentNode !== page) {
        page.insertBefore(features, firstPricing || insertBefore)
    }
    var pricingNodes = [
        document.getElementById("hg-product-pricing-plans"),
        document.getElementById("hg-product-pricing-addons"),
        document.getElementById("hg-product-pricing-guide"),
        document.getElementById("hg-product-pricing-services")
    ]
    for (var i = 0; i < pricingNodes.length; i++) {
        var node = pricingNodes[i]
        if (node) {
            page.insertBefore(node, insertBefore)
        }
    }
}

function initHoneyGoldStickyCta(product) {
    var bar = document.getElementById("hg-product-sticky-cta")
    if (!bar) {
        return
    }
    var hc = product && product.heroConversion
    var primary = (hc && hc.primaryCta) || {}
    var secondary = (hc && hc.secondaryCta) || {}
    var primaryLink = bar.querySelector(".hg-product-sticky-cta__primary")
    var secondaryLink = bar.querySelector(".hg-product-sticky-cta__secondary")
    if (primaryLink) {
        primaryLink.setAttribute("href", siteAssetPath(primary.href || honeyGoldSignInHref("starter")))
        primaryLink.textContent = primary.label || "Start free with Google"
    }
    if (secondaryLink) {
        var secHref = secondary.href || "#hg-product-pricing-plans"
        if (secHref.charAt(0) === "#") {
            secHref = productDetailHref("honeygold") + secHref
        } else {
            secHref = siteAssetPath(secHref)
        }
        secondaryLink.setAttribute("href", secHref)
        secondaryLink.textContent = secondary.label || "See pricing"
    }
    bar.hidden = false
    var onScroll = function () {
        var scrollBottom = window.scrollY + window.innerHeight
        var docHeight = document.documentElement.scrollHeight
        var nearBottom = scrollBottom >= docHeight - 140
        var show = window.scrollY > 280 && !nearBottom
        bar.classList.toggle("is-visible", show)
        document.body.classList.toggle("hg-sticky-cta-visible", show)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    onScroll()
}

function fixHoneyGoldPageScrollLayout() {
    var page = document.getElementById("page")
    var primary = document.getElementById("primary")
    if (page) {
        page.style.height = "auto"
        page.style.marginBottom = "0"
    }
    if (primary) {
        primary.style.height = "auto"
        primary.style.overflow = "visible"
        primary.style.float = "none"
    }
    var lists = document.querySelectorAll(".other-products ul, .related-posts ul")
    for (var i = 0; i < lists.length; i++) {
        lists[i].style.height = "auto"
    }
}

function applyHoneyGoldProductPage(slug, product) {
    if (slug !== "honeygold") {
        return
    }
    document.body.classList.add("product-honeygold")
    var article = document.querySelector("#primary article")
    if (article) {
        article.classList.add("product-honeygold-article")
    }
    var featuresHeading = document.getElementById("hg-product-features-heading")
    if (featuresHeading) {
        featuresHeading.hidden = false
    }
    applyHoneyGoldConversionHero(product)
    applyHoneyGoldPricingRegions(product)
    reorderHoneyGoldProductLayout()
    initHoneyGoldStickyCta(product)
    fixHoneyGoldPageScrollLayout()
    window.setTimeout(fixHoneyGoldPageScrollLayout, 0)
    window.setTimeout(fixHoneyGoldPageScrollLayout, 400)
}

function buildProductHeroHtml(slug, product, options) {
    options = options || {}
    var galleryStart = options.galleryStart || 0
    var gallery = product && product.heroGallery
    if (!gallery || !gallery.length || galleryStart >= gallery.length) {
        if (galleryStart > 0) {
            return ""
        }
        var single = siteAssetPath(defaultProductImagePath(slug))
        return '<div class="product-detail-hero"><img class="aligncenter size-full" src="' + single + '" alt="" /></div>'
    }
    var main = gallery[galleryStart]
    var mainSrc = siteAssetPath(main.src)
    var mainAlt = escapeHtml(main.alt || product.name || "")
    var html = '<div class="product-detail-hero product-detail-gallery">'
    html += '<figure class="product-detail-gallery-main"><img class="aligncenter size-full" src="' + mainSrc + '" alt="' + mainAlt + '" /></figure>'
    if (gallery.length > galleryStart + 1) {
        html += '<div class="product-detail-gallery-secondary">'
        for (var g = galleryStart + 1; g < gallery.length; g++) {
            var item = gallery[g]
            var src = siteAssetPath(item.src)
            var alt = escapeHtml(item.alt || "")
            html += '<figure><img class="aligncenter size-full" src="' + src + '" alt="' + alt + '" /></figure>'
        }
        html += "</div>"
    }
    var extra = options.extraImage
    if (extra && extra.src) {
        var extraSrc = siteAssetPath(extra.src)
        var extraAlt = escapeHtml(extra.alt || "")
        html += '<figure class="product-detail-gallery-extra"><img class="aligncenter size-full" src="' + extraSrc + '" alt="' + extraAlt + '" /></figure>'
    }
    html += "</div>"
    return html
}

function setProductPrevNextLinks(activeSlug) {
    var idx = PRODUCT_ORDER.indexOf(activeSlug)
    if (idx === -1) {
        return
    }
    var prevSlug = PRODUCT_ORDER[(idx - 1 + PRODUCT_ORDER.length) % PRODUCT_ORDER.length]
    var nextSlug = PRODUCT_ORDER[(idx + 1) % PRODUCT_ORDER.length]
    var prevHref = productDetailHref(prevSlug)
    var nextHref = productDetailHref(nextSlug)

    var prevLinks = document.getElementsByClassName("product-prev-link")
    for (var i = 0; i < prevLinks.length; i++) {
        prevLinks[i].setAttribute("href", prevHref)
    }
    var nextLinks = document.getElementsByClassName("product-next-link")
    for (var j = 0; j < nextLinks.length; j++) {
        nextLinks[j].setAttribute("href", nextHref)
    }
}


function renderOtherProducts(activeSlug) {
    var wrap = document.getElementsByClassName("other-products")[0]
    if (!wrap) {
        return
    }
    var picks = PRODUCT_SIMILAR[activeSlug] || []
    if (!picks.length) {
        // fallback: pick the next 3 in order (excluding current)
        var idx = PRODUCT_ORDER.indexOf(activeSlug)
        for (var i = 1; i <= 3; i++) {
            var s = PRODUCT_ORDER[(idx + i) % PRODUCT_ORDER.length]
            if (s !== activeSlug) {
                picks.push(s)
            }
        }
    }
    picks = picks.slice(0, 3)

    var html = ""
    html += "<div class=\"related-posts\">"
    html += "<h1 class=\"entry-title\">Other products</h1>"
    html += "<hr/>"
    html += "<ul>"
    for (var k = 0; k < picks.length; k++) {
        var slug = picks[k]
        var p = PRODUCT_DETAILS[slug]
        if (!p) continue
        var img = siteAssetPath(getProductHeroImagePathForSlug(slug, p))
        var href = productDetailHref(slug)
        html += `
          <li class="grid-4 m-grid-6 s-grid-12 work-pod medium product product-${escapeHtml(slug)}">
            <a href="${href}" title="${escapeHtml(p.name)}">
              <div class="grid-12 work-pod-thumb">
                <img width="640" height="343" src="${img}" alt=""/>
              </div>
              <div class="grid-12 pod-text">
                <h2>${escapeHtml(p.name)}</h2>
                <p>${escapeHtml(p.subtitle || "")}</p>
              </div>
              <div class="grid-12 work-more">
                <div class="work-more-link flip up">
                  <figure class="rollover cube">
                    <img src="${siteAssetPath("images/more.svg")}" width="26" height="26" class="front">
                    <img src="${siteAssetPath("images/more-over.svg")}" width="26" height="26" class="back">
                  </figure>
                </div>
              </div>
            </a>
          </li>
        `
    }
    html += "</ul></div>"
    wrap.innerHTML = html

    if (window.jQuery && jQuery.fn.matchHeight) {
        jQuery(".other-products .pod-text").matchHeight({ remove: true })
        jQuery(".other-products .pod-text").matchHeight({ byRow: true })
    }
}

function loadProductDetail() {
    var slug = getProductSlugFromUrl()
    if (!slug) {
        if (!isSocialPreviewCrawler()) {
            window.location.href = "products.html"
        }
        return
    }
    slug = String(slug).toLowerCase()
    var product = PRODUCT_DETAILS[slug]
    if (!product) {
        if (!isSocialPreviewCrawler()) {
            window.location.href = "products.html"
        }
        return
    }

    document.title = product.name + " - " + product.subtitle + " | Granola Consulting"
    setCanonicalUrl(canonicalProductUrl(slug))
    var productDesc = String(product.overview || product.subtitle || "").trim()
    if (slug === "honeygold" && product.heroConversion) {
        var hcMeta = product.heroConversion
        productDesc = [hcMeta.headline, hcMeta.subhead].filter(function (part) {
            return String(part || "").trim()
        }).join(" ")
    }
    var productHero = siteAssetPath(getProductHeroImagePathForSlug(slug, product))
    applySocialMetaForPage({
        url: canonicalProductUrl(slug),
        title: product.name + " - " + (product.subtitle || "") + " | Granola Consulting",
        description: productDesc,
        image: productHero,
        type: "website"
    })

    var titleWrap = document.getElementsByClassName("project-title")[0]
    var subtitleEl = document.getElementsByClassName("project-subtitle")[0]
    // Overview section removed from product shell.
    var descEl = null
    var contentEl = document.getElementsByClassName("product-detail-content")[0]

    if (titleWrap) {
        titleWrap.innerHTML = '<h1 class="entry-title">' + escapeHtml(product.name) + "</h1>"
    }
    if (subtitleEl) {
        subtitleEl.textContent = product.subtitle || ""
    }
    // No overview text on the detail page

    if (contentEl) {
        var isHoneyGold = slug === "honeygold"
        var heroHtml = isHoneyGold
            ? buildProductHeroHtml(slug, product, { galleryStart: 0, extraImage: product.platformExtraImage })
            : buildProductHeroHtml(slug, product)
        var introParas = product.intro || []
        var introHtml = ""
        if (!isHoneyGold && introParas.length) {
            var introChunks = []
            for (var ii = 0; ii < introParas.length; ii++) {
                var chunk = String(introParas[ii] || "").trim()
                if (chunk) {
                    introChunks.push(chunk)
                }
            }
            if (introChunks.length) {
                introHtml = "<p>" + escapeHtml(introChunks.join(" ")) + "</p>"
            }
        }
        if (!isHoneyGold && !introHtml && product.overview) {
            introHtml = "<p>" + escapeHtml(product.overview) + "</p>"
        }
        var cards = product.featureCards || []
        var cardHtml = ""
        for (var c = 0; c < cards.length; c++) {
            var card = cards[c] || {}
            var title = card.title || ""
            var body = card.body || ""
            var colClass = "content-column one_third"
            if ((c + 1) % 3 === 0) {
                colClass += " last_column"
            }
            cardHtml += "<div class='" + colClass + "'>"
            cardHtml += "<div style=\"" + (((c + 1) % 3 === 1) ? "padding-right:1em;" : ((c + 1) % 3 === 2) ? "padding-right:1em;padding-left:1em;" : "padding-left:1em;") + "\">"
            cardHtml += "<h2>" + escapeHtml(title) + "</h2>"
            cardHtml += "<p>" + escapeHtml(body) + "</p>"
            cardHtml += "</div></div>"
            if ((c + 1) % 3 === 0 && c !== cards.length - 1) {
                cardHtml += "<div class='p-t-20 clear_column'></div>"
            }
        }
        cardHtml += "<div class='clear_column'></div>"

        contentEl.innerHTML = `
          ${heroHtml}
          <div class="product-detail-intro">
            ${introHtml}
          </div>
          <article class="services service-area">
            ${cardHtml}
          </article>
        `
    }

    if (slug === "honeygold") {
        applyHoneyGoldProductPage(slug, product)
    } else {
        applyHoneyGoldPricingRegions(product)
    }
    scrollToProductHashAnchor()

    setProductPrevNextLinks(slug)
    renderOtherProducts(slug)
    if (slug === "honeygold") {
        fixHoneyGoldPageScrollLayout()
        window.setTimeout(fixHoneyGoldPageScrollLayout, 0)
        window.setTimeout(fixHoneyGoldPageScrollLayout, 500)
    }

    updateLinkedInShareLinks(slug)
}

function bootstrapGranolaPage() {
    if (document.getElementById("blog-cards")) {
        listBlogs()
    }
    if (document.getElementsByClassName("product-detail-content").length) {
        loadProductDetail()
    }
    if (document.getElementsByClassName("blog-entry-content").length && getQueryParam("name")) {
        loadBlogDetail()
    }
    if (document.body.classList.contains("service-detail-page") && getQueryParam("name")) {
        loadServiceDetail()
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapGranolaPage)
} else {
    bootstrapGranolaPage()
}

