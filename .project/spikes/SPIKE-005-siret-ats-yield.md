# SPIKE-005 — Rendement de la chaîne SIRET → site → page carrière → logiciel de recrutement

**Date** : 2026-09-24
**Sprint** : 026 / US-117
**Agent** : developer
**Workflow** : [[workflows/runs/developer-20260924160000]]

---

## Le chiffre

**6 entreprises sur 100** aboutissent à un tableau d'offres qu'un adaptateur existant sait collecter (greenhouse, lever, ashby, smartrecruiters, workable, recruitee, personio, welcomekit).

Chaque cas a été vérifié à la main : le tableau appartient bien à l'entreprise et publie au moins une offre.

Seuls **3** de ces tableaux publient des offres à Nantes, le lieu de la recherche : Lengow, Elephant Technologies et Mobiapps.

## Décision : NE PAS INDUSTRIALISER

Le résultat est sous le seuil de 10 % fixé par le sprint. Pour 3 à 6 tableaux utiles par centaine d'entreprises, il faudrait :
- télécharger le HTML de sites tiers, ce que Common Crawl avait justement été choisi pour éviter ;
- deviner les domaines, dont 1 sur 8 est faux ;
- maintenir une heuristique pour repérer la page carrière.

Le registre reste alimenté par Common Crawl et par les liens des offres partenaires de France Travail.

**Seul l'usage n°2 de sprint-026 est abandonné.** La rubrique « Entreprises qui recrutent » et la candidature spontanée (US-119, US-120) répondent déjà au besoin du candidat.

---

## Méthode

- **Échantillon** : 100 SIRET tirés au hasard (graine 117) parmi les 179 établissements de La Bonne Boîte en base (Nantes à 30 km ; métiers Développeur, Développeur web et Comptable).
  - **Biais favorable** : 60 % d'entreprises du numérique, qui s'équipent plus que la moyenne. Sur un échantillon tous métiers, le rendement réel sera plus bas.
- **Voie A, par le site**, sans aucune clé et en respectant chaque hôte (5 requêtes en parallèle, délai maximal de 8 s) :
  1. Trouver le site :
     - par Wikidata (P1616 SIREN → P856 site officiel), qui en trouve 12 ;
     - sinon en devinant `www.<nom>.fr` ou `.com`, retenu si la page cite le nom de l'entreprise.
  2. Trouver la page carrière : un lien de la page d'accueil dont le texte ou l'adresse parle de carrière, de recrutement, d'emploi ou de nous rejoindre.
  3. Passer toutes les URL de la page carrière dans `detectAtsBoard`.
- **Voie B, par l'identifiant** : interroger directement l'API publique de chaque logiciel avec un identifiant tiré du nom (`aubay`, `elephanttechnologies`…), sans passer par le site.

## Résultats détaillés

| Étape | Voie A (site) |
|---|---|
| Site trouvé | 73, dont environ 8 faux (euro.com, societe.com, orange.fr…), soit **65 environ** |
| Page carrière trouvée | 57, soit environ 50 une fois les faux sites retirés |
| Logiciel reconnu | **1** (Lengow, workable). Un second (Exakis) était un faux positif, `smartrecruiters:company` |

| Voie B (identifiant) | |
|---|---|
| Tableau avec des offres | 8 |
| Qui appartient vraiment à l'entreprise | **5** : Aubay et Primagaz (recruitee, offres hors Nantes), Avisia (recruitee, offres à Lille), Mobiapps (recruitee et smartrecruiters), Elephant Technologies (recruitee) |
| Homonymes étrangers | 3 : ASI (États-Unis), Open (Dublin), Pomona (Jakarta) |

Aucun de ces 6 tableaux n'était déjà dans `job_boards`, qui en compte 32.

### Logiciels non reconnus, vus sur 13 entreprises

| Logiciel | Entreprises |
|---|---|
| WeRecruit | 4 |
| Taleez | 2 |
| Teamtailor | 2 |
| Welcome to the Jungle, Flatchr, Workday, SAP SuccessFactors, Talentsoft/Cegid | 1 chacun |

Même avec des adaptateurs pour tous ces logiciels, la chaîne plafonnerait vers 20 % sur un échantillon favorable. Il faudrait alors écrire et maintenir cinq adaptateurs de plus.

## Ce que la mesure a appris

- **L'API Recherche d'entreprises ne donne aucune URL de site** (vérifié en US-121).
  - Wikidata ne connaît que les grandes entreprises (12 sur 100).
  - La devinette de domaine se trompe une fois sur huit.
- **SmartRecruiters répond 200 avec 0 offre pour n'importe quel identifiant.** Un sondage par identifiant doit exiger au moins une offre, puis vérifier le nom et la ville.
- **Défaut dans `detectAtsBoard`** : une URL `smartrecruiters.com/company/...` donne le jeton générique `company`. Il faut ajouter `company` à la liste des segments ignorés à la prochaine modification de ce fichier.

## À reconsidérer si

- un adaptateur **Teamtailor** ou **WeRecruit** est écrit un jour pour une autre raison : relancer alors `measure/us117-measure.mts` ;
- les **Pages employeurs** (US-116) donnent l'URL du site ou de la page carrière : la voie A perdrait alors son maillon le plus fragile.

Les scripts, l'échantillon et les résultats bruts se trouvent dans `workflows/developer-20260924160000/measure/`.
