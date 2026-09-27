---
tags: [run/analyze-design-dev-review-20260924232418, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924232418/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924232418/04-review]]"
---
### Verdict: PASS
### API
- **`companies.publishable`** (migration 0044, écrite à la main : le snapshot drizzle est périmé). `readCompanyRecord` le calcule avec `isPublishable`, déplacé depuis `company-check`. Une ligne `null` redevient due.
- **`company-record.ts`** : `toCompanyCheckSheet` (partagé avec l'outil), `nafSectionOf`, `SIREN`.
- **`PgCompanyPagesStore`** : `isIndexableCompany` et son équivalent SQL, tri par taille, même NAF. `hiring` joint La Bonne Boîte et `market_stats` via `INDEXABLE_MARKET_STATS`, exporté.
- **`CompanyPagesService`** : plafond 4 500, 404 hors page. **`public/company-pages`** hors rate limit (ADR-022 septies).
### Landing
- **`lib/seo-pages.ts`** : `slugify`, `slugSegment` et `fetchSeoPageData`, partagés avec `market-pages`.
- `Breadcrumbs`, `PageLinks`, `CompanyLeadCta` et `formatSiren` sont extraits et partagés.
- Structured data : `breadcrumbList` partagé ; nouveau `companyPageStructuredData` (`WebPage` + `Organization`, `taxID`, `sameAs`).
- **Route `[locale]/employer-check/[company]`** : ISR d'un jour, 308 vers le slug canonique, `notFound()`.
- `next.config` et sitemap mis à jour. Le texte va dans `content/company-check/`.
### Vérification réelle
- **Rafraîchissement** : 287 lues ; seule « NAJAT AGEZ (CHOUAIB) » est non publiable.
- **API** : 277 pages. 404 pour l'entrepreneur individuel, une fiche mince, un SIREN inconnu ou mal formé.
- **Landing** :
  - FR et EN en 200 ;
  - quatre cas de 308 ;
  - 404 comme attendu ;
  - canonical, hreflang et x-default présents ;
  - JSON-LD présent ;
  - sitemap : 554 URL d'entreprises, sans le 922733621.
- **axe** (happy-dom) : 0 violation en FR et en EN, avec un contrôle par mutation.
- **Navigateur** : rendu vérifié.
### Tests
API 1 968 (couverture 99,8 % sur les fichiers touchés), landing 273. Lint et tsc propres.
