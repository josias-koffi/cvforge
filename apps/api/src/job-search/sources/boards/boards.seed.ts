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
 * The nine employers added the same day — hotels, laboratories, engineering,
 * retail, luxury, real estate, industry — come from `boards:probe` over 117
 * large French employers of every sector. Only eight passed its identity rule
 * (a board is believed only when a real share of its offers is physically in
 * France), which is the honest yield: these tools are the recruiting stack of
 * scale-ups far more than of the CAC 40.
 *
 * Caveat worth knowing rather than hiding: seven of the boards below currently
 * publish **no offer located in France**, only remote roles — Cursor, Lovable,
 * Poolside, Resend, Sifflet, Swan and Sodexo, whose board serves Australia.
 * They stay because a remote role open to France is worth a candidate's time,
 * and because a board that dies is retired on its own by `recordFetch`.
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
  { boardToken: "accor", companyName: "Accor", provider: "smartrecruiters" },
  { boardToken: "assystem", companyName: "Assystem", provider: "smartrecruiters" },
  { boardToken: "eurofins", companyName: "Eurofins", provider: "smartrecruiters" },
  { boardToken: "galerieslafayette", companyName: "Galeries Lafayette", provider: "smartrecruiters" },
  { boardToken: "kiabi", companyName: "Kiabi", provider: "smartrecruiters" },
  { boardToken: "lvmh", companyName: "LVMH", provider: "smartrecruiters" },
  { boardToken: "nexity", companyName: "Nexity", provider: "smartrecruiters" },
  { boardToken: "saintgobain", companyName: "Saint-Gobain", provider: "smartrecruiters" },
  { boardToken: "Sodexo", companyName: "Sodexo", provider: "smartrecruiters" },
];
