# EDGAR Alert MCP Server

Connect Claude Desktop (or any [MCP](https://modelcontextprotocol.io)-compatible
client) directly to your [EDGAR Alert](https://www.edgaralert.com) account. Ask
live questions about SEC insider trading signals, Form 4 activity, 8-K
officer/director changes, and company research context — without leaving
your conversation.

> **Works on any paid EDGAR Alert plan.** Most tools (latest alerts,
> search, company profiles, fundamentals, price windows) work on STARTER
> and PRO. One tool — `edgaralert_get_company_agent_context`, the bundled
> AI research-context payload — requires **Enterprise**; on a lower plan
> it returns a clear upgrade message instead of failing silently. See
> [Tools](#tools) below for the full breakdown, and
> [edgaralert.com/pricing](https://www.edgaralert.com/pricing) to upgrade.

## What this is (and isn't)

- A **thin, read-only wrapper** around the existing public
  `https://api.edgaralert.com/api/v1` REST API. Every tool maps to exactly
  one v1 endpoint.
- **No direct database access.** No scoring or signal logic is duplicated
  here — all of that lives in the API, same as it does for every other v1
  API consumer.
- **No write actions, no billing, no account management.** This server
  cannot place orders, change your subscription, or modify settings of any
  kind.
- Your API key is **yours** — you provide it, it is sent only to
  `api.edgaralert.com` as the `X-API-Key` header, and this server never
  writes it to disk or logs it.

## Requirements

- Node.js 18.17 or later
- An EDGAR Alert API key on any paid plan
  ([get one here](https://www.edgaralert.com/account/api-keys)) — STARTER
  and PRO both work for most tools; Enterprise unlocks all 8.

## Install

### Option A: One-click install via `.mcpb` (recommended for most users)

1. Download `edgaralert-mcp.mcpb` from the
   [latest release](https://github.com/ikop32-code/edgaralert/releases).
2. Open Claude Desktop → Settings → Extensions → Advanced settings →
   Install Extension, and select the downloaded file (or just drag the
   file onto the Claude Desktop window).
3. When prompted, paste your EDGAR Alert API key. Claude Desktop stores it
   securely in your OS keychain — this project never sees or stores it
   outside that prompt.
4. Restart Claude Desktop if prompted.

### Option B: Manual install via `claude_desktop_config.json`

1. Clone or download this folder (`mcp-server/`) somewhere on your machine.
2. Install dependencies and build:

   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

3. Open your Claude Desktop config file:

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

4. Add an entry under `mcpServers` (see [example below](#example-claude-desktop-config)).
5. Restart Claude Desktop.

### Option C: Run locally for development

```bash
cd mcp-server
npm install
EDGARALERT_API_KEY=EA_your_key_here npm run dev
```

This runs the server on stdio using `tsx`, without a build step. Useful
when iterating on tool definitions.

## Example Claude Desktop config

```json
{
  "mcpServers": {
    "edgaralert": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "EDGARALERT_API_KEY": "EA_your_key_here"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp-server/dist/index.js` with the real path on
your machine, and `EA_your_key_here` with your actual EDGAR Alert API key.
Never commit this file with a real key in it.

## Environment variables

| Variable               | Required | Default                              | Description                                                        |
| ----------------------- | -------- | ------------------------------------- | -------------------------------------------------------------------- |
| `EDGARALERT_API_KEY`    | Yes      | —                                      | Your EDGAR Alert v1 API key. Sent as `X-API-Key` on every request.   |
| `EDGARALERT_BASE_URL`   | No       | `https://api.edgaralert.com/api/v1`   | Override for staging/local development. Most users should not set this. |

## Tools

All tools are **read-only**. See [`docs/tools.md`](./docs/tools.md) for full
input schemas, endpoint mappings, and error behavior.

| Tool                                    | Endpoint                                          | Min. plan  |
| ---------------------------------------- | -------------------------------------------------- | ---------- |
| `edgaralert_get_latest_alerts`           | `GET /alerts/latest`                               | STARTER    |
| `edgaralert_search_alerts`               | `GET /alerts`                                      | PRO        |
| `edgaralert_get_alert_price_window`      | `GET /alerts/{id}/price-window`                    | PRO        |
| `edgaralert_search_companies`            | `GET /companies/search`                            | PRO        |
| `edgaralert_get_company_profile`         | `GET /companies/{tickerOrCik}/profile`             | All paid   |
| `edgaralert_get_company_fundamentals`    | `GET /companies/{tickerOrCik}/fundamentals`        | PRO        |
| `edgaralert_get_company_agent_context`   | `GET /companies/{tickerOrCik}/agent-context`       | ENTERPRISE |
| `edgaralert_get_weekly_insights`         | `GET /insights/weekly` (public)                    | None       |

"Min. plan" reflects what the *underlying API* enforces today — STARTER
and PRO keys can use 7 of 8 tools. Only `edgaralert_get_company_agent_context`
requires Enterprise; on a lower-tier key it returns a clean `403` with an
upgrade message (see below) rather than failing silently or crashing.

## Errors you might see

- **"Your EDGAR Alert API key was rejected"** — check `EDGARALERT_API_KEY`
  is set and correct.
- **"This action requires a higher EDGAR Alert plan"** — expected on
  `edgaralert_get_company_agent_context` for STARTER/PRO keys; every
  other tool should work normally on those plans. If you see this on a
  different tool, double check your plan tier in the EDGAR Alert
  dashboard.
- **"rate or daily quota exceeded"** — you've hit your plan's API limits.
  Wait, or check usage in your EDGAR Alert dashboard.
- **"Could not reach the EDGAR Alert API"** — a network/connectivity issue,
  not an account issue. Run
  `node -e "fetch('https://api.edgaralert.com/api/v1/alerts/latest').then(r=>r.text()).then(console.log)"`
  — you should see a JSON error like `{"message":"Missing X-API-Key
  header."}` (that's expected and means the API is reachable). If you get
  a DNS error (`ENOTFOUND`/`ENODATA`) or no response, the problem is
  local network/DNS, not this server or your account.
- **"Unexpected token '<', is not valid JSON"** — the request reached a
  server, but got back an HTML page instead of API data. This happens if
  `EDGARALERT_BASE_URL` is ever pointed at `edgaralert.com` or
  `www.edgaralert.com` instead of `api.edgaralert.com` — the bare and
  `www` hosts serve the marketing website (an Azure Static Web App), not
  the API. The default in this package is already set to
  `api.edgaralert.com`; if you see this error, check whether
  `EDGARALERT_BASE_URL` has been overridden somewhere in your config.

## Security notes

- This server has no admin, billing, or order-management capability of any
  kind — those endpoints are not implemented here, by design.
- No secrets are hardcoded anywhere in this package. The only credential
  used is the one you supply via environment variable / Claude Desktop
  config.
- No data is cached or persisted to disk between tool calls.
- Network access is limited to `EDGARALERT_BASE_URL` (defaults to
  `api.edgaralert.com`) — no other outbound calls are made.

## Development

```bash
npm run typecheck   # type-check without emitting
npm run build        # compile to dist/
npm run dev           # run with tsx, no build step
```

To add a new tool: copy the pattern in `src/tools/getWeeklyInsights.ts` (for
a no-input tool) or `src/tools/searchAlerts.ts` (for a filtered tool),
register it in `src/tools/index.ts`, and only ever call `api/v1/*` or other
already-public endpoints. Do not add database clients, Stripe/order
clients, or any write-capable tool to this package.
