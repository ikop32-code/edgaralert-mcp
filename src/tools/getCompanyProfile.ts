import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  tickerOrCik: z.string().min(1).describe("Stock ticker (e.g. AAPL) or SEC CIK number."),
  recentAlertsLimit: z
    .number()
    .int()
    .min(0)
    .max(50)
    .default(10)
    .describe("Number of recent insider alerts to include in the profile."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerGetCompanyProfile(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_company_profile",
    {
      title: "Get company profile",
      description:
        "Returns a company's profile: identity (name, ticker, CIK, SIC, exchange), market " +
        "summary (price, returns, 52-week range, volatility), fundamentals summary (revenue, " +
        "net income, margins, debt ratios), insider trading summary (recent buyer/seller " +
        "counts and dollar values), and recent insider alerts. Available on all paid EDGAR " +
        "Alert plans. For a more detailed multi-year fundamentals history use " +
        "edgaralert_get_company_fundamentals; for a single bundled research-agent payload use " +
        "edgaralert_get_company_agent_context.",
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
        const result = await client.get(
          `companies/${encodeURIComponent(input.tickerOrCik)}/profile`,
          { recentAlertsLimit: input.recentAlertsLimit },
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );
}
