<!-- generated-by: run-agent product-owner tech-lead -->

# SPIKE-002 — Dépendances de livraison, estimation et gates techniques

Date: 2026-04-18
Agents: `product-owner`, `tech-lead`
Sources: `.project/vision.md`, `spec/engineering-standards.md`, `sprints/backlog.md`

## Objectif

Transformer le backlog visionnaire en plan d'exécution plus opérationnel avant implémentation, avec:

- une échelle d'estimation commune
- les dépendances bloquantes entre épics
- les gates techniques et ADR à préparer
- le chemin critique jusqu'au MVP

## Échelle d'estimation retenue

Les tailles de stories restent `S`, `M`, `L`, mais sont désormais interprétées ainsi:

| Taille | Portée attendue | Règle d'exécution |
| ------ | --------------- | ----------------- |
| `S` | 0,5 à 1 jour de travail net | Peut tenir dans une seule branche courte |
| `M` | 2 à 4 jours de travail net | Doit être découpée en 1 à 2 PRs |
| `L` | 5 à 8 jours de travail net | Doit être décomposée en sous-tâches ou feature flags avant exécution |

Cette lecture est compatible avec la règle du spec: branches courtes et PRs limitées (source: spec `§4`).

## Chemin critique MVP

Le chemin critique jusqu'au MVP est:

1. `E1` fondations repo + Docker
2. `E2` design system + shell responsive
3. `E3` auth + rôles + `/admin`
4. `E4` onboarding + profil + pseudonymisation
5. `E6` OpenRouter + Puck + templates
6. `E5` ingestion offre + pipeline candidature
7. `E7` génération CV + édition + PDF
8. `E8` crédits + Stripe + page crédits
9. `E9` dashboard + admin + RGPD critique

Pourquoi cet ordre:

- `E3` est un prérequis d'accès au panel admin de `E9`
- `E4` et `E6` sont des prérequis métiers du pipeline documentaire de `E7`
- `E5` fournit la matière première des KPI dashboard et des générations ciblées
- `E8` et `E9` sont nécessaires pour rendre le MVP commercialisable

## Dépendances bloquantes par epic

| Epic | Dépend de | Motif |
| ---- | --------- | ----- |
| `E2` | `E1` | Les tokens, composants et layouts dépendent du monorepo et des packages partagés |
| `E3` | `E1`, `E2` | L'auth doit s'intégrer au shell applicatif et aux apps existantes |
| `E4` | `E3` | L'onboarding n'a de sens qu'après authentification |
| `E5` | `E4` | Une candidature exploitable dépend d'un profil de base candidat |
| `E6` | `E2`, `E4` | Le pipeline IA et les templates dépendent du design system et des données profil |
| `E7` | `E5`, `E6` | Génération et export nécessitent offre, templates et pipeline IA |
| `E8` | `E7` | La valeur monétisée est liée aux actions IA/documentaires déjà en place |
| `E9` | `E3`, `E5`, `E6`, `E8` | Dashboard et admin reposent sur auth, données métier, templates et crédits |
| `E10` | `E7` | Versions, DOCX et import CV prolongent le pipeline documentaire |
| `E11` | `E9` | Les analytics avancées et rappels prolongent dashboard et notifications |
| `E12` | `E3`, `E4` | L'interview vocal requiert auth, profil, observabilité et shell déjà stables |
| `E13` | `E12` | Le produit interview complet dépend de la base temps réel |
| `E14` | `E5`, `E9` | Les fonctions recruteur/entreprise prolongent candidature et admin |

## Stories à décomposer avant dev

Les stories suivantes sont assez larges pour nécessiter un découpage interne avant implémentation:

- `US-009` auth passwordless + sessions
- `US-013` wizard d'onboarding en 5 étapes
- `US-021` blocs Puck custom CV/LM
- `US-022` gestion admin templates
- `US-025` génération CV pseudonymisée
- `US-033` panel admin utilisateurs et crédits
- `US-038` import CV existant
- `US-044` et `US-045` streaming STT/TTS
- `US-048` mode interview complet
- `US-050` lot interview "réécoute + transcription + purge + pré-génération"

## Gates techniques et ADR attendus

Selon le spec, un ADR est requis si le projet ajoute une nouvelle librairie non triviale, change de fournisseur d'auth ou modifie le déploiement (source: spec `§5`).

### ADR très probables

- Provider email pour magic links et notifications
- Librairie de conversion DOCX
- Choix éventuel d'un framework ou SDK spécifique pour l'extension browser
- Option OpenRouter enterprise si elle change les garanties d'infrastructure

### Gates techniques par phase

| Phase | Gate |
| ----- | ---- |
| `Sprint 002` | Baseline design tokens centralisée + accessibilité shell |
| `Sprint 003` | Revue sécurité auth + autorisation |
| `Sprint 005` | Vérification `zdr: true`, logging désactivé, pseudonymisation |
| `Sprint 007` | Revue PDF et fuite potentielle de données identifiantes |
| `Sprint 008` | Vérification ledger crédits + webhook Stripe |
| `Sprint 009` | Checklist RGPD de lancement MVP |
| `Sprint 012` | Observabilité latence / audio / streaming |
| `Sprint 013` | Politique de purge audio et conservation |

## Recommandations produit/tech

- Commencer chaque story `L` par un sous-découpage explicite dans le sprint avant de coder
- Introduire des feature flags pour `import CV`, `fallback PDF`, `interview vocal` et toute capacité à risque de latence
- Garder `Sprint 010` et `Sprint 014` comme zones d'évaluation pour les choix encore ouverts dans la vision

## Open

- Le provider email et la durée de session restent des décisions préalables à la stabilisation de `Sprint 003`
- La librairie DOCX reste à sélectionner avant `Sprint 010`
