import { ConflictException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { ProfilesService } from "../../../profiles/profiles.service";
import type { StoredProfile } from "../../../profiles/profiles.types";
import { assertStorableRegistry } from "../../../profiles/profiles.validation";
import { defineTool } from "../mcp-tool";

export type ProfileWriteDeps = {
  profiles: Pick<ProfilesService, "getRegistry" | "saveRegistry">;
  now?: () => Date;
};

const text = (max: number) => z.string().max(max);

const experienceSchema = z.object({
  company: text(200),
  current: z.boolean().optional(),
  end: text(20).optional().describe("AAAA-MM"),
  period: text(100).describe("Texte affiché, ex. « 2021 – 2024 »"),
  results: text(4000).describe(
    "Missions et résultats chiffrés, une ligne par point",
  ),
  role: text(200),
  start: text(20).optional().describe("AAAA-MM"),
});

const guard = {
  expectedLastSavedAt: z
    .string()
    .nullable()
    .describe(
      "meta.lastSavedAt du profil lu par get_profile : refus si le profil a changé depuis",
    ),
  profileId: text(100),
};

const index = z
  .number()
  .int()
  .min(0)
  .max(99)
  .describe("Position dans sections.experiences (0 = première)");

/**
 * Reads the registry, changes one profile, validates and saves it — the agent
 * never sends a whole registry. Refused when the profile changed since the
 * agent read it, so an edit made in the app meanwhile is not overwritten.
 */
async function mutateProfile(
  deps: ProfileWriteDeps,
  userEmail: string,
  args: { profileId: string; expectedLastSavedAt: string | null },
  mutate: (profile: StoredProfile) => StoredProfile,
) {
  const registry = await deps.profiles.getRegistry(userEmail);
  const position =
    registry?.profiles.findIndex((p) => p.id === args.profileId) ?? -1;

  if (!registry || position < 0) {
    throw new NotFoundException("Profil introuvable.");
  }

  const current = registry.profiles[position];

  if ((current.meta.lastSavedAt ?? null) !== args.expectedLastSavedAt) {
    throw new ConflictException(
      "Le profil a été modifié depuis votre lecture : relisez-le avec get_profile.",
    );
  }

  const changed = mutate(structuredClone(current));
  const lastSavedAt = (deps.now?.() ?? new Date()).toISOString();
  const profiles = [...registry.profiles];
  profiles[position] = { ...changed, meta: { ...changed.meta, lastSavedAt } };
  const next = { ...registry, profiles };

  assertStorableRegistry(next);
  await deps.profiles.saveRegistry(userEmail, next);

  return { lastSavedAt, profile: profiles[position] };
}

function experienceAt(profile: StoredProfile, position: number) {
  if (position >= profile.sections.experiences.length) {
    throw new NotFoundException("Aucune expérience à cette position.");
  }
}

export function profileWriteTools(deps: ProfileWriteDeps) {
  return [
    defineTool({
      description:
        "Modifie une expérience (champs fournis seulement), typiquement pour détailler et chiffrer " +
        "les résultats. N'invente aucun chiffre : demande-les à l'utilisateur.",
      inputSchema: { ...guard, changes: experienceSchema.partial(), index },
      name: "update_experience",
      run: (args, { principal }) =>
        mutateProfile(deps, principal.userEmail, args, (profile) => {
          experienceAt(profile, args.index);
          const experiences = profile.sections.experiences;
          experiences[args.index] = {
            ...experiences[args.index],
            ...args.changes,
          };
          return profile;
        }),
      scopes: ["profile:write"],
      title: "Modifier une expérience",
    }),
    defineTool({
      description:
        "Ajoute une expérience au profil (en tête par défaut, ou à la position donnée).",
      inputSchema: {
        ...guard,
        experience: experienceSchema,
        index: index.optional(),
      },
      name: "add_experience",
      run: (args, { principal }) =>
        mutateProfile(deps, principal.userEmail, args, (profile) => {
          profile.sections.experiences.splice(
            args.index ?? 0,
            0,
            args.experience,
          );
          return profile;
        }),
      scopes: ["profile:write"],
      title: "Ajouter une expérience",
    }),
    defineTool({
      description:
        "Retire une expérience du profil. Demande confirmation à l'utilisateur avant.",
      inputSchema: { ...guard, index },
      name: "remove_experience",
      run: (args, { principal }) =>
        mutateProfile(deps, principal.userEmail, args, (profile) => {
          experienceAt(profile, args.index);
          profile.sections.experiences.splice(args.index, 1);
          return profile;
        }),
      scopes: ["profile:write"],
      title: "Retirer une expérience",
    }),
    defineTool({
      description:
        "Remplace des rubriques du profil (seules celles fournies). Les listes sont remplacées en entier. " +
        "Nom, e-mail et téléphone ne sont pas modifiables par un agent.",
      inputSchema: {
        ...guard,
        certifications: z
          .array(
            z.object({
              date: text(20).optional(),
              issuer: text(200),
              title: text(200),
              year: text(10),
            }),
          )
          .max(50)
          .optional(),
        education: z
          .array(
            z.object({
              date: text(20).optional(),
              degree: text(200),
              description: text(2000),
              honors: text(200),
              institution: text(200),
              year: text(10),
            }),
          )
          .max(30)
          .optional(),
        headline: text(300).optional().describe("Titre du profil"),
        interests: text(1000).optional(),
        languages: z
          .array(z.object({ language: text(60), level: text(60) }))
          .max(20)
          .optional(),
        personalProjects: z
          .array(
            z.object({
              description: text(2000),
              link: text(500),
              title: text(200),
            }),
          )
          .max(30)
          .optional(),
        softSkills: z.array(text(100)).max(50).optional(),
        summary: text(3000).optional().describe("Résumé / accroche"),
        technicalSkills: z.array(text(100)).max(100).optional(),
      },
      name: "update_profile_sections",
      run: (args, { principal }) =>
        mutateProfile(deps, principal.userEmail, args, (profile) => {
          const {
            expectedLastSavedAt: _guard,
            profileId: _id,
            headline,
            ...sections
          } = args;
          const provided = Object.fromEntries(
            Object.entries(sections).filter(([, value]) => value !== undefined),
          );

          return {
            ...profile,
            headline: headline ?? profile.headline,
            sections: { ...profile.sections, ...provided },
          };
        }),
      scopes: ["profile:write"],
      title: "Modifier des rubriques du profil",
    }),
  ];
}
