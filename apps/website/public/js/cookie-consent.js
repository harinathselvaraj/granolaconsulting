(function () {
    "use strict";

    var STORAGE_KEY = "granola_cookie_consent_v1";
    var MEASUREMENT_ID = "G-R4MWSYLHR5";
    var PRIVACY_URL = "honeygold-privacy.html#cookies";

    function getConsent() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function setConsent(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch (e) {
            /* private mode */
        }
    }

    function isHoneygoldPage() {
        return /honeygold/i.test(window.location.pathname || "");
    }

    function ensureGtag() {
        window.dataLayer = window.dataLayer || [];
        if (!window.gtag) {
            window.gtag = function () {
                window.dataLayer.push(arguments);
            };
        }
        return window.gtag;
    }

    function loadGoogleAnalytics(grantAnalytics) {
        if (window.__granolaAnalyticsLoaded) {
            if (grantAnalytics) {
                ensureGtag()("consent", "update", { analytics_storage: "granted" });
            }
            return;
        }
        window.__granolaAnalyticsLoaded = true;

        var gtag = ensureGtag();
        gtag("consent", "default", {
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
            analytics_storage: grantAnalytics ? "granted" : "denied",
            functionality_storage: "denied",
            personalization_storage: "denied",
            security_storage: "granted",
            wait_for_update: grantAnalytics ? 0 : 500
        });

        var script = document.createElement("script");
        script.async = true;
        script.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
        script.onload = function () {
            gtag("js", new Date());
            if (grantAnalytics) {
                gtag("consent", "update", { analytics_storage: "granted" });
                gtag("config", MEASUREMENT_ID);
            }
        };
        document.head.appendChild(script);
    }

    function removeBanner() {
        var el = document.getElementById("granola-cookie-consent");
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    function showBanner() {
        if (document.getElementById("granola-cookie-consent")) {
            return;
        }

        var root = document.createElement("div");
        root.id = "granola-cookie-consent";
        root.className = "granola-cookie";
        if (isHoneygoldPage()) {
            root.classList.add("granola-cookie--honeygold");
        }
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-labelledby", "granola-cookie-title");
        root.setAttribute("aria-describedby", "granola-cookie-desc");
        root.setAttribute("aria-live", "polite");

        root.innerHTML =
            '<div class="granola-cookie__panel">' +
            '<div class="granola-cookie__body">' +
            '<p id="granola-cookie-title" class="granola-cookie__title">Cookies on this site</p>' +
            '<p id="granola-cookie-desc" class="granola-cookie__text">We use essential cookies to run the site. With your consent, we use Google Analytics to understand how visitors use our pages. See our <a href="' +
            PRIVACY_URL +
            '">Privacy Policy</a> for details.</p>' +
            "</div>" +
            '<div class="granola-cookie__actions">' +
            '<button type="button" class="granola-cookie__btn granola-cookie__btn--reject">Reject analytics</button>' +
            '<button type="button" class="granola-cookie__btn granola-cookie__btn--accept">Accept analytics</button>' +
            "</div></div>";

        document.body.appendChild(root);

        root.querySelector(".granola-cookie__btn--accept").addEventListener("click", function () {
            setConsent("accepted");
            removeBanner();
            loadGoogleAnalytics(true);
        });

        root.querySelector(".granola-cookie__btn--reject").addEventListener("click", function () {
            setConsent("rejected");
            removeBanner();
        });
    }

    var consent = getConsent();
    if (consent === "accepted") {
        loadGoogleAnalytics(true);
    } else if (consent === "rejected") {
        /* no analytics */
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showBanner);
    } else {
        showBanner();
    }
})();
