import {
  AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
  type SearchProject,
} from "@cvforge/types";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import { extractJsonFromContent } from "../cv-generation/cv-generation.normalizers";
import type { StoredProfile } from "../profiles/profiles.types";
import type { JobSourceAdapter } from "./job-search.types";
import type { JobsStore } from "./jobs.types";
import type { NewJobMatch } from "./matches.types";
import type { ScoredJob } from "./matching/job-matching";
import {
  buildRerankUserMessage,
  JOB_RERANK_SYSTEM_PROMPT,
  readRerankResponse,
  toRerankCandidates,
} from "./matching/job-rerank";

/**
 * The steps of a candidate's morning selection, apart from the run that
 * orders them (split from `job-digest.service.ts`, US-124).
 */

/** What one morning run did, kept in `job_digest_runs.stats`. */
export interface DigestStats {
  /** Searches the collection worked from. */
  projects: number;
  /** Companies added to the registry from the adverts' original links. */
  boardsDiscovered: number;
  /** Sources an admin switched off, named rather than silently missing. */
  sourcesSkipped: string[];
  /** Among them, those that also asked for the morning selection. */
  digestProjects: number;
  listingsCollected: number;
  jobsCreated: number;
  boardsRead: number;
  matchesWritten: number;
  candidatesWithoutOffers: number;
  notificationsSent: number;
  aiReranks: number;
  errors: string[];
}

/**
 * Checks the offers are still online before proposing them.
 *
 * A source that cannot answer leaves the offer in place: "we could not
 * check" is not "it is gone", and dropping a live offer on a network blip
 * would be the worse mistake.
 */
export async function keepLiveOnly(
  selected: ScoredJob[],
  deps: {
    jobs: Pick<JobsStore, "findById" | "closeListing">;
    sources: readonly JobSourceAdapter[];
    now: () => number;
  },
): Promise<ScoredJob[]> {
  const live: ScoredJob[] = [];

  for (const entry of selected) {
    const listings = (await deps.jobs.findById(entry.job.id))?.listings ?? [];
    const open = listings.filter((listing) => !listing.closedAt);
    let isOpen = open.length > 0;

    for (const listing of open) {
      const source = deps.sources.find(
        (candidate) => candidate.source === listing.source,
      );
      if (!source) continue;

      const answer = await source.isStillOpen(listing.externalId);
      if (answer === false) {
        await deps.jobs.closeListing(
          listing.source,
          listing.externalId,
          new Date(deps.now()).toISOString(),
        );
        isOpen = open.length > 1;
      }
    }

    if (isOpen) live.push(entry);
  }

  return live;
}

/**
 * The paid pass. Credits are charged **after** the model answered: a failed
 * call must not cost the candidate anything. Throws on any failure; the run
 * falls back on the deterministic order.
 */
export async function rerankSelection(
  input: {
    userEmail: string;
    profile: StoredProfile | null;
    selected: ScoredJob[];
  },
  deps: { credits: CreditsService; openRouter: OpenRouterService },
) {
  const { userEmail, profile, selected } = input;

  await deps.credits.assertSufficientCredits(
    AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
    userEmail,
  );

  const raw = await withOpenRouterHttpErrors(() =>
    deps.openRouter.chat(
      [
        { content: JOB_RERANK_SYSTEM_PROMPT, role: "system" },
        {
          content: buildRerankUserMessage(
            {
              // No name, no contact details: the model is given what the
              // candidate does, never who they are.
              headline: profile?.headline ?? "",
              skills: profile?.sections.technicalSkills ?? [],
              targetRoles: [],
            },
            toRerankCandidates(selected),
          ),
          role: "user",
        },
      ],
      { temperature: 0.2 },
    ),
  );

  const ranked = readRerankResponse(
    extractJsonFromContent<{ classement?: unknown }>(raw),
    selected,
  );

  await deps.credits.consumeCredits({
    action: AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
    userEmail,
  });

  return ranked;
}

export function toNewMatches(input: {
  live: ScoredJob[];
  project: SearchProject;
  ranked: Array<{ id: string; rank: number; reason: string }> | null;
  runDate: string;
  userEmail: string;
}): NewJobMatch[] {
  const byId = new Map(input.ranked?.map((entry) => [entry.id, entry]) ?? []);

  return input.live.map((entry) => {
    const ranking = byId.get(entry.job.id);

    return {
      aiRank: ranking?.rank ?? null,
      aiReason: ranking?.reason || null,
      digestDate: input.runDate,
      jobId: entry.job.id,
      jobSnapshot: entry.job,
      matchedSkills: entry.matchedSkills,
      missingSkills: entry.missingSkills,
      profileId: input.project.profileId,
      score: entry.score,
      scoreBreakdown: entry.breakdown,
      userEmail: input.userEmail,
    };
  });
}
