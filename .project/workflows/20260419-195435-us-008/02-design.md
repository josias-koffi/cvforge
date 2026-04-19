# Stage 2 — Design

- Agent: `designer`
- Verdict: `passed`

## Design Direction

- Keep the "Papier & Crayon" hero and card language already established in `@cvforge/ui`.
- Add a mobile bottom bar with compact labels and tactile targets.
- Add a desktop sidebar at `lg` with clearer labels and section descriptions.

## Accessibility Notes

- Both navigation regions use semantic `nav` landmarks with explicit `aria-label`s.
- Active items expose `aria-current="page"`.
- Touch targets remain large enough through padded link blocks and pill kickers.

## Reuse Decision

The shell should accept typed navigation items plus optional children so later authenticated screens can inject their own content without replacing the shared responsive frame.
