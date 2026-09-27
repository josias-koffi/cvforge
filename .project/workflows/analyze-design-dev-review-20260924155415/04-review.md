---
tags: [run/analyze-design-dev-review-20260924155415, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924155415/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924155415/final-summary]]"
---
### Verdict: PASS après deux retours en implémentation
### Critères
1. VERIFIED — `LeadCaptureService.acceptedEmail` (email normalisé, consentement strictement `true`). `sendLink` ne lève jamais d'erreur. L'ATS délègue à ce service.
2. VERIFIED — Les quatre types d'intention sont portés par le lien (jsonb, migration 0041) et supprimés avec lui. Au clic : écouteurs `onLeadIntent`, puis `next`. Aller-retour testé sur PGlite.
3. VERIFIED — Seulement des identifiants et un texte d'offre, validés par `parseLeadIntent`, que `sendLink` rappelle systématiquement.
4. VERIFIED — ATS migré. `GET ats/scans[/:id]` renvoie la même 404 pour un scan d'un autre email : pas d'IDOR. La page et le tableau de bord se dégradent proprement.
### Findings
- [BLOCKING, corrigé] Redirection ouverte via `next=/%09/evil.com`, par une tabulation que le navigateur supprime. Correctif : résolution par `new URL`, même origine exigée, caractères de contrôle refusés.
- [BLOCKING, corrigé à la contre-revue] `/.//evil.com` se réduisait en `//evil.com`. Tout résultat résolu commençant par `//` ou `/\` est désormais refusé. Sept charges utiles ajoutées au test, contrôlées par une sonde Node.
- [ADVISORY, corrigé] Focus visible sur les liens du tableau de bord ; les titres de cartes sont des titres de niveau 2.
- [ADVISORY] Si A a débloqué un scan et que B le débloque à son tour, le lien de B mène à une 404. Cas limite accepté.
- [ADVISORY] `auth.service.ts` (345 lignes) et `auth.pg-store.ts` (372) dépassent la cible de 300, sous le seuil de 400.
