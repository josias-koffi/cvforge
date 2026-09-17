<!-- generated-by: run-agent analyst (E16 — décision produit 2026-09-17) -->

# Sprint 022

## 🎯 Sprint Goal

Épic **E16 — Supervision solde IA & pilotage revenus admin**, précédé du hotfix sécurité **US-096**
(violation de la règle non négociable vision `§3.2` constatée dans le code livré). À l'issue du
sprint : l'admin voit le solde OpenRouter, est alerté avant rupture, ne peut plus vendre de crédits
sous seuil critique, et dispose d'un dashboard métriques produit + revenus exportable en CSV.

Cible unique côté front : `apps/web` (gabarit ADR-008). `apps/app` est gelé et n'est pas touché.

## 📅 Period

- Start: 2026-09-17
- End: 2026-10-02

## ✅ Tasks (3–8 max)

- [x] **[US-096]** Hotfix `§3.2` : rendre la promotion user→admin impossible par toute action admin
  - Agent: `developer` + `qa-reviewer` + `tech-lead`
  - Workflow: `developer-qa-reviewer-tech-lead` (pas de phase design — on retire de la surface)
  - Acceptance criteria:
    - [x] `AuthService.demoteAccountToUser` (ex-`updateAccountRole`) refuse tout rôle autre que `"user"` en `BadRequestException`, message renvoyant à l'invitation nominative (US-011)
    - [x] La garde « impossible de retirer le dernier administrateur » (`ConflictException`) est conservée
    - [x] `PATCH /admin/users/:email` n'accepte plus que `role: "user"` → 400 sur `{role:"admin"}`
    - [x] Le select de rôle disparaît du dialogue d'édition `/admin/users` ; remplacé par `DemoteUserDialog` (`AlertDialog` de confirmation), action visible seulement si la cible est admin
    - [x] `RoleSelect` reste utilisé par `InviteUserDialog` (seule voie légitime vers `admin`)
    - [x] Tests de non-régression : 3 niveaux — service (`auth.service.test.ts`), contrôleur mocké, et **chemin complet contrôleur→service réel→store** prouvant qu'aucune couche ne promeut
  - Source: vision `§3.2` — ajout hors énoncé, validé le 2026-09-17
  - Renforcement au-delà de l'énoncé : le **contrat de store** lui-même a été réduit
    (`updateRole(email, role)` → `demoteToUser(email)`), donc la promotion n'est plus seulement
    refusée, elle n'est plus exprimable dans le code. Couverture : `admin-users.controller.ts` 100 %,
    `auth.pg-store.ts` 100 % lignes.

- [x] **[US-083]** Service `OpenRouterBalanceService` (cache mémoire TTL 5 min)
  - Agent: `analyst` + `developer`
  - Workflow: `analyze-dev-review` (aucune UI)
  - Acceptance criteria:
    - [x] Retourne `{totalCredits, totalUsage, remaining}` depuis `GET {OPENROUTER_BASE_URL}/credits`
    - [x] Cache mémoire TTL 5 min ; aucune nouvelle dépendance (pas de cron/Redis/BullMQ)
    - [x] Fallback stale + flag `stale:true` si échec réseau ; `null` si aucune valeur en cache
    - [x] Tests cache hit / cache miss / expiration / échec réseau / 403 / 5xx / réponse incomplète / service désactivé
    - [x] `OPENROUTER_MANAGEMENT_API_KEY` absente → service désactivé proprement, `app.module.boot.test.ts` vérifié vert **sans** la variable
    - [x] `.env.example` documente `OPENROUTER_MANAGEMENT_API_KEY` et `OPENROUTER_BALANCE_ALERT_THRESHOLD` (+ `OPENROUTER_BASE_URL` et `CREDITS_LOW_BALANCE_THRESHOLD`, jusqu'ici absents)
  - Source: décision produit 2026-09-17 · ⚠️ `GET /api/v1/credits` exige une **management key** (la clé d'inférence reçoit un 403)
  - Livré : `src/ai/openrouter-balance.{config,service}.ts` + token `OPENROUTER_BALANCE_SERVICE`.
    Couverture du nouveau code : **98,7 % lignes / 92,3 % branches**. Horloge injectable (`now`)
    pour tester le TTL sans faux timers. **Reste à faire hors code** : créer la clé de management
    sur le dashboard OpenRouter et la provisionner (local, staging, production) — sans elle la
    supervision reste inerte.

- [x] **[US-084]** `GET /admin/metrics/openrouter-balance` + alerte in-app sous seuil
  - Agent: `developer` + `qa-reviewer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Endpoint protégé rôle admin (403 sinon) via `requireAdminSession` ; 401 sans session
    - [x] Alerte in-app si `remaining < OPENROUTER_BALANCE_ALERT_THRESHOLD`, envoyée à **tous** les admins (fan-out `listAccounts()`), jamais aux users
    - [x] Alerte non dupliquée : 1×/jour tant que le seuil reste bas
    - [x] Évaluation par `setInterval` quotidien (pattern `interview-purge.service.ts`, Node pur), + une vérification au démarrage ; échec journalisé sans faire tomber l'API
  - Source: décision produit 2026-09-17 · ⚠️ le système de notifications n'a aucun chemin d'écriture : prévoir méthode de création publique + nouveau type + fan-out `AuthService.listAccounts()` + garde de déduplication
  - Livré : nouveau module `src/metrics/` (16e module) — `AdminMetricsController`,
    `OpenRouterBalanceAlertService`. Ajout du type de notification
    `openrouter_low_balance` (aucune migration : la colonne `type` n'a pas de CHECK) et de la
    primitive d'écriture **générique** `NotificationsService.createOncePerDay()` — premier chemin
    d'écriture du système, réutilisable pour toute alerte à cadence quotidienne. Une alerte sur
    solde périmé le signale dans son texte. Couverture : contrôleur 100 %, service d'alerte 100 %.

- [x] **[US-085]** Garde-fou achat de crédits sous seuil critique
  - Agent: `developer` + `qa-reviewer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [x] Checkout bloqué (503 + message explicite) si solde OpenRouter sous seuil critique, **avant** création de la commande (aucune commande `pending` orpheline, aucun appel Stripe)
    - [x] Test avec solde simulé = 0 → achat bloqué
    - [x] Bandeau front explicite sur `/credits` + boutons d'achat désactivés
  - Source: décision produit 2026-09-17 · ⚠️ `POST /credits/checkout` n'existe pas — la cible est `POST /billing/checkout-sessions` (`billing.controller.ts:33`), accroche `checkout.service.ts:30-34`
  - Décisions prises : (1) nouveau seuil distinct `OPENROUTER_BALANCE_CRITICAL_THRESHOLD`,
    **défaut 0** — une vente n'est refusée qu'une fois le compte réellement vide, jamais sur un
    solde simplement bas (le seuil d'alerte, lui, vaut 5) ; (2) **échec ouvert** : supervision
    désactivée ou solde illisible ⇒ la vente passe (bloquer tout le chiffre d'affaires sur une
    panne de supervision coûte plus que la rare vente de trop) ; un solde **périmé mais
    connu vide** bloque quand même ; (3) nouvel endpoint `GET /billing/purchase-availability`
    renvoyant un booléen + un motif — un acheteur n'a pas à connaître le solde du fournisseur.
    Variante `warning` ajoutée à `components/ui/alert.tsx` (le token existait, la variante non).
    Couverture : `checkout.service.ts` 100 %.

- [ ] **[US-086]** Dashboard admin `/admin/metrics`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Métriques : CV/LM générés, interviews, utilisateurs actifs, crédits vendus vs consommés, CA Stripe, coût API estimé, marge nette
    - [ ] Calculs côté `apps/api` — aucune logique métier dans `apps/web`
    - [ ] Fichiers ≤ 400 lignes, découpage par carte de métrique
    - [ ] WCAG 2.1 AA
    - [ ] Entrée de navigation admin ajoutée (`components/layout/app-sidebar.tsx:32`)
  - Source: décision produit 2026-09-17, ADR-008 · ⚠️ pas de colonne `lastLoginAt` (utilisateurs actifs à dériver d'une fenêtre d'activité) ; CA en EUR cents vs usage OpenRouter en USD → expliciter la conversion

- [ ] **[US-087]** Export CSV des métriques
  - Agent: `developer`
  - Workflow: `analyze-dev-review`
  - Acceptance criteria:
    - [ ] CSV horodaté, mêmes métriques que le dashboard
    - [ ] Réutilise `escapeCsvCell`/`toCsv` (`apps/api/src/templates/templates.service.ts:360-390`) et le gabarit de route de téléchargement `apps/web/app/(app)/candidatures/[id]/export/route.ts`
  - Source: décision produit 2026-09-17

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold (80 % global / 90 % nouveau code)
- [ ] QA review ✅
- [ ] Gate sécurité US-096 : aucun chemin de code ne promeut user→admin (vision `§3.2`)
- [ ] Gate : aucune nouvelle dépendance introduite sans ADR validée
- [ ] Rapport de contraste WCAG 2.1 AA passé sur `/admin/metrics`

## 🚧 Risks

- US-096 : la rétrogradation reste sans effet immédiat tant que les sessions ne sont pas révocables (cookie HMAC sans état, valide jusqu'à 7 j) — traité en E17 (US-095), à mentionner dans l'UI.
- US-083/084 : la clé de management OpenRouter est un secret supplémentaire à provisionner sur chaque environnement (local, staging, production) avant que l'alerte ne serve à quelque chose.
- US-086 : « coût API estimé » et « marge nette » reposent sur un cumul OpenRouter en USD et un CA en EUR ; sans coût persisté par génération, la marge par période reste une estimation — l'assumer explicitement dans l'UI.
- US-086 : `credit_ledger_entries` n'a pas d'index sur `created_at` seul — les agrégats par période feront un table scan si on ne l'ajoute pas.

## ⚠️ To Clarify

Bloquant pour US-086 :

- Taux de conversion USD→EUR pour la marge nette : fixe en configuration, ou saisi par l'admin ?
- Définition retenue de « utilisateur actif » (fenêtre 7 j / 30 j, sur quelle activité ?).

Tranché le 2026-09-17 :

- ~~Seuil critique de US-085 : identique au seuil d'alerte, ou distinct ?~~ → seuil distinct
  `OPENROUTER_BALANCE_CRITICAL_THRESHOLD`, défaut 0, avec échec ouvert (cf. note US-085).

## 🔁 Workflow Runs

_(à compléter à l'exécution)_
