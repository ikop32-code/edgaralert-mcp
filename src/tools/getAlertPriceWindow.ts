import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  alertId: z.number().int().positive().describe("The numeric id of the alert (from a search or latest-alerts result)."),
  daysBefore: z.number().int().min(0).max(365).default(30).describe("Days of price history before the alert date."),
  daysAfter: z.number().int().min(0).max(365).default(30).describe("Days of price history after the alert date."),
  scope: z
    .enum(["watchlist", "universe"])
    .optional()
    .describe('"watchlist" restricts to the user\'s default ticker list, "universe" (default) does not.'),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerGetAlertPriceWindow(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_alert_price_window",
    {
      title: "Get stock price performance around an alert",
      description:
        "Returns daily price history for the stock around the date of a specific insider " +
        "trading alert, useful for backtesting whether the signal preceded a price move. " +
        "Requires an alert id from edgaralert_search_alerts or edgaralert_get_latest_alerts. " +
        "Requires EDGAR Alert PRO plan or higher.",
      inputSchema: inputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: Input) => {
      try {
        const result = await client.get(`alerts/${input.alertId}/price-window`, {
          daysBefore: input.daysBefore,
          daysAfter: input.daysAfter,
          scope: input.scope,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );
}
