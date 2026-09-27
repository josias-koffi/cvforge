---
tags: [run/developer-20260924110500, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924110500/task]]"
next: "[[workflows/runs/developer-20260924110500/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-127

**Livré** :
- Web :
  - `offer-skills.tsx` : deux lignes compactes sur la carte (2 libellés puis « +n ») et deux listes dans le panneau, qui remplacent « Ce qui correspond » ;
  - « À mettre en avant » est présenté comme une piste, jamais comme un manque ;
  - « Source : ROME 4.0, France Travail » quand l'offre a un code ROME.
- API, trajet de la pièce :
  - « Postuler » recopie `missingSkills` sur la candidature (colonne `applications.skills_to_highlight`, migration **0034**), via le magasin des candidatures. `applications.service.ts` fait 767 lignes et n'est pas touché ;
  - la génération les place dans un bloc à part, « PISTES À VALORISER — SI ET SEULEMENT SI LE PROFIL LES ÉTAYE », entre l'offre et le profil ;
  - le CV et la lettre ont une règle explicite : une piste n'est valorisée que si le profil l'étaye, et ignorée sinon.
- Garantie : le grounding serveur retire une piste que le modèle aurait ajoutée sans source ; un test le vérifie avec un modèle qui désobéit.
- Nettoyage de `cv-generation.service.ts` (427 → 398 lignes) :
  - `updateCvContent` passe par `loadApplication` au lieu de dupliquer la vérification ;
  - `offerContextOf` va dans `payload` ;
  - `defaultTemplateId` va dans `versions`.

**Vérifié** :
- API : 1 666 tests, lint, tsc et build. Web : 348 tests, lint et tsc.
- Dans le navigateur, sur six offres du jour écrites localement pour le compte de dev, supprimées ensuite : la carte et le panneau affichent les deux listes et la source.
- « Postuler » n'a pas été cliqué en direct (un crédit et deux appels au LLM) ; les tests unitaires couvrent ce trajet.
