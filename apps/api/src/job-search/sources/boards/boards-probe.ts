import type { NormalizedJobListing } from "../../job-search.types";
import type { BoardsService } from "../../boards.service";
import type { BoardProvider } from "./detect-board";
import type { CompanyBoardAdapter } from "./board.types";

export interface ProbeHit {
  provider: BoardProvider;
  boardToken: string;
  companyName: string;
  listingCount: number;
  /** How many of them are physically located in France. */
  frenchCount: number;
}

export interface ProbeReport {
  probed: number;
  hits: ProbeHit[];
  registered: number;
}

/**
 * Finding a company's job board from its name alone.
 *
 * These boards live at a guessable address — `greenhouse.io/acme`,
 * `jobs.lever.co/acme` — so a name can be turned into candidate tokens and
 * each one tried. The danger is that the address exists and belongs to
 * **somebody else**: `ashbyhq.com/vinci` is an AI startup in Palo Alto, not
 * the construction group, and `greenhouse.io/air` is a company in Virginia.
 * Both answer 200 with real offers.
 *
 * Hence the acceptance rule below, which is the whole design: a board is kept
 * only when a real share of its offers is **physically in France**. Measured
 * on the impostors above — 0 French offers out of 9, 2 out of 27 — against
 * the genuine ones — 49 out of 60, 46 out of 60, 81 out of 83.
 *
 * It complements the Common Crawl discovery rather than replacing it: that
 * one finds companies nobody thought of, this one answers "is this employer,
 * whose name we already have, reachable?" — which is the question our own
 * offer base keeps asking.
 */

/** Words that belong to a legal name, never to a board address. */
const LEGAL_NOISE =
  /\b(sa|sas|sasu|sarl|eurl|snc|scop|sci|group|groupe|france|holding|international|company|societe)\b/g;

/**
 * Several spellings per company, cheapest first.
 *
 * "Fnac Darty" is `fnacdarty`, `fnac-darty` or plain `fnac` depending on the
 * provider, and nothing but trying says which. The list stays short: each
 * extra spelling costs one outbound call per provider.
 */
export function tokenCandidates(companyName: string): string[] {
  const folded = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, " ")
    .trim();

  if (!folded) return [];

  const trimmed = folded.replace(LEGAL_NOISE, " ").replace(/\s+/g, " ").trim();
  const words = (trimmed || folded).split(" ").filter(Boolean);

  return [
    ...new Set(
      [
        words.join(""),
        words.join("-"),
        words[0],
        // The original casing: SmartRecruiters addresses are capitalised.
        companyName.replace(/\s+/g, ""),
      ]
        .map((candidate) => candidate?.trim() ?? "")
        .filter((candidate) => candidate.length >= 3),
    ),
  ];
}

/**
 * How much of a board has to be in France for the name to be believed.
 *
 * A share alone would accept a one-offer board on a fluke; a count alone would
 * accept a foreign company with a Paris office, which is exactly how the wrong
 * "Vinci" got in. Both together separated every case measured on 2026-09-23.
 */
const MIN_FRENCH_LISTINGS = 3;
const MIN_FRENCH_SHARE = 0.25;

/**
 * The first board that answers as this company, or nothing.
 *
 * Stops at the first hit: a company publishes on one tool, and probing the
 * others would only spend requests. A board answering with nothing, or with
 * offers that are not in France, is not a hit — several large groups keep an
 * empty address alive, and a homonym abroad is worse than silence: its offers
 * would be filed under a name candidates recognise.
 */
export async function probeCompany(
  companyName: string,
  adapters: readonly CompanyBoardAdapter[],
  tokens: readonly string[] = tokenCandidates(companyName),
): Promise<ProbeHit | null> {
  for (const boardToken of tokens) {
    for (const adapter of adapters) {
      const listings = await safeFetch(adapter, boardToken);
      const frenchCount = listings.filter(
        (listing) => listing.department !== "",
      ).length;

      if (isThisCompany(listings.length, frenchCount)) {
        return {
          boardToken,
          companyName,
          frenchCount,
          listingCount: listings.length,
          provider: adapter.provider,
        };
      }
    }
  }

  return null;
}

export function isThisCompany(total: number, frenchCount: number): boolean {
  return (
    frenchCount >= MIN_FRENCH_LISTINGS &&
    frenchCount / Math.max(total, 1) >= MIN_FRENCH_SHARE
  );
}

/**
 * Probes a list of employers and registers the ones that answered.
 *
 * `onProgress` exists because this is a command a human watches: a hundred
 * companies take minutes, and a silent terminal is indistinguishable from a
 * hung one.
 */
export async function probeCompanies(
  companyNames: readonly string[],
  adapters: readonly CompanyBoardAdapter[],
  boards: Pick<BoardsService, "register"> | null,
  onProgress: (companyName: string, hit: ProbeHit | null) => void = () => {},
): Promise<ProbeReport> {
  const report: ProbeReport = { hits: [], probed: 0, registered: 0 };
  const seen = new Set<string>();

  for (const companyName of companyNames) {
    const key = companyName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    report.probed += 1;
    const hit = await probeCompany(companyName, adapters);
    onProgress(companyName, hit);

    if (!hit) continue;

    report.hits.push(hit);

    if (
      boards &&
      (await boards.register({
        boardToken: hit.boardToken,
        companyName: hit.companyName,
        origin: "probe",
        provider: hit.provider,
      }))
    ) {
      report.registered += 1;
    }
  }

  return report;
}

/** A board that cannot be read is not a board: 404s are the normal answer here. */
async function safeFetch(
  adapter: CompanyBoardAdapter,
  boardToken: string,
): Promise<NormalizedJobListing[]> {
  try {
    return await adapter.fetchBoard(boardToken);
  } catch {
    return [];
  }
}
