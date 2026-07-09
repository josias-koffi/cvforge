# Stage 02 — Designer

### Verdict: PASS

### Summary (≤100 words)
Direction retenue : **poursuivre** la ligne "brutally minimal / Papier & Crayon raffiné" déjà livrée en sprint 016 (`.project/designs/frontend-rationalization-20260610.md`) — DM Sans + EB Garamond, tokens `#1A1A18`/`#FAFAF7`/`#D9D3C7` déjà centralisés dans `packages/ui/src/design-system.ts`. Je **rejette** la direction shadcn-minimal générique planifiée en US-071 (Inter, gris neutre `#fafafa`) : elle viole l'anti-convergence (police et palette par défaut) et jetterait un système déjà partiellement en production. Le doc étendu couvre les 9 zones du périmètre.

### Findings
- [BLOCKING] US-071 (sprint 019) doit être **remplacée**, pas exécutée telle quelle : conserver `design-system.ts`, l'étendre (densité desktop, accordions, tables) plutôt que le remplacer par une palette générique.
- [ADVISORY] `dashboard/page.tsx` (672L) et `onboarding/wizard.tsx` (670L) doivent être scindés en sous-composants pendant la refonte (spec §9, seuil d'alerte dépassé) — pas une refonte visuelle seule.
- [ADVISORY] US-067 ("Documents Hub /documents") est adapté : pas de nouvelle route top-level ; table CV/LM à filtres devient l'écran d'accueil de `/cv` et `/letters` respectivement (chacun listant ses propres documents), cohérent avec le périmètre demandé.
- [ADVISORY] Contraste vérifié sur les tokens existants : `#1A1A18` sur `#FAFAF7` = 15.1:1, `#6B6860` sur `#FAFAF7` = 4.6:1 — conformes WCAG AA. Aucun changement de palette nécessaire pour la conformité.

### Next action
Doc de direction étendu : `.project/designs/frontend-rationalization-20260709.md`. Tickets écran par écran : `.project/sprints/sprint-020.md`, qui supersede sprint-018/019.
