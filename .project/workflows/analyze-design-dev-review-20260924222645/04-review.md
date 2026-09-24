---
tags: [run/analyze-design-dev-review-20260924222645, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924222645/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924222645/final-summary]]"
---
### Verdict: PASS
### Critères
1. **Recherche par nom ou SIREN ; fiche complète** ✅
   - nom, SIREN et SIRET testés, et vus en vrai ;
   - la fiche montre l'effectif, le NAF (code et section), Egapro, l'ESS, la société à mission et le bilan carbone ;
   - la page employeur France Travail est lue dans la copie `companies`. Elle n'existe que pour les entreprises déjà lues par le rafraîchissement ; sinon, la fiche dit « aucune page connue ».
2. **Sans clé API ; sources citées** ✅
   - un test à `fetch` réel ne voit que l'Annuaire et Egapro ;
   - les sources affichées dépendent des données montrées ;
   - la fiche de l'Annuaire est liée.
3. **Entreprise inconnue** ✅
   - liste vide ⇒ encart neutre dans la région live ;
   - SIREN inconnu ou fiche vide ⇒ `unknown` en 200, sans CTA.
4. **CTA → service lead** ✅
   - test de bout en bout sur PGlite : le lien ouvre `/entreprises` ;
   - la recherche est créée et son origine est notée ;
   - une recherche existante reste intacte.
- **Quotas** ✅ vérifiés et consignés dans ADR-022 (sexies) : 7/s documentés, 429 vu à 5/s ; 2/s + 2/s.
### Critères E23
FR/EN et parité ✅, événements ✅, `aria-live`, focus et axe ✅, `Reveal` et `motion-reduce` ✅, `pageMetadata` et sitemap ✅, rate limit avant la mise en ligne ✅. RGPD : seul le SIREN part dans l'intention ; rien n'est persisté.
### Points non bloquants
- `content/fr.ts`, `en.ts` et `types.ts` dépassent déjà le plafond de 400 lignes. Le nouveau contenu est à part ; les découper reste une dette.
- Pas de test DOM du flux de l'outil : même limite que pour US-136 et US-137.
- Diff de plus de 400 lignes, livré en commits API et landing séparés.
- L'API de dev lancée par `tsx watch` n'a pas rechargé les nouveaux fichiers : il faut la redémarrer.
