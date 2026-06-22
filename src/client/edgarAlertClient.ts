/**
 * Thin HTTP client for the EDGAR Alert v1 API.
 *
 * This is intentionally dumb: it builds a URL, attaches X-API-Key,
 * makes a GET request, and translates the API's existing error
 * contract into typed errors. It does NOT:
 *   - cache or reimplement plan-gating logic (the API already enforces
 *     this via ApiKeyAuthorize / ApiPlanAuthorize)
 *   - retry on 429 (callers surface the message; SEC data is not so
 *     time-critical that silent retries are worth the complexity)
 *   - touch any endpoint outside api/v1/* or api/insights/* (no Stripe,
 *     no orders, no member-portal-only routes)
 */

import type { EdgarAlertConfig } from "../config/env.js";

export class EdgarAlertApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind:
      | "auth"
      | "plan"
      | "rate_limit"
      | "not_found"
      | "bad_request"
      | "server"
      | "network",
  ) {
    super(message);
    this.name = "EdgarAlertApiError";
  }
}

interface ApiErrorBody {
  message?: string;
}

export class EdgarAlertClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  /** baseUrl with any trailing /v1 (or /api/v1) stripped, e.g.
   *  "https://api.edgaralert.com/api/v1" -> "https://api.edgaralert.com/api".
   *  Used only by getAbsolute() for the small number of endpoints that
   *  intentionally live outside the v1-prefixed API surface. */
  private readonly apiRoot: string;

  constructor(config: EdgarAlertConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.apiRoot = config.baseUrl.replace(/\/v1\/?$/, "");
  }

  /**
   * Issues a GET request against api/v1/<path> with the given query
   * params. Booleans/numbers are stringified; undefined/null values are
   * omitted entirely so optional filters don't get sent as "undefined".
   */
  async get<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
    return this.request<T>("GET", `${this.baseUrl}/${path.replace(/^\/+/, "")}`, query);
  }

  /**
   * Issues a GET request against api/<path> (NOT api/v1/<path>) — for the
   * small set of endpoints, like InsightsController, that are mounted at
   * [Route("api/insights")] rather than under the v1-prefixed API. Same
   * auth header, same error handling as get(); only the path base differs.
   */
  async getAbsolute<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
    return this.request<T>("GET", `${this.apiRoot}/${path.replace(/^\/+/, "")}`, query);
  }

  /**
   * Issues a POST request against api/v1/<path> with a JSON body.
   */
  async post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    return this.request<T>("POST", `${this.baseUrl}/${path.replace(/^\/+/, "")}`, {}, body);
  }

  /**
   * Issues a DELETE request against api/v1/<path>.
   * Returns null for 204 No Content responses (successful delete).
   */
  async delete<T>(path: string): Promise<T | null> {
    return this.request<T>("DELETE", `${this.baseUrl}/${path.replace(/^\/+/, "")}`, {});
  }

  private async request<T>(
    method: string,
    baseUrl: string,
    query: Record<string, unknown>,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      Accept: "application/json",
      "User-Agent": "edgaralert-mcp-server/0.1.0",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new EdgarAlertApiError(
        `Could not reach the EDGAR Alert API (${(err as Error).message}). ` +
          "Check your network connection and try again.",
        0,
        "network",
      );
    }

    // 204 No Content — successful delete, nothing to parse
    if (response.status === 204) {
      return null as T;
    }

    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const preview = (await response.text()).slice(0, 200);
        throw new EdgarAlertApiError(
          "The EDGAR Alert API returned a non-JSON response (HTTP " +
            `${response.status}, content-type: ${contentType || "unknown"}). ` +
            "This usually means the request reached the wrong host (e.g. " +
            "the marketing site instead of the API) rather than a real API " +
            `error. Response started with: ${JSON.stringify(preview)}`,
          response.status,
          "server",
        );
      }
      return (await response.json()) as T;
    }

    const errorBody = await safeParseJson<ApiErrorBody>(response);
    const apiMessage = errorBody?.message;

    switch (response.status) {
      case 401:
        throw new EdgarAlertApiError(
          apiMessage ??
            "Your EDGAR Alert API key was rejected. Check EDGARALERT_API_KEY and try again.",
          401,
          "auth",
        );
      case 403:
        throw new EdgarAlertApiError(
          apiMessage ??
            "This action requires a higher EDGAR Alert plan. The MCP server requires an Enterprise-plan API key.",
          403,
          "plan",
        );
      case 404:
        throw new EdgarAlertApiError(apiMessage ?? "Not found.", 404, "not_found");
      case 429:
        throw new EdgarAlertApiError(
          apiMessage ??
            "EDGAR Alert API rate or daily quota exceeded. Wait before retrying, or check usage in your dashboard.",
          429,
          "rate_limit",
        );
      case 400:
        throw new EdgarAlertApiError(apiMessage ?? "Invalid request.", 400, "bad_request");
      default:
        throw new EdgarAlertApiError(
          apiMessage ?? `EDGAR Alert API returned an unexpected error (HTTP ${response.status}).`,
          response.status,
          "server",
        );
    }
  }
}

async function safeParseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
