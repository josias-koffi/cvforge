---
tags: [run/analyze-design-dev-review-20260602170000, workflow/analyze-design-dev-review, agent/designer, stage/02]
run: "[[workflows/runs/analyze-design-dev-review-20260602170000/task]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602170000/01-analyze]]"
---

# Stage 2 — Design (Designer)

## HTML Rendering (categories present)

```html
<section class="section skills-section">
  <h2>Compétences clés</h2>
  <p><strong>Outils digitaux</strong> : Salesforce · HubSpot · Canva</p>
  <p><strong>Compétences métier</strong> : Gestion de campagnes · E-commerce</p>
  <p><strong>Communication</strong> : Créativité · Gestion de projet</p>
</section>
```

## CSS additions (cv-html-templates.ts inline styles)

```css
.skills-section {
  border-top: 1px solid #d0cdc8;
  padding-top: 0.2rem;
}

.skills-section p {
  font-size: 9.5pt;
  line-height: 1.3;
}
```

The h2 already has `border-bottom` — that covers the rule below the title. The `border-top` on `.skills-section` provides the rule above the block. The section title (h2) itself is not "above the section" — the filet mentionné is the divider between Profile and the skills block, which is the section's own top border.

## Fallback (no categories)

If `skills.categories` is absent or empty → render `skills.hard` as the existing flat `<p class="skills-inline">`. Backward compat preserved.

## Section order in template

Move skills section rendering code to appear **after** summary/profile and **before** experiences array.

## Type design

```ts
export interface SkillCategory {
  label: string;
  items: string[];
}

// In CVDocumentContent.skills:
skills: {
  hard: string[];
  soft: string[];
  categories?: SkillCategory[];
}
```

## AI prompt output schema change

`skills` field in the JSON schema becomes:
```json
"skills": {
  "hard": [],
  "soft": [],
  "categories": [
    { "label": "", "items": [] }
  ]
}
```

## Verdict

PASS — design fits scope, placement and CSS approach explicit.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602170000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602170000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260602170000/03-implement]]
