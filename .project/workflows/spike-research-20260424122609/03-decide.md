# Stage 3 — Decide

Agent: `tech-lead`
Verdict: passed

Outcome: `proceed`

Décision: `US-040` est considéré comme suffisamment cadré pour `V1.1` sans implémentation immédiate supplémentaire dans ce run. Le bon périmètre est une recherche assistée de contact recruteur rattachée à une candidature, avec édition manuelle et provenance explicite des données.

Rationale:
- cela respecte la vision `§7.4` sans créer un produit recruteur en avance sur `V2.0`;
- aucun nouveau framework n'est requis au stade du cadrage, donc pas d'ADR à ouvrir maintenant;
- le flux réutilise les champs déjà extraits lors de l'import d'offre et reste cohérent avec la fiche candidature existante.

Guardrails de future implémentation:
- stocker la source et la date de vérification avec chaque contact;
- séparer clairement les données détectées des données confirmées par l'utilisateur;
- ne jamais enrichir via une adresse email inférée ou une source non publique.
