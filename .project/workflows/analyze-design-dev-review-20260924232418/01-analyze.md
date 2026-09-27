---
tags: [run/analyze-design-dev-review-20260924232418, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924232418/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924232418/02-design]]"
---
### Verdict: PASS
### Périmètre
Une page par entreprise de la table `companies` : les entreprises derrière les établissements de La Bonne Boîte, relues chaque mois. Aucun appel à une source à la requête : tout vient de la copie.
### Qui a une page
Une entreprise est éligible si elle est :
- **trouvée** dans l'Annuaire ;
- **publiable** ;
- **ouverte** ;
- avec un code NAF.

Elle doit aussi avoir **au moins un fait de plus** : effectif connu, finances, un engagement, un Egapro ou une page employeur. Sinon, elle n'a pas de page : 404 et pas d'entrée au sitemap.

**Publiable** : ni entrepreneur individuel, ni diffusion partielle. La base de dev contient « NAJAT AGEZ (CHOUAIB) », qui est une personne. La table ne garde pas ce statut : on ajoute une colonne `publishable`, remplie par le rafraîchissement. Une ligne non encore relue (`null`) redevient à relire et n'a pas de page d'ici là. Le filtre d'US-139 est déplacé dans `company-record.ts` et partagé.

**Plafond** : 4 500 entreprises, les plus grandes d'abord (tranche d'effectif). Cela fait 40 000 URL de pages métier, 9 000 d'entreprises et les pages statiques, sous les 50 000 d'un sitemap.
### API (`public/company-pages`, hors rate limit comme `market-pages`)
- `GET` : liste (SIREN, nom, date).
- `GET /:siren` : fiche au format `CompanyCheckSheet` (section NAF déduite du code), plus :
  - métiers et départements où elle recrute (La Bonne Boîte), avec un lien quand la page métier × département existe ;
  - au plus 6 autres entreprises du même code NAF qui ont une page.
### Landing
- `/fr/verifier-employeur/everience-812345678` · `/en/employer-check/…`
- ISR à la demande, un jour. Un slug non canonique donne une 308.
- Sitemap ; JSON-LD `BreadcrumbList` + `Organization` (`taxID` = SIREN, `sameAs` Annuaire).
- Sources citées : Annuaire, Egapro, France Travail, La Bonne Boîte. Date de relecture.
### Critères testables
- 404 pour un SIREN absent, non publiable, fermé ou mince.
- Sitemap = liste de l'API × 2 langues.
- canonical, hreflang et x-default par langue.
- Aucun lien vers une page absente.
