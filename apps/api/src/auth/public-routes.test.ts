import { PATH_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { IS_PUBLIC_ROUTE } from "./public.decorator";

const SRC = join(__dirname, "..");
const modules: Record<string, Record<string, unknown>> = {};

function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(path);
    return entry.name.endsWith(".controller.ts") ? [path] : [];
  });
}

beforeAll(async () => {
  for (const file of controllerFiles(SRC)) {
    modules[file] = (await import(file)) as Record<string, unknown>;
  }
});

const METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "ALL",
  "OPTIONS",
  "HEAD",
];

/** Every route reachable without a session. Growing this list is a security decision. */
const EXPECTED_PUBLIC_ROUTES = [
  "GET|ready|",
  "GET|health|",
  "GET|auth/invitations/preview|",
  "GET|auth/passwordless/consume|",
  "POST|auth/invitations/consume|",
  "POST|auth/logout|",
  "POST|auth/passwordless/consume|",
  "POST|auth/passwordless/request|",
  "POST|billing/stripe/webhook|",
  // ADR-032: admitted by an agent token, not a cookie. GET/DELETE only answer
  // 405 — a 401 there would send MCP clients looking for OAuth.
  "POST|mcp|",
  "GET|mcp|",
  "DELETE|mcp|",
  // A signed, single-use, 10-minute link is the credential.
  "GET|mcp/files/:token|",
  // ADR-033: the OAuth authorization server MCP clients (claude.ai, ChatGPT…)
  // call without a session. The consent endpoints need the cookie.
  "GET|.well-known/oauth-protected-resource/mcp|",
  "GET|.well-known/oauth-protected-resource|",
  "GET|.well-known/oauth-authorization-server|",
  "GET|oauth/authorize|",
  "POST|oauth/token|",
  "POST|oauth/register|",
  "POST|oauth/revoke|",
];

function publicRoutes() {
  const routes: string[] = [];
  for (const mod of Object.values(modules)) {
    for (const controller of Object.values(mod)) {
      if (
        typeof controller !== "function" ||
        Reflect.getMetadata(PATH_METADATA, controller) === undefined
      )
        continue;
      const base = String(
        Reflect.getMetadata(PATH_METADATA, controller),
      ).replace(/^\/|\/$/g, "");
      const classPublic =
        Reflect.getMetadata(IS_PUBLIC_ROUTE, controller) === true;
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method === undefined) continue;
        const isPublic =
          classPublic || Reflect.getMetadata(IS_PUBLIC_ROUTE, handler) === true;
        if (!isPublic) continue;
        const path = String(
          Reflect.getMetadata(PATH_METADATA, handler),
        ).replace(/^\/|\/$/g, "");
        routes.push(
          `${METHODS[method] ?? method}|${[base, path].filter(Boolean).join("/")}|`,
        );
      }
    }
  }
  return routes;
}

describe("public routes", () => {
  it("should only expose the routes listed here (public/* tools included)", () => {
    const routes = publicRoutes();
    const nonPublicPrefix = routes.filter(
      (r) => !r.split("|")[1]!.startsWith("public/"),
    );

    expect(nonPublicPrefix.sort()).toEqual([...EXPECTED_PUBLIC_ROUTES].sort());
    expect(routes.length).toBeGreaterThan(nonPublicPrefix.length);
  });
});
