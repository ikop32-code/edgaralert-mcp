import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  ticker: z.string().optional().describe("Exact stock ticker to filter on, e.g. AAPL."),
  eventType: z.string().optional().describe("Raw alert event type filter."),
  status: z.string().optional().describe("Alert status filter."),
  minScore: z.number().int().min(0).max(100).optional().describe("Minimum signal_score, inclusive."),
  maxScore: z.number().int().min(0).max(100).optional().describe("Maximum signal_score, inclusive."),
  fromDate: z.string().optional().describe("ISO date (YYYY-MM-DD). Only alerts on/after this date."),
  toDate: z.string().optional().describe("ISO date (YYYY-MM-DD). Only alerts on/before this date."),
  side: z.enum(["BUY", "SELL", "ALL"]).optional().describe("Transaction direction."),
  sectorCodes: z
    .array(z.string())
    .optional()
    .describe("Industry sector codes to filter by (same codes as company search)."),
  marketCapBuckets: z
    .array(z.enum(["MEGA", "LARGE", "MID", "SMALL"]))
    .optional()
    .describe("Market cap buckets to include."),
  plannedOnly: z.boolean().optional().describe("Only planned/10b5-1/scheduled trades."),
  discretionaryOnly: z.boolean().optional().describe("Only likely-discretionary (non-scheduled) trades."),
  priorWeaknessOnly: z
    .boolean()
    .optional()
    .describe("Only alerts where the stock showed prior price weakness."),
  historicalEdgeOnly: z
    .boolean()
    .optional()
    .describe("Only alerts with a favorable historical signal track record."),
  scope: z
    .enum(["watchlist", "universe"])
    .optional()
    .describe(
      '"watchlist" restricts to the user\'s default ticker list; ignored if ticker is set.',
    ),
  limit: z.number().int().min(1).max(200).default(50).describe("Maximum results, 1-200."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerSearchAlerts(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_search_alerts",
    {
      title: "Search insider trading alerts with filters",
      description:
        "Searches SEC insider trading alerts (Form 4 buy/sell signals and 8-K officer/director " +
        "change events) using detailed filters: ticker, signal score range, date range, " +
        "transaction side, sector, market cap bucket, and planned-vs-discretionary trade type. " +
        "Requires EDGAR Alert PRO plan or higher (your Enterprise key qualifies). Use this for " +
        "targeted research questions like 'show me large-cap insider buys in tech this month' " +
        "rather than a general recent-activity feed (use edgaralert_get_latest_alerts for that).",
      inputSchema: inputShape,
    },
    async (input: Input) => {
      try {
        const result = await client.get("alerts", {
          ticker: input.ticker,
          eventType: input.eventType,
          status: input.status,
          minScore: input.minScore,
          maxScore: input.maxScore,
          fromDate: input.fromDate,
          toDate: input.toDate,
          side: input.side,
          sectorCodes: input.sectorCodes,
          marketCapBuckets: input.marketCapBuckets,
          plannedOnly: input.plannedOnly,
          discretionaryOnly: input.discretionaryOnly,
          priorWeaknessOnly: input.priorWeaknessOnly,
          historicalEdgeOnly: input.historicalEdgeOnly,
          scope: input.scope,
          limit: input.limit,
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
