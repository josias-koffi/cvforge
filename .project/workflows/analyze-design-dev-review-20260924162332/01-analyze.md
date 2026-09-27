---
tags: [run/analyze-design-dev-review-20260924162332, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924162332/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924162332/02-design]]"
---
### Verdict: PASS (un critère précisé)
### Périmètre
- **Langue** : `postScan` ajoute `locale` au formulaire. La BFF transmet déjà le `FormData` tel quel, et l'API lit `body.locale`.
- **Erreurs par code** : l'API ajoute `code` au corps de chaque refus du tunnel ATS :
  - fichier absent, trop lourd ou non accepté ;
  - pas assez de texte ;
  - email invalide, consentement manquant ;
  - analyse introuvable ou expirée ;
  - trop de requêtes, budget épuisé.

  La liste est partagée dans `@cvforge/types`. La landing traduit le code avec son dictionnaire FR/EN et ne montre **plus jamais** le message de l'API. À défaut de code, elle se replie sur le statut HTTP, puis sur le message générique. Le message français de l'API reste, pour les journaux et les appels directs.
- **Liens** : un lien secondaire vers l'analyse ATS dans le Hero et dans la section CTA de la home, à côté de l'appel principal, sans le concurrencer.
- **`ats-checker.tsx`** : le panneau de résultat sort dans `ats-result.tsx`, et les quatre événements dans `atsFunnel(locale)`.
### Critère précisé
« Branchement des 4 événements testé » : la landing n'a pas d'environnement DOM de test, et `happy-dom` n'y est que transitif. L'ajouter demanderait un ADR pour un besoin ponctuel. `atsFunnel` porte donc les quatre appels, testés ; le composant ne fait que l'appeler. L'effet `view` reste vérifié par relecture.
