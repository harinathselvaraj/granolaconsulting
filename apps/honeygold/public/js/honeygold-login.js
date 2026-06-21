/**
 * HoneyGold return sign-in — sends users to the shared gateway Cognito flow.
 */
(function () {
    "use strict";

    function gatewayBase() {
        var b = window.HG_SHARED_APP_URL;
        if (typeof b === "string" && b.length) {
            return b.replace(/\/$/, "");
        }
        return "https://honeygold.granolaconsulting.com";
    }

    function tenantIdFromQuery() {
        var q = new URLSearchParams(window.location.search);
        return (q.get("tenantId") || q.get("tenant") || "").trim();
    }

    function signInUrl() {
        var tid = tenantIdFromQuery();
        var url = gatewayBase() + "/auth/login";
        if (tid) {
            url += "?" + new URLSearchParams({ tenantId: tid }).toString();
        }
        return url;
    }

    window.initHoneyGoldLogin = function initHoneyGoldLogin() {
        var btn = document.getElementById("hg-login-google");
        var err = document.getElementById("hg-login-error");
        var meta = document.getElementById("hg-login-tenant");
        var tid = tenantIdFromQuery();

        if (meta && tid) {
            meta.hidden = false;
            meta.textContent = "Workspace: " + tid;
        }

        if (!btn) {
            return;
        }

        btn.addEventListener("click", function () {
            if (err) {
                err.hidden = true;
            }
            window.location.href = signInUrl();
        });
    };
})();
