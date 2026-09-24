import { readFileSync, writeFileSync } from "node:fs";
const S = process.argv[2];
const tok = await (await fetch("https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID, client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET, scope: "api_synthese-pages-employeursv1 pages-employeurs-synthese" }) })).json();
const url = "https://api.francetravail.io/partenaire/synthese-pages-employeurs/v1/page-employeur/recherche";
const rows = readFileSync(`${S}/pe-companies.tsv`, "utf8").trim().split("\n").map((l) => l.split("\t"));
const out = [];
for (const [siren, siret, name, legal, dep] of rows) {
  let hit = null, tried = [];
  for (const what of [...new Set([name, legal].filter(Boolean))]) {
    const r = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${tok.access_token}`, accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ where: dep || siret.slice(0, 2), what, pageNumber: 1, pageMaxSize: 10 }) });
    const j = r.ok ? await r.json() : null; tried.push(`${r.status}:${j?.totalResults ?? "-"}`);
    const p = j?.pageEmployeurResults?.map((x) => x.pageEmployeur).find((p) => p.sirenOrSiret?.slice(0, 9) === siren || p.employeur.etablissements.some((e) => e.siret?.startsWith(siren)));
    if (p) { hit = { page: p.page.entete.pageName, auto: p.statutWrapper?.auto, offres: p.offresCount, url: p.urls.find((u) => u.actif)?.urlPath ?? null, accroche: !!p.page.entete.accroche, etabHere: p.employeur.etablissements.some((e) => e.siret === siret) }; break; }
    await new Promise((res) => setTimeout(res, 250));
  }
  out.push({ siren, name, tried, hit }); process.stderr.write(hit ? "+" : ".");
}
writeFileSync(`${S}/pe-cover.json`, JSON.stringify(out, null, 1));
const h = out.filter((o) => o.hit);
console.log(`\ncompanies ${out.length}, with page ${h.length}, edited by employer (auto=false) ${h.filter((o) => o.hit.auto === false).length}, with active url ${h.filter((o) => o.hit.url).length}, with offers ${h.filter((o) => o.hit.offres > 0).length}, with accroche ${h.filter((o) => o.hit.accroche).length}, this establishment listed ${h.filter((o) => o.hit.etabHere).length}`);
console.log("errors:", out.filter((o) => o.tried.some((t) => !t.startsWith("200"))).length);
