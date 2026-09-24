---
tags: [run/analyze-design-dev-review-20260924164112, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924164112/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924164112/02-design]]"
---
### Verdict: PASS
### Périmètre
- **Un registre des outils livrés** (`lib/tools.ts`) : clé, chemin localisé, icône. Seul l'ATS y figure aujourd'hui. Un outil y entre le jour où sa page est livrée (US-136, 137, 139, 141), pas avant : pas de drapeau « bientôt », pas de carte grisée. Le hub, la section home et le JSON-LD lisent tous ce registre.
- **Page `/fr/outils` · `/en/tools`** : même montage que la page ATS (dossier au slug anglais, réécriture FR, redirections croisées, slug traduit par le sélecteur de langue). Sitemap (priorité 0,7, sous l'ATS), `pageMetadata()`, JSON-LD `ItemList` de `WebApplication` gratuites (`isAccessibleForFree`, prix 0).
- **Menu** : le lien visible « Test ATS gratuit » de l'en-tête devient « Outils gratuits » vers le hub. Le Hero et le CTA gardent leur lien direct vers l'ATS (US-134). Pied de page et menu mobile ont les deux liens.
- **Home** : section « Outils gratuits » entre « Comment ça marche » et « Fonctionnalités ».
### Hors périmètre
- Aucun événement de tunnel pour le hub : les valeurs d'US-131 sont par outil, et la vue compte déjà sur la page de l'outil.
### Critères testables
Hub servi dans les deux langues ; `/fr/tools` et `/en/outils` redirigés ; sélecteur de langue ; sitemap ; JSON-LD sans outil non livré ; en-tête ≤ 3 entrées ; section home rendue ; parité FR/EN.
### Question ouverte (non bloquante)
Avec un seul outil, le hub répète la carte de la home. Accepté : il prend son sens dès US-136.
