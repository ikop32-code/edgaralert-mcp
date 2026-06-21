import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  tickerOrCik: z.string().min(1).describe("Stock ticker (e.g. MSFT) or SEC CIK number."),
  period: z
    .enum(["FY", "Q"])
    .default("FY")
    .describe("FY for annual fundamentals, Q for quarterly."),
  years: z.number().int().min(1).max(20).default(10).describe("Number of years of history to return."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerGetCompanyFundamentals(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_get_company_fundamentals",
    {
      title: "Get company fundamentals history",
      description:
        "Returns historical company fundamentals (revenue, net income, margins, assets, " +
        "liabilities, debt ratios, free cash flow) by fiscal year or quarter, derived from SEC " +
        "filings. Requires EDGAR Alert PRO plan or higher. Use edgaralert_get_company_profile " +
        "first if you just need the latest snapshot rather than multi-year history.",
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
          `companies/${encodeURIComponent(input.tickerOrCik)}/fundamentals`,
          { period: input.period, years: input.years },
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
