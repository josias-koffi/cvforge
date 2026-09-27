---
tags: [run/developer-20260924130000, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924130000/task]]"
next: "[[workflows/runs/developer-20260924130000/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-116 et US-119

**US-116** : contrat de La Bonne Boîte relevé en direct et consigné dans le sprint (paramètres, bornes, champs, débit de 2 appels/s, pas d'URL de site). Pages employeurs : le scope `api_synthese-pages-employeursv1` et la racine existent, mais tous les chemins répondent 403. Chemins à demander au support ; la story reste ouverte.

**US-119, livré** :
- `LaBonneBoiteSource` : `/recherche`, 100 entreprises au plus, lieu choisi dans cet ordre : commune et rayon (200 km au plus), coordonnées, département. SIRET obligatoire ; un effectif « 0 à 0 » signifie inconnu.
- Migration **0036** : `hiring_company_queries` (date de lecture, y compris quand aucune entreprise n'est trouvée) et `hiring_companies`.
- Service : contrôle toutes les heures, relecture après 7 jours, 60 lectures au plus par passage, lectures partagées entre candidats ; un échec garde la copie précédente. Script `hiring-companies:refresh`.
- `GET profiles/:id/hiring-companies` : liste sans doublon (par SIRET), triée par potentiel d'embauche, 100 au plus, et un état explicite (`no_rome`, `no_location`, `pending`, `ready`).
- Page `/entreprises`, dans la navigation et le fil d'Ariane : cartes (secteur, ville, effectif, métier, fort potentiel), source et date de lecture, mention « Gratuit ».
- `la-bonne-boite` ajoutée aux valeurs par défaut de compose et de Terraform, ainsi qu'à la doc ; débit de 2 appels/s dans `FT_APIS`.

**Vérifié** : 1 711 tests API et 356 tests web passent, lint et types au vert. En réel, compte de test avec Nantes à 30 km : 2 lectures, 100 entreprises sans doublon, entre les métiers Comptable et Développeur web. Page vide (« Quel métier visez-vous ? ») vérifiée dans le navigateur ; page remplie vérifiée par le service et par les tests de rendu.
