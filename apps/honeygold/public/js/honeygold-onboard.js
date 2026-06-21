/**
 * HoneyGold customer onboarding wizard.
 * Phase 1: mock provisioning API (see docs/honeygold-onboarding.md).
 * Starter shared-pool tenancy: docs/honeygold-starter-multitenancy-checklist.md
 * Phase 3: set window.HG_ONBOARD_API_BASE to API Gateway stage URL.
 */
(function () {
    "use strict";

    var STORAGE_KEY = "hg-onboard-draft-v1";
    var PROVISION_STORAGE_KEY = "hg-onboard-provision-v1";
    var STARTER_SESSION_KEY = "hg-starter-session-v1";
    var TERMS_VERSION = "2026-05-19";

    var STEP_DEFS = [
        { id: "plan", label: "Plan" },
        { id: "organization", label: "Organization" },
        { id: "address", label: "Address" },
        { id: "contact", label: "Contact" },
        { id: "review", label: "Review" }
    ];

    var STARTER_STEP_DEFS = [
        { id: "company", label: "Company" },
        { id: "profile", label: "Profile" }
    ];

    var PROVISION_STEPS = [
        { id: "validating", label: "Validating your request" },
        { id: "creating_network", label: "Creating network (VPC & subnets)" },
        { id: "provisioning_database", label: "Provisioning RDS PostgreSQL (metadata)" },
        { id: "deploying_application", label: "Deploying ECS Fargate (HoneyGold + Superset)" },
        { id: "health_checks", label: "Running health checks" },
        { id: "ready", label: "Environment ready" }
    ];

    var STARTER_PROVISION_STEPS = [
        { id: "validating", label: "Validating your account" },
        { id: "creating_network", label: "Creating secure network" },
        { id: "provisioning_database", label: "Provisioning database schemas" },
        { id: "deploying_application", label: "Deploying Superset workspace" },
        { id: "health_checks", label: "Running health checks" },
        { id: "ready", label: "Finalizing your workspace" }
    ];

    var ONBOARD_PLAN_IDS = { business: true, enterprise: true };

    var FALLBACK_PLANS = [
        { id: "business", name: "Business", price: "€699 / mo*", compute: "2 vCPU · 4 GB · dedicated ECS + RDS", note: "Dedicated stack, SSO, 8 creators + 50 viewers, 5,000 MCP tool calls/mo. Provision ~10–20 min." },
        { id: "enterprise", name: "Enterprise", price: "Contact us", compute: "XL / multi-region", note: "Sales-assisted deployment; custom MCP and infrastructure." }
    ];

    /** Business list price (EUR) — keep in sync with PRODUCT_DETAILS.honeygold pricing table. */
    var BUSINESS_MONTHLY_EUR = 699;
    var BUSINESS_ANNUAL_SAVINGS_RATE = 0.1;
    var ONBOARD_DEFAULT_TITLE = "Get your dedicated environment";

    function formatEur(amount) {
        return "€" + Math.round(amount).toLocaleString("en-IE");
    }

    function getBusinessBillingLabels() {
        var monthly = BUSINESS_MONTHLY_EUR;
        var annualTotal = Math.round(monthly * 12 * (1 - BUSINESS_ANNUAL_SAVINGS_RATE));
        var annualPerMonth = Math.round(annualTotal / 12);
        var monthlyYearTotal = monthly * 12;
        var savings = monthlyYearTotal - annualTotal;
        return {
            monthlyDetail: formatEur(monthly) + " / mo",
            annualDetail: formatEur(annualTotal) + " / yr",
            annualSub:
                formatEur(annualPerMonth) +
                " / mo effective · save " +
                formatEur(savings) +
                " (~" + Math.round(BUSINESS_ANNUAL_SAVINGS_RATE * 100) + "%) vs monthly",
            monthlyReview: formatEur(monthly) + " / mo",
            annualReview:
                formatEur(annualTotal) + " / yr billed annually (" + formatEur(annualPerMonth) + " / mo effective)"
        };
    }

    var COUNTRIES = [
        "Ireland", "United Kingdom", "United States", "Canada", "Germany", "France", "Netherlands",
        "Australia", "Singapore", "India", "Other"
    ];

    var state = {
        stepIndex: 0,
        draft: defaultDraft(),
        jobId: null,
        tenantId: null,
        idToken: null,
        mode: "business",
        provisioningActive: false,
        pollTimer: null,
        provisionStartedAt: null
    };

    function defaultDraft() {
        return {
            product: "honeygold",
            plan: "",
            billingInterval: "monthly",
            organization: { name: "", country: "" },
            address: { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" },
            contact: { fullName: "", email: "", phone: "", title: "" },
            consent: { termsAccepted: false, termsVersion: TERMS_VERSION },
            starterProfile: {
                companyName: "",
                companyEmail: "",
                phone: "",
                occupation: "",
                jobTitle: "",
                teamSize: "",
                primaryUseCase: ""
            }
        };
    }

    function activeStepDefs() {
        return state.mode === "starter" ? STARTER_STEP_DEFS : STEP_DEFS;
    }

    function activeProvisionSteps() {
        return state.mode === "starter" ? STARTER_PROVISION_STEPS : PROVISION_STEPS;
    }

    function sharedAppBase() {
        return String(window.HG_SHARED_APP_URL || "https://honeygold.granolaconsulting.com").replace(/\/$/, "");
    }

    function tenantIdFromQuery() {
        var q = window.location.search.replace(/^\?/, "").split("&");
        for (var i = 0; i < q.length; i++) {
            var p = q[i].split("=");
            if (decodeURIComponent(p[0]) === "tenantId" && p[1]) {
                return decodeURIComponent(p[1]);
            }
        }
        return "";
    }

    function phaseFromQuery() {
        var q = window.location.search.replace(/^\?/, "").split("&");
        for (var i = 0; i < q.length; i++) {
            var p = q[i].split("=");
            if (decodeURIComponent(p[0]) === "phase" && p[1]) {
                return decodeURIComponent(p[1]).toLowerCase();
            }
        }
        return "";
    }

    function loadStarterSession() {
        try {
            var raw = sessionStorage.getItem(STARTER_SESSION_KEY);
            if (!raw) {
                return;
            }
            var parsed = JSON.parse(raw);
            if (parsed && parsed.tenantId) {
                state.tenantId = parsed.tenantId;
            }
            if (parsed && parsed.idToken) {
                state.idToken = parsed.idToken;
            }
            if (parsed && parsed.email && !state.draft.starterProfile.companyEmail) {
                state.draft.starterProfile.companyEmail = parsed.email;
            }
        } catch (e) {
            /* ignore */
        }
    }

    function saveStarterSession(extra) {
        try {
            var payload = {
                tenantId: state.tenantId || tenantIdFromQuery(),
                idToken: state.idToken || null,
                email: state.draft.starterProfile.companyEmail || ""
            };
            if (extra && typeof extra === "object") {
                Object.keys(extra).forEach(function (k) {
                    payload[k] = extra[k];
                });
            }
            sessionStorage.setItem(STARTER_SESSION_KEY, JSON.stringify(payload));
        } catch (e) {
            /* ignore */
        }
    }

    function loadProvisionState() {
        try {
            var raw = sessionStorage.getItem(PROVISION_STORAGE_KEY);
            if (!raw) {
                return null;
            }
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function saveProvisionState() {
        try {
            sessionStorage.setItem(
                PROVISION_STORAGE_KEY,
                JSON.stringify({
                    mode: state.mode,
                    jobId: state.jobId,
                    tenantId: state.tenantId,
                    startedAt: state.provisionStartedAt || Date.now()
                })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function clearProvisionState() {
        try {
            sessionStorage.removeItem(PROVISION_STORAGE_KEY);
        } catch (e) {
            /* ignore */
        }
    }

    function esc(s) {
        if (typeof escapeHtml === "function") {
            return escapeHtml(String(s == null ? "" : s));
        }
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function getPlans() {
        var pt = typeof PRODUCT_DETAILS !== "undefined" && PRODUCT_DETAILS.honeygold && PRODUCT_DETAILS.honeygold.pricingTables;
        if (!pt || !pt.comparison) {
            return FALLBACK_PLANS;
        }
        var cols = pt.comparison.columns || [];
        var rows = pt.comparison.rows || [];
        var priceRow = null;
        var computeRow = null;
        for (var r = 0; r < rows.length; r++) {
            if (rows[r][0] === "Starting at") {
                priceRow = rows[r];
            }
            if (rows[r][0] === "Compute tier (included)") {
                computeRow = rows[r];
            }
        }
        var plans = [];
        for (var c = 1; c < cols.length; c++) {
            var name = cols[c];
            var id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            if (!ONBOARD_PLAN_IDS[id]) {
                continue;
            }
            plans.push({
                id: id,
                name: name,
                price: priceRow ? priceRow[c] : "",
                compute: computeRow ? computeRow[c] : "",
                note: id === "enterprise"
                    ? "Sales-assisted deployment."
                    : "Dedicated CloudFormation stack (ECS Fargate + RDS)."
            });
        }
        return plans.length ? plans : FALLBACK_PLANS;
    }

    function isStarterPlan(planId) {
        var id = String(planId || state.draft.plan || "").toLowerCase();
        return id === "starter" || id === "sandbox";
    }

    function planFromQuery() {
        var q = window.location.search.replace(/^\?/, "").split("&");
        for (var i = 0; i < q.length; i++) {
            var p = q[i].split("=");
            if (decodeURIComponent(p[0]) === "plan" && p[1]) {
                return decodeURIComponent(p[1]).toLowerCase();
            }
        }
        return "";
    }

    function loadDraft() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    state.draft = mergeDraft(defaultDraft(), parsed);
                }
            }
        } catch (e) {
            /* ignore */
        }
        var fromUrl = planFromQuery();
        if (fromUrl) {
            state.draft.plan = fromUrl;
        }
    }

    function mergeDraft(base, patch) {
        var out = JSON.parse(JSON.stringify(base));
        if (patch.plan) {
            out.plan = patch.plan;
        }
        if (patch.organization) {
            Object.keys(patch.organization).forEach(function (k) {
                out.organization[k] = patch.organization[k];
            });
        }
        if (patch.address) {
            Object.keys(patch.address).forEach(function (k) {
                out.address[k] = patch.address[k];
            });
        }
        if (patch.contact) {
            Object.keys(patch.contact).forEach(function (k) {
                out.contact[k] = patch.contact[k];
            });
        }
        if (patch.consent) {
            Object.keys(patch.consent).forEach(function (k) {
                out.consent[k] = patch.consent[k];
            });
        }
        if (patch.starterProfile) {
            Object.keys(patch.starterProfile).forEach(function (k) {
                out.starterProfile[k] = patch.starterProfile[k];
            });
        }
        return out;
    }

    function saveDraft() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.draft));
        } catch (e) {
            /* ignore */
        }
    }

    function clearDraft() {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            /* ignore */
        }
    }

    function apiBase() {
        var b = window.HG_ONBOARD_API_BASE;
        if (typeof b === "string" && b.length) {
            return b.replace(/\/$/, "");
        }
        return "";
    }

    function apiUrl(path) {
        var base = apiBase();
        if (!base) {
            return "";
        }
        path = String(path || "");
        if (path.indexOf("/v1/") === 0 && /\/v1$/i.test(base)) {
            path = path.slice(3);
        }
        if (path.charAt(0) !== "/") {
            path = "/" + path;
        }
        return base + path;
    }

    function useMockApi() {
        if (window.HG_ONBOARD_USE_MOCK === false) {
            return false;
        }
        if (window.HG_ONBOARD_USE_MOCK === true) {
            return true;
        }
        return !apiBase();
    }

    function buildPayload() {
        var d = state.draft;
        if (d.address.country === "" && d.organization.country) {
            d.address.country = d.organization.country;
        }
        return {
            product: d.product,
            plan: d.plan,
            deploymentType: "production",
            organization: d.organization,
            address: d.address,
            contact: d.contact,
            consent: d.consent,
            metadata: {
                source: "granolaconsulting.com",
                path: window.location.pathname,
                sandboxDurationDays: null,
                funnel: "business_provision"
            }
        };
    }

    function validateStep(index) {
        var d = state.draft;
        var msg = "";
        if (state.mode === "starter") {
            var sp = d.starterProfile;
            if (index === 0) {
                if (!sp.companyName.trim()) {
                    msg = "Company name is required.";
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sp.companyEmail.trim())) {
                    msg = "A valid company email is required.";
                } else if (!sp.phone.trim()) {
                    msg = "Phone number is required.";
                }
            }
            if (index === 1 && !sp.occupation.trim()) {
                msg = "Your role / occupation is required.";
            }
            return msg;
        }
        if (index === 0 && !d.plan) {
            msg = "Please select a plan.";
        }
        if (index === 1) {
            if (!d.organization.name.trim()) {
                msg = "Organization name is required.";
            } else if (!d.organization.country) {
                msg = "Country is required.";
            }
        }
        if (index === 2) {
            if (!d.address.line1.trim()) {
                msg = "Address line 1 is required.";
            } else if (!d.address.city.trim()) {
                msg = "City is required.";
            } else if (!d.address.postalCode.trim()) {
                msg = "Postal code is required.";
            }
        }
        if (index === 3) {
            if (!d.contact.fullName.trim()) {
                msg = "Contact name is required.";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contact.email.trim())) {
                msg = "A valid work email is required.";
            } else if (!d.consent.termsAccepted) {
                msg = "Please accept the terms to continue.";
            }
        }
        return msg;
    }

    function showError(msg) {
        var globalEl = document.getElementById("hg-onboard-global-error");
        var panelEl = document.getElementById("hg-onboard-error");
        var el = globalEl || panelEl;
        if (!el) {
            return;
        }
        if (msg) {
            if (globalEl) {
                globalEl.textContent = msg;
                globalEl.hidden = false;
            }
            if (panelEl) {
                panelEl.textContent = msg;
                panelEl.hidden = false;
            }
        } else {
            if (globalEl) {
                globalEl.hidden = true;
                globalEl.textContent = "";
            }
            if (panelEl) {
                panelEl.hidden = true;
                panelEl.textContent = "";
            }
        }
    }

    function hideStarterWizardChrome() {
        var steps = document.querySelector(".hg-onboard-steps");
        var panels = document.getElementById("hg-onboard-panels");
        var actions = document.getElementById("hg-onboard-actions");
        setElHidden(steps, true);
        setElHidden(panels, true);
        setElHidden(actions, true);
    }

    function showStarterSignInGate(signinUrl) {
        hideStarterWizardChrome();
        var panels = document.getElementById("hg-onboard-panels");
        if (!panels) {
            return;
        }
        panels.removeAttribute("hidden");
        panels.innerHTML =
            '<div class="hg-onboard-panel">' +
            '<h2 class="hg-onboard-panel-title">Sign in to continue</h2>' +
            '<p class="hg-onboard-panel-lead">Your HoneyGold workspace is linked to this browser session. Sign in with Google to open setup on <strong>honeygold.granolaconsulting.com</strong>.</p>' +
            '<p class="hg-onboard-actions" style="margin-top:1.5rem">' +
            '<a class="view-more-btn hg-onboard-btn-primary" href="' +
            esc(signinUrl) +
            '">Sign in with Google</a></p></div>';
    }

    function renderIndicator() {
        var ol = document.getElementById("hg-onboard-step-indicator");
        if (!ol) {
            return;
        }
        var defs = activeStepDefs();
        var html = "";
        for (var i = 0; i < defs.length; i++) {
            var cls = "hg-onboard-step-item";
            if (i < state.stepIndex) {
                cls += " is-done";
            }
            if (i === state.stepIndex) {
                cls += " is-active";
            }
            html += '<li class="' + cls + '"><span class="hg-onboard-step-num">' + (i + 1) + '</span> ' + esc(defs[i].label) + "</li>";
        }
        ol.innerHTML = html;
    }

    function countryOptions(selected) {
        var html = '<option value="">Select country</option>';
        for (var i = 0; i < COUNTRIES.length; i++) {
            var c = COUNTRIES[i];
            html += '<option value="' + esc(c) + '"' + (c === selected ? " selected" : "") + ">" + esc(c) + "</option>";
        }
        return html;
    }

    function renderStarterCompanyPanel() {
        var sp = state.draft.starterProfile;
        var html = '<div class="hg-onboard-panel" data-step="company">';
        html += '<h2 class="hg-onboard-panel-title">Tell us about your company</h2>';
        html += '<p class="hg-onboard-panel-lead">We use this to personalize your workspace while your analytics environment starts up.</p>';
        html += fieldRow("Company name", "hg-st-company", '<input id="hg-st-company" type="text" autocomplete="organization" value="' + esc(sp.companyName) + '" />');
        html += fieldRow("Company email", "hg-st-email", '<input id="hg-st-email" type="email" autocomplete="email" value="' + esc(sp.companyEmail) + '" />');
        html += fieldRow("Phone number", "hg-st-phone", '<input id="hg-st-phone" type="tel" autocomplete="tel" value="' + esc(sp.phone) + '" />');
        html += '<p id="hg-onboard-error" class="hg-onboard-error" hidden></p>';
        html += "</div>";
        return html;
    }

    function renderStarterProfilePanel() {
        var sp = state.draft.starterProfile;
        var html = '<div class="hg-onboard-panel" data-step="profile">';
        html += '<h2 class="hg-onboard-panel-title">About you</h2>';
        html += fieldRow("Your role / occupation", "hg-st-occupation", '<input id="hg-st-occupation" type="text" value="' + esc(sp.occupation) + '" />');
        html += fieldRow("Job title (optional)", "hg-st-title", '<input id="hg-st-title" type="text" value="' + esc(sp.jobTitle) + '" />');
        html += fieldRow("Team size", "hg-st-team", '<select id="hg-st-team"><option value="">Select…</option><option' + (sp.teamSize === "Just me" ? " selected" : "") + '>Just me</option><option' + (sp.teamSize === "2–10" ? " selected" : "") + '>2–10</option><option' + (sp.teamSize === "11–50" ? " selected" : "") + '>11–50</option><option' + (sp.teamSize === "51–200" ? " selected" : "") + '>51–200</option><option' + (sp.teamSize === "200+" ? " selected" : "") + '>200+</option></select>');
        html += fieldRow("What will you use HoneyGold for?", "hg-st-usecase", '<textarea id="hg-st-usecase" rows="3" maxlength="500">' + esc(sp.primaryUseCase) + "</textarea>");
        html += '<p id="hg-onboard-error" class="hg-onboard-error" hidden></p>';
        html += "</div>";
        return html;
    }

    function renderPlanPanel() {
        var plans = getPlans();
        var html = '<div class="hg-onboard-panel" data-step="plan">';
        html += '<h2 class="hg-onboard-panel-title">Choose your plan</h2>';
        html +=
            '<p class="hg-onboard-panel-lead">Business and Enterprise receive a <strong>dedicated AWS stack</strong> (VPC, ECS Fargate, RDS). Provisioning typically takes <strong>10–20 minutes</strong>. Want free instant access? <a href="/sign-in?plan=starter">Start free with Google</a> on Starter (shared pool, 1 user).</p>';
        html += '<div class="hg-onboard-plan-grid">';
        for (var i = 0; i < plans.length; i++) {
            var p = plans[i];
            var checked = state.draft.plan === p.id ? " is-selected" : "";
            html += '<label class="hg-onboard-plan-card' + checked + '">';
            html += '<input type="radio" name="hg-plan" value="' + esc(p.id) + '"' + (state.draft.plan === p.id ? " checked" : "") + " />";
            html += "<h3>" + esc(p.name) + "</h3>";
            html += '<p class="hg-onboard-plan-price">' + esc(p.price) + "</p>";
            html += '<p class="hg-onboard-plan-meta">' + esc(p.compute) + "</p>";
            html += '<p class="hg-onboard-plan-note">' + esc(p.note) + "</p>";
            html += "</label>";
        }
        html += "</div></div>";
        return html;
    }

    function renderBillingIntervalPicker() {
        var bi = state.draft.billingInterval === "annual" ? "annual" : "monthly";
        var prices = getBusinessBillingLabels();
        var html = '<div class="hg-onboard-billing-pick">';
        html += '<p class="hg-onboard-billing-pick-label">Payment frequency</p>';
        html += '<div class="hg-billing-segmented" role="radiogroup" aria-label="Payment frequency">';
        html +=
            '<label class="hg-billing-segment' +
            (bi === "monthly" ? " is-selected" : "") +
            '"><input type="radio" name="hg-billing-interval" value="monthly"' +
            (bi === "monthly" ? " checked" : "") +
            ' /><span class="hg-billing-segment-title">Monthly</span><span class="hg-billing-segment-detail">' +
            esc(prices.monthlyDetail) +
            "</span></label>";
        html +=
            '<label class="hg-billing-segment' +
            (bi === "annual" ? " is-selected" : "") +
            '"><input type="radio" name="hg-billing-interval" value="annual"' +
            (bi === "annual" ? " checked" : "") +
            ' /><span class="hg-billing-segment-title">Annual</span><span class="hg-billing-segment-detail">' +
            esc(prices.annualDetail) +
            '</span><span class="hg-billing-segment-sub">' +
            esc(prices.annualSub) +
            "</span></label>";
        html += "</div>";
        html +=
            '<p class="hg-onboard-billing-note">Card and billing address are collected securely on Stripe.</p>';
        html += "</div>";
        return html;
    }

    function fieldRow(label, id, inputHtml) {
        return '<div class="hg-onboard-field"><label for="' + id + '">' + esc(label) + '</label>' + inputHtml + "</div>";
    }

    function renderOrganizationPanel() {
        var o = state.draft.organization;
        var html = '<div class="hg-onboard-panel" data-step="organization">';
        html += '<h2 class="hg-onboard-panel-title">Organization</h2>';
        html += fieldRow("Legal or display name", "hg-org-name", '<input id="hg-org-name" type="text" autocomplete="organization" value="' + esc(o.name) + '" />');
        html += fieldRow("Country", "hg-org-country", '<select id="hg-org-country">' + countryOptions(o.country) + "</select>");
        html += "</div>";
        return html;
    }

    function renderAddressPanel() {
        var a = state.draft.address;
        var html = '<div class="hg-onboard-panel" data-step="address">';
        html += '<h2 class="hg-onboard-panel-title">Address</h2>';
        html += fieldRow("Address line 1", "hg-addr1", '<input id="hg-addr1" type="text" autocomplete="address-line1" value="' + esc(a.line1) + '" />');
        html += fieldRow("Address line 2", "hg-addr2", '<input id="hg-addr2" type="text" autocomplete="address-line2" value="' + esc(a.line2) + '" />');
        html += '<div class="hg-onboard-field-row">';
        html += fieldRow("City", "hg-city", '<input id="hg-city" type="text" autocomplete="address-level2" value="' + esc(a.city) + '" />');
        html += fieldRow("State / region", "hg-region", '<input id="hg-region" type="text" autocomplete="address-level1" value="' + esc(a.region) + '" />');
        html += "</div>";
        html += fieldRow("Postal code", "hg-postal", '<input id="hg-postal" type="text" autocomplete="postal-code" value="' + esc(a.postalCode) + '" />');
        html += "</div>";
        return html;
    }

    function renderContactPanel() {
        var c = state.draft.contact;
        var html = '<div class="hg-onboard-panel" data-step="contact">';
        html += '<h2 class="hg-onboard-panel-title">Contact details</h2>';
        html += fieldRow("Full name", "hg-contact-name", '<input id="hg-contact-name" type="text" autocomplete="name" value="' + esc(c.fullName) + '" />');
        html += fieldRow("Work email", "hg-contact-email", '<input id="hg-contact-email" type="email" autocomplete="email" value="' + esc(c.email) + '" />');
        html += fieldRow("Phone (optional)", "hg-contact-phone", '<input id="hg-contact-phone" type="tel" autocomplete="tel" value="' + esc(c.phone) + '" />');
        html += fieldRow("Job title", "hg-contact-title", '<input id="hg-contact-title" type="text" autocomplete="organization-title" value="' + esc(c.title) + '" />');
        html +=
            '<label class="hg-onboard-consent">' +
            '<input type="checkbox" id="hg-terms" class="hg-onboard-consent-input"' +
            (state.draft.consent.termsAccepted ? " checked" : "") +
            ' aria-describedby="hg-terms-desc" />' +
            '<span class="hg-onboard-consent-box" aria-hidden="true"></span>' +
            '<span class="hg-onboard-consent-text" id="hg-terms-desc">I agree to the ' +
            '<a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and ' +
            '<a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> ' +
            "for HoneyGold hosted services.</span></label>";
        html += "</div>";
        return html;
    }

    function renderReviewPanel() {
        var d = state.draft;
        var plan = null;
        var plans = getPlans();
        for (var i = 0; i < plans.length; i++) {
            if (plans[i].id === d.plan) {
                plan = plans[i];
                break;
            }
        }
        var html = '<div class="hg-onboard-panel" data-step="review">';
        html += '<h2 class="hg-onboard-panel-title">' + (d.plan === "enterprise" ? "Review &amp; send inquiry" : "Review &amp; deploy") + "</h2>";
        if (d.plan === "enterprise") {
            html +=
                '<p class="hg-onboard-panel-lead">Submit your details and our team will reach out to discuss Enterprise deployment, custom infrastructure, and commercial terms.</p>';
        } else {
            html +=
                '<p class="hg-onboard-panel-lead">We will create a dedicated CloudFormation stack for your tenant. Provisioning typically takes <strong>10–20 minutes</strong>. You will get a URL like <strong>your-org-honeygold.granolaconsulting.com</strong>. Connect Claude Desktop via the HoneyGold MCP connector after deploy.</p>';
        }
        html += '<dl class="hg-onboard-review">';
        var planLine = plan ? plan.name + " (" + plan.price + ")" : d.plan;
        if (requiresStripeCheckout() && (d.plan === "business" || d.plan === "professional")) {
            var billingLabels = getBusinessBillingLabels();
            planLine =
                (plan ? plan.name : "Business") +
                ": " +
                (d.billingInterval === "annual" ? billingLabels.annualReview : billingLabels.monthlyReview);
        }
        html += "<dt>Plan</dt><dd>" + esc(planLine) + "</dd>";
        html += "<dt>Organization</dt><dd>" + esc(d.organization.name) + ", " + esc(d.organization.country) + "</dd>";
        html += "<dt>Address</dt><dd>" + esc(d.address.line1) + ", " + esc(d.address.city) + " " + esc(d.address.postalCode) + "</dd>";
        html += "<dt>Contact</dt><dd>" + esc(d.contact.fullName) + " &lt;" + esc(d.contact.email) + "&gt;</dd>";
        html += "</dl>";
        if (requiresStripeCheckout()) {
            html += renderBillingIntervalPicker();
            html +=
                '<p class="hg-onboard-panel-lead hg-onboard-review-pay-lead">After payment, we provision your dedicated stack automatically (typically <strong>10–20 minutes</strong>).</p>';
        }
        html += '<p id="hg-onboard-error" class="hg-onboard-error" hidden></p>';
        html += "</div>";
        return html;
    }

    function renderPanel() {
        var panels = document.getElementById("hg-onboard-panels");
        if (!panels) {
            return;
        }
        var html = "";
        if (state.mode === "starter") {
            html = state.stepIndex === 0 ? renderStarterCompanyPanel() : renderStarterProfilePanel();
        } else {
            switch (state.stepIndex) {
                case 0:
                    html = renderPlanPanel();
                    break;
                case 1:
                    html = renderOrganizationPanel();
                    break;
                case 2:
                    html = renderAddressPanel();
                    break;
                case 3:
                    html = renderContactPanel();
                    break;
                case 4:
                    html = renderReviewPanel();
                    break;
                default:
                    html = "";
            }
        }
        panels.innerHTML = html;
        bindPanelInputs();
    }

    function bindPanelInputs() {
        var planInputs = document.querySelectorAll('input[name="hg-plan"]');
        for (var i = 0; i < planInputs.length; i++) {
            planInputs[i].addEventListener("change", function (e) {
                state.draft.plan = e.target.value;
                saveDraft();
                applyOnboardPageContext();
                updateActions();
                renderPanel();
            });
        }
        var billingInputs = document.querySelectorAll('input[name="hg-billing-interval"]');
        for (var b = 0; b < billingInputs.length; b++) {
            billingInputs[b].addEventListener("change", function (e) {
                state.draft.billingInterval = e.target.value === "annual" ? "annual" : "monthly";
                saveDraft();
                var segments = document.querySelectorAll(".hg-billing-segment");
                for (var s = 0; s < segments.length; s++) {
                    var input = segments[s].querySelector('input[name="hg-billing-interval"]');
                    if (input && input.checked) {
                        segments[s].classList.add("is-selected");
                    } else {
                        segments[s].classList.remove("is-selected");
                    }
                }
                if (state.stepIndex === activeStepDefs().length - 1) {
                    renderPanel();
                    updateActions();
                }
            });
        }
        bindInput("hg-org-name", function (v) {
            state.draft.organization.name = v;
        });
        bindSelect("hg-org-country", function (v) {
            state.draft.organization.country = v;
        });
        bindInput("hg-addr1", function (v) {
            state.draft.address.line1 = v;
        });
        bindInput("hg-addr2", function (v) {
            state.draft.address.line2 = v;
        });
        bindInput("hg-city", function (v) {
            state.draft.address.city = v;
        });
        bindInput("hg-region", function (v) {
            state.draft.address.region = v;
        });
        bindInput("hg-postal", function (v) {
            state.draft.address.postalCode = v;
        });
        bindInput("hg-contact-name", function (v) {
            state.draft.contact.fullName = v;
        });
        bindInput("hg-contact-email", function (v) {
            state.draft.contact.email = v;
        });
        bindInput("hg-contact-phone", function (v) {
            state.draft.contact.phone = v;
        });
        bindInput("hg-contact-title", function (v) {
            state.draft.contact.title = v;
        });
        bindInput("hg-st-company", function (v) {
            state.draft.starterProfile.companyName = v;
        });
        bindInput("hg-st-email", function (v) {
            state.draft.starterProfile.companyEmail = v;
        });
        bindInput("hg-st-phone", function (v) {
            state.draft.starterProfile.phone = v;
        });
        bindInput("hg-st-occupation", function (v) {
            state.draft.starterProfile.occupation = v;
        });
        bindInput("hg-st-title", function (v) {
            state.draft.starterProfile.jobTitle = v;
        });
        bindSelect("hg-st-team", function (v) {
            state.draft.starterProfile.teamSize = v;
        });
        bindInput("hg-st-usecase", function (v) {
            state.draft.starterProfile.primaryUseCase = v;
        });
        var terms = document.getElementById("hg-terms");
        if (terms) {
            terms.addEventListener("change", function (e) {
                state.draft.consent.termsAccepted = e.target.checked;
                saveDraft();
            });
        }
        var consentLinks = document.querySelectorAll(".hg-onboard-consent-text a");
        for (var cl = 0; cl < consentLinks.length; cl++) {
            consentLinks[cl].addEventListener("click", function (e) {
                e.stopPropagation();
            });
        }
    }

    function bindInput(id, setter) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("input", function (e) {
            setter(e.target.value);
            saveDraft();
        });
    }

    function bindSelect(id, setter) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("change", function (e) {
            setter(e.target.value);
            saveDraft();
        });
    }

    function setElHidden(el, hidden) {
        if (!el) {
            return;
        }
        if (hidden) {
            el.setAttribute("hidden", "hidden");
        } else {
            el.removeAttribute("hidden");
        }
    }

    function updateActions() {
        var actions = document.getElementById("hg-onboard-actions");
        var back = document.getElementById("hg-onboard-back");
        var next = document.getElementById("hg-onboard-next");
        if (!actions || !back || !next) {
            return;
        }
        if (state.provisioningActive) {
            setElHidden(actions, true);
            return;
        }
        setElHidden(actions, false);
        var defs = activeStepDefs();
        setElHidden(back, false);
        if (state.stepIndex === defs.length - 1) {
            if (state.mode === "starter") {
                next.textContent = "Continue to setup";
            } else if (state.draft.plan === "enterprise") {
                next.textContent = "Contact us";
            } else if (requiresStripeCheckout()) {
                next.textContent = "Continue to payment";
            } else {
                next.textContent = "Start deployment";
            }
        } else {
            next.textContent = "Continue";
        }
    }

    function applyOnboardPageContext() {
        var title = document.querySelector(".hg-onboard-header .entry-title");
        var intro = document.querySelector(".hg-onboard-intro");
        if (state.mode === "starter") {
            if (title) {
                title.textContent = "Set up your HoneyGold workspace";
            }
            if (intro) {
                intro.innerHTML =
                    "Complete a short profile while we provision your private Superset workspace on the shared Starter pool (usually <strong>2–5 minutes</strong>). Your MCP API key is in the welcome email.";
            }
            return;
        }
        if (title) {
            title.textContent =
                state.draft.plan === "enterprise"
                    ? "Enterprise: contact & provision"
                    : ONBOARD_DEFAULT_TITLE;
        }
        if (intro && !intro.dataset.hgPatched) {
            intro.innerHTML =
                "Business and Enterprise receive a <strong>dedicated AWS stack</strong> per customer. After provisioning, use <strong>Claude Desktop</strong> with the HoneyGold MCP connector (you pay Anthropic for Claude).";
            intro.dataset.hgPatched = "1";
        }
    }

    function goStep(delta) {
        if (delta > 0) {
            var err = validateStep(state.stepIndex);
            if (err) {
                showError(err);
                return;
            }
            showError("");
        }
        state.stepIndex = Math.max(0, Math.min(activeStepDefs().length - 1, state.stepIndex + delta));
        saveDraft();
        renderIndicator();
        renderPanel();
        updateActions();
    }

    function hideWizard() {
        state.provisioningActive = true;
        var steps = document.querySelector(".hg-onboard-steps");
        var panels = document.getElementById("hg-onboard-panels");
        var actions = document.getElementById("hg-onboard-actions");
        setElHidden(steps, true);
        setElHidden(panels, true);
        setElHidden(actions, true);
        saveProvisionState();
    }

    function renderProvisionShell(isStarter) {
        var section = document.getElementById("hg-onboard-provision");
        if (!section) {
            return;
        }
        section.hidden = false;
        var html = '<div class="hg-onboard-provision-card">';
        html += '<div class="hg-onboard-spinner" aria-hidden="true"></div>';
        if (isStarter) {
            html += '<h2 class="hg-onboard-panel-title">Setting up your workspace</h2>';
            html +=
                '<p class="hg-onboard-panel-lead">Starting your private Superset workspace on the Starter pool. We will open HoneyGold automatically once Superset responds.</p>';
            html += '<p class="hg-onboard-provision-elapsed">Elapsed: <span id="hg-elapsed">0:00</span> (typical completion: 2–5 minutes).</p>';
        } else {
            html += '<h2 class="hg-onboard-panel-title">Provisioning your dedicated stack</h2>';
            html +=
                '<p class="hg-onboard-panel-lead">Setting up your <strong>dedicated</strong> HoneyGold environment (ECS Fargate + RDS). We will email you when the MCP connector URL and API key are ready.</p>';
            html += '<p class="hg-onboard-provision-elapsed">Elapsed: <span id="hg-elapsed">0:00</span> (typical completion: 10–20 minutes).</p>';
        }
        html += '<ol id="hg-provision-steps" class="hg-provision-step-list"></ol>';
        html += '<p id="hg-provision-status" class="hg-onboard-provision-status"></p>';
        html += '<p id="hg-provision-result" class="hg-onboard-provision-result" hidden></p>';
        html += "</div>";
        section.innerHTML = html;
    }

    function renderProvisionSteps(steps, status) {
        var ol = document.getElementById("hg-provision-steps");
        if (!ol) {
            return;
        }
        var html = "";
        var defs = activeProvisionSteps();
        for (var i = 0; i < defs.length; i++) {
            var def = defs[i];
            var st = "pending";
            if (steps && steps[def.id]) {
                st = steps[def.id];
            }
            html += '<li class="hg-provision-step hg-provision-step--' + st + '">' + esc(def.label) + "</li>";
        }
        ol.innerHTML = html;
        var statusEl = document.getElementById("hg-provision-status");
        if (statusEl && status) {
            statusEl.textContent = status;
        }
    }

    function formatElapsed(ms) {
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        s = s % 60;
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function mockCreateJob(payload) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve({
                    jobId: "mock-" + Date.now(),
                    status: "QUEUED",
                    tenantId: slugify(payload.organization.name) + "-" + Math.random().toString(36).slice(2, 8),
                    stackName: "HoneyGold-" + slugify(payload.organization.name)
                });
            }, 400);
        });
    }

    function mockPollJob(jobId, startedAt) {
        var elapsed = Date.now() - startedAt;
        var steps = {};
        var status = "IN_PROGRESS";
        var order = ["validating", "creating_network", "provisioning_database", "deploying_application", "health_checks", "ready"];
        var thresholds = [3000, 12000, 28000, 45000, 58000, 72000];
        for (var i = 0; i < order.length; i++) {
            if (elapsed >= thresholds[i]) {
                steps[order[i]] = i === order.length - 1 ? "done" : "done";
            } else if (elapsed >= (thresholds[i - 1] || 0)) {
                steps[order[i]] = "active";
            } else {
                steps[order[i]] = "pending";
            }
        }
        if (elapsed >= thresholds[thresholds.length - 1]) {
            status = "READY";
            return Promise.resolve({
                jobId: jobId,
                status: status,
                steps: steps,
                percent: 100,
                publicHostname: "demo-org-honeygold.granolaconsulting.com",
                appUrl: "https://demo-org-honeygold.granolaconsulting.com",
                stackId: "arn:aws:cloudformation:mock:stack/" + jobId
            });
        }
        if (elapsed > 90000) {
            status = "FAILED";
            return Promise.resolve({
                jobId: jobId,
                status: status,
                steps: steps,
                error: "Mock timeout. Replace with live API."
            });
        }
        return Promise.resolve({
            jobId: jobId,
            status: status,
            steps: steps,
            percent: Math.min(99, Math.floor((elapsed / 72000) * 100))
        });
    }

    function slugify(s) {
        return String(s || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 24) || "tenant";
    }

    /** Prefer API publicHostname; fall back to appUrl. */
    function resolveHoneyGoldAppLink(data) {
        var host = data && data.publicHostname ? String(data.publicHostname).trim() : "";
        if (host) {
            host = host.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
            return host ? "https://" + host : "";
        }
        var url = data && data.appUrl ? String(data.appUrl).trim() : "";
        return url;
    }

    function displayHostnameFromLink(link) {
        if (!link) {
            return "";
        }
        try {
            return new URL(link).hostname;
        } catch (e) {
            return link.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
        }
    }

    function apiGetTenantStatus(tenantId) {
        return fetch(apiUrl("/tenants/" + encodeURIComponent(tenantId) + "/status")).then(function (r) {
            if (!r.ok) {
                throw new Error("Status check failed (" + r.status + ")");
            }
            return r.json();
        });
    }

    function apiGetWorkspaceStatus(tenantId) {
        var headers = {};
        if (state.idToken) {
            headers.Authorization = "Bearer " + state.idToken;
        }
        return fetch(sharedAppBase() + "/t/" + encodeURIComponent(tenantId) + "/workspace-status", {
            headers: headers
        }).then(function (r) {
            if (!r.ok) {
                throw new Error("Workspace status failed (" + r.status + ")");
            }
            return r.json();
        });
    }

    function apiSaveStarterProfile() {
        var sp = state.draft.starterProfile;
        if (!state.idToken) {
            return Promise.reject(new Error("Sign-in session missing. Return to sign-in and try again."));
        }
        return fetch(apiUrl("/tenants/" + encodeURIComponent(state.tenantId) + "/onboarding"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idToken: state.idToken,
                companyName: sp.companyName,
                companyEmail: sp.companyEmail,
                phone: sp.phone,
                occupation: sp.occupation,
                jobTitle: sp.jobTitle,
                teamSize: sp.teamSize,
                primaryUseCase: sp.primaryUseCase
            })
        }).then(function (r) {
            if (!r.ok) {
                return r.text().then(function (t) {
                    throw new Error(t || "Could not save profile (" + r.status + ")");
                });
            }
            return r.json();
        });
    }

    function openHoneyGoldWithSession(idToken) {
        var form = document.createElement("form");
        form.method = "POST";
        form.action = sharedAppBase() + "/auth/complete-session";
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = "id_token";
        input.value = idToken;
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
    }

    function showStarterReadyResult() {
        var result = document.getElementById("hg-provision-result");
        if (!result) {
            return;
        }
        result.hidden = false;
        result.innerHTML =
            '<p class="hg-onboard-success">Your HoneyGold workspace is ready.</p>' +
            '<p class="hg-onboard-panel-lead">Opening HoneyGold…</p>';
        clearProvisionState();
        clearDraft();
        if (state.idToken) {
            setTimeout(function () {
                openHoneyGoldWithSession(state.idToken);
            }, 800);
        }
    }

    function startStarterPolling(tenantId) {
        state.tenantId = tenantId;
        state.provisionStartedAt = state.provisionStartedAt || Date.now();
        var elapsedEl = document.getElementById("hg-elapsed");
        function tick() {
            if (elapsedEl) {
                elapsedEl.textContent = formatElapsed(Date.now() - state.provisionStartedAt);
            }
            var statusPromise = state.idToken ? apiGetWorkspaceStatus(tenantId) : apiGetTenantStatus(tenantId);
            statusPromise
                .then(function (data) {
                    renderProvisionSteps(data.steps, "Status: " + (data.status || "IN_PROGRESS"));
                    if (data.readyToOpen) {
                        if (state.pollTimer) {
                            clearInterval(state.pollTimer);
                            state.pollTimer = null;
                        }
                        showStarterReadyResult();
                    } else if (data.status === "FAILED" || data.status === "REVOKED") {
                        if (state.pollTimer) {
                            clearInterval(state.pollTimer);
                            state.pollTimer = null;
                        }
                        var result = document.getElementById("hg-provision-result");
                        if (result) {
                            result.hidden = false;
                            result.innerHTML =
                                '<p class="hg-onboard-error">Workspace setup did not complete.</p>' +
                                '<p class="hg-onboard-meta">Email <a href="mailto:hello@granolaconsulting.com">hello@granolaconsulting.com</a>.</p>';
                        }
                    }
                })
                .catch(function (err) {
                    var statusEl = document.getElementById("hg-provision-status");
                    if (statusEl) {
                        statusEl.textContent = "Error checking status: " + err.message;
                    }
                });
        }
        tick();
        state.pollTimer = setInterval(tick, 5000);
    }

    function beginProvisioningUI() {
        hideWizard();
        renderProvisionShell(state.mode === "starter");
    }

    function resumeProvisioningIfAny() {
        var saved = loadProvisionState();
        if (saved && saved.mode === "business" && saved.jobId) {
            state.mode = "business";
            state.jobId = saved.jobId;
            state.provisionStartedAt = saved.startedAt || Date.now();
            beginProvisioningUI();
            renderProvisionSteps({ validating: "active" }, "Status: IN_PROGRESS");
            startPolling(saved.jobId);
            return true;
        }
        if ((saved && saved.mode === "starter" && saved.tenantId) || (state.mode === "starter" && phaseFromQuery() === "progress")) {
            state.mode = "starter";
            state.tenantId = (saved && saved.tenantId) || state.tenantId || tenantIdFromQuery();
            state.provisionStartedAt = (saved && saved.startedAt) || Date.now();
            if (state.tenantId) {
                beginProvisioningUI();
                startStarterPolling(state.tenantId);
                return true;
            }
        }
        return false;
    }

    function submitStarterProfile() {
        showError("");
        saveStarterSession();
        if (!state.idToken) {
            window.location.href = starterSigninUrl(state.tenantId || tenantIdFromQuery());
            return;
        }
        openHoneyGoldWithSession(state.idToken);
        return;

        var err = "";
        for (var v = 0; v < STARTER_STEP_DEFS.length; v++) {
            err = validateStep(v);
            if (err) {
                break;
            }
        }
        if (err) {
            showError(err);
            return;
        }

        beginProvisioningUI();
        apiSaveStarterProfile()
            .then(function () {
                saveProvisionState();
                startStarterPolling(state.tenantId);
            })
            .catch(function (e) {
                state.provisioningActive = false;
                updateActions();
                var section = document.getElementById("hg-onboard-provision");
                if (section) {
                    section.hidden = true;
                }
                showError(e.message || String(e));
            });
    }

    function apiCreateJob(payload) {
        if (useMockApi()) {
            return mockCreateJob(payload);
        }
        return fetch(apiUrl("/provisioning/jobs"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(function (r) {
            if (!r.ok) {
                throw new Error("Request failed (" + r.status + ")");
            }
            return r.json();
        });
    }

    function apiFetchError(e, fallback) {
        if (e && e.name === "TypeError") {
            return new Error(
                fallback ||
                    "Could not reach the provisioning service (network or server error). Please try again in a moment."
            );
        }
        return e instanceof Error ? e : new Error(String(e));
    }

    function apiGetJob(jobId) {
        if (useMockApi()) {
            return mockPollJob(jobId, state.provisionStartedAt || Date.now());
        }
        return fetch(apiUrl("/provisioning/jobs/" + encodeURIComponent(jobId)))
            .then(parseApiJsonResponse)
            .catch(function (e) {
                throw apiFetchError(e, "Could not check deployment status. Please refresh this page.");
            });
    }

    function provisionErrorSummary(raw) {
        if (!raw) {
            return "";
        }
        var s = String(raw);
        if (s.indexOf("already exists") >= 0) {
            var exists = s.match(/identifier '([^']+)' already exists/);
            return exists
                ? "A required resource already exists: " + exists[1] + "."
                : "A required AWS resource already exists.";
        }
        if (s.indexOf("Cannot find version") >= 0) {
            var ver = s.match(/Cannot find version ([^\s]+)/);
            return ver
                ? "RDS engine version " + ver[1] + " is not available in this region."
                : "RDS engine version is not available in this region.";
        }
        if (s.indexOf("429") >= 0 || s.indexOf("toomanyrequests") >= 0 || s.indexOf("rate limit") >= 0) {
            return "Docker image build hit Docker Hub rate limits. We are retrying with AWS-hosted base images.";
        }
        if (s.indexOf("Error while executing command:") === 0 && s.length > 320) {
            return "CloudFormation deployment failed. Our team can retry from job reference below.";
        }
        return s.length > 400 ? s.slice(0, 400) + "…" : s;
    }

    function showProvisionResult(data) {
        var result = document.getElementById("hg-provision-result");
        if (!result) {
            return;
        }
        result.hidden = false;
        if (data.status === "READY") {
            var appLink = resolveHoneyGoldAppLink(data);
            var hostLabel = displayHostnameFromLink(appLink);
            var successLead = "Your dedicated HoneyGold environment is ready.";
            var html = '<p class="hg-onboard-success">' + successLead + "</p>";
            if (appLink && hostLabel) {
                html +=
                    '<p class="hg-onboard-panel-lead">Open your HoneyGold app:</p>' +
                    '<p class="hg-onboard-app-link"><a class="view-more-btn" href="' +
                    esc(appLink) +
                    '" target="_blank" rel="noopener noreferrer">Open HoneyGold</a></p>' +
                    '<p class="hg-onboard-meta"><a href="' +
                    esc(appLink) +
                    '" target="_blank" rel="noopener noreferrer">' +
                    esc(hostLabel) +
                    "</a></p>";
            } else {
                html +=
                    '<p class="hg-onboard-panel-lead">Your stack is ready. We will email your app URL shortly.</p>';
            }
            html +=
                '<p class="hg-onboard-meta">Install the HoneyGold MCP connector in Claude Desktop. If the link does not load immediately, wait 1–2 minutes for DNS to propagate.</p>';
            html += data.stackId ? "<p class=\"hg-onboard-meta\">Stack: " + esc(data.stackId) + "</p>" : "";
            result.innerHTML = html;
            clearDraft();
        } else if (data.status === "FAILED") {
            result.innerHTML =
                '<p class="hg-onboard-error">Deployment did not complete.</p>' +
                (data.error
                    ? '<p class="hg-onboard-meta"><strong>Details:</strong> ' +
                      esc(provisionErrorSummary(data.error)) +
                      "</p>"
                    : "") +
                '<p class="hg-onboard-meta">Reference: <strong>' +
                esc(data.jobId || state.jobId) +
                "</strong>. Email <a href=\"mailto:hello@granolaconsulting.com\">hello@granolaconsulting.com</a>.</p>";
        }
    }

    function startPolling(jobId) {
        state.jobId = jobId;
        state.provisionStartedAt = Date.now();
        saveProvisionState();
        var elapsedEl = document.getElementById("hg-elapsed");
        function tick() {
            if (elapsedEl) {
                elapsedEl.textContent = formatElapsed(Date.now() - state.provisionStartedAt);
            }
            apiGetJob(jobId)
                .then(function (data) {
                    renderProvisionSteps(data.steps, "Status: " + (data.status || "IN_PROGRESS"));
                    if (data.status === "READY" || data.status === "FAILED") {
                        if (state.pollTimer) {
                            clearInterval(state.pollTimer);
                            state.pollTimer = null;
                        }
                        showProvisionResult(data);
                    }
                })
                .catch(function (err) {
                    var friendly = apiFetchError(err);
                    var statusEl = document.getElementById("hg-provision-status");
                    if (statusEl) {
                        statusEl.textContent = "Error checking status: " + friendly.message;
                    }
                    showError(friendly.message);
                });
        }
        tick();
        state.pollTimer = setInterval(tick, 5000);
    }

    function requiresStripeCheckout() {
        if (useMockApi()) {
            return false;
        }
        if (window.HG_BILLING_ENABLED === false) {
            return false;
        }
        var plan = String(state.draft.plan || "");
        return plan === "business" || plan === "professional";
    }

    function parseApiJsonResponse(r) {
        return r.text().then(function (text) {
            var body = null;
            try {
                body = text ? JSON.parse(text) : null;
            } catch (parseErr) {
                body = text ? { message: text } : null;
            }
            if (!r.ok) {
                var msg =
                    (body && (body.message || body.error)) || "Request failed (" + r.status + ")";
                throw new Error(msg);
            }
            return body;
        });
    }

    function apiCreateCheckoutSession(payload) {
        return fetch(apiUrl("/billing/checkout-sessions"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
            .then(parseApiJsonResponse)
            .catch(function (e) {
                if (e && e.name === "TypeError") {
                    throw new Error(
                        "Could not reach the payment service (network or server error). Please try again in a moment."
                    );
                }
                throw e;
            });
    }

    function startStripeCheckout() {
        var err = "";
        var defs = activeStepDefs();
        for (var v = 0; v < defs.length; v++) {
            err = validateStep(v);
            if (err) {
                break;
            }
        }
        if (err) {
            showError(err);
            return;
        }
        saveDraft();
        var nextBtn = document.getElementById("hg-onboard-next");
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = "Redirecting to Stripe…";
        }
        var payload = buildPayload();
        payload.billingInterval = state.draft.billingInterval === "annual" ? "annual" : "monthly";
        apiCreateCheckoutSession(payload)
            .then(function (res) {
                if (res && res.url) {
                    window.location.href = res.url;
                    return;
                }
                throw new Error("Stripe checkout URL was not returned.");
            })
            .catch(function (e) {
                if (nextBtn) {
                    nextBtn.disabled = false;
                    updateActions();
                }
                showError(e.message || String(e));
            });
    }

    function submitEnterpriseInquiry() {
        var err = "";
        var defs = activeStepDefs();
        for (var v = 0; v < defs.length; v++) {
            err = validateStep(v);
            if (err) {
                break;
            }
        }
        if (err) {
            showError(err);
            return;
        }

        var nextBtn = document.getElementById("hg-onboard-next");
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = "Sending…";
        }
        showError("");

        var payload = buildPayload();
        payload.plan = "enterprise";

        if (useMockApi()) {
            clearDraft();
            window.location.href = "/enterprise-thanks";
            return;
        }

        fetch(apiUrl("/sales/enterprise-inquiry"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
            .then(function (r) {
                return r.json().then(function (body) {
                    if (!r.ok) {
                        throw new Error((body && (body.message || body.error)) || "Request failed (" + r.status + ")");
                    }
                    return body;
                });
            })
            .then(function () {
                clearDraft();
                window.location.href = "/enterprise-thanks";
            })
            .catch(function (e) {
                if (nextBtn) {
                    nextBtn.disabled = false;
                    updateActions();
                }
                showError(e.message || String(e));
            });
    }

    function startDeployment() {
        if (state.draft.plan === "enterprise") {
            submitEnterpriseInquiry();
            return;
        }
        if (requiresStripeCheckout()) {
            startStripeCheckout();
            return;
        }
        var err = "";
        var defs = activeStepDefs();
        for (var v = 0; v < defs.length; v++) {
            err = validateStep(v);
            if (err) {
                break;
            }
        }
        if (err) {
            showError(err);
            return;
        }
        beginProvisioningUI();
        var payload = buildPayload();
        apiCreateJob(payload)
            .then(function (res) {
                renderProvisionSteps({ validating: "active" }, "Status: QUEUED");
                startPolling(res.jobId);
            })
            .catch(function (e) {
                state.provisioningActive = false;
                updateActions();
                var section = document.getElementById("hg-onboard-provision");
                if (section) {
                    section.innerHTML =
                        '<p class="hg-onboard-error">Could not start provisioning: ' + esc(e.message) + "</p>";
                }
            });
    }

    function onboardBackHref() {
        if (state.mode === "starter") {
            return "/sign-in?product=honeygold&plan=starter";
        }
        return "product.html?product=honeygold#hg-product-pricing-plans";
    }

    function handleBack() {
        if (state.stepIndex > 0) {
            goStep(-1);
            return;
        }
        window.location.href = onboardBackHref();
    }

    function bindChrome() {
        var back = document.getElementById("hg-onboard-back");
        var next = document.getElementById("hg-onboard-next");
        if (back) {
            back.addEventListener("click", function (e) {
                e.preventDefault();
                handleBack();
            });
        }
        if (next) {
            next.addEventListener("click", function () {
                var defs = activeStepDefs();
                if (state.mode === "starter" && state.stepIndex === defs.length - 1) {
                    submitStarterProfile();
                } else if (state.stepIndex === defs.length - 1) {
                    startDeployment();
                } else {
                    goStep(1);
                }
            });
        }
    }

    function starterSigninUrl(tenantId) {
        return (
            "/sign-in?product=honeygold&plan=starter&tenantId=" +
            encodeURIComponent(tenantId || tenantIdFromQuery())
        );
    }

    function initStarterOnboarding() {
        state.mode = "starter";
        state.draft.plan = "starter";
        state.tenantId = tenantIdFromQuery();
        loadStarterSession();
        if (!state.tenantId) {
            window.location.replace("/sign-in?product=honeygold&plan=starter");
            return;
        }
        saveStarterSession();

        var signinUrl = starterSigninUrl(state.tenantId);

        // Starter profile + provisioning live on honeygold.granolaconsulting.com after session cookie is set.
        if (state.idToken) {
            showStatusRedirecting();
            openHoneyGoldWithSession(state.idToken);
            return;
        }

        // No Cognito token in sessionStorage (common after HoneyGold redirects back to www).
        // Show one clear action instead of a wizard whose buttons were never wired.
        hideStarterWizardChrome();
        applyOnboardPageContext();
        var panels = document.getElementById("hg-onboard-panels");
        if (panels) {
            panels.removeAttribute("hidden");
            panels.innerHTML =
                '<div class="hg-onboard-panel">' +
                '<h2 class="hg-onboard-panel-title">Sign in to continue</h2>' +
                '<p class="hg-onboard-panel-lead">Your workspace is ready to set up. Sign in with Google to open HoneyGold and complete a short profile while we provision Superset.</p>' +
                '<p class="hg-onboard-actions" style="margin-top:1.5rem">' +
                '<a class="view-more-btn hg-onboard-btn-primary" href="' +
                esc(signinUrl) +
                '">Sign in with Google</a></p></div>';
        }
        var actions = document.getElementById("hg-onboard-actions");
        setElHidden(actions, true);
    }

    function showStatusRedirecting() {
        hideStarterWizardChrome();
        var panels = document.getElementById("hg-onboard-panels");
        if (panels) {
            panels.removeAttribute("hidden");
            panels.innerHTML =
                '<div class="hg-onboard-panel"><p class="hg-onboard-panel-lead">Opening your HoneyGold workspace…</p></div>';
        }
    }

    function checkoutIdFromQuery() {
        var q = window.location.search.replace(/^\?/, "").split("&");
        for (var i = 0; i < q.length; i++) {
            var p = q[i].split("=");
            if (decodeURIComponent(p[0]) === "checkout_id" && p[1]) {
                return decodeURIComponent(p[1]);
            }
        }
        return "";
    }

    function sessionIdFromQuery() {
        var q = window.location.search.replace(/^\?/, "").split("&");
        for (var i = 0; i < q.length; i++) {
            var p = q[i].split("=");
            if (decodeURIComponent(p[0]) === "session_id" && p[1]) {
                return decodeURIComponent(p[1]);
            }
        }
        return "";
    }

    function resumeFromPaidCheckout() {
        var checkoutId = checkoutIdFromQuery();
        var sessionId = sessionIdFromQuery();
        if (!checkoutId || useMockApi()) {
            return false;
        }
        state.mode = "business";
        showError("");
        beginProvisioningUI();
        var statusEl = document.getElementById("hg-provision-status");
        if (statusEl) {
            statusEl.textContent = "Confirming your subscription…";
        }
        function pollCheckout(attempt) {
            var url = apiUrl(
                "/billing/checkout-sessions/" +
                encodeURIComponent(checkoutId) +
                (sessionId ? "?session_id=" + encodeURIComponent(sessionId) : "")
            );
            fetch(url)
                .then(parseApiJsonResponse)
                .then(function (data) {
                    if (data.jobId) {
                        if (statusEl) {
                            statusEl.textContent = "Payment confirmed. Starting deployment…";
                        }
                        saveProvisionState({ mode: "business", jobId: data.jobId, startedAt: Date.now() });
                        startPolling(data.jobId);
                        return;
                    }
                    if (attempt > 40) {
                        throw new Error(
                            "Payment confirmed but provisioning has not started yet. Please refresh this page in a minute or email hello@granolaconsulting.com."
                        );
                    }
                    if (statusEl) {
                        statusEl.textContent =
                            "Waiting for payment confirmation" + (attempt > 2 ? " (" + attempt + ")…" : "…");
                    }
                    setTimeout(function () {
                        pollCheckout(attempt + 1);
                    }, 2500);
                })
                .catch(function (err) {
                    var friendly = apiFetchError(
                        err,
                        "Could not verify your payment. Please refresh this page or email hello@granolaconsulting.com."
                    );
                    showError(friendly.message);
                    if (statusEl) {
                        statusEl.textContent = friendly.message;
                    }
                });
        }
        pollCheckout(0);
        return true;
    }

    window.initHoneyGoldOnboarding = function () {
        loadDraft();
        var plan = String(state.draft.plan || planFromQuery() || "").toLowerCase();
        if (isStarterPlan(plan) || tenantIdFromQuery()) {
            initStarterOnboarding();
            return;
        }
        if (resumeFromPaidCheckout()) {
            return;
        }
        if (resumeProvisioningIfAny()) {
            return;
        }
        if (!state.draft.plan || !ONBOARD_PLAN_IDS[state.draft.plan]) {
            state.draft.plan = "business";
            saveDraft();
        }
        applyOnboardPageContext();
        renderIndicator();
        renderPanel();
        updateActions();
        bindChrome();
    };
})();
