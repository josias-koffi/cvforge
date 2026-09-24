import { readFileSync, writeFileSync } from "node:fs";
import * as boards from "/home/devops/perso/projets/cvforge/apps/api/src/job-search/sources/boards/detect-board.ts";
const detectAtsBoard: (u: string) => { provider: string; boardToken: string } | null = (boards as any).detectAtsBoard ?? (boards as any).default.detectAtsBoard;

const S = process.argv[2]!;
const UA = "cvforge-measure/1.0 (US-117, one-off yield measurement)";
const rows = readFileSync(`${S}/us117-sample.tsv`, "utf8").trim().split("\n").map((l) => {
  const [siret, name, legal, naf, headcount, city] = l.split("\t");
  return { siret: siret!, name: name!, legal: legal!, naf: naf!, headcount, city };
});

/** Other ATS seen in France, not handled by detectAtsBoard: counted for the decision only. */
const OTHER_ATS: Array<[string, RegExp]> = [
  ["teamtailor", /teamtailor\.com/i], ["welcometothejungle", /welcometothejungle\.com/i],
  ["workday", /myworkdayjobs\.com|workday\.com/i], ["talentsoft/cegid", /talent-soft\.com|talentsoft|cegid\.com\/.*recrut/i],
  ["flatchr", /flatchr\.io/i], ["taleez", /taleez\.com/i], ["jobaffinity", /jobaffinity\.fr/i],
  ["digitalrecruiters", /digitalrecruiters\.com/i], ["softy", /softy\.pro/i], ["beetween", /beetween\.com/i],
  ["werecruit", /werecruit\.io/i], ["successfactors", /successfactors|jobs\.sap\.com/i], ["taleo", /taleo\.net/i],
  ["cornerstone", /csod\.com/i], ["icims", /icims\.com/i], ["jobvite", /jobvite\.com/i], ["breezy", /breezy\.hr/i],
  ["hellowork", /hellowork\.com/i], ["indeed", /indeed\.com|indeed\.fr/i], ["linkedin-jobs", /linkedin\.com\/(jobs|company\/[^"']+\/jobs)/i],
  ["jobteaser", /jobteaser\.com/i], ["talentview/altays", /altays-progiciels|talentview/i], ["zohorecruit", /zohorecruit/i],
];
const CAREER = /carri[eè]re|recrut|emploi|offres|jobs?\b|careers?|rejoindre|join|talent/i;
const PARKED = /domain (is )?for sale|ce nom de domaine|parking|sedoparking|godaddy|site en construction|coming soon|index of \//i;
const LEGAL = /\b(sas|sasu|sarl|sa|eurl|sci|scop|selarl|selas|groupe|group|france|atlantique|ouest|nantes|la rochelle)\b/gi;

async function get(url: string, ms = 8000): Promise<{ url: string; html: string } | null> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return { html: (await r.text()).slice(0, 600_000), url: r.url };
  } catch { return null; }
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function tokens(name: string) {
  return fold(name).replace(LEGAL, " ").split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
}
function slugs(name: string) {
  const words = fold(name).replace(/\(.*?\)/g, " ").replace(LEGAL, " ").split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return [];
  const set = new Set([words.join(""), words.join("-"), words[0]!.length >= 4 ? words[0]! : ""].filter((s) => s.length >= 3));
  return [...set];
}
function looksLike(html: string, name: string) {
  const text = fold(html.slice(0, 200_000));
  if (PARKED.test(text)) return false;
  const t = tokens(name);
  return t.length > 0 && t.some((tok) => text.includes(tok));
}
function links(html: string, base: string) {
  const out: Array<{ href: string; text: string }> = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    try { out.push({ href: new URL(m[1]!, base).toString(), text: m[2]!.replace(/<[^>]+>/g, " ") }); } catch {}
  }
  for (const m of html.matchAll(/(?:src|href|data-src)=["'](https?:\/\/[^"']+)["']/gi)) out.push({ href: m[1]!, text: "" });
  for (const m of html.matchAll(/https?:\/\/[a-z0-9.-]+\.(?:greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com|recruitee\.com|personio\.(?:de|com|eu)|welcomekit\.co)[^"'\s<>)]*/gi)) out.push({ href: m[0], text: "" });
  return out;
}
function ats(html: string, base: string) {
  const supported = new Set<string>(); const other = new Set<string>();
  for (const l of links(html, base)) {
    const d = detectAtsBoard(l.href); if (d?.boardToken) supported.add(`${d.provider}:${d.boardToken}`);
  }
  for (const [n, re] of OTHER_ATS) if (re.test(html)) other.add(n);
  return { other: [...other], supported: [...supported] };
}

async function wikidata(sirens: string[]) {
  const q = `SELECT ?siren ?site WHERE { VALUES ?siren { ${sirens.map((s) => `"${s}"`).join(" ")} } ?i wdt:P1616 ?siren; wdt:P856 ?site. }`;
  const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { headers: { "user-agent": UA, accept: "application/sparql-results+json" } });
  const j = (await r.json()) as { results: { bindings: Array<{ siren: { value: string }; site: { value: string } }> } };
  return new Map(j.results.bindings.map((b) => [b.siren.value, b.site.value]));
}

async function measure(row: (typeof rows)[number], wd: Map<string, string>) {
  const res: Record<string, unknown> = { siret: row.siret, name: row.name, naf: row.naf, headcount: row.headcount };
  let home: { url: string; html: string } | null = null;
  const w = wd.get(row.siret.slice(0, 9));
  if (w) { home = await get(w); if (home) res.siteVia = "wikidata"; }
  if (!home) {
    outer: for (const name of [...new Set([row.name, row.legal].filter(Boolean))]) {
      for (const slug of slugs(name)) for (const tld of ["fr", "com"]) {
        const page = await get(`https://www.${slug}.${tld}/`, 6000);
        if (page && looksLike(page.html, name)) { home = page; res.siteVia = `guess:${slug}.${tld}`; break outer; }
      }
    }
  }
  if (!home) return { ...res, step: "no_site" };
  res.site = home.url;
  const found = ats(home.html, home.url);
  let careerUrl: string | null = null;
  if (found.supported.length === 0) {
    const origin = new URL(home.url).origin;
    const candidates = links(home.html, home.url).filter((l) => CAREER.test(l.href) || CAREER.test(l.text)).map((l) => l.href).filter((h) => !/linkedin|facebook|twitter|instagram|youtube|\.pdf$/i.test(h));
    const tries = [...new Set(candidates)].slice(0, 3);
    if (tries.length === 0) tries.push(`${origin}/recrutement`, `${origin}/carrieres`, `${origin}/nous-rejoindre`);
    for (const t of tries) {
      if (detectAtsBoard(t)?.boardToken) { found.supported.push(`${detectAtsBoard(t)!.provider}:${detectAtsBoard(t)!.boardToken}`); careerUrl = t; break; }
      const page = await get(t, 6000); if (!page) continue;
      const a = ats(page.html, page.url);
      careerUrl ??= page.url;
      found.supported.push(...a.supported); found.other.push(...a.other.filter((o) => !found.other.includes(o)));
      if (a.supported.length > 0) { careerUrl = page.url; break; }
    }
  }
  return { ...res, career: careerUrl, other: found.other, step: found.supported.length ? "ats" : careerUrl ? "career_no_ats" : "site_no_career", supported: [...new Set(found.supported)] };
}

const wd = await wikidata(rows.map((r) => r.siret.slice(0, 9)));
const out: unknown[] = [];
const queue = [...rows];
await Promise.all(Array.from({ length: 5 }, async () => { for (let r = queue.shift(); r; r = queue.shift()) { out.push(await measure(r, wd)); process.stderr.write("."); } }));
writeFileSync(`${S}/us117-results.json`, JSON.stringify(out, null, 1));
const by = (k: string) => out.filter((o: any) => o.step === k).length;
console.log(`\nwikidata sites: ${wd.size}`);
console.log({ ats: by("ats"), career_no_ats: by("career_no_ats"), no_site: by("no_site"), site_no_career: by("site_no_career") });
