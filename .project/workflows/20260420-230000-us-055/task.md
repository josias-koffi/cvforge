# Task: US-055

**Sprint**: 008
**Workflow**: analyze-design-dev-review
**Run ID**: 20260420-230000-us-055

## Title
Installer `@measured-co/puck`, créer l'adaptateur `toPuckConfig()` et migrer le JSON des templates existants

## Acceptance Criteria
- [ ] `@measured-co/puck` est installé dans `packages/ui`
- [ ] `toPuckConfig(registry, kind)` produit un `Config` Puck valide filtré par `templateKind`
- [ ] Le type `TemplateRecord.layout` est mis à jour vers le type `Data` de Puck
- [ ] Un script de migration convertit les templates existants de `{ blocks: [] }` vers `{ content: [], root: { props: {} } }`
- [ ] Les tests existants liés au registre passent après migration

## Sources
- ADR-003: `.project/decisions/ADR-003-puck-editor-integration.md`
- Vision: §6.1, §6.3
