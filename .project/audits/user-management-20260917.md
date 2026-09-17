<!-- generated-by: run-agent analyst (US-088) -->

# Audit — Gestion des utilisateurs (admin) vs vision §13.2 / §15.1

- **Date** : 2026-09-17
- **Story** : US-088 (E17, sprint 023) — audit sans code
- **Périmètre** : `/admin/users` (apps/web v2), US-033 (panel admin utilisateurs et crédits),
  US-082 (refonte table admin), US-036 (RGPD), vision `§13.2` et `§15.1`
- **Base de code auditée** : `develop` @ `d57ec66`

> **Fait majeur découvert pendant l'audit** — la règle non négociable vision `§3.2` était **violée
> dans le code livré** : `PATCH /admin/users/:email` acceptait `{role:"admin"}` et l'UI exposait un
> select « Administrateur ». Corrigé immédiatement par **US-096** (sprint 022) avant la suite de E17 :
> le contrat de store lui-même a été réduit à `demoteToUser(email)`, la promotion n'est plus
> exprimable dans le code. US-093 se limite donc à vérifier que la garde tient et à couvrir la
> règle « dernier admin ».

---

## 1. Tableau de conformité vision §13.2

| Fonctionnalité attendue (§13.2) | État | Où |
| --- | --- | --- |
| Liste des utilisateurs — tableau paginé avec recherche/filtre | ⚠️ **Partiel** | `GET /admin/users?page&pageSize&query&role` (`apps/api/src/admin/admin-users.controller.ts:39`) ; table `apps/web/components/admin/users-table.tsx`. Recherche + filtre rôle + pagination existent et sont reflétés dans l'URL — mais tout est calculé **en mémoire** (voir §3) |
| Fiche utilisateur — profil, candidatures, crédits, activité | ❌ **Absent** | Aucune route `/admin/users/[id]` (`apps/web/app/(app)/admin/` ne contient que `users/` et `offers/`) |
| Créer un lien d'invitation | ✅ **Livré** | `POST /auth/invitations` (`auth.controller.ts:57`) + `InviteUserDialog` ; usage unique, TTL 48 h en base (`auth_invitations`) |
| Attribuer des crédits avec note | ✅ **Livré** | `POST /credits/admin/grants` (`credits.controller.ts:78`) ; note obligatoire côté serveur (`credits.service.ts:112-117`) **et** client (`user-dialogs.tsx`) |
| Désactiver un compte — suspension sans suppression | ❌ **Absent** | Aucune notion de statut : `auth_accounts` = `email, role, consent, created_at` (`database/schema/auth.ts:12-26`) |
| Supprimer un compte — suppression RGPD complète | ⚠️ **Partiel** | `DELETE /admin/users/:email` → `PrivacyService.purgeAccount` (`privacy.service.ts:80`) ; couverture incomplète (voir §5) |

## 2. État story par story

### US-089 — Recherche, filtres, pagination serveur · ⚠️ partiellement livré

Déjà là : recherche par email, filtre rôle, pagination, plafond `MAX_ADMIN_PAGE_SIZE = 100`,
enveloppe `{filters, pagination, users}`, filtres reflétés dans l'URL via `navigate()`
(`users-table.tsx:107-114`).

Manque :
- **Filtre par statut** — impossible tant que la colonne de statut n'existe pas (dépend de US-091).
- **Filtre par solde** — absent.
- **Pagination réellement serveur** : `buildAdminUserDirectory` (`credits/admin-user-directory.ts:22-84`)
  charge `listAccounts()` (tous les comptes), puis filtre/trie/pagine en JS, **et appelle
  `creditsService.getSummaryForUser` une fois par compte retenu**. Coût O(n) requêtes. À pousser en SQL.
- **Tri** figé (`lastActivityAt desc, email asc`), non paramétrable.
- Doublon : `GET /credits/admin/users` (`credits.controller.ts:52`) appelle le même builder avec
  `maxPageSize: 20`. Deux routes pour un écran.

### US-090 — Fiche `/admin/users/[id]` · ❌ absent

Aucune page. Les briques existent partiellement côté API :
- Crédits d'un utilisateur : `GET /credits/users/:userEmail` (`credits.controller.ts:37`, admin).
- Profil : `ProfilesStore` par email, **aucun endpoint admin**.
- Candidatures : `ApplicationsStore.listByUserEmail` existe, **aucun endpoint admin**
  (`applications.controller.ts` est entièrement scopé session).
- Sessions actives : **impossible** aujourd'hui (voir US-095).
- Le front reçoit déjà `consent` et `lastManualGrant` de l'API mais ne les déclare pas dans
  `AdminUserRow` (`apps/web/lib/admin.ts`) — données disponibles non exploitées.

### US-091 — Suspension / réactivation · ❌ absent

Aucun statut de compte dans le code (grep `suspend|disabled|blocked|deactivat` → aucun résultat
métier). Travail requis : colonne `status` sur `auth_accounts` + mise à jour du CHECK (migration
`0011`), et point d'application.

⚠️ **Piège** : refuser le magic link ne suffit pas. Les sessions sont des cookies HMAC **sans état**
(`auth.service.ts:298-340`), valides jusqu'à 7 jours. Un utilisateur suspendu **déjà connecté garde
l'accès** jusqu'à expiration. La suspension n'est effective qu'avec la révocation (US-095) — les deux
stories doivent être livrées ensemble, sinon la fonctionnalité est mensongère.

### US-092 — Suppression RGPD complète · ⚠️ partiellement livré

`purgeAccount` (`privacy.service.ts:80-106`) supprime : candidatures (avec CV/LM/versions/rapports
embarqués), notifications, profils, entrées de ledger crédits, compte auth + invitations reçues ;
anonymise les références admin et l'émetteur des invitations émises.

Manque :
- **Sessions d'entretien et chunks** (`interview_sessions`, `interview_chunks`) : jamais touchés.
  `InterviewStore` n'a **pas** de `deleteByUserEmail` — seulement `purgeCompletedBefore(cutoff)`
  (rétention 30 j). L'« audio interviews » de l'énoncé survit donc à la suppression du compte
  jusqu'à 30 jours après la fin de session. *(Note : il n'y a pas de stockage objet branché ;
  l'audio n'existe que sous forme de transcription texte dans `interview_chunks`.)*
- **Commandes de crédits** (`credit_orders`) : non purgées.
- **Double confirmation par saisie de l'email** : existe côté self-service
  (`POST /privacy/delete-account` vérifie `confirmationEmail`), **absente du chemin admin** —
  `DELETE /admin/users/:email` purge directement.
- **Aucun test d'intégration** ne prouve l'absence de données résiduelles.

### US-093 — Rétrogradation admin → user uniquement · ✅ livré par US-096

`AuthService.demoteAccountToUser` refuse tout rôle ≠ `"user"` ; le store n'expose plus que
`demoteToUser(email)` ; garde « dernier admin » (`ConflictException`) en place ; 3 tests de
non-régression dont un sur le chemin complet contrôleur→service→store.

Reste pour US-093 : afficher explicitement dans l'UI que la rétrogradation ne prend effet qu'à la
prochaine connexion (tant que US-095 n'est pas livrée), et vérifier le cas « dernier admin » côté front.

### US-094 — Journal d'audit · ❌ absent

**Aucun journal d'audit dans le repo** : aucun identifiant `audit`/`auditLog`/`journal` dans
`apps/**` ou `packages/**`, aucune table dans `database/schema/`, aucune migration (`0000`→`0010`).

Seule trace actuelle d'une action admin : la ligne de ledger `type:"admin_grant"` + `note` +
`metadata.adminEmail`. **Les rétrogradations, suppressions et invitations ne laissent aucune trace**
(les invitations portent `created_by`, mais elles sont supprimées ou anonymisées à la purge).

Travail : nouvelle table `admin_audit_log` + migration, écriture depuis chaque action admin, écran
`/admin/audit-log`. À écrire avant US-091/092 si l'on veut que suspensions et suppressions soient
journalisées dès leur première utilisation.

### US-095 — Déconnexion forcée / révocation de session · ❌ absent, et bloqué par une décision d'archi

Il n'existe **aucun stockage de session** : pas de table, pas de `jti`, pas de compteur de version.
`clearSessionCookie()` et `POST /auth/logout` ne vident que le cookie du navigateur. L'UI l'admettait
d'ailleurs : « Le changement s'applique à la prochaine connexion de l'utilisateur ».

Conséquence : **aucune révocation n'est possible sans changement d'architecture** — c'est la
décision n° 1 ci-dessous.

---

## 3. Dette et doublons à traiter avant d'ajouter de la surface

1. `GET /admin/users` et `GET /credits/admin/users` appellent le même builder avec deux plafonds
   différents. Fusionner avant d'ajouter filtres et tri.
2. L'écran admin v1 `apps/app/app/admin/page.tsx` existe encore et duplique l'écran.
   **Position proposée : E17 ne touche que `apps/web`** (`apps/app` est gelé, cf. contexte §2).
3. `buildAdminUserDirectory` vit dans `src/credits/` alors qu'il sert l'admin — à déplacer si E17
   le réécrit en SQL.
4. Hors périmètre E17 mais à connaître : les magic links vivent dans une `Map` **en mémoire de
   processus** (`auth.service.ts:48`). Ils ne survivent pas à un redémarrage et cassent en
   multi-instance. Si la suspension s'applique au niveau du magic link, elle héritera de cette limite.

## 4. Ordre d'exécution recommandé (révisé par l'audit)

L'énoncé propose 089 → 095. L'audit recommande :

1. **US-094** (journal d'audit) **d'abord** — pour que suspension, suppression et rétrogradation
   soient journalisées dès leur première exécution plutôt que rétro-ajoutées.
2. **US-091 + US-095 ensemble** — la suspension sans révocation est une fausse promesse.
3. **US-092** (RGPD), qui bénéficie du journal.
4. **US-089** puis **US-090** (surface de lecture), après la consolidation des doublons.
5. **US-093** — finition UI, la garde serveur étant déjà livrée.

## 5. Décisions à trancher par le propriétaire avant tout code E17

1. **Révocation de session** (US-091/095) — colonne `sessionEpoch` (ou `revokedAt`) sur
   `auth_accounts`, vérifiée dans `verifySessionCookie` : léger, aucune table, révocation « tous
   appareils » uniquement. **Ou** vraie table de sessions : permet de lister/révoquer les sessions
   individuellement (ce que demande « sessions actives » de US-090), au prix d'une écriture par
   connexion et d'une migration plus lourde.
   *Recommandation : `sessionEpoch` maintenant, table de sessions seulement si US-090 exige
   vraiment la liste par appareil.*
2. **Suspension** (US-091) — colonne `status` sur `auth_accounts` + CHECK. Point d'application :
   à la demande de magic link, à sa consommation, **et** dans `requireSession` ? (Le troisième est
   nécessaire pour que la suspension soit immédiate.)
3. **Périmètre RGPD** (US-092) — ajouter `deleteByUserEmail` à `InterviewStore` : oui.
   Mais `credit_orders` : purger, ou conserver anonymisé pour la comptabilité ?
   **Question fiscale, pas technique** — une facture encaissée doit généralement être conservée.
4. **Consolidation** — fusionner `GET /admin/users` et `GET /credits/admin/users` ? Confirmer que
   E17 ne touche que `apps/web` ?

## 6. Synthèse

| Story | État |
| --- | --- |
| US-089 | ⚠️ partiel — recherche/filtre rôle/pagination OK ; statut, solde, tri et vraie pagination SQL manquants |
| US-090 | ❌ absent |
| US-091 | ❌ absent — migration + décision n° 2 |
| US-092 | ⚠️ partiel — manque interviews, `credit_orders`, double confirmation admin, test d'intégration |
| US-093 | ✅ livré (US-096) — reste la finition UI |
| US-094 | ❌ absent — table à créer |
| US-095 | ❌ absent — bloqué par la décision n° 1 |
