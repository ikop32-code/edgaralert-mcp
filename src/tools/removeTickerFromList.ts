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
      "The ID of the ticker list to remove from. Get list IDs from edgaralert_get_ticker_lists.",
    ),
  ticker: z
    .string()
    .min(1)
    .max(20)
    .describe("Stock ticker to remove, e.g. AAPL."),
};

const inputSchema = z.object(inputShape);
type Input = z.infer<typeof inputSchema>;

export function registerRemoveTickerFromList(server: McpServer, client: EdgarAlertClient): void {
  server.registerTool(
    "edgaralert_remove_ticker_from_list",
    {
      title: "Remove ticker from watchlist",
      description:
        "Removes a stock ticker from one of the user's ticker lists (watchlists). " +
        "Use edgaralert_get_ticker_lists first to find the correct listId. " +
        "Returns no content on success (204). Returns an error if the ticker is not found in the list.",
      inputSchema: inputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input: Input) => {
      try {
        await client.delete(`ticker-lists/${input.listId}/items/${input.ticker.toUpperCase()}`);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, ticker: input.ticker.toUpperCase(), listId: input.listId }) }],
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );
}
