import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import { SearchProjectsController } from "./search-projects.controller";
import type { SearchProjectsService } from "./search-projects.service";

const ROME = [{ code: "38976", status: "confirmed" }];
const REQUEST = { headers: { cookie: "session=1" } };

function createController(
  session: { email: string } | null = { email: "ana@x.fr" },
) {
  const service = {
    confirmRome: vi.fn(async () => ROME),
    dismissRome: vi.fn(async () => []),
    get: vi.fn(async () => ({ profileId: "p1" })),
    listRome: vi.fn(async () => ROME),
    prefill: vi.fn(async () => ({ profileId: "p1", targetRoles: ["x"] })),
    save: vi.fn(async () => ({ profileId: "p1", targetRoles: ["Boulanger"] })),
  };
  const auth = { readSessionFromCookieHeader: vi.fn(() => session) };

  return {
    controller: new SearchProjectsController(
      service as unknown as SearchProjectsService,
      auth as unknown as AuthService,
    ),
    service,
  };
}

describe("SearchProjectsController", () => {
  it("returns the project with its ROME appellations", async () => {
    const { controller } = createController();

    expect(await controller.getSearchProject("p1", REQUEST)).toEqual({
      rome: ROME,
      searchProject: { profileId: "p1" },
    });
  });

  it("saves first, then reads the appellations ROMEO just suggested", async () => {
    const { controller, service } = createController();

    expect(
      await controller.saveSearchProject(
        "p1",
        { searchProject: { targetRoles: ["Boulanger"] } },
        REQUEST,
      ),
    ).toEqual({
      rome: ROME,
      searchProject: { profileId: "p1", targetRoles: ["Boulanger"] },
    });
    expect(service.save).toHaveBeenCalledWith("ana@x.fr", "p1", {
      targetRoles: ["Boulanger"],
    });
    expect(service.save.mock.invocationCallOrder[0]).toBeLessThan(
      service.listRome.mock.invocationCallOrder[0]!,
    );
  });

  it("confirms and dismisses an appellation, answering the new list", async () => {
    const { controller, service } = createController();

    expect(
      await controller.confirmRomeAppellation("p1", "38976", REQUEST),
    ).toEqual({ rome: ROME });
    expect(
      await controller.dismissRomeAppellation("p1", "38976", REQUEST),
    ).toEqual({ rome: [] });
    expect(service.confirmRome).toHaveBeenCalledWith("ana@x.fr", "p1", "38976");
    expect(service.dismissRome).toHaveBeenCalledWith("ana@x.fr", "p1", "38976");
  });

  it("prefills without saving", async () => {
    const { controller, service } = createController();

    expect(await controller.prefillSearchProject("p1", REQUEST)).toEqual({
      searchProject: { profileId: "p1", targetRoles: ["x"] },
    });
    expect(service.save).not.toHaveBeenCalled();
  });

  it("refuses every route without a session", async () => {
    const { controller, service } = createController(null);

    for (const call of [
      () => controller.getSearchProject("p1", { headers: {} }),
      () => controller.saveSearchProject("p1", {}, { headers: {} }),
      () => controller.confirmRomeAppellation("p1", "38976", { headers: {} }),
      () => controller.dismissRomeAppellation("p1", "38976", { headers: {} }),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(service.listRome).not.toHaveBeenCalled();
  });
});
