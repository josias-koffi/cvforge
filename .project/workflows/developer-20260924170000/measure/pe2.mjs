const tok = await (await fetch("https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID, client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET, scope: "api_synthese-pages-employeursv1 pages-employeurs-synthese" }) })).json();
const url = "https://api.francetravail.io/partenaire/synthese-pages-employeurs/v1/page-employeur/recherche";
for (const b of JSON.parse(process.argv[2])) {
  const r = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${tok.access_token}`, accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(b) });
  const t = await r.text(); let s = t.slice(0, 160);
  try { const j = JSON.parse(t); if (j.pageEmployeurResults) s = `total=${j.totalResults} n=${j.pageEmployeurResults.length} ` + j.pageEmployeurResults.slice(0, 3).map((x) => `${x.pageEmployeur.page.entete.pageName}/${x.pageEmployeur.sirenOrSiret}/offres=${x.pageEmployeur.offresCount}/etabs=${x.pageEmployeur.employeur.etablissements.length}`).join(" | "); } catch {}
  const rl = [...r.headers].filter(([k]) => /rate|limit/i.test(k)).map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(r.status, (t.length/1024).toFixed(0)+"k", JSON.stringify(b), "\n   ", s, rl ? "\n    " + rl : "");
  await new Promise((res) => setTimeout(res, 700));
}
