---
tags: [run/analyze-design-dev-review-20260925000215, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260925000215/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260925000215/04-review]]"
---
### Verdict: PASS
### API
- **`interview-questions/`** (service, contrôleur, module sans base de données) :
  - un `chat` court (900 jetons, `require_parameters`, température 0,4) ;
  - la sortie est revérifiée par `parseQuestions` : exactement 5 questions, type connu, textes non vides et ≤ 300 caractères ;
  - toute erreur donne une 503 `QUESTIONS_UNAVAILABLE`.
- **Prompt** `buildLikelyQuestionsPrompt` et `LIKELY_QUESTIONS_RESPONSE_FORMAT` (strict) dans `interview.prompts.ts`. Ils reprennent les profils technique et comportemental et le libellé de langue. L'offre est traitée comme une donnée.
- **Rate limit** : `freeToolPolicies("interview-questions")`, 3/h et 10/j par IP, 300/j au global. Amendement octies d'ADR-022.
- **Lead** : intention `interview` (`packages/types`, `LATEST_APPLICATION = "recente"`). `LeadOfferListener` crée la candidature avec `LEAD_INTERVIEW_SOURCE_LABEL`. `readOfferLeadActivations(label)` remplace `readKeywordMatchActivations`, et le funnel admin gagne l'outil.
- **Refactor** :
  - `applications.service.ts` passe de 710 à 399 lignes. En sortent `offer-input.ts` (normalisation), `offer-import.ts` (`OfferImporter` : URL, texte, offert) et `applications.kpi.ts` ; `stripRawOfferText` part dans `applications.normalize.ts`.
  - `acceptedOfferText` va dans `ats.validation.ts`, partagé avec le comparateur.
### Web
`/entretiens/new` résout `?candidature=recente` en la candidature la plus récente (`preselectedApplicationId`). Le libellé admin est ajouté.
### Landing
- Route `[locale]/interview-questions`, réécrite en `/fr/questions-entretien`, avec ses redirections 308.
- BFF `api/interview-questions` et `/lead`, client, outil et résultat.
- `OfferTextField` est extrait et partagé avec le comparateur. Le contenu va dans `content/interview-questions/`, plus la carte du hub et le message d'erreur.
### Vérification réelle
- **API** (port 3344, SMTP coupé) :
  - FR et EN : 200 et 5 questions ancrées dans l'offre, en ~12 s ;
  - 4ᵉ appel d'une même IP : 429 avec `Retry-After: 3600` ;
  - budget à 6 : 503 `BUDGET_EXHAUSTED` avec `Retry-After` ;
  - OpenRouter injoignable : 503 `QUESTIONS_UNAVAILABLE`.
- **Lead racheté** : candidature « Questions d'entretien gratuites » créée, lien supprimé, redirection vers `next=/entretiens/new?candidature=recente`.
- **Navigateur** : 5 cartes, focus sur le résultat, CTA puis email, événements view → result → cta_click → email_submitted en base.
- **Accessibilité** : axe WCAG 2.1 AA, 0 violation.
- **Pages** : canonical, hreflang, sitemap et hub vérifiés. Données de test effacées.
### Tests
- Nouveau code API : 94,9 % de lignes couvertes.
- Suites : API 2 002 (la seule panne, `app.module.test`, est corrigée), web 435, landing 289, types 52. Lint et tsc propres.
