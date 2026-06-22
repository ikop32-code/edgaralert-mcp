import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

export function registerGetIndustryCapitalFlow(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_industry_capital_flow",
    {
      title: "Get 12-week insider capital flow by industry",
      description:
        "Returns 12-week rolling insider capital flow (insider buy value minus sell value) " +
        "for the top 6 most active FF48 industry groups by absolute net insider score. " +
        "Each row contains weekStartDate, weekEndDate, ff48Code, ff48Description, sectorCode, sectorName, " +
        "buyValue, sellValue, and netCapitalFlow. Industries are grouped using the Fama-French 48 " +
        "classification (e.g. 'Pharmaceutical Products', 'Computers', 'Banking') nested under 11 " +
        "GICS-like sectors (e.g. 'Health Care', 'Technology', 'Financials'). " +
        "Use this to identify sustained sector rotation — which industries insiders have been " +
        "consistently buying into or selling out of over the past quarter, not just the latest week. " +
        "Complements edgaralert_get_weekly_insights (single week snapshot) with multi-week trend data. " +
        "Good for questions like: 'which industries have had sustained insider buying over the past 3 months?' " +
        "or 'is the tech selloff concentrated in semiconductors or broad across the sector?'",
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
        // api/v1/insights — same as getWeeklyInsights, must use
        // getAbsolute() not get().
        const result = await client.getAbsolute("insights/capital-flow");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );
}
