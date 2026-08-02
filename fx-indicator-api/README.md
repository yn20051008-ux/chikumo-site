# USD/JPY market-data proxy scaffold

This directory is intentionally **not deployed**. `chikumo.jp` is static GitHub Pages and cannot hold an API secret. The worker is the server-side boundary for the Twelve Data key; the browser receives only normalized USD/JPY one-minute closing prices.

## Required authorization before deployment

Obtain one **Twelve Data API key whose subscription/add-on or written agreement explicitly permits public external display of USD/JPY data on chikumo.jp**. Do not use a Basic/free key: Twelve Data describes Basic as “internal non-display usage,” and its terms require separate authorization for redistribution/external display.

Official references:

- API key security and `/time_series`: https://twelvedata.com/docs/advanced/api-usage
- Forex update cadence (one-minute mid-price updates): https://support.twelvedata.com/en/articles/12520817-forex-api-v2
- Public display/redistribution terms: https://twelvedata.com/terms
- Current plans and limits: https://twelvedata.com/pricing

## Deployment contract

1. Deploy `worker.js` to a serverless runtime that supports the standard Worker APIs used here.
2. Store the key as the server-side secret `TWELVE_DATA_API_KEY`; never commit it or return it to the browser.
3. Map the worker endpoint to `https://api.chikumo.jp/api/fx/usdjpy` (or another HTTPS origin approved for the site).
4. Verify its CORS response allows only `https://chikumo.jp`, and verify the returned timestamps and values against the provider dashboard.
5. Set `LIVE_DATA_ENDPOINT` in `fx-indicator-lab/index.html` to that deployed endpoint, validate the fallback state, then use the repository’s normal PR-and-merge release workflow.

The proxy caches for 15 seconds to reduce quota use, while the provider’s documented Forex API v2 stream cadence is one minute. The page must describe these as one-minute market-data closes—not tick-by-tick or executable real-time prices.
