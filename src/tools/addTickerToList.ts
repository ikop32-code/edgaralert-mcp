import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";
import { toToolError } from "./toolError.js";

const inputShape = {
  listId: z
    .number()
    .int()
    .positive()
    .describe(
      "The ID of the ticker list to add to. Get list IDs from edgaralert_get_ticker_lists.",
    ),
  ticker: z
    .string()
    .min(1)
    .max(20)
    .describe("Stock ticker to add, e.g. AAPL. Will be uppercased automatically."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerAddTickerToList(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_add_ticker_to_list",
    {
      title: "Add ticker to watchlist",
      description:
        "Adds a stock ticker to one of the user's ticker lists (watchlists). " +
        "Use edgaralert_get_ticker_lists first to find the correct listId. " +
        "Plan limits apply: FREE/STARTER plans are capped at 10 tickers total across all lists. " +
        "Returns the created ticker list item on success.",
      inputSchema: inputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: Input) => {
      try {
        const result = await client.post(`ticker-lists/${input.listId}/items`, {
          ticker: input.ticker,
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
