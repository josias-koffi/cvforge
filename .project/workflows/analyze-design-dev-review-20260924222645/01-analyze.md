---
tags: [run/analyze-design-dev-review-20260924222645, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924222645/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924222645/02-design]]"
---
### Verdict: PASS
### Constats
- `CompanySources` lit l'Annuaire et Egapro par SIREN, sans clé ; aucune recherche par nom.
- Une réponse `/search` de l'Annuaire porte déjà tout le dossier (NAF, effectif, `complements` ESS / mission / GES / Egapro) : **un appel** par fiche, plus Egapro si déclaré.
- La page employeur France Travail demande OAuth et un département : on la lit **dans la copie `companies`** (job horaire US-121), jamais à la requête.
- **Quotas** : l'Annuaire documente 7 appels/s par IP, sans en-tête de quota ; 429 observé à 5/s le 2026-09-24. Le job horaire consomme 2/s. L'outil a **son propre limiteur à 2/s** : 4/s au pire, sous le seuil observé.
### Décisions
- **API `public/company-check`** :
  - `GET ?q=` : nom (2 à 100 caractères), SIREN (9 chiffres) ou SIRET (14 → SIREN). Au plus 8 résultats. Aucun résultat ⇒ liste vide, pas d'erreur.
  - `GET /:siren` : `{status:"found", company}` ou `{status:"unknown"}` (200).
  - Source en panne ⇒ 503 `COMPANY_SOURCE_UNAVAILABLE`, message traduit.
  - `POST lead` (email, consentement, SIREN) → `LeadCaptureService`, intention `company` existante.
- **RGPD** : entrepreneurs individuels et unités non diffusibles écartés ; rien n'est persisté (pas d'écriture dans `companies`, qui nourrira US-140).
- **Fiche** : effectif, catégorie, NAF (code + section), création, établissements, CA, ESS, société à mission, bilan GES publié, Egapro (note et année), page employeur si connue. Sources : Annuaire, Egapro, France Travail.
- **CTA** « Voir les entreprises qui recrutent dans votre métier » → `leadIntentPath` `company` ⇒ `/entreprises`. À la connexion : profil et recherche créés si absents, `lead_origin = company_check` (activation).
- **Rate limit** : `company-check` 60/h, 300/j par IP, budget global 10 000/j ; `company-check-lead` 5/h, 20/j.
- Outil `company_check` : événements, hub, sitemap, tunnel admin. Slugs `verifier-employeur` / `employer-check`.
- Deux tranches : API puis landing.
### Critères testables
- Recherche par nom et par SIREN/SIRET ; inconnu ⇒ liste vide / `unknown`, 200.
- Aucune dépendance à France Travail à la requête (module non importé).
- Page employeur lue dans le store.
- Lien magique → `/entreprises`, origine notée.
