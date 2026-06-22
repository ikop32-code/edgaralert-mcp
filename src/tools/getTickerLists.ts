import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

export function registerGetTickerLists(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_ticker_lists",
    {
      title: "Get watchlists",
      description:
        "Returns all ticker lists (watchlists) for the authenticated user, including the tickers " +
        "in each list and the plan's ticker limit. Auto-creates a default 'My Tickers' list if " +
        "none exists yet. Use this to find the listId needed for adding or removing tickers, " +
        "or to check what the user is currently tracking. The default watchlist is used by " +
        "edgaralert_get_latest_alerts and edgaralert_search_alerts when scope='watchlist'.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const result = await client.get("ticker-lists");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );
}
