import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Maximum number of alerts to return (1-200)."),
  days: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Optional lookback window in days."),
  scope: z
    .enum(["watchlist", "universe"])
    .optional()
    .describe(
      '"watchlist" restricts to the user\'s default ticker list; "universe" (default) applies no restriction.',
    ),
  minScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(80)
    .describe(
      "Minimum signal_score, inclusive. Defaults to 80 (high-confidence only). Pass 0 to see all alerts.",
    ),
  side: z
    .enum(["BUY", "SELL", "ALL"])
    .optional()
    .describe('Filter by transaction direction. Omit or "ALL" returns both.'),
  planned: z
    .boolean()
    .optional()
    .describe(
      "true = only planned/10b5-1/scheduled trades. false = only likely-discretionary trades. Omit for both.",
    ),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerGetLatestAlerts(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_latest_alerts",
    {
      title: "Get latest insider trading alerts",
      description:
        "Returns the most recent SEC Form 4 insider trading alerts and 8-K Item 5.02 " +
        "officer/director change alerts across the EDGAR Alert universe, ranked by recency. " +
        "By default only returns high-confidence alerts (signal_score >= 80); lower minScore " +
        "to widen results. Use this for 'what's happening right now' questions. For complex " +
        "multi-filter searches (by ticker, sector, market cap, date range), use " +
        "edgaralert_search_alerts instead.",
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
        const result = await client.get("alerts/latest", {
          limit: input.limit,
          days: input.days,
          scope: input.scope,
          minScore: input.minScore,
          side: input.side,
          planned: input.planned,
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
