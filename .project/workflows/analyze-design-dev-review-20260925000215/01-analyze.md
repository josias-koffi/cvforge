---
tags: [run/analyze-design-dev-review-20260925000215, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260925000215/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260925000215/02-design]]"
---
### Verdict: PASS
### Périmètre
Le visiteur colle une offre (200 à 8 000 caractères, mêmes bornes que le comparateur). Il reçoit 5 questions probables. Chacune dit ce que le recruteur cherche et son type (motivation, expérience, technique, comportementale, mise en situation). Un seul appel LLM court (`OpenRouterService.chat`, `maxTokens` ≈ 700, `require_parameters`), sans CV : l'offre seule suffit et ce n'est pas une donnée personnelle. Rien n'est stocké.
### API (`public/interview-questions`)
- `POST` `{ offerText, locale }` → `{ questions: [{ question, intent, kind }] × 5 }`.
- Prompt dans `interview.prompts.ts` : il reprend la voix du recruteur et le libellé de langue. Schéma `strict`, et la réponse est revérifiée : exactement 5 questions, champs non vides et bornés.
- Panne OpenRouter, réponse hors schéma ou délai dépassé ⇒ 503 `QUESTIONS_UNAVAILABLE`, sans `Retry-After`. Jamais une 500.
- Rate limit US-132 via `freeToolPolicies` : 3/h et 10/j par IP, 300/j au global, surchargeables par `PUBLIC_INTERVIEW_QUESTIONS_*`. Budget épuisé ⇒ 503 `BUDGET_EXHAUSTED` avec `Retry-After` (middleware existant).
- `POST lead` : email + consentement + offre. Nouvelle intention `{ kind: "interview", offerText }`.
### Au clic sur le lien
- La candidature est créée depuis l'offre (même code qu'US-136), avec son propre libellé de source.
- Redirection vers `/entretiens/new?candidature=recente`, la candidature pré-sélectionnée.
- Activation mesurée par ce libellé : `readOfferLeadActivations(label)` remplace `readKeywordMatchActivations`.
### Critères testables
- 5 questions, schéma strict envoyé, sortie invalide ⇒ 503 propre.
- Politique `interview-questions` : 429 par IP, 503 + `Retry-After` au budget (timers simulés).
- OpenRouter qui lève ⇒ 503 `QUESTIONS_UNAVAILABLE`.
- Le lead envoie l'intention `interview`, et la redirection pré-sélectionne la candidature.
- Page FR/EN, parité, sitemap, hub, événements view/result/cta/email, axe propre.
### Questions produit
Aucune bloquante. Le crédit consommé par l'entretien reste la règle actuelle de l'app.
