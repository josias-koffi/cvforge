---
tags: [run/developer-20260924085500, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924085500/task]]"
next: "[[workflows/runs/developer-20260924085500/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-125

**Mesuré en direct (2026-09-24)** : `predictionCompetences` accepte 60 textes et 5 000 caractères par appel. Ses codes sont ceux du référentiel local et des compétences des offres : les 249 codes d'offres y figurent tous. Bruit réel : « Docker » est lu « Doctorat » à 0,83 et « TypeScript » « AutoItScript » à 0,81. Aucun seuil ne sépare le bruit du juste, d'où le retrait par le candidat. Le résumé et les diplômes ne rendent que des libellés génériques, ils sont donc exclus.

**Livré** :
- `RomeoClient.predictCompetences` : corps commun avec `predict` (`ask`), 3 réponses par texte.
- `profile-competences.inference.ts` :
  - textes : compétences, puis chaque ligne de résultat, chaque projet, chaque certification ;
  - empreinte sha256 versionnée ;
  - sélection : score d'au moins 0,70, un code une fois, 40 au plus.
- Migration **0032** : `profile_rome_competences` (`inferred` ou `dismissed`) et `profile_rome_inferences` (empreinte), sans clé étrangère.
- Déclenchement à l'enregistrement du profil, après la sauvegarde ; ne lève jamais d'exception. Si ROMEO est indisponible, l'empreinte n'est pas enregistrée et le prochain enregistrement réessaie. Les profils supprimés du registre sont oubliés.
- Purge RGPD dans `PgProfilesStore.deleteByUserEmail` ; détenteur `competence` ajouté pour les substitutions.
- `GET` et `DELETE /profiles/:id/rome-competences[/:code]` ; carte « Vos compétences » sur `/ma-recherche`, groupée en savoir-faire, savoir-être et connaissances, source citée.

**Vérifié** :
- API : 1 645 tests, lint, tsc et build. Web : 344 tests, lint et tsc. Couverture du code touché : 98,8 %.
- En direct, sur le compte de dev avec un profil fictif :
  - 19 compétences déduites ;
  - « Doctorat » retiré, puis texte modifié : nouvelle lecture, chocolaterie ajoutée, « Doctorat » toujours absent ;
  - ville modifiée seule : empreinte et date inchangées, aucun appel.
