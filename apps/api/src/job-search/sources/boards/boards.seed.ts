import type { BoardProvider } from "./detect-board";

export interface SeededBoard {
  provider: BoardProvider;
  boardToken: string;
  companyName: string;
}

/**
 * The companies shipped with the code, so a fresh instance collects something
 * other than France Travail on its very first run.
 *
 * Every token below was checked against its provider's public API on
 * 2026-09-23 and kept **only** when the board published at least one offer in
 * France or fully remote — the rule the Common Crawl discovery already
 * applies. None was guessed: two thirds of the plausible candidates answered
 * 404, and three large French groups answered with an empty board.
 *
 * A company that later closes its board is retired by `recordFetch` like any
 * other, so this list needs no maintenance to stay harmless. It is a starting
 * point, not a catalogue: the registry then grows by itself from the adverts'
 * original links.
 *
 * Written in TypeScript rather than JSON on purpose — a mistyped provider
 * fails the build, and no data file has to be copied into the image.
 */
export const SEEDED_BOARDS: readonly SeededBoard[] = [
  { boardToken: "cursor", companyName: "Cursor", provider: "ashby" },
  { boardToken: "dust", companyName: "Dust", provider: "ashby" },
  { boardToken: "finary", companyName: "Finary", provider: "ashby" },
  { boardToken: "ledger", companyName: "Ledger", provider: "ashby" },
  { boardToken: "lovable", companyName: "Lovable", provider: "ashby" },
  { boardToken: "photoroom", companyName: "PhotoRoom", provider: "ashby" },
  { boardToken: "poolside", companyName: "Poolside", provider: "ashby" },
  { boardToken: "resend", companyName: "Resend", provider: "ashby" },
  { boardToken: "sifflet", companyName: "Sifflet", provider: "ashby" },
  { boardToken: "swan", companyName: "Swan", provider: "ashby" },
  { boardToken: "algolia", companyName: "Algolia", provider: "greenhouse" },
  { boardToken: "dataiku", companyName: "Dataiku", provider: "greenhouse" },
  { boardToken: "doctolib", companyName: "Doctolib", provider: "greenhouse" },
  { boardToken: "mirakl", companyName: "Mirakl", provider: "greenhouse" },
  { boardToken: "360learning", companyName: "360Learning", provider: "lever" },
  { boardToken: "agicap", companyName: "Agicap", provider: "lever" },
  { boardToken: "aircall", companyName: "Aircall", provider: "lever" },
  { boardToken: "qonto", companyName: "Qonto", provider: "lever" },
  { boardToken: "swile", companyName: "Swile", provider: "lever" },
  { boardToken: "vestiairecollective", companyName: "Vestiaire Collective", provider: "lever" },
  { boardToken: "younited", companyName: "Younited", provider: "lever" },
  { boardToken: "Sodexo", companyName: "Sodexo", provider: "smartrecruiters" },
];
