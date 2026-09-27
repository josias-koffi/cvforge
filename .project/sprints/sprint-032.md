<!-- generated-by: plan « Onboarding guidé à la première connexion » (demande propriétaire 2026-09-25) -->

# Sprint 032 — Guider le candidat dès sa première connexion

## 🎯 Sprint Goal

Épic **E25 — Onboarding guidé**. Un nouveau compte arrivait sur le tableau de bord sans savoir
quoi remplir. La page plein écran `/bienvenue` le guide en 7 étapes, avec un texte « pourquoi on
vous le demande » et une astuce à chaque étape, en réutilisant les formulaires de l'app. Il arrive
ensuite sur un tableau de bord opérationnel, avec la checklist « Bien démarrer ».

> Remplace US-077 (scission de l'ancien wizard, supprimé à la réécriture v2).

## ✅ Tasks

- [x] **[US-149]** API onboarding
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Migration 0045 idempotente ; les comptes dont un profil est prêt sont marqués terminés.
    - [x] `GET /onboarding`, `POST /onboarding/complete`, `POST /onboarding/getting-started/dismiss`,
          session requise, la première date est conservée.
    - [x] Tests store (PGlite, reprise de la migration comprise), service et contrôleur.
- [x] **[US-150]** Page `/bienvenue`, étapes 1 à 3 et redirection
  - Critères d'acceptation :
    - [x] `/login/success` et l'acceptation d'invitation envoient une première connexion sur
          `/bienvenue`, en conservant `next` (US-133).
    - [x] Import de CV facultatif (coût affiché), identité (prénom et nom requis), parcours.
    - [x] L'étape est dans l'URL ; sans elle, reprise sur le premier manque.
- [x] **[US-151]** Étapes 4 à 7
  - Critères d'acceptation :
    - [x] Postes pré-remplis depuis le profil, lieu, métiers ROME, alertes (offres du jour activées
          par défaut), récapitulatif, puis tableau de bord.
- [x] **[US-152]** Checklist « Bien démarrer »
  - Critères d'acceptation :
    - [x] Six étapes calculées depuis les données, « Reprendre la prise en main » tant que
          l'onboarding n'est pas terminé, masquage définitif.

## Vérification

- Lint, types et tests verts (API et web).
- Parcours complet joué dans un navigateur headless sur un compte neuf, en 1440 et 390 px :
  redirection, 7 étapes, arrivée sur le tableau de bord, nouvelle connexion sans redirection,
  « Terminer plus tard » puis reprise sur la bonne étape, masquage de la checklist.
