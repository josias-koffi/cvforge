---
tags: [run/analyze-design-dev-review-20260601110000, workflow/analyze-design-dev-review, agent/designer, stage/02]
run: "[[workflows/runs/analyze-design-dev-review-20260601110000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260601110000/01-analyze]]"
---

### Verdict: PASS

### Summary
Refactorisation CRUD sur le système "Papier & Crayon" existant. Aesthetic direction : **editorial/magazine** — listing épuré en table, édition structurée en accordéon léger. Border-radius réduits de ~50% pour un look plus éditorial et moins "bulle". Aucun breaking change sur les tokens pilule.

---

## Design Thinking

1. **Purpose** : Permettre à un chercheur d'emploi de gérer plusieurs profils de base rapidement — choisir le bon socle par contexte de candidature. Page listing = cockpit, page édition = atelier.
2. **Tone** : **editorial/magazine** — grille structurée, contrastes de poids typographiques, peu de décorations. Adapté à une gestion de données sérieuse.
3. **Differentiator** : La page listing affiche chaque profil comme une **ligne de tableau dense** (label, nom, sections renseignées, date, statut actif) — pas une carte molle. L'utilisateur voit d'un coup d'œil la complétude de chaque profil.
4. **Anti-convergence** : ✓ Pas de card-grid 3 colonnes. ✓ Typographie Playfair Display / DM Sans déjà établie. ✓ Pas de gradient purple.

---

## Mockup

### `/profile` — Listing

```
┌─ Page header ─────────────────────────────────────────┐
│  Profils de base                    [+ Nouveau profil] │
│  Gérez vos socles de candidature                       │
└───────────────────────────────────────────────────────┘

┌─ Table ────────────────────────────────────────────────┐
│  Label          Candidat        Sections   Sauvegardé  │
│ ─────────────────────────────────────────────────────  │
│ ● Profil Tech   Jean Dupont     7 / 9      Il y a 2j   │
│   [Modifier]                              [Supprimer]  │
│ ─────────────────────────────────────────────────────  │
│   Profil RH     Jean Dupont     3 / 9      Il y a 5j   │
│   [Modifier]                              [Supprimer]  │
└───────────────────────────────────────────────────────┘

Import CV : [Importer un CV existant] (lien discret)
RGPD      : [Export & suppression]   (lien discret en bas)
```

### `/profile/new` — Création rapide

```
┌─ Page header ──────────────────────┐
│  Nouveau profil                    │
│  Donnez un nom à ce socle          │
└────────────────────────────────────┘

┌─ Card ─────────────────────────────┐
│  Nom du profil*   [____________]   │
│  Prénom           [____________]   │
│  Nom              [____________]   │
│  Email            [____________]   │
│                                    │
│  [Créer le profil] [Annuler]       │
└────────────────────────────────────┘
```

### `/profile/[id]/edit` — Édition complète

Même contenu que `profile-editor.tsx` actuel SANS le bloc "Profils de base multiples" (déplacé sur listing). Ajout du `CvImportPanel` en haut.

```
┌─ Page header ──────────────────────────────────────────┐
│  ← Retour aux profils     Profil Tech    [Activer]      │
└────────────────────────────────────────────────────────┘
[CvImportPanel]
[Identité du profil]
[Titre professionnel]
[Accroche / Summary]
[Expériences]
[Formations]
[Compétences techniques]
[Compétences humaines]
[Certifications]
[Projets personnels]
[Loisirs]
```

---

## Border Radius — nouvelles valeurs

| Token | Actuel | Nouveau | Ratio |
|---|---|---|---|
| `radius.sm` | `0.75rem` | `0.25rem` | −67% |
| `radius.md` | `1rem` | `0.375rem` | −62% |
| `radius.lg` | `1.5rem` | `0.5rem` | −67% |
| `radius.pill` | `999px` | `999px` | inchangé |

Justification : les coins très arrondis donnent un aspect "toy-app". Réduire à des valeurs subtiles renforce le caractère éditorial. Les badges et boutons conservent le pilule car c'est sémantique.

---

## Journey

1. User arrive sur `/profile` → voit liste + statut actif
2. Clic "Nouveau profil" → `/profile/new` → formulaire minimal → submit → redirect `/profile/[id]/edit`
3. Clic "Modifier" sur ligne → `/profile/[id]/edit` → édition complète → retour listing
4. Clic "Supprimer" → confirmation inline → suppression si count > 1
5. Clic radio actif sur ligne → change `activeProfileId` sans navigation

---

## Developer brief

**Nouveaux fichiers à créer** :
- `apps/app/app/profile/new/page.tsx` — formulaire création (champs: label, firstName, lastName, email)
- `apps/app/app/profile/[id]/edit/page.tsx` — wraps le `ProfileEditor` en mode édition d'un profil spécifique
- `apps/app/app/profile/profile-list.tsx` (client) — tableau listing

**Fichiers à modifier** :
- `apps/app/app/profile/page.tsx` → devient la page listing (importe `ProfileList`)
- `apps/app/app/profile/profile-editor.tsx` → extraire les sous-composants fields (ExperienceFields, EducationFields, etc.) dans un fichier séparé `profile-entry-fields.tsx` pour passer sous 400 lignes
- `packages/ui/src/design-system.ts` → réduire radius.sm/md/lg
- `packages/ui/src/styles.tsx` → vérifier et aligner les usages hardcodés

**Comportement** :
- La création dans `/profile/new` appelle `createAdditionalBaseProfile()` puis save + redirect
- L'édition dans `/profile/[id]/edit` charge le profil par ID depuis registry, édite, sauve
- Le listing lit le registry et permet de changer l'`activeProfileId`
- Si un `[id]` n'existe pas → redirect `/profile`

---

## WCAG check
- Table listing : `<th scope="col">` sur les en-têtes, `role="row"` implicite
- Boutons d'action : libellés descriptifs (`aria-label="Modifier le profil Profil Tech"`)
- Contraste : tokens existants inchangés (ratio ≥ 4.5:1 déjà validé)
- Focus : `focus-visible` déjà dans `styles.tsx`

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260601110000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260601110000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260601110000/03-implement]]
