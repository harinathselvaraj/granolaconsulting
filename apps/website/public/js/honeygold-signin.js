/**
 * HoneyGold Starter sign-in — Google via Cognito (when configured) or enroll API stub.
 */
(function () {
    "use strict";

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

    function enrollEndpoint() {
        var proxy = window.HG_ENROLL_API_URL;
        if (typeof proxy === "string" && proxy.length) {
            return proxy.replace(/\/$/, "");
        }
        var url = apiUrl("/accounts/enroll");
        return url || "";
    }

    function useMockEnroll() {
        try {
            var q = new URLSearchParams(window.location.search);
            if (q.get("mock") === "1" || q.get("mock") === "true") {
                return true;
            }
        } catch (e) {
            /* ignore */
        }
        if (window.HG_SIGNIN_USE_MOCK === true) {
            return true;
        }
        if (window.HG_SIGNIN_USE_MOCK === false) {
            return false;
        }
        return false;
    }

    function mockEnrollResult() {
        return Promise.resolve({
            tenantId: "demo-starter",
            plan: "starter",
            appUrl: window.HG_SHARED_APP_URL || "https://honeygold.granolaconsulting.com",
            apiKey: null,
            existing: false,
            mock: true
        });
    }

    function friendlyEnrollError(err, status, bodyText) {
        var body = String(bodyText || "");
        if (body.indexOf("Missing Authentication Token") !== -1 || status === 403) {
            return (
                "Starter sign-in API is not live on this environment yet (POST /v1/accounts/enroll). " +
                "Redeploy HoneyGoldProvisioningControlStack, or email hello@granolaconsulting.com."
            );
        }
        if (status === 404) {
            return "Enrollment endpoint not found. The control plane may need an API Gateway update.";
        }
        var msg = err && err.message ? err.message : String(err || "");
        if (msg === "Load failed" || msg === "Failed to fetch" || msg.indexOf("NetworkError") !== -1) {
            return (
                "Could not reach the HoneyGold enrollment service. Use https://www.granolaconsulting.com/sign-in " +
                "(not a local file), disable ad blockers for this page, and try again. If it persists, email hello@granolaconsulting.com."
            );
        }
        try {
            var j = JSON.parse(body);
            if (j.message) {
                return j.message;
            }
            if (j.error) {
                return String(j.error);
            }
        } catch (e) {
            /* ignore */
        }
        if (body && body.length < 400) {
            return body;
        }
        return msg || "Sign-in failed. Please try again or contact hello@granolaconsulting.com.";
    }

    function showError(msg) {
        var el = document.getElementById("hg-signin-error");
        if (!el) {
            return;
        }
        if (msg) {
            el.textContent = msg;
            el.hidden = false;
        } else {
            el.hidden = true;
            el.textContent = "";
        }
    }

    function showStatus(msg) {
        var el = document.getElementById("hg-signin-status");
        if (!el) {
            return;
        }
        if (msg) {
            el.textContent = msg;
            el.hidden = false;
        } else {
            el.hidden = true;
            el.textContent = "";
        }
    }

    var PKCE_STORAGE_KEY = "hg_cognito_pkce_verifier";

    function cognitoConfigured() {
        var domain = (window.HG_COGNITO_DOMAIN || "").replace(/\/$/, "");
        var clientId = window.HG_COGNITO_CLIENT_ID || "";
        return !!(domain && clientId);
    }

    function cognitoDomain() {
        return (window.HG_COGNITO_DOMAIN || "").replace(/\/$/, "");
    }

    function cognitoClientId() {
        return window.HG_COGNITO_CLIENT_ID || "";
    }

    function cognitoRedirectUri() {
        if (window.HG_COGNITO_REDIRECT_URI) {
            return String(window.HG_COGNITO_REDIRECT_URI);
        }
        return "https://www.granolaconsulting.com/sign-in";
    }

    function base64UrlEncode(bytes) {
        var binary = "";
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function randomPkceVerifier() {
        var arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return base64UrlEncode(arr);
    }

    function pkceChallenge(verifier) {
        var encoder = new TextEncoder();
        return crypto.subtle.digest("SHA-256", encoder.encode(verifier)).then(function (hash) {
            return base64UrlEncode(new Uint8Array(hash));
        });
    }

    function buildCognitoAuthorizeUrl(verifier) {
        var domain = cognitoDomain();
        var clientId = cognitoClientId();
        if (!domain || !clientId) {
            return Promise.resolve("");
        }
        return pkceChallenge(verifier).then(function (challenge) {
            var params = new URLSearchParams({
                client_id: clientId,
                response_type: "code",
                scope: "openid email profile",
                redirect_uri: cognitoRedirectUri(),
                identity_provider: "Google",
                prompt: "select_account",
                code_challenge_method: "S256",
                code_challenge: challenge
            });
            return domain + "/oauth2/authorize?" + params.toString();
        });
    }

    function exchangeCodeForIdToken(code, verifier) {
        var domain = cognitoDomain();
        var clientId = cognitoClientId();
        var body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            code: code,
            redirect_uri: cognitoRedirectUri(),
            code_verifier: verifier
        });
        return fetch(domain + "/oauth2/token", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: body.toString()
        }).then(function (r) {
            return r.text().then(function (t) {
                if (!r.ok) {
                    var msg = "Could not complete sign-in (token exchange failed).";
                    try {
                        var j = JSON.parse(t);
                        if (j.error_description) {
                            msg = j.error_description;
                        } else if (j.error) {
                            msg = String(j.error);
                        }
                    } catch (e) {
                        if (t && t.length < 200) {
                            msg = t;
                        }
                    }
                    throw new Error(msg);
                }
                try {
                    var tokens = JSON.parse(t);
                    if (!tokens.id_token) {
                        throw new Error("Sign-in did not return an ID token.");
                    }
                    return tokens.id_token;
                } catch (e2) {
                    if (e2 && e2.message) {
                        throw e2;
                    }
                    throw new Error("Invalid token response from Cognito.");
                }
            });
        });
    }

    function parseOAuthCallback() {
        var q = new URLSearchParams(window.location.search);
        if (q.get("error")) {
            return {
                error: q.get("error"),
                error_description: q.get("error_description") || q.get("error")
            };
        }
        if (q.get("code")) {
            return { code: q.get("code") };
        }
        return null;
    }

    function parseHashTokens() {
        var hash = window.location.hash.replace(/^#/, "");
        if (!hash) {
            return null;
        }
        var params = {};
        hash.split("&").forEach(function (part) {
            var kv = part.split("=");
            if (kv[0]) {
                params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
            }
        });
        return params.id_token ? params : null;
    }

    function enrollWithIdToken(idToken) {
        if (useMockEnroll()) {
            return mockEnrollResult();
        }
        var url = enrollEndpoint();
        if (!url) {
            return Promise.reject(
                new Error("Sign-in API is not configured. Set HG_ENROLL_API_URL or HG_ONBOARD_API_BASE, or HG_SIGNIN_USE_MOCK for local demo.")
            );
        }
        return fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan: "starter", idToken: idToken })
        })
            .then(function (r) {
                return r.text().then(function (t) {
                    if (!r.ok) {
                        throw new Error(friendlyEnrollError(null, r.status, t));
                    }
                    try {
                        return JSON.parse(t);
                    } catch (e) {
                        throw new Error("Invalid response from enrollment API.");
                    }
                });
            })
            .catch(function (err) {
                if (err && err.message) {
                    var m = err.message;
                    if (
                        m.indexOf("Starter sign-in API") !== -1 ||
                        m.indexOf("invalid_token") !== -1 ||
                        m.indexOf("JWT") !== -1 ||
                        m.indexOf("enrollment service") !== -1
                    ) {
                        throw err;
                    }
                }
                throw new Error(friendlyEnrollError(err, 0, ""));
            });
    }

    function showView(view) {
        var views = ["signin", "signup", "confirm", "forgot", "reset", "result"];
        views.forEach(function (v) {
            var el = document.getElementById("hg-view-" + v);
            if (el) {
                el.hidden = v !== view;
            }
        });
        if (view === "result") {
            var result = document.getElementById("hg-signin-result");
            if (result) {
                result.hidden = false;
            }
        }
    }

    function showFieldError(elId, msg) {
        var el = document.getElementById(elId);
        if (!el) {
            return;
        }
        if (msg) {
            el.textContent = msg;
            el.hidden = false;
        } else {
            el.hidden = true;
            el.textContent = "";
        }
    }

    function emailSignInAndEnroll(email, password) {
        return apiPost("/accounts/sign-in", { email: email, password: password }).then(function (resp) {
            if (!resp || !resp.idToken) {
                throw new Error("Sign-in did not return a token.");
            }
            return enrollWithIdToken(resp.idToken).then(function (data) {
                return { data: data, idToken: resp.idToken };
            });
        });
    }

    function emailSignUpAndEnroll(email, password) {
        return apiPost("/accounts/sign-up", { email: email, password: password }).then(function (resp) {
            if (resp && resp.needsConfirmation) {
                var pending = new Error(
                    resp.message || "Check your email for a verification code, then confirm below."
                );
                pending.code = "needs_confirmation";
                throw pending;
            }
            return emailSignInAndEnroll(email, password);
        });
    }

    function openConfirmView(email, password) {
        var confirmEmail = document.getElementById("hg-confirm-email");
        var confirmPassword = document.getElementById("hg-confirm-password");
        if (confirmEmail) {
            confirmEmail.value = email;
        }
        if (confirmPassword && password) {
            confirmPassword.value = password;
        }
        showFieldError("hg-confirm-error", "");
        showView("confirm");
    }

    function apiPost(path, body) {
        var url = apiUrl(path);
        if (!url) {
            return Promise.reject(new Error("Sign-in API is not configured."));
        }
        return fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body || {})
        }).then(function (r) {
            return r.text().then(function (t) {
                var data = null;
                try {
                    data = t ? JSON.parse(t) : null;
                } catch (e) {
                    data = null;
                }
                if (!r.ok) {
                    var msg =
                        (data && (data.message || data.error)) ||
                        friendlyEnrollError(null, r.status, t);
                    var apiErr = new Error(String(msg));
                    if (data && data.error) {
                        apiErr.code = String(data.error);
                    }
                    throw apiErr;
                }
                return data;
            });
        });
    }

    function showForgotError(msg) {
        var el = document.getElementById("hg-forgot-error");
        if (!el) {
            return;
        }
        if (msg) {
            el.textContent = msg;
            el.hidden = false;
        } else {
            el.hidden = true;
            el.textContent = "";
        }
    }

    function showResetError(msg) {
        var el = document.getElementById("hg-reset-error");
        if (!el) {
            return;
        }
        if (msg) {
            el.textContent = msg;
            el.hidden = false;
        } else {
            el.hidden = true;
            el.textContent = "";
        }
    }

    function sharedAppBase() {
        return String(window.HG_SHARED_APP_URL || "https://honeygold.granolaconsulting.com").replace(/\/$/, "");
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

    var lastEnrollIdToken = null;

    function onboardingUrlFor(data) {
        if (data.onboardingUrl) {
            return data.onboardingUrl;
        }
        if (data.tenantId) {
            return sharedAppBase() + "/t/" + encodeURIComponent(data.tenantId) + "/onboarding";
        }
        return "";
    }

    function marketingOnboardUrl(data) {
        if (data.onboardingUrl && (data.onboardingUrl.indexOf("/onboard") !== -1 || data.onboardingUrl.indexOf("honeygold-onboard.html") !== -1)) {
            return data.onboardingUrl;
        }
        if (data.tenantId) {
            var params = "plan=starter&tenantId=" + encodeURIComponent(data.tenantId);
            if (data.provisioning || data.status === "PENDING" || data.status === "PROVISIONING") {
                params += "&phase=progress";
            }
            return "https://app.granolaconsulting.com/onboard?" + params;
        }
        return "";
    }

    function saveStarterSessionForOnboard(data, idToken) {
        if (!data || !data.tenantId || !idToken) {
            return;
        }
        try {
            sessionStorage.setItem(
                "hg-starter-session-v1",
                JSON.stringify({
                    tenantId: data.tenantId,
                    idToken: idToken,
                    email: ""
                })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function showEnrollResult(data, idToken) {
        lastEnrollIdToken = idToken || null;
        var result = document.getElementById("hg-signin-result");
        var btn = document.getElementById("hg-signin-google");
        if (btn) {
            btn.disabled = true;
        }
        showStatus("");
        showError("");
        // End-to-end integration: after enroll, send the user to the shared pool app.
        // The gateway will redirect to onboarding/progress when needed.
        if (lastEnrollIdToken && !data.mock) {
            saveStarterSessionForOnboard(data, lastEnrollIdToken);
            showStatus("Opening your HoneyGold workspace…");
            openHoneyGoldWithSession(lastEnrollIdToken);
            return;
        }
        if (!result) {
            return;
        }
        var onboardUrl = marketingOnboardUrl(data);
        var appUrl = onboardUrl || onboardingUrlFor(data) || data.appUrl || data.loginUrl || window.HG_SHARED_APP_URL || "";
        var apiKey = data.apiKey || "";
        var isNewSignup = data.existing === false;
        var provisioning =
            data.provisioning === true ||
            data.status === "PENDING" ||
            data.status === "PROVISIONING";
        var html = "<h1>You're in</h1>";
        if (isNewSignup) {
            html +=
                '<p class="hg-signin-lead">Your Starter account is created. Complete a short setup while we provision your private Superset workspace (usually 2–5 minutes). Your <strong>MCP API key</strong> is in the <strong>welcome email</strong>. Check your inbox.</p>';
        } else if (provisioning) {
            html +=
                '<p class="hg-signin-lead">Welcome back. Your workspace is still being set up. You can track progress on the next screen.</p>';
        } else {
            html +=
                '<p class="hg-signin-lead">Welcome back. Continue to your HoneyGold workspace.</p>';
        }
        if (appUrl) {
            html +=
                '<p><a class="hg-signin-submit" style="display:inline-block;text-align:center;text-decoration:none;" href="' +
                esc(appUrl) +
                '" rel="noopener noreferrer">Continue setup</a></p>';
        }
        if (apiKey && !isNewSignup) {
            html +=
                '<p class="hg-signin-lead"><strong>MCP API key</strong> (Claude Desktop): <code style="word-break:break-all;">' +
                esc(apiKey) +
                "</code></p>";
        }
        html +=
            '<p class="hg-signin-lead"><a href="/blog/honeygold-mcp-claude-desktop">How to set up HoneyGold MCP in Claude Desktop</a></p>';
        if (data.mock) {
            html += '<p class="hg-signin-lead"><em>Demo mode:</em> enroll API not called.</p>';
        }
        html +=
            '<p class="hg-signin-foot"><a href="https://app.granolaconsulting.com/onboard?product=honeygold&plan=business">Upgrade to Business</a></p>';
        result.innerHTML = html;
        showView("result");
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    function handleGoogleClick() {
        showError("");
        // Prefer gateway OAuth so enrollment runs server-side (Safari often blocks execute-api fetch).
        if (window.HG_USE_GATEWAY_OAUTH !== false && cognitoConfigured()) {
            window.location.href = sharedAppBase() + "/auth/google?reauth=1";
            return;
        }
        if (cognitoConfigured()) {
            var verifier = randomPkceVerifier();
            try {
                sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
            } catch (e) {
                showError("Your browser blocked sign-in storage. Allow cookies/storage for this site.");
                return;
            }
            buildCognitoAuthorizeUrl(verifier)
                .then(function (cognitoUrl) {
                    if (cognitoUrl) {
                        window.location.href = cognitoUrl;
                        return;
                    }
                    showError("Cognito sign-in is not configured on this page.");
                })
                .catch(function (e) {
                    showError(e.message || String(e));
                });
            return;
        }
        showStatus("Connecting…");
        enrollWithIdToken("dev-stub-token")
            .then(function (data) {
                showEnrollResult(data, null);
            })
            .catch(function (e) {
                showStatus("");
                showError(e.message || String(e));
            });
    }

    function tryHashEnroll() {
        var tokens = parseHashTokens();
        if (!tokens || !tokens.id_token) {
            return;
        }
        showStatus("Completing sign-in…");
        enrollWithIdToken(tokens.id_token)
            .then(function (data) {
                showEnrollResult(data, tokens.id_token);
            })
            .catch(function (e) {
                showStatus("");
                showError(e.message || String(e));
            });
    }

    function tryCodeEnroll() {
        var callback = parseOAuthCallback();
        if (!callback) {
            tryHashEnroll();
            return;
        }
        if (callback.error) {
            showError(callback.error_description || callback.error);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        var verifier = "";
        try {
            verifier = sessionStorage.getItem(PKCE_STORAGE_KEY) || "";
            sessionStorage.removeItem(PKCE_STORAGE_KEY);
        } catch (e) {
            verifier = "";
        }
        if (!verifier) {
            showError("Sign-in session expired. Please click Continue with Google again.");
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        showStatus("Completing sign-in…");
        exchangeCodeForIdToken(callback.code, verifier)
            .then(function (idToken) {
                return enrollWithIdToken(idToken).then(function (data) {
                    return { data: data, idToken: idToken };
                });
            })
            .then(function (r) {
                showEnrollResult(r.data, r.idToken);
            })
            .catch(function (e) {
                showStatus("");
                showError(e.message || String(e));
            });
    }

    window.initHoneyGoldSignIn = function () {
        var btn = document.getElementById("hg-signin-google");
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                handleGoogleClick();
            });
        }

        var signupGoogle = document.getElementById("hg-signup-google");
        if (signupGoogle) {
            signupGoogle.addEventListener("click", function (e) {
                e.preventDefault();
                handleGoogleClick();
            });
        }

        // Debug hook for local/manual testing without running Cognito.
        // Enable with `?debug=1` then run `__hgDebugEnroll({tenantId:'t_demo', existing:false}, 'fake')` in devtools.
        try {
            var q = new URLSearchParams(window.location.search);
            if (q.get("debug") === "1") {
                window.__hgDebugEnroll = function (data, idToken) {
                    showEnrollResult(data || {}, idToken || "");
                };
            }
        } catch (e) {
            /* ignore */
        }

        var showSignup = document.getElementById("hg-show-signup");
        if (showSignup) {
            showSignup.addEventListener("click", function (e) {
                e.preventDefault();
                showError("");
                showFieldError("hg-signup-error", "");
                var signinEmail = document.getElementById("hg-signin-email");
                var signupEmail = document.getElementById("hg-signup-email");
                if (signinEmail && signupEmail && signinEmail.value) {
                    signupEmail.value = signinEmail.value;
                }
                showView("signup");
            });
        }

        var showSigninLinks = ["hg-show-signin", "hg-back-signin-confirm"];
        showSigninLinks.forEach(function (id) {
            var link = document.getElementById(id);
            if (link) {
                link.addEventListener("click", function (e) {
                    e.preventDefault();
                    showForgotError("");
                    showResetError("");
                    showFieldError("hg-signup-error", "");
                    showFieldError("hg-confirm-error", "");
                    showView("signin");
                });
            }
        });

        var forgotLink = document.getElementById("hg-forgot-link");
        if (forgotLink) {
            forgotLink.addEventListener("click", function (e) {
                e.preventDefault();
                showForgotError("");
                var emailIn = document.getElementById("hg-signin-email");
                var forgotEmail = document.getElementById("hg-forgot-email");
                if (emailIn && forgotEmail && emailIn.value) {
                    forgotEmail.value = emailIn.value;
                }
                showView("forgot");
            });
        }

        function backToSignIn(e) {
            if (e) {
                e.preventDefault();
            }
            showForgotError("");
            showResetError("");
            showView("signin");
        }
        var back1 = document.getElementById("hg-back-signin");
        var back2 = document.getElementById("hg-back-signin-2");
        if (back1) {
            back1.addEventListener("click", backToSignIn);
        }
        if (back2) {
            back2.addEventListener("click", backToSignIn);
        }

        var emailForm = document.getElementById("hg-signin-email-form");
        if (emailForm) {
            emailForm.addEventListener("submit", function (e) {
                e.preventDefault();
                showError("");
                var email = (document.getElementById("hg-signin-email") || {}).value || "";
                var password = (document.getElementById("hg-signin-password") || {}).value || "";
                email = String(email).trim().toLowerCase();
                if (!email || !password) {
                    showError("Enter your email and password.");
                    return;
                }
                showStatus("Signing in…");
                emailSignInAndEnroll(email, password)
                    .then(function (r) {
                        showStatus("");
                        showEnrollResult(r.data, r.idToken);
                    })
                    .catch(function (err) {
                        showStatus("");
                        var msg = err.message || String(err);
                        if (
                            err.code === "needs_confirmation" ||
                            err.code === "user_not_confirmed" ||
                            msg.indexOf("Confirm your email") !== -1
                        ) {
                            openConfirmView(email, password);
                            return;
                        }
                        showError(msg);
                    });
            });
        }

        var signupForm = document.getElementById("hg-signup-email-form");
        if (signupForm) {
            signupForm.addEventListener("submit", function (e) {
                e.preventDefault();
                showFieldError("hg-signup-error", "");
                var email = (document.getElementById("hg-signup-email") || {}).value || "";
                var password = (document.getElementById("hg-signup-password") || {}).value || "";
                email = String(email).trim().toLowerCase();
                if (!email || !password) {
                    showFieldError("hg-signup-error", "Enter your email and password.");
                    return;
                }
                if (password.length < 8) {
                    showFieldError("hg-signup-error", "Password must be at least 8 characters.");
                    return;
                }
                var statusEl = document.getElementById("hg-signup-status");
                if (statusEl) {
                    statusEl.hidden = false;
                    statusEl.textContent = "Creating account…";
                }
                emailSignUpAndEnroll(email, password)
                    .then(function (r) {
                        if (statusEl) {
                            statusEl.hidden = true;
                        }
                        showEnrollResult(r.data, r.idToken);
                    })
                    .catch(function (err) {
                        if (statusEl) {
                            statusEl.hidden = true;
                        }
                        if (err.code === "needs_confirmation") {
                            openConfirmView(email, password);
                            return;
                        }
                        var msg = err.message || String(err);
                        if (msg.indexOf("already exists") !== -1) {
                            showFieldError("hg-signup-error", msg);
                            return;
                        }
                        showFieldError("hg-signup-error", msg);
                    });
            });
        }

        var confirmForm = document.getElementById("hg-confirm-form");
        if (confirmForm) {
            confirmForm.addEventListener("submit", function (e) {
                e.preventDefault();
                showFieldError("hg-confirm-error", "");
                var email = (document.getElementById("hg-confirm-email") || {}).value || "";
                var code = (document.getElementById("hg-confirm-code") || {}).value || "";
                var password = (document.getElementById("hg-confirm-password") || {}).value || "";
                email = String(email).trim().toLowerCase();
                code = String(code).trim();
                if (!email || !code || !password) {
                    showFieldError("hg-confirm-error", "Enter your email, verification code, and password.");
                    return;
                }
                var confirmStatus = document.getElementById("hg-confirm-status");
                if (confirmStatus) {
                    confirmStatus.hidden = false;
                    confirmStatus.textContent = "Confirming…";
                }
                apiPost("/accounts/confirm-sign-up", { email: email, code: code })
                    .then(function () {
                        return emailSignInAndEnroll(email, password);
                    })
                    .then(function (r) {
                        if (confirmStatus) {
                            confirmStatus.hidden = true;
                        }
                        showEnrollResult(r.data, r.idToken);
                    })
                    .catch(function (err) {
                        if (confirmStatus) {
                            confirmStatus.hidden = true;
                        }
                        showFieldError("hg-confirm-error", err.message || String(err));
                    });
            });
        }

        var forgotForm = document.getElementById("hg-forgot-form");
        if (forgotForm) {
            forgotForm.addEventListener("submit", function (e) {
                e.preventDefault();
                showForgotError("");
                var email = (document.getElementById("hg-forgot-email") || {}).value || "";
                email = String(email).trim().toLowerCase();
                if (!email) {
                    showForgotError("Enter your email address.");
                    return;
                }
                var statusEl = document.getElementById("hg-forgot-status");
                if (statusEl) {
                    statusEl.hidden = false;
                    statusEl.textContent = "Sending…";
                }
                apiPost("/accounts/forgot-password", { email: email })
                    .then(function (resp) {
                        if (resp && resp.canReset === false) {
                            if (statusEl) {
                                statusEl.hidden = true;
                            }
                            showForgotError(
                                resp.message || "No HoneyGold account found for this email."
                            );
                            return;
                        }
                        if (statusEl) {
                            statusEl.textContent =
                                (resp && resp.message) ||
                                "If an account exists, check your email for a verification code.";
                        }
                        var resetEmail = document.getElementById("hg-reset-email");
                        if (resetEmail) {
                            resetEmail.value = email;
                        }
                        showView("reset");
                    })
                    .catch(function (err) {
                        if (statusEl) {
                            statusEl.hidden = true;
                        }
                        showForgotError(err.message || String(err));
                    });
            });
        }

        var resetForm = document.getElementById("hg-reset-form");
        if (resetForm) {
            resetForm.addEventListener("submit", function (e) {
                e.preventDefault();
                showResetError("");
                var email = (document.getElementById("hg-reset-email") || {}).value || "";
                var code = (document.getElementById("hg-reset-code") || {}).value || "";
                var newPassword = (document.getElementById("hg-reset-password") || {}).value || "";
                email = String(email).trim().toLowerCase();
                code = String(code).trim();
                if (!email || !code || !newPassword) {
                    showResetError("Fill in email, code, and new password.");
                    return;
                }
                if (newPassword.length < 8) {
                    showResetError("Password must be at least 8 characters.");
                    return;
                }
                apiPost("/accounts/confirm-forgot-password", {
                    email: email,
                    code: code,
                    newPassword: newPassword
                })
                    .then(function () {
                        showResetError("");
                        showView("signin");
                        showError("");
                        showStatus("Password updated. Sign in with your new password.");
                    })
                    .catch(function (err) {
                        showResetError(err.message || String(err));
                    });
            });
        }

        try {
            var oauthErr = new URLSearchParams(window.location.search);
            var errMsg = oauthErr.get("error_description") || oauthErr.get("error");
            if (errMsg) {
                showError(decodeURIComponent(String(errMsg).replace(/\+/g, " ")));
            }
        } catch (urlErr) {
            /* ignore */
        }

        try {
            var qs = new URLSearchParams(window.location.search);
            if (qs.get("logout") === "1") {
                try {
                    sessionStorage.removeItem("hg-starter-session-v1");
                    sessionStorage.removeItem(PKCE_STORAGE_KEY);
                } catch (storageErr) {
                    /* ignore */
                }
                showStatus("You signed out. Sign in again when you're ready.");
                showError("");
                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname + "?product=honeygold&plan=starter"
                );
                return;
            }
        } catch (logoutErr) {
            /* ignore */
        }

        tryCodeEnroll();

        if (!cognitoConfigured() && !apiBase()) {
            showError("Starter sign-in is not live yet. Configure HG_COGNITO_* or the enroll API, or email hello@granolaconsulting.com.");
        }
    };
})();
