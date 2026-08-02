const ALLOWED_ORIGIN = "https://chikumo.jp";
const PROVIDER_URL = "https://api.twelvedata.com/time_series";

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Vary": "Origin",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Accept",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "GET" || url.pathname !== "/api/fx/usdjpy") return json({ error: "Not found" }, 404);
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403);
    if (!env.TWELVE_DATA_API_KEY) return json({ error: "Provider is not configured" }, 503, { "Cache-Control": "no-store" });

    const cache = caches.default;
    const cacheKey = new Request("https://fx-cache.chikumo.jp/api/fx/usdjpy", request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const provider = new URL(PROVIDER_URL);
    provider.searchParams.set("symbol", "USD/JPY");
    provider.searchParams.set("interval", "1min");
    provider.searchParams.set("outputsize", "120");
    provider.searchParams.set("format", "JSON");

    let upstream;
    try {
      upstream = await fetch(provider, {
        headers: { "Authorization": `apikey ${env.TWELVE_DATA_API_KEY}`, "Accept": "application/json" },
      });
    } catch {
      return json({ error: "Market-data provider unavailable" }, 502, { "Cache-Control": "no-store" });
    }

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data || data.status !== "ok" || !Array.isArray(data.values)) {
      return json({ error: "Market-data provider error" }, 502, { "Cache-Control": "no-store" });
    }

    const prices = data.values.map((point) => ({ time: point.datetime, close: Number(point.close) }))
      .filter((point) => Number.isFinite(point.close) && point.close > 0).reverse();
    if (prices.length < 60) return json({ error: "Insufficient market data" }, 502, { "Cache-Control": "no-store" });

    const response = json({ symbol: "USD/JPY", interval: "1min", provider: "Twelve Data", fetchedAt: new Date().toISOString(), prices }, 200, {
      "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=30",
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
