---
tags: [run/analyze-design-dev-review-20260924211657, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924211657/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924211657/02-design]]"
---
### Verdict: PASS
### Constat
`market_stats` ne couvre que les couples (métier, département) des projets de recherche : 25 lignes en dev. Un outil public tombera donc souvent sur un couple jamais lu. Appeler France Travail pendant la requête est interdit par le critère.
### Décision — la demande publique alimente la collecte
- Un couple manquant est **noté** dans `market_demand` : code ROME, département, date de la demande.
- Le rafraîchissement horaire lit ces couples après ceux des candidats, avec les demandeurs d'emploi, sur 90 jours de demande.
- La réponse dit `collecting` : « chiffres en cours de collecte ». Le CTA reste proposé.
- Coût borné :
  - codes ROME validés dans le référentiel local ;
  - départements validés ;
  - rate limit par IP ;
  - au plus environ 600 métiers × 101 départements.
### Tranche 1 — API (`public/job-market`)
- `GET appellations?q=` : autocomplétion lue dans la copie locale, sans session.
- `GET ?appellation=&department=` renvoie :
  - le métier (appellation → métier) ;
  - le département et son libellé ;
  - l'état `ready` ou `collecting` ;
  - tension, offres (trimestre et 12 mois), demandeurs ;
  - salaire ou `null`, avec `salaryMinSample` = 5 (`MIN_SALARY_SAMPLE`, exporté) ;
  - `refreshedAt`.
- `POST lead` (email, consentement, appellation, département) → `LeadCaptureService`. L'intention `job_search` porte désormais `appellationCode`, pas un code métier : c'est l'appellation que le projet confirme. L'intention n'avait encore aucun usage.
- Au clic sur le lien, un écouteur `onLeadIntent` écrit dans le profil actif. Sans profil, il crée « Profil principal » vide. Il ajoute ensuite :
  - le département au projet ;
  - l'appellation confirmée ;
  - l'intitulé dans les postes visés ;
  - `digestEnabled` et `emailEnabled` à vrai.

  Aucun appel ROMEO. Un projet existant n'est complété que sur ces champs. Redirection vers `/ma-recherche`.
- **Activation** : `search_projects.lead_origin` = `job_market`, lu par `/admin/metrics`.
- **Rate limit** :
  - `job-market-lead` : strict, car la route envoie un mail ;
  - `job-market` : large, pour l'autocomplétion, avec un plafond global de lignes.
- **Codes publics** : `ROME_APPELLATION_UNKNOWN` et `DEPARTMENT_UNKNOWN`.
### Tranche 2 — landing
Page FR/EN, BFF GET + POST, outil `job_market` dans le registre, événements, sitemap.
### Critères testables
- 0 appel France Travail : le module n'importe pas `FranceTravailModule`, et un espion sur `fetch` le vérifie.
- Salaire masqué sous 5.
- Demande notée puis lue par `wantedTargets`.
- Projet pré-rempli au clic, digest activé.
