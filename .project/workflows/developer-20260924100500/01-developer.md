---
tags: [run/developer-20260924100500, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924100500/task]]"
next: "[[workflows/runs/developer-20260924100500/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-126

**Mesuré sur la base locale** : les compétences propres d'une offre sont presque toujours dans la fiche de son métier (1 050 sur 1 058). Les offres en citent une le plus souvent ; une fiche métier en liste 55 (médiane). Mais un CV lu par ROMEO ne tombe que rarement sur le code exact d'une fiche : 3 compétences sur 21 pour la boulangère fictive. Les savoir-être génériques figurent dans jusqu'à 1 231 métiers sur 1 911.

**Livré** :
- `matching/rome-matching.ts` :
  - titre : 1 pour un métier confirmé, 0,6 dans le même **domaine** (M18), 0 sinon. Le « grand domaine » M mettait comptabilité et informatique ensemble ;
  - compétences : celles de l'offre, sinon celles de son métier avec un facteur 0,8. Les génériques (plus de 100 métiers) sont exclues. Une compétence correspond si le code est le même ou si les libellés partagent au moins deux mots significatifs ;
  - 3 compétences en commun donnent le maximum ;
  - le score garde le meilleur des deux lectures, mots-clés ou ROME : jamais plus bas qu'avant, barème toujours sur 100.
- `missingSkills` : les compétences propres de l'offre absentes du CV, exigées d'abord, 5 au plus. Migration **0033** (`job_matches.missing_skills`).
- `PgRomeMatchingReader.forRun()` : lecture du référentiel une fois par run. `listDigestEnabled` renvoie les codes confirmés.
- Nettoyage :
  - salaire extrait dans `salary.ts` ;
  - `toJob` dupliqué dans `matches.pg-store` supprimé ;
  - `DigestStats` déplacé vers `job-digest.steps.ts` (digest à 393 lignes).

**Vérifié** :
- 1 658 tests, lint, tsc, build ; couverture `rome-matching` et du lecteur 100 %.
- Essai à blanc local (1 948 offres, rien d'écrit) : 1 108 scores relevés, aucun baissé ; 9 nouvelles offres sur 10 dans le top.
- CV boulangère contre fiche D1102 : 5 compétences reconnues, contre 2 par code seul.
- Un faux positif corrigé : « règles … sécurité » alimentaire contre informatique.
