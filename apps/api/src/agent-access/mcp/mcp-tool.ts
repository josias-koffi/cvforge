import type { AgentScope } from "@cvforge/types";
import { HttpException, Logger } from "@nestjs/common";
import type { z } from "zod";
import type { AgentPrincipal } from "../agent-tokens.service";

export type McpToolContext = { principal: AgentPrincipal };

/**
 * One MCP tool: its schema, the scopes a token needs to see it, and what it
 * costs. `run` calls a JobSpark service for `ctx.principal.userEmail` only.
 */
export type McpToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  title: string;
  description: string;
  scopes: AgentScope[];
  inputSchema: Shape;
  /** Changes nothing on the account. */
  readOnly?: boolean;
  /**
   * The output quotes text written by third parties (offers, companies): it
   * is wrapped so the agent treats it as data, never as instructions.
   */
  untrusted?: boolean;
  /** Credits reserved on the token's daily cap before running. */
  cost?: (args: z.infer<z.ZodObject<Shape>>) => number;
  run: (
    args: z.infer<z.ZodObject<Shape>>,
    ctx: McpToolContext,
  ) => Promise<unknown>;
};

/** Keeps each tool's own argument type while building heterogeneous lists. */
export function defineTool<Shape extends z.ZodRawShape>(
  definition: McpToolDefinition<Shape>,
): McpToolDefinition {
  return definition as unknown as McpToolDefinition;
}

export const UNTRUSTED_TAG = "untrusted_offer_content";

export function wrapUntrusted(text: string) {
  // A closing tag inside the content must not end the wrapper early.
  const safe = text.replaceAll(`</${UNTRUSTED_TAG}>`, `<\\/${UNTRUSTED_TAG}>`);

  return `<${UNTRUSTED_TAG}>\n${safe}\n</${UNTRUSTED_TAG}>`;
}

export type McpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function toolResult(data: unknown, untrusted = false): McpToolResult {
  const text = JSON.stringify(data ?? null, null, 2);

  return {
    content: [{ text: untrusted ? wrapUntrusted(text) : text, type: "text" }],
  };
}

export function toolError(message: string): McpToolResult {
  return { content: [{ text: message, type: "text" }], isError: true };
}

const logger = new Logger("McpTools");

/** The service's own message for expected errors; nothing internal otherwise. */
export function describeToolError(error: unknown, tool: string) {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === "string"
        ? response
        : (response as { message?: unknown }).message;

    return Array.isArray(message)
      ? message.join(" ")
      : String(message ?? error.message);
  }

  logger.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      event: "mcp_tool_failed",
      tool,
    }),
  );

  return "Erreur interne de JobSpark. Réessayez plus tard.";
}
