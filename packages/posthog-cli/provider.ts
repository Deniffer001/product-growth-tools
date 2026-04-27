/**
 * @input PostHog personal API key, project/env id, and official agent toolkit tools
 * @output stable raw PostHog datasets for product-growth agents
 * @pos provider adapter over PostHog's official agent toolkit, not a parallel analytics layer
 */

import {
  getToolsFromContext,
  PostHogAgentToolkit,
  type Context,
} from "@posthog/agent-toolkit";
import { cliError } from "./lib/errors";

export type PostHogReadiness = {
  provider: "posthog";
  ready: boolean;
  host: string;
  projectId: string | null;
  hasApiToken: boolean;
  apiKey?: {
    label?: string | null;
    scopes: string[];
    scopedTeams: unknown[];
    scopedOrganizations: unknown[];
  };
};

export type QueryRunRequest = {
  query: string;
  limit?: number;
  noLimitGuard?: boolean;
  raw?: boolean;
};

export type PostHogClient = {
  checkReadiness: () => Promise<PostHogReadiness>;
  runHogql: (input: QueryRunRequest) => Promise<unknown>;
  listEventDefinitions: (input: { q?: string }) => Promise<unknown>;
  listPropertyDefinitions: (input: {
    type: "event" | "person";
    eventName?: string;
    includePredefinedProperties?: boolean;
  }) => Promise<unknown>;
  listFeatureFlags: () => Promise<unknown>;
  listInsights: (input: {
    limit?: number;
    offset?: number;
    search?: string;
    favorited?: boolean;
  }) => Promise<unknown>;
  listDashboards: (input: {
    limit?: number;
    offset?: number;
    search?: string;
    pinned?: boolean;
  }) => Promise<unknown>;
};

type ContentResult = {
  content?: Array<{ type?: string; text?: string }>;
};

type ToolkitTool = {
  name: string;
  handler: (
    context: Context,
    params: Record<string, unknown>
  ) => Promise<unknown>;
};

export function createPostHogClient(input: {
  apiToken?: string;
  apiBaseUrl: string;
  projectId?: string;
}): PostHogClient {
  requireApiToken(input.apiToken);

  const toolkit = new PostHogAgentToolkit({
    posthogApiToken: input.apiToken,
    posthogApiBaseUrl: input.apiBaseUrl,
  });

  let contextPromise: Promise<Context> | null = null;
  let toolsPromise: Promise<ToolkitTool[]> | null = null;

  async function getContext() {
    if (!contextPromise) {
      contextPromise = Promise.resolve(toolkit.getContext()).then(
        async (context) => {
          if (input.projectId) {
            await context.cache.set("projectId", input.projectId);
          }
          return context;
        }
      );
    }

    return contextPromise;
  }

  async function getTools() {
    if (!toolsPromise) {
      toolsPromise = getContext().then(
        (context) => getToolsFromContext(context) as Promise<ToolkitTool[]>
      );
    }

    return toolsPromise;
  }

  async function callTool(name: string, params: Record<string, unknown>) {
    const [context, tools] = await Promise.all([getContext(), getTools()]);
    const tool = tools.find((candidate) => candidate.name === name);

    if (!tool) {
      throw cliError({
        code: "auth_error",
        message: `PostHog toolkit tool is unavailable: ${name}`,
        hint: "Check the personal API key scopes for this command.",
      });
    }

    const result = (await tool.handler(context, params)) as ContentResult;
    return parseToolContent(result, name);
  }

  return {
    async checkReadiness() {
      const context = await getContext();
      const apiKey = await context.stateManager.getApiKey();
      const projectId = await context.stateManager.getProjectId();

      return {
        provider: "posthog",
        ready: true,
        host: input.apiBaseUrl,
        projectId,
        hasApiToken: true,
        apiKey: {
          label: readOptionalString(apiKey, "label"),
          scopes: readStringArray(apiKey, "scopes"),
          scopedTeams: readArray(apiKey, "scoped_teams"),
          scopedOrganizations: readArray(apiKey, "scoped_organizations"),
        },
      };
    },
    runHogql(request) {
      const query = withLimitGuard(request);
      return callTool("query-run", {
        query: {
          kind: "DataVisualizationNode",
          source: {
            kind: "HogQLQuery",
            query,
          },
        },
      });
    },
    listEventDefinitions(request) {
      return callTool("event-definitions-list", request);
    },
    listPropertyDefinitions(request) {
      return callTool("properties-list", request);
    },
    listFeatureFlags() {
      return callTool("feature-flag-get-all", {});
    },
    listInsights(request) {
      return callTool("insights-get-all", { data: stripUndefined(request) });
    },
    listDashboards(request) {
      return callTool("dashboards-get-all", { data: stripUndefined(request) });
    },
  };
}

function requireApiToken(apiToken?: string): asserts apiToken is string {
  if (apiToken) {
    return;
  }

  throw cliError({
    code: "auth_error",
    message: "Missing PostHog personal API key.",
    hint: "Set POSTHOG_API_TOKEN, POSTHOG_PERSONAL_API_KEY, or POSTHOG_CLI_API_KEY in the active product-growth profile or invocation env.",
  });
}

function parseToolContent(result: ContentResult, toolName: string) {
  const text = result.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw cliError({
      code: "provider_error",
      message: `PostHog toolkit tool returned no text content: ${toolName}`,
    });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

const LIMIT_PATTERN = /\blimit\s+\d+\b/i;

export function withLimitGuard(input: QueryRunRequest) {
  const trimmed = input.query.trim().replace(/;+\s*$/, "");

  if (input.noLimitGuard || LIMIT_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const limit = input.limit ?? 100;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 10000) {
    throw cliError({
      code: "invalid_input",
      message: "Invalid query limit.",
      hint: "Use an integer limit between 1 and 10000.",
    });
  }

  return `${trimmed} LIMIT ${limit}`;
}

function stripUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function readOptionalString(input: unknown, key: string) {
  if (!input || typeof input !== "object") {
    return null;
  }
  const value = Reflect.get(input, key);
  return typeof value === "string" ? value : null;
}

function readStringArray(input: unknown, key: string) {
  const value = input && typeof input === "object" ? Reflect.get(input, key) : [];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readArray(input: unknown, key: string) {
  const value = input && typeof input === "object" ? Reflect.get(input, key) : [];
  return Array.isArray(value) ? value : [];
}
