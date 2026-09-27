---
tags: [run/analyze-design-dev-review-20260924222645, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924222645/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924222645/04-review]]"
---
### Verdict: PASS
### API
- **`packages/types`** : `company-check.ts` (`CompanyCheckMatch`, `CompanyCheckSheet`, `PublicCompanyCheckResponse`), outil `company_check`, codes `COMPANY_QUERY_INVALID` / `COMPANY_SOURCE_UNAVAILABLE`, `leadIntentPath` `company` ⇒ `/entreprises`. `headcountLabel(band, locale)` déplacé depuis l'API (FR/EN).
- **`CompanySources`** : `search(query, limit)` et `egaproScore` extraits ; `read` les réutilise.
- **`CompanyCheckService`** : nom, SIREN ou SIRET ; entrepreneurs individuels, unités non diffusibles et fiches vides (SIREN 123456789, vu en vrai) écartés ; page employeur lue dans `companies` ; 503 codé si l'Annuaire tombe. Rien n'est écrit.
- **`PublicCompanyCheckController`** + module, limiteur propre à 2/s.
- **Lead** : `applyCompanyCheck` crée profil et recherche vides au besoin, `lead_origin = company_check`.
- **Rate limit** : `freeToolPolicies` factorise les couples lecture + lead (comparateur, marché, employeur). ADR-022 amendé (sexies).
- **Métriques** : `readSearchLeadActivations(tool)` remplace `readJobMarketActivations` ; libellé admin.
### Landing
- `/fr/verifier-employeur` · `/en/employer-check` : slugs, redirections, réécriture, `translateSlug`, `freeTools` (hub, home, sitemap, JSON-LD).
- `CompanyCheckTool`, `CompanyMatches`, `CompanySheet` (+ sections) ; BFF `GET ?q`, `GET [siren]` (SIREN seul), `POST lead`.
- `ToolLeadCta` extrait ; `JobMarketLeadCta` en devient une enveloppe (82 → 38 lignes).
- Contenu dans `content/company-check/{types,fr,en}.ts` : `fr.ts`/`en.ts` déjà au-dessus du plafond n'y grossissent que de l'import.
### Vérification réelle
- **API** (instance sur 3344) :
  - recherche par nom, par SIREN et par SIRET ;
  - fiche EVERIENCE complète (Egapro 94, page employeur) ;
  - inconnu ⇒ `unknown` ;
  - « ab » ⇒ 400 ;
  - 61ᵉ appel ⇒ 429 avec `Retry-After`.
- **Landing** :
  - FR/EN en 200 ;
  - redirections 308 ;
  - canonical et hreflang ;
  - sitemap et hub.
- **Navigateur** :
  - liste d'homonymes ;
  - fiche avec focus sur la région live ;
  - formulaire CTA ;
  - « aucun résultat » dans la région live ;
  - axe 0 violation en sombre et en clair ;
  - événements view, result et cta_click en base.
### Tests
API 1 958, landing 250, types 49, web vert. Lint et tsc propres. Couverture : service 99 %, contrôleur couvert. Le flux interactif de l'outil n'a pas de test DOM (pas de bibliothèque DOM dans la landing), il a été vérifié dans le navigateur.
