import { EdgarAlertApiError } from "../client/edgarAlertClient.js";

/**
 * Converts any thrown error into MCP tool-result content with
 * isError: true, so Claude sees a clean, actionable message instead of
 * a stack trace or a silently failed call.
 */
export function toToolError(err: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (err instanceof EdgarAlertApiError) {
    let hint = "";
    switch (err.kind) {
      case "auth":
        hint = " Verify EDGARALERT_API_KEY is set correctly in your MCP client config.";
        break;
      case "plan":
        hint =
          " This MCP server is built for EDGAR Alert Enterprise plan. Upgrade at https://www.edgaralert.com/pricing.";
        break;
      case "rate_limit":
        hint = " Try again later, or check your usage in the EDGAR Alert dashboard.";
        break;
      case "network":
        hint = " This is a connectivity issue, not an EDGAR Alert account issue.";
        break;
      default:
        break;
    }
    return {
      content: [{ type: "text", text: `${err.message}${hint}` }],
      isError: true,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: `Unexpected error: ${message}` }],
    isError: true,
  };
}
