/**
 * Configuration for the EDGAR Alert MCP server.
 *
 * The server takes NO secrets as code or defaults. Everything sensitive
 * comes from environment variables that the user supplies via their
 * Claude Desktop config (or shell environment when running locally).
 *
 * EDGARALERT_API_KEY  - required. The user's own EDGAR Alert v1 API key
 *                        (X-API-Key). Never logged, never written to disk
 *                        by this process.
 * EDGARALERT_BASE_URL - optional. Defaults to the production v1 API.
 *                        Overridable for staging/local development only.
 *
 * NOTE on the default host: this MUST be api.edgaralert.com, not
 * edgaralert.com or www.edgaralert.com. Both of the latter resolve and
 * respond with HTTP 200, but serve the marketing/frontend website (an
 * Azure Static Web App), not the ASP.NET Core API — calling them returns
 * an HTML page, which breaks JSON parsing with "Unexpected token '<'".
 * api.edgaralert.com was confirmed live on 2026-06 by checking the
 * response body matches the exact literal string produced by
 * ApiKeyAuthFilter.cs ("Missing X-API-Key header.") when called without
 * a key — i.e. confirmed against the real backend, not guessed from the
 * hostname pattern alone. If EDGAR Alert's routing changes, re-verify
 * with the same kind of check before changing this default again.
 */

const DEFAULT_BASE_URL = "https://api.edgaralert.com/api/v1";

export interface EdgarAlertConfig {
  apiKey: string;
  baseUrl: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EdgarAlertConfig {
  const apiKey = env.EDGARALERT_API_KEY?.trim();

  if (!apiKey) {
    throw new ConfigError(
      "Missing EDGARALERT_API_KEY. Set it in your Claude Desktop config's " +
        '"env" block, or export it in your shell before running this server. ' +
        "Get an Enterprise-plan API key at https://www.edgaralert.com/account/api-keys",
    );
  }

  // Defensive: catch the common mistake of pasting the key with the
  // header name still attached, e.g. "X-API-Key: EA_xxx".
  if (apiKey.includes(" ") || apiKey.toLowerCase().startsWith("x-api-key")) {
    throw new ConfigError(
      "EDGARALERT_API_KEY looks malformed. Provide only the raw key value " +
        "(e.g. EA_xxx...), not the header name.",
    );
  }

  const baseUrl = (env.EDGARALERT_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");

  return { apiKey, baseUrl };
}
