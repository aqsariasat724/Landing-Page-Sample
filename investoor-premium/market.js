/* ============================================================
   Investoor  |  market.js
   Market strip in the top bar.

   Without an API key the strip shows real EUR/USD and Bitcoin
   (free public sources, no account needed) and keeps the index
   and gold values as the last known ones. Paste a free Twelve
   Data key below and all five come from that feed, delayed,
   which is what the label says.
   ============================================================ */
(function () {
    "use strict";

    var CONFIG = {
        /* free key from twelvedata.com, 800 calls per day is plenty */
        TWELVE_DATA_KEY: "",
        REFRESH_MS: 300000   /* 5 minutes */
    };

    var track = document.getElementById("marketTrack");
    var note = document.getElementById("marketNote");
    if (!track) return;

    /* duplicate the row so the slow scroll can loop without a jump */
    if (!track.getAttribute("data-cloned")) {
        track.innerHTML += track.innerHTML;
        track.setAttribute("data-cloned", "1");
    }

    function isEnglish() {
        return document.documentElement.getAttribute("lang") === "en";
    }
    function locale() {
        return isEnglish() ? "en-US" : "de-DE";
    }
    function nodes(symbol) {
        return track.querySelectorAll('.quote[data-symbol="' + symbol + '"]');
    }

    function render(symbol, price, changePct, decimals) {
        if (price == null || isNaN(price)) return;
        [].forEach.call(nodes(symbol), function (el) {
            var v = el.querySelector(".q-val");
            var c = el.querySelector(".q-chg");
            if (v) {
                v.textContent = Number(price).toLocaleString(locale(), {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                });
            }
            if (c && changePct != null && !isNaN(changePct)) {
                var up = Number(changePct) >= 0;
                c.textContent = (up ? "+" : "") + Number(changePct).toLocaleString(locale(), {
                    minimumFractionDigits: 2, maximumFractionDigits: 2
                }) + " %";
                c.className = "q-chg " + (up ? "up" : "down");
            }
            el.classList.add("is-live");
        });
        stamp();
    }

    function stamp() {
        if (!note) return;
        var t = new Date().toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
        note.textContent = isEnglish()
            ? "Prices delayed · " + t
            : "Kurse verzögert · " + t;
    }

    function getJSON(url) {
        return fetch(url, { cache: "no-store" }).then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        });
    }

    /* --- free sources, no account --- */
    function loadFree() {
        getJSON("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD")
            .then(function (d) { render("EURUSD", d.rates && d.rates.USD, null, 4); })
            .catch(function () {});

        getJSON("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true")
            .then(function (d) {
                var b = d.bitcoin || {};
                render("BTC", b.eur, b.eur_24h_change, 0);
            })
            .catch(function () {});
    }

    /* --- full feed with a key: indices, gold, fx, crypto --- */
    function loadKeyed() {
        var symbols = "DAX,SPX,XAU/USD,EUR/USD,BTC/EUR";
        getJSON("https://api.twelvedata.com/quote?symbol=" + encodeURIComponent(symbols) +
                "&apikey=" + encodeURIComponent(CONFIG.TWELVE_DATA_KEY))
            .then(function (d) {
                var map = {
                    "DAX": ["DAX", 2], "SPX": ["SPX", 2], "XAU/USD": ["XAU", 2],
                    "EUR/USD": ["EURUSD", 4], "BTC/EUR": ["BTC", 0]
                };
                Object.keys(map).forEach(function (key) {
                    var q = d[key] || (d.symbol === key ? d : null);
                    if (!q || q.status === "error") return;
                    render(map[key][0], parseFloat(q.close), parseFloat(q.percent_change), map[key][1]);
                });
            })
            .catch(loadFree);
    }

    function refresh() {
        if (CONFIG.TWELVE_DATA_KEY) loadKeyed();
        else loadFree();
    }

    refresh();
    stamp();
    setInterval(refresh, CONFIG.REFRESH_MS);
    document.addEventListener("inv:lang", function () { refresh(); stamp(); });
})();
