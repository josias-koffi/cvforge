---
tags: [run/analyze-design-dev-review-20260924173554, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924173554/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924173554/final-summary]]"
---
### Verdict: PASS
### Critères
1. **`POST /public/keyword-match`** — ✅
   - `extractCvText` avec `allowOcr: false` ;
   - vocabulaire d'offre partagé avec la dimension `keywords` (`offerTerms` ← `extractKeywords`) ;
   - PDF testé de bout en bout. Le DOCX passe par le même contrôle d'octets magiques et la même extraction que le scan ATS, déjà testés.
2. **0 LLM, CV jamais persisté** — ✅
   - test : le service n'a aucune dépendance et le module n'importe que `LeadsModule` ;
   - aucun `fetch` pendant une comparaison ;
   - aucun store, donc aucune ligne écrite.
3. **Taux et termes présents et manquants** — ✅ Service, composant et appel réel.
4. **CTA → service lead, puis candidature avec l'offre, sans crédit** — ✅ Test de bout en bout avec les vraies classes : route lead, lien, `consumeMagicLink`, écouteur, candidature créée, `next=/candidatures`, aucun appel aux crédits. Repli testé quand le modèle échoue.
5. **Page ou onglet** — ✅ Page dédiée (02-design).
6. **Découpage API puis page** — ✅ Deux tranches séparables (packages/api, puis landing) : on pourra en faire deux PR.
### Critères communs E23
FR/EN et parité ✅, 4 événements via `toolFunnel` ✅, sitemap et `pageMetadata` ✅, `aria-live` et focus ✅ (corrigé), puces bordées lisibles, états vides écrits.
### Points non bloquants
- **Focus du checker ATS** : probablement le même défaut → backlog.
- **Vocabulaire** : des mots de prose passent encore → backlog.
- **Extraction offerte** à l'inscription : coût assumé et borné (ADR-022).
- **Gate RGPD du sprint** non cochée : il manque un test d'intégration sur Postgres.
