import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EdgarAlertClient } from "../client/edgarAlertClient.js";

import { registerGetLatestAlerts } from "./getLatestAlerts.js";
import { registerSearchAlerts } from "./searchAlerts.js";
import { registerGetAlertPriceWindow } from "./getAlertPriceWindow.js";
import { registerSearchCompanies } from "./searchCompanies.js";
import { registerGetCompanyProfile } from "./getCompanyProfile.js";
import { registerGetCompanyFundamentals } from "./getCompanyFundamentals.js";
import { registerGetCompanyAgentContext } from "./getCompanyAgentContext.js";
import { registerGetWeeklyInsights } from "./getWeeklyInsights.js";
import { registerGetIndustryCapitalFlow } from "./getIndustryCapitalFlow.js";

/**
 * Registers every MVP tool. Each tool is a thin wrapper around exactly
 * one api/v1/* (or public api/insights/*) endpoint — no business logic,
 * no scoring, no direct data access lives here. To add a tool: create a
 * new file in this folder following the existing pattern, then add one
 * line here.
 */
export function registerAllTools(server: McpServer, client: EdgarAlertClient): void {
  registerGetLatestAlerts(server, client);
  registerSearchAlerts(server, client);
  registerGetAlertPriceWindow(server, client);
  registerSearchCompanies(server, client);
  registerGetCompanyProfile(server, client);
  registerGetCompanyFundamentals(server, client);
  registerGetCompanyAgentContext(server, client);
  registerGetWeeklyInsights(server, client);
  registerGetIndustryCapitalFlow(server, client);
}
