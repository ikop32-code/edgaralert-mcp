import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

export function registerGetWeeklyInsights(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_weekly_insights",
    {
      title: "Get weekly insider trading market summary",
      description:
        "Returns a market-wide weekly summary of insider trading activity: the most bullish " +
        "and bearish industries by net insider signal, and the top buying/selling companies " +
        "for the week. Good for broad 'what's the market doing' questions before drilling into " +
        "a specific company or sector.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        // NOTE: InsightsController is [Route("api/insights")], not
        // api/v1/insights — this endpoint intentionally lives outside the
        // v1-prefixed surface, so it must use getAbsolute(), not get().
        const result = await client.getAbsolute("insights/weekly");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );
}
