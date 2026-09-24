---
tags: [run/analyze-design-dev-review-20260924211657, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924211657/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924211657/final-summary]]"
---
### Verdict: PASS
### Critères
1. **Autocomplétion ROME publique sur la copie locale** — ✅ `PgRomeAppellationsReader`, sans session. Appel réel : 8 appellations « comptab ».
2. **Tension, offres, demandeurs, salaire médian avec échantillon** — ✅ Service, composant et appel réel (`sample: 18`).
3. **0 appel France Travail, source citée** — ✅
   - test : le client du radar n'est jamais appelé par `lookup` ni par `read` ;
   - journal de l'API lancée : aucun appel ;
   - les deux sources sont affichées dans tous les états.
4. **Salaire masqué sous l'échantillon minimal, avec message** — ✅ Seuil de 5 partagé ; message « moins de 5 offres » testé et vu en vrai (`M1827/59`).
5. **CTA → service lead, projet pré-rempli, digest** — ✅ Test de bout en bout sur PGlite avec les vraies classes :
   - lead, lien, `consumeMagicLink`, écouteur ;
   - profil créé, projet avec le département et l'appellation confirmée, `digestEnabled` ;
   - `listDigestEnabled` le renvoie avec `M1855` ;
   - un projet existant est complété, jamais écrasé.

   L'envoi du mail du matin lui-même n'est pas rejoué : c'est le digest E19 inchangé.
6. **Découpage API puis page** — ✅ Deux tranches séparables.
### Critères communs E23
✅ FR/EN et parité, événements, `aria-live` et focus, axe propre, sitemap, `pageMetadata`, rate limit avant la mise en ligne.
### Points non bloquants
- Un couple jamais lu affiche « en cours de collecte » tant que le rafraîchissement horaire (40 lectures par heure) ne l'a pas lu. La promesse des 24 h tient sous la charge actuelle ; à surveiller.
- Les périodes s'affichent telles que France Travail les écrit (« ANNEE 2025 »).
- Hors périmètre, mais corrigé : le double comptage du rate limit sur les leads et les déverrouillages ATS (ADR-022, amendement quater).
