# Stage 3 — Prioritize

## Agent

`product-owner`

## Decision

Keep `US-012` in the active sprint. The gap is directly required by vision §3.3 and §13.1 and blocks any meaningful `/admin` surface.

## Delivery Note

The current task cannot be completed through the declared `bug-triage` workflow because that workflow contains no implementation or review stages. It should be rerun with an implementation-capable workflow such as `analyze-design-dev-review`, or the sprint metadata should be corrected to point to that workflow.

## Ownership

- Product: keep the story in sprint `003`
- Engineering: switch the workflow metadata, then implement app-side route protection and tests
