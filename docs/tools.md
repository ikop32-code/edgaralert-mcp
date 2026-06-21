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

| Field      | Type                       | Default | Notes                                   |
| ---------- | -------------------------- | ------- | ---------------------------------------- |
| `limit`    | integer (1–200)            | 50      |                                          |
| `days`     | integer ≥ 1                | —       | optional lookback window                |
| `scope`    | `"watchlist" \| "universe"`| —       | restrict to default ticker list or not  |
| `minScore` | integer (0–100)            | 80      | signal_score floor                      |
| `side`     | `"BUY" \| "SELL" \| "ALL"` | —       |                                          |
| `planned`  | boolean                    | —       | true=scheduled/10b5-1 only, false=discretionary only |

**Output:** array of alert objects (see `AlertEventDto` shape — id,
ticker, eventType, side, alertCategory, signalScore, eventDate, details,
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

**Output:** same alert object shape as `get_latest_alerts`.

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
messageTitle, prices: [{date, open, high, low, close, volume}, ...] }`

**Errors:** 401, 403, 404 if alert not found, 429.

---

## `edgaralert_search_companies`

Search SEC-registered companies by name, ticker, SIC, sector, state,
market cap, or S&P 500 membership.

- **Endpoint:** `GET /api/v1/companies/search`
- **Min. plan:** PRO
- At least one of `query`, `ticker`, `sicCode` is required (enforced both
  client-side in the tool and server-side by the API).

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

**Output:** `{identity, market, fundamentals, insider, recentAlerts: []}`

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

Market-wide weekly summary: most bullish/bearish industries, top
buying/selling companies. **Public endpoint — no plan requirement.**

- **Endpoint:** `GET /api/insights/weekly`
- **Min. plan:** none (public)

**Input:** none.

**Output:** `{latestWeekStartDate, latestWeekEndDate, summary, bullishIndustries: [], bearishIndustries: [], topBuyingCompanies: [], topSellingCompanies: []}`

**Errors:** 429 only (subject to the global rate limiter, not plan gating).

---

## Endpoints deliberately NOT included in MVP

- `GET /api/v1/companies/{ticker}/prices` (raw daily price history,
  Enterprise-gated) — omitted from MVP only to keep the initial tool count
  small and outcome-oriented; safe to add in a later phase since it's
  read-only and already Enterprise-gated.
- `GET/POST /api/v1/ticker-lists/*` — these are read **and write**
  (create list, add/remove ticker). Excluded from this read-only MVP per
  the "MCP must be read-only for MVP" constraint. Candidate for a v2 once
  write-tool UX (confirmations, etc.) is decided deliberately.
- `GET /api/insights/capital-flow` — public, safe, simply deprioritized for
  MVP scope; trivial to add alongside `weekly`.
- Anything under `api/member/*`, `api/auth/*`, Stripe/orders/admin
  controllers — **never** in scope for this MCP server, regardless of
  phase. These are not part of the v1 API-key-authenticated surface and
  several are billing-sensitive.
