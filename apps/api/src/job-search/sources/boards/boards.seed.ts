import type { BoardProvider } from "./detect-board";
import { WORKDAY_COMPANIES } from "./workday.config";

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
 * **Second batch, 2026-11-04**: 90 mid-size French employers (ETI, large
 * PME, scale-ups) found by probing about 1 800 company names against the
 * providers' public APIs, kept under the same identity rule (at least three
 * offers in France and a quarter of the board, or the token equals a known
 * French company's name). Homonyms were rejected by hand — `recruitee/picard`
 * is a German firm, `ashby/vinci` an American start-up. Qonto moved from Lever
 * to Ashby; its old Lever board answers empty and retires itself.
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
  { boardToken: "akur8", companyName: "Akur8", provider: "ashby" },
  { boardToken: "alan", companyName: "Alan", provider: "ashby" },
  { boardToken: "ami", companyName: "AMI Labs", provider: "ashby" },
  { boardToken: "ankorstore", companyName: "Ankorstore", provider: "ashby" },
  { boardToken: "backmarket", companyName: "Back Market", provider: "ashby" },
  { boardToken: "cursor", companyName: "Cursor", provider: "ashby" },
  { boardToken: "doctolib", companyName: "Doctolib", provider: "ashby" },
  { boardToken: "dust", companyName: "Dust", provider: "ashby" },
  { boardToken: "finary", companyName: "Finary", provider: "ashby" },
  { boardToken: "hcompany", companyName: "H Company", provider: "ashby" },
  { boardToken: "hexa", companyName: "Hexa", provider: "ashby" },
  { boardToken: "joko", companyName: "Joko", provider: "ashby" },
  { boardToken: "ledger", companyName: "Ledger", provider: "ashby" },
  { boardToken: "lemlist", companyName: "Lemlist", provider: "ashby" },
  { boardToken: "lovable", companyName: "Lovable", provider: "ashby" },
  { boardToken: "nabla", companyName: "Nabla", provider: "ashby" },
  { boardToken: "owkin", companyName: "Owkin", provider: "ashby" },
  { boardToken: "pennylane", companyName: "Pennylane", provider: "ashby" },
  { boardToken: "photoroom", companyName: "PhotoRoom", provider: "ashby" },
  { boardToken: "poolside", companyName: "Poolside", provider: "ashby" },
  { boardToken: "qonto", companyName: "Qonto", provider: "ashby" },
  { boardToken: "resend", companyName: "Resend", provider: "ashby" },
  { boardToken: "seloger", companyName: "Seloger", provider: "ashby" },
  { boardToken: "seyna", companyName: "Seyna", provider: "ashby" },
  { boardToken: "sifflet", companyName: "Sifflet", provider: "ashby" },
  { boardToken: "sorare", companyName: "Sorare", provider: "ashby" },
  { boardToken: "swan", companyName: "Swan", provider: "ashby" },
  { boardToken: "voodoo", companyName: "Voodoo", provider: "ashby" },
  { boardToken: "yubo", companyName: "Yubo", provider: "ashby" },
  { boardToken: "algolia", companyName: "Algolia", provider: "greenhouse" },
  { boardToken: "dataiku", companyName: "Dataiku", provider: "greenhouse" },
  { boardToken: "dim", companyName: "DIM", provider: "greenhouse" },
  { boardToken: "ivalua", companyName: "Ivalua", provider: "greenhouse" },
  { boardToken: "mirakl", companyName: "Mirakl", provider: "greenhouse" },
  { boardToken: "ouihelp", companyName: "OuiHelp", provider: "greenhouse" },
  { boardToken: "platformsh", companyName: "Upsun Platform.sh", provider: "greenhouse" },
  { boardToken: "shifttechnology", companyName: "Shift Technology", provider: "greenhouse" },
  { boardToken: "360learning", companyName: "360Learning", provider: "lever" },
  { boardToken: "agicap", companyName: "Agicap", provider: "lever" },
  { boardToken: "alice-bob", companyName: "Alice & Bob", provider: "lever" },
  { boardToken: "bigblue", companyName: "Bigblue", provider: "lever" },
  { boardToken: "blablacar", companyName: "BlaBlaCar", provider: "lever" },
  { boardToken: "brevo", companyName: "Brevo", provider: "lever" },
  { boardToken: "contentsquare", companyName: "Contentsquare", provider: "lever" },
  { boardToken: "didomi", companyName: "Didomi", provider: "lever" },
  { boardToken: "doctrine", companyName: "Doctrine", provider: "lever" },
  { boardToken: "ekimetrics", companyName: "Ekimetrics", provider: "lever" },
  { boardToken: "equativ", companyName: "Equativ", provider: "lever" },
  { boardToken: "heetch", companyName: "Heetch", provider: "lever" },
  { boardToken: "ippon", companyName: "Ippon Technologies", provider: "lever" },
  { boardToken: "loftorbital", companyName: "Loft Orbital", provider: "lever" },
  { boardToken: "malt", companyName: "Malt", provider: "lever" },
  { boardToken: "ogury", companyName: "Ogury", provider: "lever" },
  { boardToken: "pigment", companyName: "Pigment", provider: "lever" },
  { boardToken: "qonto", companyName: "Qonto", provider: "lever" },
  { boardToken: "scaleway", companyName: "Scaleway", provider: "lever" },
  { boardToken: "sfeir", companyName: "Sfeir", provider: "lever" },
  { boardToken: "swile", companyName: "Swile", provider: "lever" },
  { boardToken: "theodo", companyName: "Theodo", provider: "lever" },
  { boardToken: "veepee", companyName: "Veepee", provider: "lever" },
  { boardToken: "verkor", companyName: "Verkor", provider: "lever" },
  { boardToken: "vestiairecollective", companyName: "Vestiaire Collective", provider: "lever" },
  { boardToken: "winamax", companyName: "Winamax", provider: "lever" },
  { boardToken: "younited", companyName: "Younited", provider: "lever" },
  { boardToken: "aubay", companyName: "Aubay", provider: "recruitee" },
  { boardToken: "Sodexo", companyName: "Sodexo", provider: "smartrecruiters" },
  { boardToken: "accor", companyName: "Accor", provider: "smartrecruiters" },
  { boardToken: "akuo", companyName: "Akuo Energy", provider: "smartrecruiters" },
  { boardToken: "altarea", companyName: "Altarea", provider: "smartrecruiters" },
  { boardToken: "artelia", companyName: "Artelia", provider: "smartrecruiters" },
  { boardToken: "assystem", companyName: "Assystem", provider: "smartrecruiters" },
  { boardToken: "barriere", companyName: "Hôtels Barrière", provider: "smartrecruiters" },
  { boardToken: "believe", companyName: "Believe", provider: "smartrecruiters" },
  { boardToken: "biogaran", companyName: "Biogaran", provider: "smartrecruiters" },
  { boardToken: "boulanger", companyName: "Boulanger", provider: "smartrecruiters" },
  { boardToken: "bricomarche", companyName: "Bricomarché", provider: "smartrecruiters" },
  { boardToken: "conforama", companyName: "Conforama", provider: "smartrecruiters" },
  { boardToken: "courir", companyName: "Courir", provider: "smartrecruiters" },
  { boardToken: "darty", companyName: "Darty", provider: "smartrecruiters" },
  { boardToken: "dentego", companyName: "Dentego", provider: "smartrecruiters" },
  { boardToken: "devoteam", companyName: "Devoteam", provider: "smartrecruiters" },
  { boardToken: "digitalcampus", companyName: "Digital Campus", provider: "smartrecruiters" },
  { boardToken: "dontnod", companyName: "Don't Nod", provider: "smartrecruiters" },
  { boardToken: "ecovadis", companyName: "Ecovadis", provider: "smartrecruiters" },
  { boardToken: "eurofins", companyName: "Eurofins", provider: "smartrecruiters" },
  { boardToken: "flowdesk", companyName: "Flowdesk", provider: "smartrecruiters" },
  { boardToken: "free2move", companyName: "Free2Move", provider: "smartrecruiters" },
  { boardToken: "galerieslafayette", companyName: "Galeries Lafayette", provider: "smartrecruiters" },
  { boardToken: "gameloft", companyName: "Gameloft", provider: "smartrecruiters" },
  { boardToken: "intermarche", companyName: "Intermarché", provider: "smartrecruiters" },
  { boardToken: "julhietsterwen", companyName: "Julhiet Sterwen", provider: "smartrecruiters" },
  { boardToken: "kaufmanbroad", companyName: "Kaufman Broad", provider: "smartrecruiters" },
  { boardToken: "kiabi", companyName: "Kiabi", provider: "smartrecruiters" },
  { boardToken: "lesaffre", companyName: "Lesaffre", provider: "smartrecruiters" },
  { boardToken: "lvmh", companyName: "LVMH", provider: "smartrecruiters" },
  { boardToken: "mazars", companyName: "Mazars France", provider: "smartrecruiters" },
  { boardToken: "mediaparticipations", companyName: "Média Participations", provider: "smartrecruiters" },
  { boardToken: "meilleurtaux", companyName: "Meilleurtaux", provider: "smartrecruiters" },
  { boardToken: "netatmo", companyName: "Netatmo", provider: "smartrecruiters" },
  { boardToken: "nexity", companyName: "Nexity", provider: "smartrecruiters" },
  { boardToken: "nexton", companyName: "Nexton", provider: "smartrecruiters" },
  { boardToken: "octotechnology", companyName: "Octo Technology", provider: "smartrecruiters" },
  { boardToken: "saintgobain", companyName: "Saint-Gobain", provider: "smartrecruiters" },
  { boardToken: "salomon", companyName: "Salomon", provider: "smartrecruiters" },
  { boardToken: "segulatechnologies", companyName: "Segula Technologies", provider: "smartrecruiters" },
  { boardToken: "shippeo", companyName: "Shippeo", provider: "smartrecruiters" },
  { boardToken: "sisley", companyName: "Sisley", provider: "smartrecruiters" },
  { boardToken: "smcp", companyName: "SMCP", provider: "smartrecruiters" },
  { boardToken: "socotec", companyName: "Socotec", provider: "smartrecruiters" },
  { boardToken: "somfygroup", companyName: "Somfy Group", provider: "smartrecruiters" },
  { boardToken: "spie-batignolles", companyName: "Spie Batignolles", provider: "smartrecruiters" },
  { boardToken: "talan", companyName: "Talan", provider: "smartrecruiters" },
  { boardToken: "tenergie", companyName: "Tenergie", provider: "smartrecruiters" },
  { boardToken: "thrustme", companyName: "ThrustMe", provider: "smartrecruiters" },
  { boardToken: "vandemoortele", companyName: "Vandemoortele France", provider: "smartrecruiters" },
  { boardToken: "vetoquinol", companyName: "Vetoquinol", provider: "smartrecruiters" },
  { boardToken: "yespark", companyName: "Yespark", provider: "smartrecruiters" },
  { boardToken: "huggingface", companyName: "Hugging Face", provider: "workable" },
  // Workday has a closed list of its own, checked company by company.
  ...WORKDAY_COMPANIES.map(({ companyName, token }) => ({
    boardToken: token,
    companyName,
    provider: "workday" as const,
  })),
];
