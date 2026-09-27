---
tags: [run/analyze-design-dev-review-20260924173554, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924173554/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924173554/02-design]]"
---
### Verdict: PASS
### Tranche 1 — API
- **Calcul** : `matchOfferKeywords(cvText, offerText)` dans `packages/ats-score`. Il partage avec la dimension `keywords` l'extraction des termes de l'offre (`extractKeywords` + mots vides d'offre). Il renvoie :
  - le taux (0-100) calculé sur tous les termes ;
  - les termes présents et manquants, triés par fréquence dans l'offre et limités à 30 chacun.
- **`POST public/keyword-match`** :
  - contrôles du scan ATS (octets magiques, 5 Mo) ;
  - `extractCvText` sans OCR ;
  - offre obligatoire (`OFFER_TEXT_REQUIRED` sous 200 caractères, 8 000 au maximum).

  Aucun store et aucune dépendance OpenRouter : le module ne peut ni écrire ni appeler de modèle.
- **`POST public/keyword-match/lead`** (email, consentement, offre) → `LeadCaptureService` avec l'intention `offer`. La réponse ne dépend pas de l'existence du compte.
- **Rate limit** : politiques `keyword-match` (par IP + plafond global de CPU) et `keyword-match-lead` (par IP, strict, car la route envoie des emails).
- **Après le clic** : un écouteur `onLeadIntent` du module candidatures crée la candidature avec le texte de l'offre.
  - L'extraction structurée est offerte : aucun débit de crédit. Si le modèle échoue, la candidature est créée depuis le texte seul.
  - Redirection vers `/candidatures`.
  - Étiquette de source dédiée, qui sert à mesurer l'activation dans `/admin/metrics` (outil `keyword_match`).
### Tranche 2 — landing
Page, BFF, dictionnaires, événements, entrée dans le registre du hub (US-135).
### Décision
L'appel de modèle à l'inscription est payé par la plateforme, une fois par lien consommé. Le coût est borné par le rate limit de la route lead et par la boîte mail de l'utilisateur.
### Critères testables
0 LLM (le module n'a aucun fournisseur de modèle, et le test d'intégration le vérifie avec un espion) ; rien d'écrit ; taux et listes ; candidature créée sans débit ; refus avec des codes.
