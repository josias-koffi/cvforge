---
tags: [run/analyze-design-dev-review-20260924143552, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924143552/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924143552/02-design]]"
---
### Verdict: PASS (un critère amendé)
### Périmètre
- **Outils** : `ats` seul pour l'instant. Chaque story d'outil ajoute son identifiant à la liste partagée (`@cvforge/types`).
- **Étapes** : `view`, `result`, `cta_click`, `email_submitted`. Émises par la landing via sa route BFF.
- **Un visiteur compte une fois par jour et par étape** : index unique (jour, outil, étape, `ip_hash`), insertion sans effet en cas de doublon. Le tunnel compte donc des visiteurs, pas des rechargements de page.
- **`ip_hash`** = sha256(IP + jour + secret) : il change chaque jour, donc impossible de suivre un visiteur d'un jour à l'autre. Secret : `ATS_IP_HASH_SECRET`, déjà en place.
- **Activation du compte** : pour l'ATS, les emails des scans débloqués sur la période qui ont un compte (même jointure que `readAtsCounters`). Pour les autres outils : `null` jusqu'au service lead (US-133).
- **Période** : celle d'`activeWindowDays` (30 j), déjà utilisée par le tableau de bord. Purge des lignes après 90 jours.
- **Admin** : une carte par outil (vues → résultats → clics → emails → comptes) et les mêmes chiffres dans l'export CSV (règle d'US-087).
- **L'envoi n'est jamais bloquant** : `sendBeacon`, une erreur est ignorée, rien ne change pour le visiteur.
### Critère amendé
« `POST /public/events` rate-limitée (US-132) » dépend d'une story placée **après** celle-ci. Le limiteur actuel est câblé sur l'ATS (clé `global:ats-scan`) : l'appliquer compterait chaque événement comme un scan. Pour US-131, la route est bornée par :
- des valeurs fermées (outil, étape, locale) et un corps de taille fixe ;
- le dédoublonnage : une IP écrit au plus outils × étapes lignes par jour.

L'enregistrement de la route dans le rate limit passe dans les critères d'US-132.
### Critères testables
Pas d'IP brute, d'email ni de texte libre (test sur la ligne écrite) ; dédoublonnage (test SQL) ; tunnel dans l'admin et le CSV (tests des composants et du service).
### Question ouverte (non bloquante)
La politique de confidentialité, stockée en base, doit mentionner cette mesure d'audience sans cookie : c'est au propriétaire de la modifier dans `/admin/legal`.
