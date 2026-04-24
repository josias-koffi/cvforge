<!-- generated-by: sprint spike-research -->

# SPIKE-003 — Cadrage de la recherche de recruteur

Date: 2026-04-24
Agents: `analyst`, `tech-lead`
Sources: `.project/vision.md` `§7.3`, `§7.4`, `§16`; `apps/app/app/candidatures/page.tsx`; `apps/api/src/applications/applications.service.ts`; `packages/types/src/index.ts`

## Objectif

Définir un périmètre `V1.1` réaliste pour `US-040` sans dériver vers le rôle recruteur `V2.0`.

## Constats

- La vision demande un `Contact recruteur` dans la fiche candidature et liste `Recherche de recruteur` en `V1.1`.
- Le produit existant sait déjà créer une candidature, extraire l'offre, suivre le statut et générer CV/LM.
- Le code ne contient encore ni modèle de contact recruteur ni surface de recherche dédiée.

## Décision

Le bon périmètre `V1.1` est une **recherche assistée de contact recruteur** attachée à une candidature existante.

Flux cible:
1. L'utilisateur importe une offre et obtient un brouillon de candidature.
2. Depuis la fiche candidature, il lance `Rechercher un recruteur`.
3. Le système préremplit la recherche avec l'entreprise, le poste, la localisation et le domaine de l'offre.
4. Une liste courte de contacts potentiels est proposée avec provenance.
5. L'utilisateur choisit, corrige si besoin, puis enregistre le contact sur la candidature.
6. Le contact sauvegardé est réutilisé dans la fiche candidature, les rappels et la lettre de motivation.

## Données à stocker

- `name`
- `role`
- `email`
- `linkedinUrl`
- `sourceUrl`
- `confidence`
- `lastVerifiedAt`
- `verifiedByUser`

## Sources autorisées

- page de l'offre et domaine associé
- pages publiques de l'entreprise: `about`, `team`, `contact`, `careers`
- résultats de moteur de recherche public menant vers des profils publics
- emails explicitement publiés sur une source publique

## Limitations

- pas de garantie d'exhaustivité ni d'exactitude
- pas de scraping derrière login, CAPTCHA ou mur anti-bot
- pas d'inférence d'email non publiée
- validation humaine obligatoire avant usage

## Recommandation d'implémentation

- ajouter un sous-bloc `Contact recruteur` à la fiche candidature
- distinguer données suggérées et données confirmées
- réutiliser les champs déjà extraits de l'offre pour éviter un second tunnel
- garder toute version "base enrichie / sourcing massif / rôle recruteur" hors `V1.1`
