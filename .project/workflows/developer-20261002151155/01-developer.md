---
tags: [run/developer-20261002151155, workflow/developer, stage/01-developer, agent/developer, result/pass]
sprint: "[[sprints/sprint-034#US-167]]"
workflow: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261002151155/task]]"
next: "[[workflows/runs/developer-20261002151155/final-summary]]"
---
# 01 — Developer : US-167 — PASS (4/4)

**Livré**
- « Offres du jour » : section « Nouvelles depuis votre dernière visite » (`splitSinceVisit`, `lib/offer-freshness.ts`), offres arrivées depuis la dernière visite, triées par publication, badge « il y a X min / X h » puis date à l'heure de Paris (`formatFreshness`). Dernière visite : cookie `jobspark_offers_visit`, écrit en quittant la page (`OffersVisitMarker`) avec l'heure d'ouverture, pour que la section ne se vide pas pendant la visite.
- Recherche libre : « Publiée depuis 24 h / 3 jours / 7 jours » (`publiee`) et « Les plus récentes d'abord » (`tri=recent`, tri par publication). Le tri par défaut met en tête les offres dont l'intitulé contient les mots.
- Alerte : le bouton mène à `/offres-du-jour/postuler/<jobId>`. Côté navigateur, la page appelle `applyFromAlert` : candidature, puis génération du CV, puis arrivée sur le CV. Une offre déjà candidatée rouvre la candidature : l'API renvoie `existing`, sans nouveau crédit. En cas d'échec, le message s'affiche avec un lien vers la candidature si elle a été créée.

**Vérification** : tsc et eslint OK. Tests : API 2 175, web 391. Ajouts : fraîcheur et fuseau de Paris, section « nouvelles », badge de carte, cookie, page sans effet au rendu serveur, tri et fenêtre en PGlite, idempotence de « postuler ».
**Non vérifié** : le parcours dans un navigateur, faute de serveur de dev lancé. Un visiteur déconnecté passe par la connexion et n'est pas ramené à l'offre.
