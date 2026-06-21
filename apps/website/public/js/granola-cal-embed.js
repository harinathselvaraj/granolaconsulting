(function () {
    "use strict";

    var CAL_ORIGIN = "https://cal.com";
    var CAL_EMBED_SRC = "https://app.cal.com/embed/embed.js";
    var DEFAULT_CAL_LINK = "granolaconsulting/30min";
    var BRAND_COLOR = "#29989a";

    (function (C, A, L) {
        var p = function (a, ar) {
            a.q.push(ar);
        };
        var d = C.document;
        C.Cal =
            C.Cal ||
            function () {
                var cal = C.Cal;
                var ar = arguments;
                if (!cal.loaded) {
                    cal.ns = {};
                    cal.q = cal.q || [];
                    d.head.appendChild(d.createElement("script")).src = A;
                    cal.loaded = true;
                }
                if (ar[0] === L) {
                    var api = function () {
                        p(api, arguments);
                    };
                    var namespace = ar[1];
                    api.q = api.q || [];
                    if (typeof namespace === "string") {
                        cal.ns[namespace] = cal.ns[namespace] || api;
                        p(cal.ns[namespace], ar);
                        p(cal, ["initNamespace", namespace]);
                    } else {
                        p(cal, ar);
                    }
                    return;
                }
                p(cal, ar);
            };
    })(window, CAL_EMBED_SRC, "init");

    var containers = document.querySelectorAll("[data-cal-inline]");
    if (!containers.length) {
        return;
    }

    Cal("init", { origin: CAL_ORIGIN });

    for (var i = 0; i < containers.length; i++) {
        var el = containers[i];
        Cal("inline", {
            elementOrSelector: el,
            calLink: el.getAttribute("data-cal-link") || DEFAULT_CAL_LINK,
            config: {
                layout: "month_view",
                theme: "light"
            }
        });
    }

    Cal("ui", {
        cssVarsPerTheme: {
            light: { "cal-brand": BRAND_COLOR }
        },
        hideEventTypeDetails: false,
        layout: "month_view"
    });
})();
