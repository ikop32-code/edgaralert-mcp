import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  query: z.string().optional().describe("Free-text match against company name, ticker, or SIC name."),
  ticker: z.string().optional().describe("Exact ticker match."),
  sicCode: z.string().optional().describe("Exact SIC industry code match."),
  sectorCode: z.string().optional().describe("Industry sector code (same codes used in alert filters)."),
  marketCapBucket: z
    .enum(["MEGA", "LARGE", "MID", "SMALL"])
    .optional()
    .describe("Market cap bucket to filter by."),
  state: z.string().optional().describe("State of incorporation."),
  sp500Only: z.boolean().optional().describe("true to restrict results to S&P 500 constituents."),
  limit: z.number().int().min(1).max(200).default(50).describe("Maximum results, 1-200."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerSearchCompanies(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_search_companies",
    {
      title: "Search companies",
      description:
        "Searches SEC-registered companies by name, ticker, SIC code, sector, state of " +
        "incorporation, market cap bucket, or S&P 500 membership. At least one of query, " +
        "ticker, or sicCode is required. Use this to find a company's ticker/CIK before " +
        "calling edgaralert_get_company_profile, edgaralert_get_company_fundamentals, or " +
        "edgaralert_get_company_agent_context. Requires EDGAR Alert PRO plan or higher.",
      inputSchema: inputShape,
    },
    async (input: Input) => {
      if (!input.query && !input.ticker && !input.sicCode) {
        return {
          content: [
            {
              type: "text" as const,
              text: "At least one of query, ticker, or sicCode is required.",
            },
          ],
          isError: true as const,
        };
      }
      try {
        const result = await client.get("companies/search", {
          query: input.query,
          ticker: input.ticker,
          sicCode: input.sicCode,
          sectorCode: input.sectorCode,
          marketCapBucket: input.marketCapBucket,
          state: input.state,
          sp500Only: input.sp500Only,
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
