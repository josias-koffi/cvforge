# US-027 — Exporter le CV en PDF via Puppeteer sans métadonnées identifiantes

## Contexte
- Sprint: 007
- Workflow: analyze-design-dev-review
- Agent cible: tech-lead

## Acceptance criteria
- L'export PDF est généré par le service dédié
- Le rendu est fidèle au template Puck
- Les métadonnées identifiantes sont supprimées

## Scope retenu
- Ajouter un service API dédié à l'export PDF pour les CV déjà générés
- Utiliser le service Puppeteer Browserless du compose local via `PUPPETEER_URL`
- Exposer une route de téléchargement côté app pour le navigateur utilisateur
- Réutiliser la structure documentaire CV existante pour garder la fidélité au template

## Hors scope
- Stockage MinIO du PDF exporté
- Historique de versions PDF
- Export LM ou DOCX

