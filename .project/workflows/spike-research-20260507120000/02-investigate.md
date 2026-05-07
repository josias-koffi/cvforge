# Stage 2 — Investigate

**Agent**: Analyst
**Date**: 2026-05-07
**Task**: US-052

---

## Finding 1 — Import PDF d'offre

### Contexte technique existant

Le backend dispose déjà de :
- Mistral Small 4 multimodal (vision) avec pipeline PDF → rasterisation → base64 (utilisé pour CV/documents)
- MinIO pour le stockage des fichiers (PDF, audio)
- BullMQ pour les jobs asynchrones (génération PDF, emails)
- Une route `/candidatures` avec scraping URL + fallback textarea

### Option A — Upload PDF → extraction texte serveur (pdf-parse / pdfjs-dist)

| Critère | Évaluation |
|---|---|
| Effort d'implémentation | Faible — `pdf-parse` ou `pdfjs-dist` s'intègre en 1 service NestJS |
| Qualité extraction | Bonne pour PDF textuels natifs, mauvaise pour PDF scannés |
| Coût | Nul (traitement local) |
| RGPD | Minimal — pas d'envoi externe si extraction locale |
| Cas d'échec | PDF scanné → sortie vide ou illisible |

### Option B — Upload PDF → rasterisation → Mistral vision (alignée stack existante)

| Critère | Évaluation |
|---|---|
| Effort d'implémentation | Moyen — réutilise le pipeline multimodal déjà en place |
| Qualité extraction | Excellente y compris pour PDF scannés/images |
| Coût | Tokens Mistral consommés (< 0.01€/page typique) |
| RGPD | Attention : si le PDF contient des données personnelles (nom candidat), il transite vers l'API Mistral — §15 exige que aucune donnée personnelle sensible ne soit transmise |
| Cas d'échec | Timeout sur PDF très longs (>10 pages) |

### Option recommandée (hybride)

**Option A en premier, Option B en fallback** :
1. Tentative extraction texte locale (`pdfjs-dist`) — gratuit, RGPD-safe
2. Si résultat < 100 tokens → fallback rasterisation Mistral avec avertissement utilisateur sur la transmission

**Implémentation proposée** (scope V2.0) :
```
POST /candidatures/:id/offer-pdf
  → upload PDF → MinIO (stockage temporaire)
  → BullMQ job: pdf-extract
  → extractTextLocal() → si OK → retourner texte
  → sinon → rasterize() → Mistral vision → retourner texte
  → stocker dans candidature.offerRawText
  → supprimer fichier MinIO après extraction (RGPD)
```

**Contrainte ADR** : L'ajout de `pdfjs-dist` (ou `pdf-parse`) est une nouvelle dépendance → nécessite ADR-006.

---

## Finding 2 — Connexion sociale Google/LinkedIn

### Architecture passwordless existante

Le système actuel utilise magic links (email → JWT). Il n'y a pas de mot de passe. L'ajout OAuth2 doit être additionnel, pas de remplacement.

### Analyse providers OAuth2

| Critère | Passport.js (NestJS natif) | Auth.js v5 (next-auth) | NextAuth intégré |
|---|---|---|---|
| Compatibilité NestJS | Native (passport-google-oauth20, passport-linkedin-oauth2) | Complexe — conçu pour Next.js uniquement | Non applicable backend |
| Compatibilité Next.js | Via proxy backend | Native | Native |
| Maintenance | Stable, active | Active v5 stable | N/A |
| Effort | Moyen — 2 stratégies Passport + guards | Faible front, moyen backend sync | — |

**Recommandation** : Passport.js côté NestJS, avec les stratégies `passport-google-oauth20` et `passport-linkedin-oauth2`. Le frontend délègue l'initiation OAuth au backend (/auth/google, /auth/linkedin) — cohérent avec l'architecture passwordless actuelle où le backend contrôle les sessions.

### Impacts sécurité

| Risque | Mitigation |
|---|---|
| Token leakage (OAuth callback interception) | PKCE obligatoire pour Google OAuth2 (code_challenge) |
| Session fixation | Régénérer le session token après OAuth callback |
| Scope over-permissive LinkedIn | Demander uniquement `r_emailaddress` + `r_liteprofile` — pas r_fullprofile |
| Compte existant linkage | Si un compte passwordless existe avec le même email → lier automatiquement, ne pas créer un doublon |

### Impacts RGPD

| Point | Évaluation |
|---|---|
| Transfert données hors UE | Google (transfert US) → nécessite clauses contractuelles standard (SCC) ou vérification Privacy Shield II |
| LinkedIn (Microsoft) | Transfert US → même exigence SCC |
| Données collectées | Email + nom d'affichage + avatar (optionnel) — pas de données sensibles |
| Consentement | La page de connexion doit informer que les données sont transmises à Google/LinkedIn |
| Droit à l'effacement | La suppression de compte doit révoquer les tokens OAuth côté provider (revocation endpoint) |

**Verdict RGPD** : Faisable mais nécessite mention dans la politique de confidentialité et implémentation d'un endpoint de révocation de token. L'essentiel est le SCC avec Google et Microsoft (déjà standard dans toute app utilisant ces providers).

### Contrainte ADR

L'ajout d'un nouveau auth provider est une modification d'architecture d'authentification → **ADR obligatoire** (§5 engineering-standards). Créer ADR-007-social-login.md.

---

## Unknowns et trade-offs

| Inconnu | Impact | Résolution suggérée |
|---|---|---|
| LinkedIn peut changer ses scopes V2 API | Moyen | Vérifier la doc LinkedIn API au moment de l'implémentation |
| Taille max PDF offre à accepter | Faible | Limiter à 5MB (≤ 50 pages) — suffisant pour une offre d'emploi |
| Politique de rétention des PDF uploadés | Moyen (RGPD) | Supprimer immédiatement après extraction (pas de stockage permanent) |
| Compte linkage si même email sur 2 providers | Moyen | Décider : merge automatique ou demander confirmation utilisateur |

## Pass Criteria

- [x] Findings documentés dans le time box
- [x] Unknowns et trade-offs explicites
- [x] Options chiffrées et sourcées
