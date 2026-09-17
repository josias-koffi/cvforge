import { ServiceUnavailableException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "./database.types";
import { ReadinessController } from "./readiness.controller";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

describe("ReadinessController", () => {
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  it("reports ready when the migrated database answers", async () => {
    const controller = new ReadinessController(testDatabase.db);

    await expect(controller.ready()).resolves.toEqual({
      status: "ok",
      service: "api",
      database: "ok",
    });
  });

  it("answers 503 when the database is unreachable", async () => {
    const unreachable = {
      execute: () => Promise.reject(new Error("ECONNREFUSED")),
    } as unknown as Database;

    await expect(new ReadinessController(unreachable).ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
