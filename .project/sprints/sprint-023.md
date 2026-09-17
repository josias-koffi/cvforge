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

- Start: à planifier après le sprint 022
- End: à planifier

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

- [ ] **[US-089]** Recherche, filtres et pagination serveur sur la table utilisateurs
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [ ] Recherche par email, filtres rôle / statut / solde, pagination serveur
    - [ ] Filtres reflétés dans l'URL (pattern `navigate()` existant, `users-table.tsx:107-114`)
    - [ ] Filtre, tri et pagination poussés en SQL — plus de `listAccounts()` suivi d'un filtre JS, plus de requête par compte
  - Source: vision `§13.2`

- [ ] **[US-090]** Fiche `/admin/users/[id]`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Profil, candidatures, historique crédits, statut compte, sessions actives
    - [ ] Actions rapides inline (sans page dédiée)
    - [ ] WCAG 2.1 AA
    - [ ] Fichiers ≤ 400 lignes
  - Source: vision `§13.2`

- [ ] **[US-091]** Suspension / réactivation de compte
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [ ] Magic link refusé si le compte est suspendu
    - [ ] Données intactes (suspension ≠ suppression)
    - [ ] Réactivation restaure l'accès
  - Source: vision `§13.2` · ⚠️ `auth_accounts` n'a pas de colonne `status` → migration requise (CHECK à mettre à jour) ; point d'application à décider (demande de magic link, consommation, `requireSession`)

- [ ] **[US-092]** Suppression RGPD complète
  - Agent: `developer` + `tech-lead` + `qa-reviewer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [ ] Double confirmation par saisie de l'email
    - [ ] Supprime : profil, candidatures, documents, audio interviews, transactions crédits
    - [ ] Test d'intégration prouvant l'absence de données résiduelles
    - [ ] **La story n'est cochée que si ce test passe réellement**
  - Source: vision `§13.2`, `§15.1` · ⚠️ `purgeAccount` ne touche aujourd'hui ni `interview_sessions`/`interview_chunks` (pas de `deleteByUserEmail` sur `InterviewStore`) ni `credit_orders`

- [ ] **[US-093]** Rétrogradation admin → user uniquement
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [ ] Jamais de promotion user → admin (réservée à l'invitation US-011)
    - [ ] Rétrogradation bloquée si dernier admin
    - [ ] Vérifie que le durcissement US-096 tient toujours
  - Source: vision `§3.2`, `§13.2`

- [ ] **[US-094]** Journal d'audit `/admin/audit-log`
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Enregistre qui / quand / quoi / sur qui / note
    - [ ] Couvre suspension, réactivation, suppression, rétrogradation, octroi de crédits
  - Source: vision `§13.2` · ⚠️ aucun journal n'existe (aucune table, aucun identifiant `audit` dans le code) ; seule trace actuelle : la ligne de ledger `type:"admin_grant"` + `metadata.adminEmail`

- [ ] **[US-095]** Déconnexion forcée / révocation de session
  - Agent: `developer` + `tech-lead`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [ ] Révocation déclenchable depuis la fiche utilisateur
    - [ ] La session révoquée est refusée immédiatement, sans attendre son expiration
  - Source: vision `§13.2` · ⚠️ sessions = cookie HMAC sans état, aucune révocation possible aujourd'hui — dépend de la décision d'architecture portée par US-088

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold (80 % global / 90 % nouveau code)
- [ ] QA review ✅
- [ ] Gate sécurité `§3.2` : aucun chemin de code ne promeut user→admin
- [ ] Gate RGPD : test d'intégration US-092 vert, aucune donnée résiduelle
- [ ] Rapport de contraste WCAG 2.1 AA passé sur `/admin/users`, `/admin/users/[id]`, `/admin/audit-log`

## 🚧 Risks

- US-091/095 sont inopérantes tant que la révocation de session n'est pas tranchée : un compte suspendu garde l'accès jusqu'à 7 jours avec son cookie existant.
- US-092 : une purge élargie aux `credit_orders` peut entrer en conflit avec les obligations de conservation comptable — question fiscale à arbitrer, pas technique.
- Doublons de surface : `GET /admin/users` et `GET /credits/admin/users` appellent le même builder, et l'écran admin v1 `apps/app/app/admin/page.tsx` existe encore. Consolider avant d'ajouter de la surface.
- Les magic links vivent dans une `Map` en mémoire de processus : ils ne survivent pas à un redémarrage et cassent en multi-instance. Hors périmètre E17 mais à surveiller si la suspension s'applique à ce niveau.

## ⚠️ To Clarify

_Les 4 décisions que l'audit US-088 doit porter au propriétaire avant tout code E17 :_

1. **Révocation de session** (US-091/095) : colonne `sessionEpoch`/`revokedAt` sur `auth_accounts` vérifiée dans `verifySessionCookie` (léger, pas de nouvelle table) **ou** vraie table de sessions ?
2. **Suspension** (US-091) : colonne `status` sur `auth_accounts` + mise à jour du CHECK (migration `0011`), et point d'application exact ?
3. **Périmètre RGPD** (US-092) : ajouter `deleteByUserEmail` à `InterviewStore` et purger `credit_orders`, ou conserver les commandes anonymisées pour la comptabilité ?
4. **Consolidation** : fusionner `GET /admin/users` et `GET /credits/admin/users` ? Confirmer que E17 ne touche que `apps/web` (`apps/app` gelé) ?

## 🔁 Workflow Runs

_(à compléter à l'exécution)_
