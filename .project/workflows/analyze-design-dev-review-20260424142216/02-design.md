# Design

Design decision: keep the feature inside `/dashboard` as a dedicated card section. The share card uses the existing ivory/stone palette, serif heading, subtle borders, and text-first presentation from the product art direction. The visual artifact is generated as SVG so it is lightweight, crisp on mobile and desktop, and directly downloadable without new infrastructure.

Interaction model:
- left column: live SVG preview of the share card
- right column: short social summary, `Telecharger la carte`, `Partager nativement`, and `Partager sur LinkedIn`
- fallback copy explains that LinkedIn opens the native offsite share flow while the SVG can be posted manually

Accessibility and UX:
- the preview has meaningful `alt` text
- buttons remain keyboard reachable
- layout uses `repeat(auto-fit, minmax(280px, 1fr))` to stay readable on mobile and desktop
