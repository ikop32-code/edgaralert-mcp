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
    .describe("Number of recent insider trading signals to include."),
  fundamentalYears: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(5)
    .describe("Number of years of fundamentals history to include."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerGetCompanyAgentContext(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_company_agent_context",
    {
      title: "Get AI-ready company research context",
      description:
        "Returns a single bundled, AI-optimized research payload for a company: identity, " +
        "market summary, fundamentals (current + multi-year history), insider trading summary, " +
        "recent insider signals with forward-return data, and suggested analysis steps. This is " +
        "the richest single-call tool available and is purpose-built for research and " +
        "decision-support — it is NOT investment advice, and the underlying data may be " +
        "incomplete or delayed. Requires EDGAR Alert ENTERPRISE plan. Prefer this tool over " +
        "combining edgaralert_get_company_profile + edgaralert_get_company_fundamentals + " +
        "edgaralert_search_alerts when you need a full picture of one company in one call.",
      inputSchema: inputShape,
    },
    async (input: Input) => {
      try {
        const result = await client.get(
          `companies/${encodeURIComponent(input.tickerOrCik)}/agent-context`,
          {
            recentAlertsLimit: input.recentAlertsLimit,
            fundamentalYears: input.fundamentalYears,
          },
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
