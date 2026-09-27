---
tags: [run/analyze-design-dev-review-20260924211657, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924211657/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924211657/04-review]]"
---
### Verdict: PASS
### Tranche 1 — API
- **`packages/types`** :
  - `departments.ts` est déplacé depuis `apps/api/src/market`, plus `frenchDepartments` et `isFrenchDepartment`. La landing s'en sert, sans copie.
  - `PublicJobMarketResponse` et `MARKET_MIN_SALARY_SAMPLE` (5, partagé avec `medianSalary`).
  - Outil `job_market`.
  - Codes `ROME_APPELLATION_UNKNOWN` et `DEPARTMENT_UNKNOWN`.
  - L'intention `job_search` porte `appellationCode`, avec le chemin `/ma-recherche`.
- **Migration 0043** (écrite à la main, comme 0042) :
  - table `market_demand` ;
  - colonnes `search_projects.lead_origin` et `lead_origin_at`.
- **Radar** :
  - `MarketStatsService.lookup` lit la copie. Un couple jamais lu est mis en file ; aucun appel.
  - `wantedTargets` ajoute les couples demandés depuis moins de 90 jours, après ceux des candidats, avec les demandeurs d'emploi.
- **Module `job-market/`** :
  - `GET public/job-market/appellations` ;
  - `GET public/job-market` ;
  - `POST public/job-market/lead` (202, réponse identique que le compte existe ou non).
- **Redémption du lien** : `LeadJobSearchListener` → `SearchProjectLeadService`.
  - Crée un profil vide si l'utilisateur n'en a aucun.
  - Confirme l'appellation.
  - Ajoute le département et l'intitulé ; active `digestEnabled` et `emailEnabled`.
  - Enregistre `lead_origin`.
  - Sans ROMEO. N'ajoute que ce qui manque.
- **Rate limit** : politiques `job-market` et `job-market-lead` (ADR-022, amendement quater).
- **Correctif** : le middleware comptait deux fois les routes `…/lead` et `…/unlock`, qui correspondent à deux routes déclarées. Une requête marquée n'est plus comptée qu'une fois.
- **Métriques** : `readJobMarketActivations`, avec le libellé dans l'admin web.
### Tranche 2 — landing
- Page `/fr/metier-recrute` · `/en/job-market` : redirections, réécriture, `pageMetadata`, sitemap via `freeTools`, carte du hub.
- `relayQuery` (GET ; seuls les paramètres nommés sont relayés) et trois routes BFF.
- `AppellationCombobox` (ARIA, clavier dans `combobox-keys.ts`), `JobMarketTool`, `JobMarketResult`, `job-market-figures`.
- Dictionnaires FR/EN, deux libellés d'erreur.
### Vérification réelle
- **API sur le port 3998** :
  - « Comptable / 44 » renvoie `ready` avec un salaire sur 18 offres ;
  - « DevOps / 59 » renvoie un salaire `null` ;
  - « Haute-Corse » renvoie `collecting`, et une ligne est notée dans `market_demand` ;
  - les refus renvoient leurs codes ; le 6ᵉ lead reçoit un 429.
- **Landing (dev)** : pages 200, redirection 308, sitemap, canonical et hreflang. Dans le navigateur :
  - combobox, puis résultat, avec le focus sur le panneau ;
  - événements `view` et `result` écrits en base.
- **axe-core** (happy-dom, contraste exclu) : formulaire et deux résultats propres. Contrôle par mutation : une image sans `alt` est bien détectée.
- **Email réel non envoyé** : le SMTP passe par Resend. La redemption est couverte par le test PGlite.
### Tests
API 1 921, landing 210, web 430, types 44. Lint et tsc propres.
### Taille
La diff dépasse 400 lignes : prévoir deux PR (API, puis landing).
