# Stage 2 — Design (Designer)
**Run ID:** 20260420-163000-us-024
**Date:** 2026-04-20

## Design Verdict: PASS ✅ — UI enhancement required

---

## 1. Fixture Data Design

### CV Fixture — persona: "Jean Dupont, Chef de projet IT"

Chosen deliberately to differ from the "Jane Doe" defaults — makes it obvious the preview uses injected data, not leftover template props.

```
candidate:
  firstName: "Jean"
  lastName: "Dupont"
  title: "Chef de projet IT"
  email: "jean.dupont@example.com"
  phone: "+33 6 12 34 56 78"
  city: "Lyon"
  linkedin: "linkedin.com/in/jeandupont"
  github: "github.com/jeandupont"
  summary: "Chef de projet passionné avec 8 ans d'expérience en transformation digitale..."

experiences: (2 items)
  1. Responsable Digital, Banque Crédit Sud, 2021–Présent
     achievements: ["Déploiement d'une plateforme bancaire mobile (+40k utilisateurs)",
                    "Réduction des délais de livraison de 35% via méthodologie agile"]
  2. Chef de projet SI, Logistique Express, 2018–2021
     achievements: ["Migration ERP SAP S/4HANA sur 6 sites européens",
                    "Budget maîtrisé à 2,8M€ avec 0 dépassement"]

education: (2 items)
  1. Master Management de Projets Digitaux, Université Paris-Dauphine, 2018, Mention Très Bien
  2. Licence Informatique de Gestion, Université Lyon 3, 2016

skills:
  hard: [Gestion de projet, Agile/Scrum, SAP S/4HANA, JIRA, Power BI, SQL]
  soft: [Leadership, Communication, Résolution de problèmes, Gestion du stress]

certifications: (2 items)
  1. PMP — Project Management Institute — 2022
  2. PSM I (Professional Scrum Master) — Scrum.org — 2020

languages: (2 items)
  1. Français — Langue maternelle
  2. Anglais — C1

projects: (2 items)
  1. "CV Forge Demo" — Contribution open source à un outil de génération de CV — https://example.com
  2. "Dashboard BI" — Tableau de bord analytique pour PME — https://example.com/bi
```

### Letter Fixture — matching Jean Dupont applying to a CTO role

```
candidate: (same identity as CV)
company: { name: "InnoTech Solutions", city: "Paris" }
date: "20 avril 2026"
object: "Candidature au poste de Directeur de Projet Senior"
body:
  paragraph1: "Votre annonce pour le poste de Directeur de Projet Senior a retenu toute mon attention..."
  paragraph2: "Fort de huit années d'expérience en pilotage de projets complexes..."
  paragraph3: "Je serais ravi d'échanger lors d'un entretien sur la façon dont mon parcours..."
signature: { firstName: "Jean", lastName: "Dupont" }
```

---

## 2. TemplatePreview Component Enhancement

### New prop signature
```typescript
type TemplatePreviewProps = {
  template: TemplateRecord;
  previewContent?: CVDocumentContent | LetterDocumentContent;
};
```

### Block-to-content mapping logic

When `previewContent` is provided, each block name maps to fixture data:

| Block name | Source in CVDocumentContent |
|------------|----------------------------|
| CVHeader | candidate (all fields) |
| SummaryBlock | candidate.summary |
| ExperienceItem | **expand** → one rendered instance per `experiences[i]` |
| EducationItem | **expand** → one rendered instance per `education[i]` |
| SkillsList | `{ hardSkills: skills.hard, softSkills: skills.soft }` |
| CertificationItem | **expand** → one rendered instance per `certifications[i]` |
| LanguageItem | **expand** → one rendered instance per `languages[i]` |
| ProjectItem | **expand** → one rendered instance per `projects[i]` |

| Block name | Source in LetterDocumentContent |
|------------|--------------------------------|
| LMHeader | candidate + company + date + object |
| LMBody | body |
| LMSignature | signature |

Non-data blocks (Divider, SectionTitle): keep `block.props` unchanged.

### Expansion behavior
- If the template has one `ExperienceItem` block and the fixture has 2 experiences, render both experiences under that section.
- If the template has no `ExperienceItem` block at all, skip — never inject unrequested sections.
- Each expansion wraps in the same `<section>` block container as the original.

---

## 3. Admin Preview Container — "Papier & Crayon"

```
┌─────────────────────────────────────────────────────────────┐
│  Aperçu live                                                │
│  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──              │
│  ⚠ Données fictives injectées — aperçu du rendu visuel      │
│                                                             │
│ ┌────────────────────────────────────────────────────────┐  │
│ │  [preview rendered on paper-ivory background]          │  │
│ │  font: EB Garamond or Libre Baskerville for CV content  │  │
│ │  max-width: A4-proportional (65ch)                     │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Styling tokens used:**
- Container bg: `#FAFAF7` (fond principal)
- Inner doc bg: `#FFFFFF` (paper white)
- Border: `1px solid #D9D4CA` (tracé crayon)
- Label "données fictives": small italic, `#6B6860` (texte secondaire), inline info icon
- Content font-family hint: `"EB Garamond", "Libre Baskerville", serif` applied to doc container

---

## 4. WCAG 2.1 AA

| Element | Check |
|---------|-------|
| "données fictives" label | Informational — `#6B6860` on `#FAFAF7` → ~4.8:1 ✅ |
| CV content text `#1A1A18` on white | ~18.1:1 ✅ |
| Preview container no interactive elements | No keyboard path required |

---

## 5. Fixture file location

`packages/ui/src/preview-fixtures.ts` — exported as `CV_PREVIEW_FIXTURE` and `LETTER_PREVIEW_FIXTURE`. Keeps the data close to the block registry that consumes it.
