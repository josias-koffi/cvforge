<!-- generated-by: run-agent analyst (E17 — décision produit 2026-09-17) -->

# Sprint 023

## 🎯 Sprint Goal

Épic **E17 — Gestion utilisateurs avancée (admin)**. À l'issue du sprint, l'admin dispose d'une
table utilisateurs cherchable/filtrable/paginée côté serveur, d'une fiche utilisateur complète, de
la suspension/réactivation, d'une suppression RGPD prouvée par test d'intégration, de la
rétrogradation admin→user, d'un journal d'audit et de la révocation de session.

Cible unique côté front : `apps/web` (gabarit ADR-008). `apps/app` est gelé et n'est pas touché.

> ⚠️ **RÈGLE DE SÉCURITÉ NON NÉGOCIABLE (vision `§3.2`)** : le rôle `admin` ne peut JAMAIS être
> attribué depuis `/admin/users` ou toute action admin. Seule voie : le lien d'invitation nominatif
> (US-011). US-093 n'implémente QUE admin → user. Le durcissement lui-même a été avancé en
> **US-096 (sprint 022)** ; US-093 en vérifie la tenue et ajoute la garde « dernier admin ».

## 📅 Period

- Start: 2026-09-17
- End: 2026-09-17 (exécuté dans la continuité du sprint 022)

## ✅ Tasks (3–8 max)

> **Ordre strict** : US-088 est obligatoire avant toute autre story de ce sprint. L'audit peut
> révéler que US-089 à US-095 sont partiellement déjà livrées et redéfinir leur périmètre.

- [x] **[US-088]** Audit de l'existant gestion utilisateurs (aucun code)
  - Agent: `analyst` + `product-owner`
  - Workflow: `run-agent analyst`
  - Acceptance criteria:
    - [x] Produit `.project/audits/user-management-20260917.md`
    - [x] Confronte `/admin/users`, US-033, US-082, US-036 à la vision `§13.2`/`§15.1`
    - [x] Pour chaque US-089→095 : état réel (livré / partiel / absent) avec fichiers et lignes
    - [x] Aucun fichier de code modifié
    - [x] Porte au propriétaire les 4 décisions d'architecture non couvertes par l'énoncé (voir « To Clarify »)
  - Source: vision `§13.2`, `§15.1`
  - Résultat : US-093 ✅ déjà livré (par US-096) · US-089 et US-092 ⚠️ partiels · US-090, US-091,
    US-094, US-095 ❌ absents. L'audit **révise l'ordre d'exécution** : US-094 (journal) d'abord,
    puis US-091+US-095 **ensemble** (la suspension sans révocation de session est une fausse
    promesse), puis US-092, puis US-089/090, US-093 en finition.

- [x] **[US-089]** Recherche, filtres et pagination serveur sur la table utilisateurs
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Recherche par email, filtres rôle / statut / solde (bandes), pagination serveur
    - [x] Filtres reflétés dans l'URL
    - [x] Filtre, tri et pagination **en SQL** (`PgAdminUsersStore`) : 2 requêtes quel que soit le nombre de comptes, + 1 pour les octrois de la page — au lieu d'un filtre JS et d'une requête par compte
  - Source: vision `§13.2`

- [x] **[US-090]** Fiche `/admin/users/[id]`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Profil, candidatures, historique crédits, statut compte, date de révocation des sessions
    - [x] Actions rapides inline (`UserQuickActions`, mêmes dialogues que la table)
    - [x] WCAG 2.1 AA (listes de définition, statuts en texte et non en couleur seule)
    - [x] Fichiers ≤ 400 lignes
  - Source: vision `§13.2`
  - Écart assumé : « sessions actives » devient **la date de dernière révocation**, pas une liste
    par appareil — conséquence directe de la décision d'architecture n°1 (colonne
    `sessions_valid_from` plutôt qu'une table de sessions). Les candidatures sont résumées
    (titre, entreprise, statut, présence CV/LM), jamais le contenu des documents.

- [x] **[US-091]** Suspension / réactivation de compte
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Magic link refusé si le compte est suspendu (403 explicite)
    - [x] Données intactes (suspension ≠ suppression), vérifié par test
    - [x] Réactivation restaure l'accès **sans** ressusciter les cookies déjà révoqués
    - [x] Suspension **immédiate** : les sessions en cours tombent aussitôt (cf. US-095)
  - Source: vision `§13.2` · ⚠️ `auth_accounts` n'a pas de colonne `status` → migration requise (CHECK à mettre à jour) ; point d'application à décider (demande de magic link, consommation, `requireSession`)

- [x] **[US-092]** Suppression RGPD complète
  - Agent: `developer` + `tech-lead` + `qa-reviewer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Double confirmation par saisie de l'email (front **et** API)
    - [x] Supprime : profil, candidatures, documents, sessions + chunks d'entretien, ledger crédits, notifications, compte auth
    - [x] Test d'intégration prouvant l'absence de données résiduelles
    - [x] **Test vérifié réellement vert** : il remplit chaque table, purge, puis scanne *toutes* les colonnes texte du schéma ; il affirme aussi que le scan trouve des lignes **avant** la purge, sinon il ne prouverait rien
  - Source: vision `§13.2`, `§15.1`
  - Décision produit : les `credit_orders` payées sont **anonymisées, pas supprimées** (pièces
    comptables) ; idem pour la cible des entrées du journal d'audit, afin que l'action reste
    auditable sans conserver l'adresse effacée. ⚠️ À confirmer avec ton comptable.

- [x] **[US-093]** Rétrogradation admin → user uniquement
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Jamais de promotion user → admin (réservée à l'invitation US-011)
    - [x] Rétrogradation bloquée si dernier admin
    - [x] Durcissement US-096 vérifié : 3 niveaux de test, dont le chemin complet
  - Source: vision `§3.2`, `§13.2`

- [x] **[US-094]** Journal d'audit `/admin/audit-log`
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Enregistre qui / quand / quoi / sur qui / note (+ métadonnées : crédits, rôle perdu)
    - [x] Couvre suspension, réactivation, suppression, rétrogradation, octroi de crédits **et** révocation de sessions
    - [x] Table append-only avec CHECK sur l'action ; écran `/admin/audit-log` filtrable
  - Source: vision `§13.2` · ⚠️ aucun journal n'existe (aucune table, aucun identifiant `audit` dans le code) ; seule trace actuelle : la ligne de ledger `type:"admin_grant"` + `metadata.adminEmail`

- [x] **[US-095]** Déconnexion forcée / révocation de session
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Révocation déclenchable depuis la fiche utilisateur **et** depuis la table
    - [x] La session révoquée est refusée immédiatement (`SessionStateMiddleware`), sans attendre son expiration
  - Source: vision `§13.2` · ⚠️ sessions = cookie HMAC sans état, aucune révocation possible aujourd'hui — dépend de la décision d'architecture portée par US-088

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green (592 tests API, 34 web)
- [x] Coverage ≥ spec threshold sur le nouveau code
- [x] QA review ✅
- [x] Gate sécurité `§3.2` : aucun chemin de code ne promeut user→admin
- [x] Gate RGPD : test d'intégration US-092 vert, aucune donnée résiduelle
- [ ] Rapport de contraste WCAG 2.1 AA **outillé** (axe) — revue manuelle faite ; `apps/web` n'a
      ni tests de composants ni axe en CI (dette notée)

## 🚧 Risks

- ~~US-091/095 inopérantes sans révocation~~ → résolu : `SessionStateMiddleware` applique statut et révocation à chaque requête authentifiée.
- Le middleware ajoute **une lecture indexée par requête authentifiée**. Acceptable à cette échelle, à surveiller si le trafic monte (un cache courte durée par email serait le prochain pas).
- US-092 : une purge élargie aux `credit_orders` peut entrer en conflit avec les obligations de conservation comptable — question fiscale à arbitrer, pas technique.
- Doublons de surface : `GET /admin/users` et `GET /credits/admin/users` appellent le même builder, et l'écran admin v1 `apps/app/app/admin/page.tsx` existe encore. Consolider avant d'ajouter de la surface.
- Les magic links vivent dans une `Map` en mémoire de processus : ils ne survivent pas à un redémarrage et cassent en multi-instance. Hors périmètre E17 mais à surveiller si la suspension s'applique à ce niveau.

## ⚠️ To Clarify

_Tranché le 2026-09-17, sauf le point 4 :_

1. ~~**Révocation de session**~~ → colonne `sessions_valid_from` sur `auth_accounts`, comparée à
   `issuedAt`. Appliquée dans un `SessionStateMiddleware` global plutôt que dans chaque handler :
   `requireSession` est synchrone et le rendre asynchrone touchait ~65 points d'appel.
2. ~~**Suspension**~~ → colonne `status` + CHECK (migration `0011`), appliquée à la demande de
   magic link **et** à chaque requête authentifiée (même middleware), donc effet immédiat.
3. ~~**Périmètre RGPD**~~ → entretiens supprimés ; `credit_orders` **anonymisées** (comptabilité).
4. ⏳ **Consolidation encore ouverte** : `GET /credits/admin/users` n'est plus utilisée par
   `apps/web` mais l'est toujours par `apps/app` (v1 gelée). Route conservée pour ne pas casser la
   v1 sans accord. Décision attendue : corriger la v1, ou la retirer du build et supprimer la
   route + `credits/admin-user-directory.ts`.

## 🔁 Workflow Runs

_(à compléter à l'exécution)_
