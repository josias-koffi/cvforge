---
tags: [run/analyze-design-dev-review-20260925000215, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260925000215/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260925000215/final-summary]]"
---
### Verdict: PASS
### Critères
1. **5 questions, un appel LLM court, prompt dérivé de `interview.prompts.ts`, schéma strict** : ✅
   - un seul `chat` testé, `strict: true`, 5 items min et max ;
   - revalidation côté serveur (9 cas refusés en test) ;
   - vu en vrai en FR et en EN.
2. **Budget global et limite par IP ; budget épuisé ⇒ 503 + `Retry-After`** : ✅ Tests à horloge simulée (6 cas), puis vu sur l'API lancée. Gate coût de la DoD satisfaite.
3. **Panne OpenRouter ⇒ message propre, jamais 500** : ✅ 503 `QUESTIONS_UNAVAILABLE`, traduit par la landing (FR et EN testés), vu avec un OpenRouter injoignable.
4. **CTA « S'entraîner à l'oral avec un recruteur IA » → service lead** : ✅ `LeadCaptureService` avec l'intention `interview`. Rachat vérifié : la candidature est créée et le setup d'entretien s'ouvre dessus.
### Critères E23
- Sans compte, FR/EN, parité : ✅
- Événements aux 4 étapes : ✅
- `aria-live` + focus ; axe 0 violation : ✅
- `prefers-reduced-motion` (règle globale) : ✅
- Sitemap et `pageMetadata` : ✅
- RGPD : pas de CV, l'offre n'est pas stockée par l'outil (seulement la candidature du lead, après consentement).
### Qualité
- `applications.service.ts` repasse sous 400 lignes, sans changement de comportement (tests existants verts).
- Doublons retirés : validation de l'offre et champ texte de l'offre.
### Points non bloquants
- Le compteur est en mémoire : un redémarrage remet le budget du jour à zéro (ADR-022, accepté).
- Le message `BUDGET_EXHAUSTED` de la landing est celui, générique, de l'ATS (« analyser vos CV »), comme pour les autres outils.
- La pré-sélection dans `/entretiens/new` est testée unitairement, pas vue dans le navigateur.
- Latence d'environ 12 s : l'état « Le recruteur lit l'offre… » la couvre.
- Le diff dépasse 400 lignes, dont environ 300 de découpage du service.
