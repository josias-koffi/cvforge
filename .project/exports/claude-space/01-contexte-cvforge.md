# CVForge — Contexte produit (synthèse au 15/09/2026)

> Document de reprise pour continuer le travail produit dans un projet Claude.
> Sources détaillées jointes : `02-vision-v0.7.md` (vision complète), `03-backlog-et-sprints.md`, `04-decisions-adr.md`, `05-engineering-standards.md`.
> Priorité en cas de contradiction : **ce document > ADR > backlog/sprints > vision** (la vision v0.7 date d'avril 2026 et n'a pas été mise à jour après plusieurs décisions produit).

---

## 1. Le produit en une phrase

**CVForge** est un SaaS grand public (FR/EN) qui aide un candidat à **générer un CV et une lettre de motivation optimisés ATS adaptés à une offre d'emploi**, à **suivre ses candidatures** et à **s'entraîner à l'entretien avec un agent vocal IA**, le tout payé **à l'usage via des crédits** (pas d'abonnement, pas de freemium).

### Parcours cœur
1. Connexion sans mot de passe (magic link).
2. Onboarding → profil de base (CV socle ; plusieurs profils possibles).
3. Création d'une candidature à partir d'une offre (URL scrapée, texte collé ou PDF).
4. Génération IA du CV puis de la LM, édition (formulaire + aperçu A4), export PDF/DOCX.
5. Suivi du statut de la candidature, notifications/rappels.
6. (v1) Entretien vocal simulé + rapport noté.

### Objectif actuel du propriétaire
Mettre **une version en ligne comme démonstration** de sa capacité à construire un produit complet en travaillant avec l'IA (développement piloté par agents : product-owner, analyst, designer, developer, qa-reviewer, tech-lead). La lisibilité de la démo prime sur l'exhaustivité fonctionnelle.

---

## 2. État réel du code (≠ vision)

### Monorepo (pnpm + Turborepo)
| Élément | Rôle | État |
|---|---|---|
| `apps/api` | NestJS 11 — API REST et logique métier | Actif, ~270 tests |
| `apps/web` | **Front v2** — Next.js 16, React 19.2, Tailwind v4, shadcn/ui (bloc `dashboard-01`), port 3100 | **Front de référence depuis le 15/09/2026** |
| `apps/app` | Front v1 — Next 15, mobile-first "Papier & Crayon" | Gelé, jugé confus en démo, à retirer à terme |
| `apps/landing` | Site vitrine | Existant |
| `packages/document-renderer` | Rendu A4 commun (aperçu = PDF) | Partagé |
| `packages/types`, `config`, `ui` | Types, config, UI v1 | `ui` non utilisé par `apps/web` |

### Écarts importants vs vision
- **Persistance** : l'API utilise des **stores JSON sur disque** (`.data/`), pas PostgreSQL/Prisma. Pas de Redis/BullMQ effectivement branché côté API.
- **Puck Editor retiré côté utilisateur** (juin 2026) : l'édition CV/LM se fait par **formulaire structuré + aperçu**. Puck n'était prévu que pour l'admin des templates ; l'admin templates n'est **pas exposé dans v2**.
- **Desktop-first** au lieu de mobile-first (décision du 26/04/2026, confirmée par v2).
- **Entretien vocal** : implémenté dans v1 (`apps/api/src/interview`), **volontairement absent de v2**.
- Dashboard v1 simplifié : graphiques avancés et carte partageable LinkedIn retirés.

### Modules API
`auth` (magic link, invitations, OAuth2 social — ADR-007), `profiles`, `applications` (offres, import URL/texte/PDF, statuts), `ai` (OpenRouter), `cv-generation`, `templates`, `credits`, `billing` (Stripe), `notifications`, `smtp` (Nodemailer), `privacy` (RGPD, purge compte), `interview`, `admin` (CRUD utilisateurs).

### Front v2 (`apps/web`) — routes
- Auth : `/login`, `/login/check-email`, `/login/success`, `/register/invitation`, `/forbidden`
- `/dashboard`
- `/offers`, `/offers/new`, `/offers/[id]`, `/offers/[id]/edit` (description + lien source modifiables), `/offers/[id]/cv`, `/offers/[id]/letter`
- `/profile`, `/credits`, `/notifications`
- `/admin/users` (CRUD, octroi de crédits avec note obligatoire)

Architecture : `apps/web` est un **BFF** (server components + server actions appellent l'API en relayant le cookie de session). Copie en **français**, composants shadcn, UI simple.

---

## 3. Stack & IA
- IA texte : **OpenRouter → Mistral Small 4** (`mistralai/mistral-small-2603`), `provider.only=["Mistral"]`, `zdr: true` systématique, prompts **pseudonymisés** (données identifiantes réinjectées localement).
- Audio (interview v1) : Voxtral Small (STT) + Voxtral TTS.
- Export : PDF via service Puppeteer, DOCX via `docx` ; import CV DOCX via `mammoth`.
- Paiement : Stripe. Email : Nodemailer/SMTP.
- Déploiement : Docker Compose (local = prod), Traefik + SSL en prod, image `docker/web.Dockerfile` pour v2 sur `WEB_DOMAIN`.

## 4. Modèle économique
- Pay-as-you-go, crédits sans expiration.
- **Starter 9,99 € = 550 crédits** · **Pro 19,99 € = 1 400 crédits**.
- Coûts : enrichissement entreprise 1 · CV 3 · LM 3 · import CV 2 · interview 10 min 10 → ~17 crédits / candidature complète.
- Coût API d'une candidature complète ≈ 0,01–0,04 € → marge ~80 %.
- Rôles : `user`, `admin` (1er compte = admin, invitations à usage unique 48 h). Rôle recruteur / organisations = V2.0 cadré mais non prioritaire.

## 5. Historique de livraison
- Sprints 001–015 : MVP → V1.1 → V1.2 (interview) → V2.0 (recruteur, import PDF, OAuth social) livrés sur `apps/app`.
- Sprints 016–019 (E15) : refonte UX desktop-first, partiellement exécutée.
- Sprint 020 : login/register, dashboard, notifications refondus (US-074/075/076 ✅) ; **US-077 onboarding non faite**.
- Sprint 021 (CV, LM, crédits, profil, admin sur `apps/app`) : **non démarré** — en pratique **dépassé par `apps/web`** (ADR-008), à re-planifier sur v2.
- 15/09/2026 : création de `apps/web` + endpoints `GET /applications/:id/offer`, `PATCH /applications/:id`, `POST /applications/:id/re-extract`, `GET|PATCH|DELETE /admin/users`.

## 6. Points ouverts / décisions à prendre
1. **Mise en ligne de la démo** : faire pointer `NEXT_PUBLIC_APP_URL` de l'API vers v2 (magic links et retours Stripe atterrissent encore sur v1 en prod).
2. **Retrait de `apps/app`** : quand et comment (redirections, domaine principal).
3. **Re-planifier le sprint 021 sur `apps/web`** et décider du sort de US-077 (onboarding) dans v2.
4. **Réintégrer ou non l'entretien vocal** dans v2 (fonction différenciante mais complexe pour une démo).
5. **Persistance** : rester sur stores JSON pour la démo ou migrer vers PostgreSQL (nécessite ADR).
6. Mode démo : compte de démonstration, crédits offerts, données fictives ?
7. Vision v0.7 obsolète sur plusieurs points (Puck user, mobile-first, Postgres) → une v0.8 est à rédiger **manuellement** par le propriétaire.
8. Dette notée : route `/share/dashboard` orpheline, exports morts (`share-card-content.ts`), wizard onboarding legacy.

## 7. Règles de travail du projet
- Ne jamais modifier la vision automatiquement ; toute fonctionnalité hors vision nécessite l'accord explicite du propriétaire.
- Tout nouveau framework → ADR dans `.project/decisions/`.
- Stories avec critères d'acceptation vérifiables ; tâche cochée seulement si tous les critères sont vérifiés.
- PRs ≤ 400 lignes, fichiers ≤ ~300–400 lignes, refactoring actif des fichiers touchés, WCAG 2.1 AA.
- Workflow standard par story : `analyze → design → dev → review` (analyst/PO → designer → developer → qa-reviewer + tech-lead).
