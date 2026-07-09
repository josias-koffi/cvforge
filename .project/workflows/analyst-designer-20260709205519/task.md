# Task — Rationalisation UI/UX desktop-first (ad hoc)

**Run**: analyst-designer-20260709205519
**Type**: ad hoc (pas de sprint source)
**Demandé par**: utilisateur, 2026-07-09

## Demande brute (verbatim)

> sur l'app frontend, rien ne va, on a pensé pour être mobile first, mais au final c'est une mauvaise chose, on est le plus souvent sur pc et les gens ne comprennent pas ce qui se passe à l'écran, on va refaire les écrans pour tout rationaliser en pensant à une expérience web, je veux garder que les pages qu'on utilise vraiment pour le moment et supprimer le reste, on rajoutera au fur et à mesure. On garde: pages de login et de register, /dashboard, /candidatures/*, /cv/*, /letters/*, /credits, /profile/*, /notifications. Je veux un sprint où on va traiter écran par écran et retravailler les choses, un rendu moderne et pro, prépare les tickets et la refonte totale de l'ui/ux.

## Clarifications obtenues (avant lancement)

1. `/admin/*` et `/onboarding` sont **remis dans le périmètre** (l'utilisateur les a ajoutés après question) — pas de suppression.
2. `/interview/*` reste **hors périmètre pour l'instant** — sprint 017 en cours (US-066 non terminé), on n'y touche pas.
3. `/auth/callback` et `/forbidden` sont de la plomberie technique — **aucun ticket**, laissés tels quels.
4. `/share/*` n'a pas été cité par l'utilisateur — traité comme hors périmètre pour ce sprint (au même titre qu'interview), à replanifier plus tard.

## Périmètre de la refonte (dans ce sprint)

- Login / Register (`/login/*`, `/register/invitation*`)
- `/dashboard`
- `/candidatures/*`
- `/cv/*`, `/letters/*`
- `/credits`
- `/profile/*`
- `/notifications`
- `/admin/*` (ajouté)
- `/onboarding` (ajouté)

## Hors périmètre (ne pas toucher)

- `/interview/*` (sprint 017 en cours)
- `/share/*`
- `/auth/callback`, `/forbidden` (technique)

## Contexte déjà connu (avant analyse)

- Sprints 016–019 constituent déjà une initiative "E15 — desktop-first redesign" (voir mémoire designer, 2026-04-26). Sprint 016 (nav sidebar, table candidatures, détail candidature) est **livré**. Sprints 018 et 019 (Documents Hub, dashboard, credits, profil, tokens shadcn-minimal globaux) sont **rédigés mais non exécutés** (toutes les tâches encore décochées).
- Vision §2.5/§2.6 documente encore une direction "mobile-first" / "Papier & Crayon" — en tension avec la décision produit déjà prise en sprint 016 de basculer desktop-first. Cette tension est déjà actée par le designer (memory 2026-04-26) mais jamais formalisée en ADR ni reflétée dans la vision.

## Attendu de ce run

1. **Analyst**: auditer l'écart entre ce qui est demandé, ce qui existe déjà en backlog (016–019), et l'état réel du code livré. Produire des constats chiffrés/vérifiables.
2. **Designer**: proposer une direction de rationalisation IA + esthétique (desktop-first, "moderne et pro"), et découper le travail restant en tickets écran par écran, en absorbant/complétant ce qui existe déjà dans 018/019 plutôt que de le dupliquer.

## Sortie finale attendue

Un nouveau sprint (`sprint-020.md`) avec des tickets **écran par écran**, couvrant tout le périmètre ci-dessus, sans dupliquer le travail déjà planifié dans 018/019 (les tâches valides de 018/019 sont soit reprises telles quelles, soit fusionnées).
