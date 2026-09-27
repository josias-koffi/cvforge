---
tags: [run/analyze-design-dev-review-20260924143552, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924143552/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924143552/final-summary]]"
---
### Verdict: PASS
### Critères
1. VERIFIED : `day`, `tool`, `step`, `locale` et `ip_hash` = sha256(jour:ip + secret), qui change chaque jour. Ni IP brute, ni email, ni texte libre. La migration 0039 correspond au schéma, l'entrée 39 du journal est valide, les tests pg passent.
2. VERIFIED : la BFF limite le corps à 512 octets et transmet en `application/json`, accepté par Nest. Le service valide des listes fermées (400 sinon). Le dédoublonnage passe par `onConflictDoNothing`. `SessionStateMiddleware` laisse passer les appels sans cookie.
3. VERIFIED : les 4 étapes sont branchées dans `ats-checker.tsx`. `readAtsActivations` reprend la jointure sur l'email de `convertedLeadCount`.
4. VERIFIED : une `FunnelCard` par outil, et les mêmes chiffres dans le CSV.
### Findings
- [ADVISORY] **Corrigé pendant la revue.** Les activations étaient lues depuis une heure précise et les étapes depuis le jour ISO. Les deux partent désormais de minuit UTC.
- [ADVISORY] Le dédoublonnage fait confiance au premier saut de `X-Forwarded-For`, comme le scan ATS. Un appel direct à l'API peut gonfler le tunnel. À traiter avec US-132 et la configuration du proxy.
- [ADVISORY] Juste après la mise en ligne, « Compte activé » peut dépasser « Email saisi » : les déverrouillages ATS antérieurs aux premiers événements comptent. Ça se résorbe en 30 jours.
- [ADVISORY] Aucun test ne vérifie le branchement des 4 appels dans `AtsChecker`, qui fait 317 lignes (cible 300).
- [ADVISORY] Diff d'environ 600 lignes : deux PR. Le web suppose que `acquisition` existe dans la réponse de l'API : déployer les deux ensemble.
