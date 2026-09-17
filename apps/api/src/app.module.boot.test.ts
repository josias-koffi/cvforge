import "reflect-metadata";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Resolves the whole dependency graph for real. Every other module test only
 * reads `Reflect` metadata, so a provider injected across modules but never
 * exported would pass them all and fail only when the container boots in
 * production.
 *
 * Nothing here reaches Postgres: the pool is created lazily and no query runs
 * until the first request. The file stores are pointed at a throwaway
 * directory so the developer's own `.data/` is never touched.
 */
describe("AppModule dependency graph", () => {
  let stateDirectory: string;

  beforeAll(() => {
    stateDirectory = mkdtempSync(join(tmpdir(), "cvforge-boot-"));

    Object.assign(process.env, {
      APPLICATIONS_STATE_FILE: join(stateDirectory, "applications.json"),
      AUTH_SESSION_SECRET: "boot-test-secret",
      AUTH_STATE_FILE: join(stateDirectory, "auth.json"),
      INTERVIEW_STATE_FILE: join(stateDirectory, "interviews.json"),
      NOTIFICATIONS_STATE_FILE: join(stateDirectory, "notifications.json"),
      OPENROUTER_API_KEY: "boot-test-key",
      PROFILES_STATE_FILE: join(stateDirectory, "profiles.json"),
      TEMPLATES_STATE_FILE: join(stateDirectory, "templates.json"),
    });
  });

  afterAll(() => {
    rmSync(stateDirectory, { force: true, recursive: true });
  });

  it("resolves every provider without a live database", async () => {
    const { AppModule } = await import("./app.module");

    const context = await NestFactory.createApplicationContext(AppModule, {
      abortOnError: false,
      logger: false,
    });

    expect(context).toBeDefined();

    await context.close();
  }, 30_000);

  /**
   * `createApplicationContext` above skips the HTTP layer entirely, so it
   * never registers a route or a middleware. This one builds the real Express
   * adapter and initialises it, which also resolves middleware.
   *
   * Known limit: it does **not** catch a circular import between a middleware
   * and the service it injects. Vitest's ESM graph resolves the cycle, while
   * the compiled CommonJS build leaves the class `undefined` at
   * decorator-evaluation time and the container refuses to boot. Only running
   * the built `dist/apps/api/src/main.js` reproduces that — see the note in
   * the backlog about smoke-testing the image before it is deployed.
   */
  it("registers its routes and middleware on the HTTP adapter", async () => {
    const { AppModule } = await import("./app.module");

    const app = await NestFactory.create(AppModule, {
      abortOnError: false,
      logger: false,
    });

    await app.init();

    const routes = app
      .getHttpAdapter()
      .getInstance()
      .router.stack.filter((layer: { route?: unknown }) => layer.route);

    expect(routes.length).toBeGreaterThan(0);

    await app.close();
  }, 30_000);
});
