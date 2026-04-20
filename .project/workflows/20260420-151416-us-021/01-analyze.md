# Stage 1 — Analyze

Agent: `product-owner`

## Scope

`US-021` couvre la fondation réutilisable des blocs documentaires CV/LM décrits dans la vision:

- blocs CV: `CVHeader`, `SummaryBlock`, `ExperienceItem`, `EducationItem`, `SkillsList`, `CertificationItem`, `LanguageItem`, `ProjectItem`
- blocs LM: `LMHeader`, `LMBody`, `LMSignature`
- blocs partagés: `Divider`, `SectionTitle`

## Product Boundary

- Inclus: contrat de contenu normalisé, props des blocs, composants React réutilisables, registre partagé exploitable par les futurs écrans admin et user.
- Exclu: intégration drag-and-drop Puck complète, CRUD admin des templates, stockage PostgreSQL/MinIO, preview live dédiée.
- Justification: la vision sépare explicitement les blocs custom MVP (`US-021`) du système de templates admin (`US-022`).

## Acceptance Mapping

1. `Les blocs CV et LM décrits par la vision existent`
   Evidence attendue: exports de composants correspondant à la liste de `§6.3`.
2. `Les props attendues sont implémentées`
   Evidence attendue: types partagés alignés sur `§6.3` et `§6.4`, plus tests.
3. `Les blocs sont réutilisables dans les templates admin et user`
   Evidence attendue: registre partagé unique consommable par deux usages distincts dans les tests.

## Missing Product Questions

- Aucun bloqueur produit pour cette story.
- Le choix d'intégration de la vraie librairie Puck peut rester dans `US-022`, car cette story livre déjà le contrat nécessaire.
