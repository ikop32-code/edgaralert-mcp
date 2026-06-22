# Tool Reference

Every tool below is a 1:1 wrapper around one EDGAR Alert v1 endpoint. Input
schemas are enforced with [zod](https://github.com/colinhacks/zod) and
exposed to MCP clients as JSON Schema automatically.

---

## `edgaralert_get_latest_alerts`

Most recent insider trading alerts, ranked by recency.

- **Endpoint:** `GET /api/v1/alerts/latest`
- **Min. plan:** STARTER

**Input**

| Field      | Type                        | Default | Notes                                                        |
| ---------- | --------------------------- | ------- | ------------------------------------------------------------ |
| `limit`    | integer (1–200)             | 50      |                                                              |
| `days`     | integer ≥ 1                 | —       | optional lookback window                                     |
| `scope`    | `"watchlist" \| "universe"` | —       | restrict to default ticker list or not                       |
| `minScore` | integer (0–100)             | 80      | signal_score floor                                           |
| `side`     | `"BUY" \| "SELL" \| "ALL"` | —       |                                                              |
| `planned`  | boolean                     | —       | true=scheduled/10b5-1 only, false=discretionary only         |

**Output:** array of alert objects (id, ticker, issuerName, sectorCode,
sectorName, eventType, side, alertCategory, signalScore, eventDate, details,
summary, status, plus per-ticker rollups like lastBuyDate/lastSellDate).

**Errors:** 401 invalid key, 429 daily limit exceeded, 500 unexpected.

---

## `edgaralert_search_alerts`

Multi-filter alert search (ticker, score range, date range, sector, market
cap, planned vs. discretionary).

- **Endpoint:** `GET /api/v1/alerts`
- **Min. plan:** PRO

**Input:** `ticker`, `eventType`, `status`, `minScore`, `maxScore`,
`fromDate`, `toDate`, `side`, `sectorCodes[]`, `marketCapBuckets[]`,
`plannedOnly`, `discretionaryOnly`, `priorWeaknessOnly`,
`historicalEdgeOnly`, `scope`, `limit` (default 50, max 200).

**Output:** same alert object shape as `get_latest_alerts`, plus
`forwardReturn1D/5D/10D/30D/90D` from `alert_performance` (null for recent
alerts where not enough time has passed yet).

**Errors:** 401 invalid key, 403 plan too low, 429 quota.

---

## `edgaralert_get_alert_price_window`

Daily price history around a specific alert's event date — for backtesting
whether a signal preceded a price move.

- **Endpoint:** `GET /api/v1/alerts/{id}/price-window`
- **Min. plan:** PRO

**Input:** `alertId` (required), `daysBefore` (default 30), `daysAfter`
(default 30), `scope`.

**Output:** `{ alertId, ticker, eventDate, eventType, signalScore,
messageTitle, prices: [{date, open, high, low, close, volume, returnPct}, ...] }`

**Errors:** 401, 403, 404 if alert not found, 429.

---

## `edgaralert_search_companies`

Search SEC-registered companies by name, ticker, SIC, sector, state,
market cap, or S&P 500 membership.

- **Endpoint:** `GET /api/v1/companies/search`
- **Min. plan:** PRO
- At least one of `query`, `ticker`, `sicCode` is required.

**Input:** `query`, `ticker`, `sicCode`, `sectorCode`, `marketCapBucket`
(`MEGA|LARGE|MID|SMALL`), `state`, `sp500Only`, `limit` (default 50).

**Output:** array of `{issuerCik, ticker, issuerName, sicCode, sicName,
exchangeName, stateOfIncorporation, isSp500, isSupported, lastClose,
return30D, pctFrom52WHigh, marketCap}`.

**Errors:** 400 if no search criteria given, 401, 403, 429.

---

## `edgaralert_get_company_profile`

Company profile: identity, market summary, fundamentals summary, insider
summary, recent alerts.

- **Endpoint:** `GET /api/v1/companies/{tickerOrCik}/profile`
- **Min. plan:** any paid plan

**Input:** `tickerOrCik` (required), `recentAlertsLimit` (default 10).

**Output:** `{identity, market, fundamentals, insider, recentAlerts: []}`.
`recentAlerts` carries the full alert shape including `side`, `alertCategory`,
`issuerName`, `sectorCode`, `sectorName`, and forward returns.

**Errors:** 401, 404 if company not found, 429.

---

## `edgaralert_get_company_fundamentals`

Historical fundamentals (revenue, net income, margins, debt ratios, FCF) by
fiscal year or quarter.

- **Endpoint:** `GET /api/v1/companies/{tickerOrCik}/fundamentals`
- **Min. plan:** PRO

**Input:** `tickerOrCik` (required), `period` (`FY|Q`, default `FY`),
`years` (default 10).

**Output:** array of `CompanyFundamentalPeriodDto` (one row per period).

**Errors:** 401, 403, 429.

---

## `edgaralert_get_company_agent_context`

The flagship tool. A single bundled, AI-optimized research payload:
identity, market, fundamentals + history, insider summary, recent signals
with forward-return data, and suggested analysis steps.

- **Endpoint:** `GET /api/v1/companies/{tickerOrCik}/agent-context`
- **Min. plan:** ENTERPRISE only

**Input:** `tickerOrCik` (required), `recentAlertsLimit` (default 10),
`fundamentalYears` (default 5).

**Output:**

```json
{
  "purpose": "AI-ready company research context",
  "disclaimer": "For research and decision-support only. Not investment advice.",
  "identity": { "...": "..." },
  "market": { "...": "..." },
  "fundamentals": { "...": "..." },
  "fundamentalHistory": [ { "...": "..." } ],
  "insider": { "...": "..." },
  "recentSignals": [ { "...": "...", "forwardReturn5D": 0.0 } ],
  "hints": {
    "suggestedUse": "...",
    "recommendedAnalysisSteps": ["...", "..."]
  }
}
```

**Errors:** 401, 403 (most common — this is the clearest Enterprise
boundary signal), 404 if company not found, 429.

---

## `edgaralert_get_weekly_insights`

Market-wide weekly summary: most bullish/bearish FF48 industries, top
buying/selling companies. **Public endpoint — no plan requirement.**

- **Endpoint:** `GET /api/insights/weekly`
- **Min. plan:** none (public)

**Input:** none.

**Output:**

```json
{
  "latestWeekStartDate": "2026-06-16",
  "latestWeekEndDate":   "2026-06-22",
  "summary": {
    "totalBuyAlerts":           42,
    "totalSellAlerts":          18,
    "mostBullishIndustry":      "Pharmaceutical Products",
    "mostBullishSector":        "Health Care",
    "mostBullishNetScore":      310,
    "mostBearishIndustry":      "Computers",
    "mostBearishSector":        "Technology",
    "mostBearishNetScore":      -140,
    "strongestCompanyTicker":   "MRNA",
    "strongestCompanyName":     "Moderna Inc.",
    "strongestCompanyNetScore": 95
  },
  "bullishIndustries": [
    {
      "ff48Code":        "FF48_13",
      "ff48Name":        "Drugs",
      "ff48Description": "Pharmaceutical Products",
      "sectorCode":      "HEALTH",
      "sectorName":      "Health Care",
      "buyAlertCount":   12,
      "sellAlertCount":  2,
      "netScore":        310,
      "buyValue":        4200000.00,
      "sellValue":       180000.00
    }
  ],
  "bearishIndustries":   [ "...same shape..." ],
  "topBuyingCompanies":  [ "...company shape..." ],
  "topSellingCompanies": [ "...company shape..." ]
}
```

Industries are grouped using the **Fama-French 48 (FF48)** classification
nested under 11 GICS-like sectors. The `FF48_48` "Other / Almost Nothing"
catch-all bucket is excluded from all rankings.

**Errors:** 429 only (subject to the global rate limiter, not plan gating).

---

## `edgaralert_get_industry_capital_flow`

12-week rolling insider capital flow (buy value minus sell value) for the
top 6 most active FF48 industry groups. Complements `get_weekly_insights`
with multi-week trend data. **Public endpoint — no plan requirement.**

- **Endpoint:** `GET /api/insights/capital-flow`
- **Min. plan:** none (public)

**Input:** none.

**Output:** array of rows — one per FF48 industry per week — each containing:

| Field            | Type    | Example                    | Notes                              |
| ---------------- | ------- | -------------------------- | ---------------------------------- |
| `weekStartDate`  | string  | `"2026-06-16"`             | ISO date, Monday-anchored          |
| `weekEndDate`    | string  | `"2026-06-22"`             |                                    |
| `ff48Code`       | string  | `"FF48_13"`                | Fama-French 48 identifier          |
| `ff48Description`| string  | `"Pharmaceutical Products"`| Human-readable FF48 industry label |
| `sectorCode`     | string  | `"HEALTH"`                 | GICS-like sector code              |
| `sectorName`     | string  | `"Health Care"`            | GICS-like sector name              |
| `buyValue`       | decimal | `4200000.00`               | Aggregate insider buy value ($)    |
| `sellValue`      | decimal | `180000.00`                | Aggregate insider sell value ($)   |
| `netCapitalFlow` | decimal | `4020000.00`               | `buyValue - sellValue`             |

Rows are ordered by `ff48Description` then `weekStartDate`, giving stable
column ordering for heatmap rendering. The `FF48_48` "Other" catch-all is
excluded. The 6 industries shown are those with the highest absolute net
insider score in the most recent completed week.

Good for questions like "which industries have had sustained insider buying
over the past 3 months?" or "is the tech selloff concentrated in
semiconductors or broad across the sector?"

**Errors:** 429 only.

---

## `edgaralert_get_ticker_lists`

Returns all ticker lists (watchlists) for the authenticated user, including
items in each list and the plan's ticker limit.

- **Endpoint:** `GET /api/v1/ticker-lists`
- **Min. plan:** STARTER

**Input:** none.

**Output:** `{ lists: [{ id, name, items: [{ ticker, issuerCik, addedAt }] }],
totalTickers, planLimit }`. `planLimit: 0` = unlimited (Enterprise).

Use this first to get the `listId` needed by `add_ticker_to_list` and
`remove_ticker_from_list`. Auto-creates a default "My Tickers" list if none
exists yet.

**Errors:** 401, 429.

---

## `edgaralert_add_ticker_to_list`

Adds a stock ticker to one of the user's ticker lists.

- **Endpoint:** `POST /api/v1/ticker-lists/{listId}/items`
- **Min. plan:** STARTER

**Input:** `listId` (required — from `get_ticker_lists`), `ticker` (required).

**Output:** `{ id, ticker, issuerCik, note, addedAt }`.

Plan ticker limits apply (FREE/STARTER capped at 10 total; Enterprise
unlimited). Returns 429 with a clear message if the cap is reached.

**Errors:** 400 missing ticker, 401, 429 cap exceeded.

---

## `edgaralert_remove_ticker_from_list`

Removes a stock ticker from one of the user's ticker lists.

- **Endpoint:** `DELETE /api/v1/ticker-lists/{listId}/items/{ticker}`
- **Min. plan:** STARTER

**Input:** `listId` (required — from `get_ticker_lists`), `ticker` (required).

**Output:** `{ success: true, ticker, listId }` on success.

**Errors:** 401, 404 if ticker not found in list, 429.

---

## Endpoints deliberately NOT included

- `GET /api/v1/companies/{ticker}/prices` (raw daily price history) — safe
  to add in a later phase; deprioritized to keep tool count focused.
- Anything under `api/member/*`, `api/auth/*`, Stripe/orders/admin
  controllers — **never** in scope for this MCP server. These are not part
  of the v1 API-key-authenticated surface and several are billing-sensitive.
