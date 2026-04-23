# Stage 2 — Design

Agent: designer
Verdict: passed

The UX remains inside the existing CV and LM editor pages. Each page keeps its current PDF action and adds a sibling DOCX download action, avoiding a separate export screen. This fits the existing document workflow: users edit/review the document, then choose the export format from the same context.

Version history is presented as a compact, chronological card below the editor intro controls. It shows version number, source (`génération` or `sauvegarde`), and timestamp. This keeps the feature visible without introducing restore/compare controls that were not requested.

Accessibility notes:

- Buttons remain native button elements.
- History uses an ordered list, so screen readers get document order.
- No new modal or drag interaction is introduced.

The design stage accepts a conservative DOCX output: structured headings, paragraphs, and bullets optimized for ATS readability rather than decorative fidelity.
