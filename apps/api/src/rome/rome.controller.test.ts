import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import type { RomeAppellationsReader } from "./rome-appellations.pg-reader";
import { RomeController } from "./rome.controller";

function createController(session: { email: string } | null) {
  const appellations = { find: vi.fn(), search: vi.fn(async () => []) };
  const auth = { readSessionFromCookieHeader: vi.fn(() => session) };

  return {
    appellations,
    controller: new RomeController(
      appellations as unknown as RomeAppellationsReader,
      auth as unknown as AuthService,
    ),
  };
}

describe("RomeController", () => {
  it("searches the local referential, with a bounded query and limit", async () => {
    const { appellations, controller } = createController({
      email: "ana@x.fr",
    });

    expect(
      await controller.searchAppellations("x".repeat(200), {
        headers: { cookie: "s=1" },
      }),
    ).toEqual({ appellations: [] });
    expect(appellations.search).toHaveBeenCalledWith("x".repeat(80), 8);

    await controller.searchAppellations(undefined, { headers: {} });
    expect(appellations.search).toHaveBeenLastCalledWith("", 8);
  });

  it("refuses an anonymous visitor", async () => {
    const { appellations, controller } = createController(null);

    await expect(
      controller.searchAppellations("boulanger", { headers: {} }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(appellations.search).not.toHaveBeenCalled();
  });
});
