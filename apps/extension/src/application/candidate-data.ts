import {
  completeProfile,
  IDENTITY_FIELDS,
  profileGaps,
  type FillAnswers,
  type FillProfile,
  type IdentityField,
} from "../domain/fill";
import type { DocumentKind } from "../page/attach";
import type { JobSparkTools } from "./session";

export type ProfileGap = { field: IdentityField; label: string };
export type EncodedDocument = { base64: string; name: string; mime: string };

type ProfileRegistry = {
  activeProfileId: string | null;
  profiles: (FillProfile & { id: string })[];
};

const fileName = (kind: DocumentKind, profile: FillProfile) => {
  const who = `${profile.identity.firstName} ${profile.identity.lastName}`
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim();
  const base = kind === "cv" ? "CV" : "Lettre de motivation";
  return `${who ? `${base} ${who}` : base}.pdf`;
};

export const gapsOf = (profile: FillProfile): ProfileGap[] =>
  profileGaps(profile).map((field) => ({
    field,
    label: IDENTITY_FIELDS[field],
  }));

/**
 * What a fill may use of the candidate, read through MCP: the active profile
 * completed with saved answers, and the prepared documents as PDF. Identity
 * typed in the panel is kept as answers (`answers:write`, no profile write).
 */
export class CandidateData {
  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      download: (url: string) => Promise<{ base64: string; mime: string }>;
    },
  ) {}

  /** The active profile, completed with what the panel collected before. */
  async completedProfile() {
    const profile = await this.activeProfile();
    if (!profile) return null;
    const answers = (await this.deps.tools.call("get_screening_answers", {
      profileId: profile.id,
    })) as FillAnswers;
    return { answers, profile: completeProfile(profile, answers) };
  }

  /** Identity data the profile lacks, to ask in the panel before filling. */
  async gaps(): Promise<ProfileGap[]> {
    const profile = await this.completedProfile().catch(() => null);
    return profile ? gapsOf(profile.profile) : [];
  }

  async keepIdentity(given: Partial<Record<IdentityField, string>>) {
    for (const [field, value] of Object.entries(given)) {
      const answer = value?.trim();
      if (!answer) continue;
      await this.deps.tools.call("save_screening_answer", {
        answer,
        question: IDENTITY_FIELDS[field as IdentityField],
      });
    }
  }

  async document(
    applicationId: string,
    kind: DocumentKind,
    profile: FillProfile,
  ): Promise<EncodedDocument> {
    const link = (await this.deps.tools.call("get_document_download_url", {
      applicationId,
      format: "pdf",
      kind,
    })) as { url: string };
    const file = await this.deps.download(link.url);
    return { ...file, name: fileName(kind, profile) };
  }

  private async activeProfile() {
    const registry = (await this.deps.tools.call(
      "get_profile",
    )) as ProfileRegistry;
    return (
      registry.profiles.find(
        (entry) => entry.id === registry.activeProfileId,
      ) ??
      registry.profiles[0] ??
      null
    );
  }
}
