# Rationalisation UI/UX desktop-first — refonte complète

> Étend `.project/designs/frontend-rationalization-20260610.md` (sprint 016, livré) au reste du périmètre applicatif.
> Supersede US-071 (sprint 019) : la direction shadcn-minimal générique (Inter, gris neutre) est rejetée.

## Design Thinking

**Purpose** — Un candidat qui pilote ses candidatures, ses documents (CV/LM) et son admin depuis un poste de travail. Le problème identifié n'est pas esthétique mais informationnel : trop de défilement vertical, pas de hiérarchie visuelle claire, écrans pensés pour un pouce plutôt qu'une souris.

**Tone** — `brutally minimal` (inchangé depuis le 2026-06-10) : calme, précis, fonctionnel. On ne réinvente pas l'identité, on la discipline sur toute l'app.

**Differentiator** — Chaque écran suit la même grammaire : bande KPI/contexte compacte en haut, table ou formulaire dense au centre, aperçu ou détail sticky à droite quand pertinent. Aucune carte-dans-une-carte, aucune redite d'information déjà visible dans la nav.

**Anti-convergence check** — Pas de police par défaut (DM Sans / EB Garamond confirmés, pas Inter), pas de palette shadcn générique (`#fafafa`/`#e5e7eb` rejetés), pas de grille de cartes identiques, pas d'animation décorative au-delà de 150 ms.

## Système partagé (déjà en place, à réutiliser — pas à recréer)

- Tokens : `packages/ui/src/design-system.ts` (`canvas #FAFAF7`, `text #1A1A18`, `textMuted #6B6860`, `border #D9D3C7`).
- Shell : `AppShell` (sidebar 216px desktop, drawer mobile — livré US-060).
- Typo : DM Sans (UI), EB Garamond (documents imprimables CV/LM).
- Radius : `--paper-radius-sm/md/lg/pill` existants, valeurs déjà réduites (US "border-radius" 2026-06-01).

## Écran par écran

### 1. Login / Register (`/login/*`, `/register/invitation*`)
Formulaire centré étroit (max 420px), pas de split-screen marketing. Un seul champ email + consentement RGPD inline (déjà spécifié US-016). `/register/invitation` reprend le même gabarit avec les champs rôle/expiration en lecture.

### 2. Dashboard (`/dashboard`)
Reprend exactement US-070 : 3 KPI cards en ligne, 2 tables récentes (candidatures, entretiens), panneau quick actions. Le fichier `dashboard/page.tsx` (672L) est scindé en `dashboard/kpi-row.tsx`, `dashboard/recent-tables.tsx`, `dashboard/quick-actions.tsx`.

### 3. Candidatures (`/candidatures/*`)
Inchangé — déjà livré et conforme (sprint 016, US-061/062).

### 4. CV (`/cv/*`)
`/cv` devient une table (Titre, Candidature liée, Dernière modif, Actions PDF/DOCX/Éditer) — reprend le contenu utile de US-067 sans créer de route `/documents`. `/cv/[applicationId]` garde formulaire structuré à gauche + aperçu sticky à droite (US-068, sans Puck côté user).

### 5. Letters (`/letters/*`)
Même gabarit que CV : `/letters` table, `/letters/[applicationId]` formulaire + aperçu sticky.

### 6. Credits (`/credits`)
Reprend US-072 tel quel : balance card proéminente, alerte solde bas, cards packs en ligne, table ledger triée/paginée — avec les tokens Papier & Crayon, pas shadcn.

### 7. Profile (`/profile/*`)
Reprend US-073 tel quel : colonne gauche 240px (liste profils), colonne droite (accordions Identité/Expériences/Formation/Compétences/Langues/Préférences), import CV dans l'accordion Identité.

### 8. Notifications (`/notifications`)
Non couvert par 016-019. Liste triée par date, non-lu en premier avec pastille, groupée par jour, carte "Préférences email" en pied de liste (reprend le contenu déjà livré US-041, remis en page dense plutôt qu'empilée).

### 9. Admin (`/admin/*`)
`/admin` : cards utilisateurs compactes → passent en table (colonnes : email, rôle, solde, dernière activité, actions) pour la densité desktop. `/admin/templates` : librairie + éditeur inchangés dans leur structure, mais `/admin/templates/[id]/edit` passe en Puck full-screen (US-069, admin-only, inchangé).

### 10. Onboarding (`/onboarding`)
`wizard.tsx` (670L) scindé en une étape = un composant (`step-identity.tsx`, `step-links.tsx`, `step-extra.tsx`, `step-import.tsx`, `step-recap.tsx`). Largeur desktop resserrée (600px centré) au lieu du plein-écran mobile actuel — la progression reste visible en haut, pas en barre latérale.

## Color

Inchangé : `#1A1A18` sur `#FAFAF7` = 15.1:1 (AA/AAA texte). `#6B6860` sur `#FAFAF7` = 4.6:1 (AA texte). Accent réservé à l'action primaire et à la sélection active — un seul accent par écran.

## Motion

Transitions d'état ≤150ms, aucune animation d'entrée décorative. `prefers-reduced-motion` respecté partout (déjà en place pour VAD/interview, à répliquer si un état de chargement apparaît).

## Interaction notes

Focus visible sur tout élément interactif, tables avec lignes cliquables + action explicite (pas de double sémantique), formulaires avec labels associés, cibles ≥40px.

## Developer brief

- Ne pas créer de nouveaux packages ni de nouvelle palette de tokens.
- Tout fichier touché au-dessus de 400 lignes (seuil d'alerte spec §9) doit être scindé pendant la tâche, pas après.
- `/admin/templates/[id]/edit` : layout dédié `(puck-admin)` sans shell (US-069, déjà spécifié, non exécuté).
- Pas de route `/documents` : les tables CV/LM vivent respectivement sous `/cv` et `/letters`.
