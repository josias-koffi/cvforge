---
tags:
  [
    run/analyze-design-dev-review-20260602150000,
    workflow/analyze-design-dev-review,
    agent/designer,
    stage/02,
  ]
run: "[[workflows/runs/analyze-design-dev-review-20260602150000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602150000/01-analyze]]"
---

# Stage 02 — Design (Designer)

### Verdict: PASS

### Summary

Le cahier d'instructions est une spec CSS/mise en page, pas une nouvelle interface utilisateur. La tâche est non-UI au sens "écran interactif" — elle concerne le rendu PDF exporté. Pas de design thinking requis. Le Developer Brief ci-dessous est la valeur de cette étape.

### Design Thinking

**Purpose**: Améliorer la lisibilité et le professionnalisme du CV exporté en PDF, pour qu'un recruteur puisse le scanner en 10 secondes.
**Tone**: Editorial/magazine — hiérarchie typographique forte, blanc généreux, densité contrôlée.
**Differentiator**: La mise en forme PDF "prête à envoyer" qui respecte les standards ATS sans avoir l'air générique.
**Anti-convergence**: Police serif (Garamond/Georgia déjà en place), pas de grille card générique, pas de violet gradient.

### Developer Brief

#### `cv-pdf-styles.ts` — SHARED_PDF_STYLES

```
@page { size: A4; margin: 20mm 25mm; }   /* 2cm haut/bas, 2,5cm gauche/droite */

html, body { font-size: 10pt; line-height: 1.15; }  /* 10pt corps, interligne 1,15 */

h1 { font-size: 24pt; font-weight: bold; color: #1a1a1a; letter-spacing: -0.02em; }

.title { font-size: 10.5pt; }   /* titre professionnel 10-11pt */

.contact { font-size: 9.5pt; color: #6b6860; }  /* coordonnées 9-10pt */

.hero {
  gap: 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #1a1a1a;
}
```

#### `cv-html-templates.ts` — CV section styles (inline dans <style>)

```css
/* Section titles */
h2 {
  font-size: 9.5pt;
  font-variant: small-caps; /* petites capitales */
  font-weight: bold;
  letter-spacing: 0.08em;
  color: #1a1a1a;
  border-bottom: 1px solid #d0cdc8;
  padding-bottom: 0.15rem;
  margin-top: 8pt; /* espacement avant section 8-10pt */
  margin-bottom: 0.3rem;
}

/* Job title in experience */
h3 {
  font-size: 10.5pt;
  font-weight: bold;
  line-height: 1.15;
}

/* Company name */
.company {
  font-size: 10.5pt;
  font-style: italic;
  color: #1a1a1a;
}

/* Date — right aligned */
.date-range {
  font-size: 9.5pt;
  color: #6b6860;
  white-space: nowrap;
}

/* spacing between experience items */
.item {
  gap: 0.15rem;
  margin-bottom: 6pt;
}

/* Skills blocks */
.skills-block {
  display: grid;
  gap: 0.2rem;
}
.skills-block h4 {
  font-size: 9.5pt;
  font-weight: bold;
}
.skills-block ul {
  list-style: disc;
  padding-left: 1rem;
}
.skills-block li {
  font-size: 10pt;
  line-height: 1.2;
}

/* Languages */
.lang-item {
  font-size: 10pt;
}
```

#### Compétences — Structure HTML à adopter

Remplacer le rendu inline `<p><strong>Hard skills :</strong> texte</p>` par :

```html
<div class="skills-block">
  <h4>Hard skills</h4>
  <ul>
    <li>item 1</li>
    <li>item 2</li>
    ...
  </ul>
</div>
<div class="skills-block">
  <h4>Soft skills</h4>
  <ul>
    ...
  </ul>
</div>
```

#### Langues — Format HTML

```html
<p class="lang-item">Anglais — C1 / Courant</p>
```

→ le prompt doit générer `level` déjà au format "C1 / Courant" ou "DELF B2 / Avancé".

#### Prompt CV — règles additionnelles à ajouter dans CV_SYSTEM_PROMPT

1. `summary` : ne jamais commencer par "Je suis" ou "Étudiant". Structure : [Profil clé] + [X ans d'expérience] + [domaine] + [valeur apportée]. 4-6 phrases, terminer sur ce que le candidat APPORTE.
2. `title` dans candidate : correspondre EXACTEMENT au poste visé de l'offre, 6-8 mots max.
3. `startDate`/`endDate` : format "Jan. 2022" / "Présent" — JAMAIS "2022-01" ou "YYYY-MM".
4. `description` dans experiences : phrase de contexte (secteur, taille entreprise, périmètre).
5. `achievements` dans experiences : 3-5 items max, verbe d'action fort, résultat chiffré ou impact.
6. `skills.hard` : max 8-10 items, 2-4 mots par item.
7. `skills.soft` : max 8-10 items, 2-4 mots par item.
8. `languages[].level` : format "C1 / Courant" — jamais uniquement "Courant".

### Findings

- [ADVISORY] `cv-docx-templates.ts` n'est pas dans le scope mais peut bénéficier des mêmes règles de date plus tard.

### Next action

Le Developer implémente les modifications CSS/HTML et met à jour les prompts.

---

**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602150000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602150000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260602150000/03-implement]]
