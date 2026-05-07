# Task: US-062 — Créer l'écran détail candidature `/candidatures/[id]`

Sprint: 016
Workflow: analyze-design-dev-review
Agent: designer + developer

## Acceptance criteria

- [ ] Header: titre poste, entreprise, badge statut, date création
- [ ] Onglets: Offre | CV | LM | Interviews | Historique
- [ ] Onglet Offre: données scrapées structurées lisibles
- [ ] Onglet CV: aperçu + actions "Éditer" (→ `/documents/[id]/edit`) et "PDF"
- [ ] Onglet LM: même traitement que CV
- [ ] Onglet Interviews: table des sessions passées + bouton "Démarrer un entretien" (→ `/interview/new?candidatureId=…`)
- [ ] Onglet Historique: timeline des changements de statut
- [ ] Navigation breadcrumb: Candidatures > [Poste]

Source: vision §7, §8, §9, §10
