---
tags: [run/developer-20260924140000, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924140000/task]]"
next: "[[workflows/runs/developer-20260924140000/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-120

**Question ouverte du sprint, tranchée par ADR-024 §3** : créer une candidature spontanée est gratuit ; seuls le CV et la lettre coûtent les crédits habituels.

**Livré** :
- Nouveau type de source `spontaneous` (`APPLICATION_SOURCE_SPONTANEOUS`), sans migration : la colonne n'a pas de contrainte.
- `spontaneousApplication()` construit le brouillon à partir de la fiche La Bonne Boîte : entreprise, métier comme intitulé, ville, secteur. Pas d'exigences ni de missions : personne n'en a publié. Aucun appel au modèle.
- `POST profiles/:id/hiring-companies/:siret/apply` : seule une entreprise de la liste du candidat est acceptée (404 sinon). Un deuxième clic rouvre la candidature déjà créée pour ce profil. Passe par le magasin des candidatures : `applications.service.ts` (767 lignes) n'est pas touché.
- Génération : le bloc s'appelle « CANDIDATURE SPONTANÉE », sans texte brut. Le CV cible le métier, et la lettre n'évoque jamais d'annonce (règle 13, objet « Candidature spontanée — <métier> »).
- Web : bouton « Candidature spontanée » sur chaque carte, qui mène à la candidature. La page indique que la création est gratuite.

**Vérifié** : 1 717 tests API et 366 tests web passent ; lint API au vert, types de mes fichiers au vert. En réel, sur le compte de test : candidature créée pour EVERIENCE, le deuxième clic rouvre la même, un SIRET inconnu est refusé. Candidature supprimée ensuite. **Non vérifié en réel** : une génération de CV ou de lettre (appel au modèle et crédit) ; seuls le message et les consignes sont testés.
