#!/usr/bin/env node
/**
 * EDGAR Alert MCP Server
 *
 * Read-only, thin wrapper around the public EDGAR Alert v1 API
 * (https://api.edgaralert.com/api/v1). Intended for EDGAR Alert
 * Enterprise-plan members to connect Claude Desktop (or any
 * MCP-compatible client) directly to their SEC insider-trading and
 * company-research data.
 *
 * This server holds NO secrets, performs NO scoring/business logic,
 * and never touches a database directly — every tool call is a plain
 * HTTP GET to the existing v1 API using the user's own X-API-Key.
 * Enterprise access is enforced by that API, not by this code; this
 * server has no concept of plans beyond surfacing the API's own 403
 * responses clearly.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig, ConfigError } from "./config/env.js";
import { EdgarAlertClient } from "./client/edgarAlertClient.js";
import { registerAllTools } from "./tools/index.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      // MCP clients surface stderr in their logs; stdout is reserved
      // for the JSON-RPC protocol stream, so configuration errors must
      // never be written there.
      console.error(`[edgaralert-mcp] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const client = new EdgarAlertClient(config);

  const server = new McpServer({
    name: "edgaralert",
    version: "0.1.0",
  });

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[edgaralert-mcp] EDGAR Alert MCP server running on stdio.");
}

main().catch((err) => {
  console.error("[edgaralert-mcp] Fatal error:", err);
  process.exit(1);
});
