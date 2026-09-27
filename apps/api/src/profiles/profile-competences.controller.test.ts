import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import { ProfileCompetencesController } from "./profile-competences.controller";
import type { ProfileCompetencesService } from "./profile-competences.service";
import type { ProfilesService } from "./profiles.service";

const COMPETENCES = [
  { code: "113277", libelle: "Méthode AGILE", score: 0.84, type: "SAVOIR" },
];
const REQUEST = { headers: { cookie: "session=1" } };

function createController(
  session: { email: string } | null = { email: "ana@x.fr" },
  owns = true,
) {
  const competences = {
    dismiss: vi.fn(async () => []),
    list: vi.fn(async () => COMPETENCES),
  };
  const profiles = {
    findProfile: vi.fn(async () => (owns ? { id: "p1" } : null)),
  };
  const auth = { readSessionFromCookieHeader: vi.fn(() => session) };

  return {
    competences,
    controller: new ProfileCompetencesController(
      competences as unknown as ProfileCompetencesService,
      profiles as unknown as ProfilesService,
      auth as unknown as AuthService,
    ),
    profiles,
  };
}

describe("ProfileCompetencesController", () => {
  it("lists the competences of the candidate's own profile", async () => {
    const { controller, profiles } = createController();

    expect(await controller.listCompetences("p1", REQUEST)).toEqual({
      competences: COMPETENCES,
    });
    expect(profiles.findProfile).toHaveBeenCalledWith("ana@x.fr", "p1");
  });

  it("removes one, and answers the list left", async () => {
    const { competences, controller } = createController();

    expect(await controller.dismissCompetence("p1", "113277", REQUEST)).toEqual(
      { competences: [] },
    );
    expect(competences.dismiss).toHaveBeenCalledWith(
      "ana@x.fr",
      "p1",
      "113277",
    );
  });

  it("refuses without a session, and on someone else's profile", async () => {
    await expect(
      createController(null).controller.listCompetences("p1", REQUEST),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const { competences, controller } = createController(undefined, false);
    await expect(
      controller.dismissCompetence("p1", "113277", REQUEST),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(competences.dismiss).not.toHaveBeenCalled();
  });
});
