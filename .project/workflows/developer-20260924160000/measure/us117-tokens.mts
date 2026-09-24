import { readFileSync, writeFileSync } from "node:fs";
const S = process.argv[2]!;
const UA = "cvforge-measure/1.0 (US-117)";
const rows = readFileSync(`${S}/us117-sample.tsv`, "utf8").trim().split("\n").map((l) => { const [siret, name, legal] = l.split("\t"); return { siret: siret!, name: name!, legal: legal! }; });
const LEGAL = /\b(sas|sasu|sarl|sa|eurl|sci|scop|selarl|selas|groupe|group|france|atlantique|ouest|nantes|la rochelle|services?|conseil|consulting)\b/gi;
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function slugs(name: string) {
  const w = fold(name).replace(/\(.*?\)/g, " ").replace(LEGAL, " ").split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set([w.join(""), w.join("-")].filter((s) => s.length >= 3))];
}
type Probe = { provider: string; url: (t: string) => string; count: (j: any, text: string) => number };
const PROBES: Probe[] = [
  { provider: "greenhouse", url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`, count: (j) => j?.jobs?.length ?? -1 },
  { provider: "lever", url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`, count: (j) => (Array.isArray(j) ? j.length : -1) },
  { provider: "ashby", url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`, count: (j) => j?.jobs?.length ?? -1 },
  { provider: "smartrecruiters", url: (t) => `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=1`, count: (j) => j?.totalFound ?? -1 },
  { provider: "workable", url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}`, count: (j) => j?.jobs?.length ?? -1 },
  { provider: "recruitee", url: (t) => `https://${t}.recruitee.com/api/offers/`, count: (j) => j?.offers?.length ?? -1 },
  { provider: "personio", url: (t) => `https://${t}.jobs.personio.de/xml`, count: (_j, text) => (text.includes("<workzag-jobs") ? (text.match(/<position>/g) ?? []).length : -1) },
  { provider: "welcomekit", url: (t) => `https://www.welcometothejungle.com/api/v1/organizations/${t}`, count: (j) => (j?.organization ? 1 : -1) },
];
async function probe(p: Probe, token: string) {
  try {
    const r = await fetch(p.url(token), { headers: { "user-agent": UA, accept: "application/json" }, redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (r.status !== 200) return null;
    const text = await r.text(); let j: any = null; try { j = JSON.parse(text); } catch {}
    const n = p.count(j, text);
    return n >= 0 ? { jobs: n, name: j?.name ?? j?.organization?.name ?? j?.content?.[0]?.company?.name ?? "" } : null;
  } catch { return null; }
}
const out: any[] = []; const queue = [...rows];
await Promise.all(Array.from({ length: 4 }, async () => { for (let r = queue.shift(); r; r = queue.shift()) {
  const tokens = [...new Set([...slugs(r.name), ...slugs(r.legal)])]; const hits: any[] = [];
  for (const t of tokens) for (const p of PROBES) { const h = await probe(p, t); if (h) hits.push({ provider: p.provider, token: t, ...h }); }
  out.push({ name: r.name, siret: r.siret, tokens, hits }); process.stderr.write(hits.length ? "+" : ".");
}}));
writeFileSync(`${S}/us117-tokens.json`, JSON.stringify(out, null, 1));
const hit = out.filter((o) => o.hits.length);
console.log(`\ncompanies with a board: ${hit.length}, with >=1 job: ${out.filter((o) => o.hits.some((h: any) => h.jobs > 0)).length}`);
for (const o of hit) console.log(o.name.padEnd(30), JSON.stringify(o.hits));
