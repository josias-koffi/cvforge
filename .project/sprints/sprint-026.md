<!-- generated-by: demande propriétaire 2026-09-23 (ajout des API entreprises au droit de la clé France Travail) -->

# Sprint 026 — Les entreprises qui recrutent

## 🎯 Sprint Goal

Épic **E20 — Entreprises**. Exploiter les deux API France Travail que le propriétaire a ajoutées
aux droits de notre clé le 2026-09-23 : **La Bonne Boîte** et **Synthèse Pages employeurs**.

Elles ne donnent **pas d'offres**. Elles donnent des **entreprises** : celles qui embauchent dans un
métier, près d'un lieu, même sans annonce publiée. C'est une matière différente de celle du sprint
025, et elle ouvre trois usages distincts — dont un qui est une fonctionnalité à part entière pour
le candidat.

> ⚠️ Absent de `.project/vision.md`, comme E19. À reporter par le Product Owner, jamais en
> auto-édition (hard rule).

---

## ⚠️ À vérifier avant d'écrire la moindre ligne

Le catalogue de francetravail.io est entièrement rendu en JavaScript : ni `WebFetch` ni l'extraction
de texte du navigateur n'ont pu en lire la documentation le 2026-09-23. **Rien de ce qui suit sur
les contrats d'API ne doit être considéré comme acquis.** À confirmer, en direct, avec la clé :

1. **Chemins et versions exacts.** Une recherche donne `GET /partenaire/labonneboite/v1/company/`
   pour la v1, et une v2 existe (`bonne-boite-v2` dans le catalogue). Vérifier laquelle est servie
   à notre application, et si la v1 est dépréciée.
2. **Scopes OAuth** à ajouter à ceux déjà demandés (`api_offresdemploiv2 o2dsoffre`). Chaque API a
   les siens ; un scope non accordé se manifeste par `invalid_scope` au moment du jeton.
3. **Paramètres** : `rome_codes`, `latitude`, `longitude`, `distance` sont attestés pour La Bonne
   Boîte. Vérifier les bornes (rayon maximal, nombre de résultats, pagination).
4. **Champs de réponse** : `siret`, `name`, `naf`, `headcount`, `city`, coordonnées sont attestés.
   **Vérifier en priorité s'il existe une URL de site web** — c'est ce qui conditionne l'usage n°2
   ci-dessous. Rien n'indique aujourd'hui qu'elle existe.
5. **Quotas**, comme pour Offres d'emploi (4 appels/seconde par application pour celle-ci).
6. **Licence de réutilisation et mention obligatoire**, à traiter comme pour Offres d'emploi.
7. Ce que **Synthèse Pages employeurs** renvoie réellement : à ce jour, aucune information fiable.

Méthode qui a fonctionné pour Offres d'emploi : interroger les référentiels et compter les
résultats d'appels réels plutôt que se fier aux guides tiers. Un code faux ne lève pas d'erreur, il
renvoie une page vide.

---

## Les trois usages retenus par le propriétaire

### 1. Une rubrique « Entreprises qui recrutent » (fonctionnalité candidat)

Montrer au candidat les entreprises qui embauchent dans son métier près de chez lui, **même sans
annonce publiée**, et l'aider à faire une candidature spontanée avec CVForge.

- L'entrée existe déjà côté profil : `search_projects.targetRoles` et `locations` (code INSEE,
  latitude, longitude, rayon) donnent exactement ce que l'API attend. Il manque le **code ROME** :
  `targetRoles` prévoit un ROME optionnel qui n'est jamais renseigné aujourd'hui. Décider comment
  l'obtenir — saisie assistée, référentiel ROME de France Travail, ou déduction depuis l'intitulé.
- Réutiliser le flux de candidature existant : une candidature spontanée est une candidature sans
  `offerUrl`, avec l'entreprise pour seul contexte. Vérifier ce que `applications.service.ts`
  accepte aujourd'hui, et ce que la génération de CV fait sans texte d'offre.
- Question produit ouverte : cette rubrique est-elle gratuite, ou la génération pour une
  candidature spontanée coûte-t-elle un crédit comme les autres ?

### 2. Alimenter le registre des logiciels de recrutement

La chaîne : `siret` → site web de l'entreprise (API Recherche d'entreprises, gratuite, déjà
identifiée dans le plan E19 §3c) → page carrière → `detectAtsBoard(url)`.

> **Réserve à lever avant d'industrialiser.** Le rendement est inconnu et probablement faible :
> beaucoup d'entreprises n'utilisent aucun logiciel reconnu, et trouver la page carrière depuis la
> page d'accueil suppose de récupérer le HTML du site, ce que la découverte Common Crawl avait
> justement été choisie pour éviter.
>
> **Mesurer d'abord** : prendre un échantillon de 100 entreprises rendues par La Bonne Boîte, faire
> passer la chaîne à la main, compter combien aboutissent à un jeton valide. Décider ensuite.
> Un taux inférieur à 10 % ne justifie pas le code.

### 3. Enrichir la fiche entreprise

Ce que le plan E19 §3c prévoyait en V1.1 : table `companies`, rattachement au SIREN, effectif,
secteur (NAF), et les indicateurs RSE de l'API Recherche d'entreprises (société à mission, ESS,
index Egapro, bilan GES). Les Pages employeurs complètent cette fiche avec ce que France Travail
publie côté employeur.

---

## 📋 Backlog

- [ ] **[US-116]** Vérifier les deux API en direct et consigner leurs contrats réels (§ « À
      vérifier »). Livrable : une note dans ce fichier, pas du code.
- [ ] **[US-117]** Mesurer le rendement de la chaîne SIRET → site → page carrière → ATS sur un
      échantillon de 100 entreprises. Livrable : un chiffre et une décision.
- [ ] **[US-118]** Le code ROME dans le projet de recherche (saisie et stockage).
- [ ] **[US-119]** `LaBonneBoiteSource` et la rubrique « Entreprises qui recrutent ».
- [ ] **[US-120]** Candidature spontanée depuis une entreprise.
- [ ] **[US-121]** Table `companies`, rattachement au SIREN, fiche entreprise et badges RSE.

## 🔗 Dépendances

- Le propriétaire doit avoir souscrit les deux API sur son application francetravail.io. Une API
  non souscrite authentifie mais refuse tous les appels — c'est ce qui a coûté une demi-journée sur
  Offres d'emploi.
- Aucune variable nouvelle : les deux API passent par la même clé que Offres d'emploi.
