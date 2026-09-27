---
tags: [run/analyze-design-dev-review-20260924215644, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924215644/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924215644/04-review]]"
---
### Verdict: PASS
### API
- **`packages/types`** : `MarketPageLink`, `MarketPageEntry`, `PublicMarketPage`.
- **Store** :
  - `isIndexable` : tension et offres sur 12 mois publiées ;
  - `listIndexable` et `listIndexableInDepartment`, filtrés en SQL et triés par offres.
- **ROME** : `listByMetier`, la plus courte appellation en premier.
- **`MarketPagesService`** :
  - liste plafonnée à 20 000 couples ;
  - page complète : chiffres, appellations, voisins de la région qui ont une page, autres métiers du département, appellation du CTA ;
  - 404 sous le seuil, pour un couple jamais lu ou pour des codes mal formés.
- **`PublicMarketPagesController`** (`public/market-pages`), hors rate limit (ADR-022, amendement quinquies).
### Landing
- **`lib/market-pages.ts`** : slugs à codes finaux (`comptable-m1203/loire-atlantique-44`), lecture des segments, lectures revalidées chaque jour.
- **Route `[locale]/job-market/[job]/[department]`** :
  - ISR à la demande (`revalidate` 86 400, aucun paramètre au build) ;
  - redirection 308 vers le slug canonique ;
  - `notFound()` sans données.
- **`next.config`** : réécriture et redirections `:path+` sous chaque slug.
- **`MarketPage`** : fil d'Ariane, H1, phrase tirée des chiffres, `TensionGauge` et `MarketFigures` réutilisés, sources, liens de maillage.
- **CTA extrait** dans `JobMarketLeadCta`, partagé avec `JobMarketResult` (174 → 122 lignes).
- **JSON-LD** : `BreadcrumbList` et `Dataset` (créateur France Travail, `dateModified`).
- **Sitemap** asynchrone : ajoute les pages avec `lastModified` et leurs alternates ; sans API, il garde les pages statiques.
- **Titre de l'outil en FR** : « {job}, {department} », car « en {department} » donnait « en Nord ».
### Vérification réelle
- **API** : 23 couples indexables en dev, 404 sous le seuil.
- **Landing** :
  - pages FR et EN en 200 ;
  - mauvais slug et `/fr/job-market/…` en 308 vers le canonique ;
  - couple jamais lu et couple sous le seuil en 404 ;
  - canonical, hreflang FR/EN/x-default et Dataset présents ;
  - sitemap : 46 URL de pages.
- **Navigateur** : rendu, variante sans demandeurs d'emploi, liens.
- **axe** (happy-dom) : propre.
### Tests
API 1 930, landing 231, web 430, types 44. Lint et tsc propres.
