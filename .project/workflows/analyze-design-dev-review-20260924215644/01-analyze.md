---
tags: [run/analyze-design-dev-review-20260924215644, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924215644/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924215644/02-design]]"
---
### Verdict: PASS
### Décision — volume au lancement
On indexe **les couples qui ont des données**, et seulement eux. Ce sont déjà les plus demandés : `market_stats` ne contient que les couples de l'une de ces trois origines :
- les recherches des candidats ;
- leur région ;
- les demandes des visiteurs (US-137).

Le volume suit donc la demande, sans liste à maintenir.

**Seuil contre le contenu mince** : une tension **et** un volume d'offres sur 12 mois publiés. Un couple sous le seuil n'a ni page ni entrée dans le sitemap. L'API répond 404 et la page renvoie `notFound()`.

Plafond du sitemap : 20 000 couples, soit 40 000 URL (la limite est de 50 000).
### API (`public/market-pages`)
- `GET` : liste des couples indexables (code, libellés, date), triés par offres sur 12 mois.
- `GET /:rome/:department` renvoie le contenu de la page :
  - chiffres ;
  - appellations du métier (au plus 8) ;
  - autres départements de la région qui ont une page ;
  - autres métiers du département ;
  - appellation du CTA.
- **Hors rate limit, comme `public/legal`** : lectures seules, sans file, appelées par le serveur de la landing en ISR. Derrière la même IP, une politique par IP bloquerait la régénération.
### Landing
- URL :
  - `/fr/metier-recrute/comptable-m1203/loire-atlantique-44` ;
  - `/en/job-market/comptable-m1203/loire-atlantique-44`.
- ISR à la demande (`revalidate` d'un jour, aucun paramètre au build). Un slug non canonique redirige vers le bon.
- Sitemap asynchrone : si l'API ne répond pas, il garde les pages statiques.
### Critères testables
- 404 sous le seuil.
- Sitemap = les couples indexables × 2 langues, avec leurs alternates.
- Canonical et hreflang pointent vers les slugs de chaque langue.
- JSON-LD : `BreadcrumbList` et `Dataset` avec la source France Travail.
