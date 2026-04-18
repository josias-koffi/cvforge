> **Version** : 0.7 — Docker monorepo, direction artistique "Papier & Crayon"
> **Langue** : FR (interface FR + EN)
> **Stack** : NestJS · Next.js · PostgreSQL · MinIO · Redis · OpenRouter · Voxtral TTS · Stripe · Puck Editor · shadcn/ui · Docker · Turborepo

---

## Table des matières

1. [Vue d'ensemble du projet](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#1-vue-densemble-du-projet)
2. [Stack technique](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#2-stack-technique)
3. [Authentification & Rôles](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#3-authentification--r%C3%B4les)
4. [Onboarding utilisateur](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#4-onboarding-utilisateur)
5. [Gestion des profils de base](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#5-gestion-des-profils-de-base)
6. [Système de templates](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#6-syst%C3%A8me-de-templates)
7. [Gestion des candidatures](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#7-gestion-des-candidatures)
8. [Génération de CV](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#8-g%C3%A9n%C3%A9ration-de-cv)
9. [Lettre de motivation](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#9-lettre-de-motivation)
10. [Mode Interview Vocal](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#10-mode-interview-vocal)
11. [Système de crédits & paiement](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#11-syst%C3%A8me-de-cr%C3%A9dits--paiement)
12. [Dashboard utilisateur](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#12-dashboard-utilisateur)
13. [Panel Admin](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#13-panel-admin)
14. [Notifications & Rappels](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#14-notifications--rappels)
15. [RGPD & Conformité](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#15-rgpd--conformit%C3%A9)
16. [Roadmap fonctionnelle](https://claude.ai/chat/71db131f-b302-4158-831e-d7c7ec0d51da#16-roadmap-fonctionnelle)

---

## 1. Vue d'ensemble du projet

**CVforge** est une Progressive Web App (PWA) SaaS grand public permettant à un candidat de :

- Centraliser son profil professionnel et ses profils de base (CV socles)
- Générer automatiquement un CV et une lettre de motivation optimisés ATS, adaptés à une offre d'emploi ciblée, via OpenRouter (modèles Mistral)
- Suivre l'ensemble de ses candidatures avec un pipeline de statuts
- S'entraîner à l'entretien via un agent vocal IA simulant différents styles de recruteurs
- Consommer des crédits à l'usage pour chaque action IA

L'application est accessible uniquement via navigateur (PWA, pas d'app native). L'interface est disponible en **français et en anglais**.

---

## 2. Stack technique

|Couche|Technologie|Rôle|
|---|---|---|
|Frontend|Next.js (React)|Interface PWA FR/EN|
|Backend|NestJS|API REST / logique métier|
|Base de données|PostgreSQL|Données structurées|
|Stockage fichiers|MinIO (self-hosted EU)|PDF, audio interviews|
|IA — Routeur|**OpenRouter**|Gateway unique vers tous les modèles IA (évite le vendor lock-in)|
|IA — Texte|**Mistral Small 4** (`mistralai/mistral-small-2603`) via OpenRouter|Génération CV, LM, analyse, enrichissement|
|IA — Audio|**Voxtral Small** (`mistralai/voxtral-small-24b-2507`) via OpenRouter|STT + compréhension audio pour les interviews|
|IA — TTS|**Voxtral TTS** (`mistralai/voxtral-4b-tts-2603`) via API Mistral|Synthèse vocale pour l'agent interview ($0.016/1k chars)|
|Éditeur de documents|Puck Editor|Création templates (admin) + édition CV/LM (user)|
|Templates CV/LM|Puck Editor JSON + composants React custom|Structure + rendu dynamique WYSIWYG|
|Export PDF|Puppeteer (headless Chromium)|Rendu Puck → PDF fidèle|
|Paiement|Stripe|Achat de crédits|
|Auth|Passwordless (Magic Link)|Connexion sans mot de passe|
|UI Components|**shadcn/ui**|Bibliothèque de composants React accessibles et personnalisables|
|Cache & Queues|**Redis** + BullMQ|Cache API, queues de jobs (génération PDF, emails)|
|Conteneurisation|**Docker** + Docker Compose|Environnement identique local → production|
|Monorepo|**pnpm workspaces** + Turborepo|3 apps (app, landing, api) + packages partagés|
|Email|(à définir — ex: Resend)|Envoi magic links & notifs|

> **Contrainte infrastructure** : Toutes les données (PostgreSQL, MinIO) doivent être hébergées en Europe (conformité RGPD).
> **Contrainte IA** : Tous les appels OpenRouter doivent être effectués avec `zdr: true` (Zero Data Retention) et le prompt logging désactivé. Voir section 15.

### 2.1 Pourquoi OpenRouter plutôt que Mistral direct ?

|Critère|Mistral direct|OpenRouter + Mistral|
|---|---|---|
|Vendor lock-in|Fort|Aucun — changer de modèle en 1 ligne|
|Accès à Voxtral (audio)|Via La Plateforme|✅ Disponible|
|Fallback automatique|Non|✅ Routing intelligent|
|ZDR (Zero Data Retention)|Disponible|✅ Disponible, par requête|
|Modèles alternatifs si besoin|Non|✅ 300+ modèles accessibles|
|API compatible OpenAI SDK|Oui|✅ Oui|

### 2.2 Modèle IA par défaut : Mistral Small 4 (`mistral-small-2603`)

Mistral Small 4 est sorti le 16 mars 2026. Il unifie dans un seul système les capacités de raisonnement (Magistral), de compréhension multimodale (Pixtral) et de coding (Devstral).

|Caractéristique|Valeur|
|---|---|
|Identifiant OpenRouter|`mistralai/mistral-small-2603`|
|Contexte|262 144 tokens|
|Prix input|$0.15 / 1M tokens|
|Prix output|$0.60 / 1M tokens|
|Capacités|Texte, vision (images/PDF en base64), raisonnement, code|
|Multimodal|✅ (traitement d'images, donc PDF rasterisé)|

> **Traitement PDF/DOCX** : Mistral Small 4 étant multimodal (vision), les PDF sont convertis en images côté backend avant envoi. Les DOCX sont extraits en texte brut. **Dans les deux cas, aucune donnée personnelle sensible n'est transmise** (voir section 15).

### 2.3 Modèle audio : Voxtral Small (`voxtral-small-24b-2507`)

Voxtral Small est une évolution de Mistral Small 3 avec des capacités audio intégrées. Il excelle en transcription vocale, traduction et compréhension audio. Le prix est de $0.10/M tokens pour le texte et $100/M secondes d'audio.

Utilisé exclusivement pour le **mode interview vocal** (Speech-to-Text des réponses du candidat).

### 2.4 Tier gratuit Mistral — Réalité vs mythe

Mistral offre un plan "Experiment" gratuit avec accès à tous les modèles, sans carte bancaire requise (vérification téléphone uniquement). Il inclut environ 1 milliard de tokens par mois. Ce tier est disponible **uniquement sur La Plateforme Mistral directement**, pas via OpenRouter.

**Conséquence pour CVforge** : OpenRouter facture toutes les requêtes (pas de tier gratuit). En revanche, la flexibilité (fallback, ZDR, multi-modèles) justifie ce choix. Pour les tests internes en développement, utiliser La Plateforme Mistral directement avec la clé API gratuite.

### 2.5 UI — shadcn/ui & Design Mobile-First

#### Bibliothèque de composants : shadcn/ui

[shadcn/ui](https://ui.shadcn.com/) est la bibliothèque de composants React utilisée pour toute l'interface de CVforge. Les composants sont copiés directement dans le projet (pas de dépendance npm à maintenir), entièrement personnalisables, et construits sur Radix UI + Tailwind CSS.

**Composants shadcn/ui utilisés en priorité :**

|Zone|Composants|
|---|---|
|Navigation|`NavigationMenu`, `Sheet` (menu mobile), `Breadcrumb`|
|Formulaires|`Form`, `Input`, `Select`, `Combobox`, `DatePicker`, `Textarea`|
|Feedback|`Toast`, `Alert`, `Badge`, `Progress`, `Skeleton`|
|Layout|`Card`, `Separator`, `Tabs`, `Accordion`|
|Modales|`Dialog`, `AlertDialog`, `Drawer` (mobile)|
|Données|`Table`, `DataTable` (avec TanStack Table)|
|Paiement|`Button`, `Badge` (statut crédits)|
|Dashboard|`Chart` (Recharts intégré shadcn)|

> **Puck Editor** coexiste avec shadcn/ui : il est utilisé uniquement dans les vues de création/édition de templates et de CV. Partout ailleurs dans l'app, c'est shadcn/ui.

#### Approche Mobile-First

L'app est conçue **mobile-first** : chaque écran est d'abord pensé pour un viewport ~390px (iPhone 14), puis adapté pour tablette et desktop.

|Principe|Application concrète|
|---|---|
|**Navigation mobile**|Bottom navigation bar (4-5 items) sur mobile, sidebar collapsible sur desktop|
|**Formulaires**|Champs pleine largeur, labels au-dessus, keyboards natifs (type="tel", type="email")|
|**Tableaux**|Cards empilées sur mobile, table classique sur desktop|
|**Modales**|`Drawer` (bottom sheet) sur mobile, `Dialog` centré sur desktop|
|**Dashboard**|KPIs en grid 2 colonnes sur mobile, 4 colonnes sur desktop|
|**Interview vocal**|Interface minimaliste, bouton micro central, pas de sidebar|
|**Breakpoints Tailwind**|Base = mobile · `md:` = tablette (768px) · `lg:` = desktop (1024px)|

> L'éditeur Puck Editor (création/édition CV) est le seul écran à nécessiter un affichage desktop recommandé — un mode lecture seule mobile est prévu pour consulter le CV généré sans l'éditer.

### 2.6 Direction artistique — "Papier & Crayon"

#### Concept

L'identité visuelle de CVforge s'inspire directement de l'objet qu'elle produit : **un CV et une lettre de motivation manuscrite, épurée, artisanale**. L'interface doit rappeler la texture d'une feuille de papier blanc, la précision d'un trait de crayon, et le soin apporté à un document rédigé à la main.

> _L'outil disparaît. Le document parle._

#### Palette & Typographie

|Élément|Valeur|Intention|
|---|---|---|
|Fond principal|`#FAFAF7` — blanc cassé légèrement chaud|Papier ivoire, pas de blanc pur froid|
|Fond secondaire|`#F2F0EB` — beige très doux|Zones de contenu distincts|
|Texte principal|`#1A1A18` — noir charbon|Encre, pas de noir absolu|
|Texte secondaire|`#6B6860` — gris pierre|Annotations, métadonnées|
|Accent primaire|`#2C2C2A` — gris anthracite profond|Boutons, titres, CTA|
|Accent secondaire|`#C8A96E` — or doux / sable|Highlights, badges, éléments premium|
|Danger / Alerte|`#C0392B` — rouge stylo|Erreurs, avertissements|
|Succès|`#4A7C59` — vert encre|Confirmations, statuts positifs|

**Typographies :**

|Usage|Police|Style|
|---|---|---|
|Titres & headings|`Playfair Display` ou `Lora`|Serif élégant, rappelle les machines à écrire premium|
|Corps de texte UI|`Inter` ou `DM Sans`|Sans-serif lisible, neutre|
|Contenu CV/LM généré|`EB Garamond` ou `Libre Baskerville`|Serif classique — cohérent avec les vrais CV|
|Code / Monospace|`JetBrains Mono`|Parties techniques admin uniquement|

#### Principes de design

|Principe|Application|
|---|---|
|**Espace blanc généreux**|Marges larges, line-height élevé — laisser respirer comme sur une feuille|
|**Pas d'ombre portée agressive**|Ombres très légères, presque imperceptibles (`shadow-sm`)|
|**Bordures fines et subtiles**|`border-stone-200` — tracé au crayon, pas au marqueur|
|**Pas de gradient, pas de glassmorphism**|Surface plate, mate, texturée psychologiquement|
|**Iconographie fine**|Icônes line-art, stroke 1.5px (Lucide Icons) — pas de fill solide|
|**Animations minimalistes**|Transitions douces 150–200ms, pas d'effet spectaculaire|
|**Cards comme feuilles posées**|Légère élévation, coins légèrement arrondis (`rounded-lg`)|

#### Déclinaison par section

|Section|Ambiance|Notes|
|---|---|---|
|Dashboard|"Bureau ordonné"|Cards blanches sur fond ivoire, KPIs comme des en-têtes de rapport|
|Candidature / CV|"Feuille de travail"|Éditeur Puck sur fond légèrement tramé, règles de marge visibles|
|Interview vocal|"Cabine téléphonique épurée"|Fond très sombre (`#1A1A18`), onde audio minimaliste, micro central|
|Onboarding|"Formulaire de papeterie"|Champs comme des lignes à remplir sur un formulaire manuscrit|
|Admin|"Registre comptable"|Plus fonctionnel, tables denses, accent anthracite|

#### Ce que ce style n'est pas

- ❌ Pas de néomorphisme, pas de glassmorphism
- ❌ Pas de couleurs vives ou de dégradés fluo
- ❌ Pas d'illustrations cartoon ou de mascotte
- ❌ Pas d'effets 3D ou de parallaxe

#### Inspiration références

- Notion (espace blanc, typographie propre)
- Linear (précision, sobriété)
- Un vrai CV ATS bien mis en page (l'objet lui-même comme inspiration)

---

### 2.7 Architecture & Déploiement — Monorepo Docker

#### Structure du monorepo

Un seul dépôt Git contenant trois projets indépendants, chacun dockerisé :

```
cvforge/                          ← Racine du monorepo
├── apps/
│   ├── app/                      ← PWA Next.js (interface utilisateur)
│   ├── landing/                  ← Site vitrine Next.js (marketing)
│   └── api/                      ← Backend NestJS (API REST)
├── packages/
│   ├── ui/                       ← Composants shadcn/ui partagés
│   ├── types/                    ← Types TypeScript partagés
│   └── config/                   ← Configs ESLint, TypeScript, Tailwind partagées
├── docker/
│   ├── app.Dockerfile
│   ├── landing.Dockerfile
│   ├── api.Dockerfile
│   └── puppeteer.Dockerfile      ← Service dédié export PDF
├── docker-compose.yml            ← Environnement local complet
├── docker-compose.prod.yml       ← Overrides production
└── .env.example
```

**Gestionnaire de monorepo** : `pnpm workspaces` + `Turborepo` (builds incrémentaux, cache partagé).

#### Services Docker

|Service|Image|Port local|Description|
|---|---|---|---|
|`app`|Node 20 Alpine|3000|PWA Next.js — interface candidat|
|`landing`|Node 20 Alpine|3001|Site vitrine marketing|
|`api`|Node 20 Alpine|3333|Backend NestJS|
|`postgres`|postgres:16-alpine|5432|Base de données|
|`minio`|minio/minio|9000 / 9001|Stockage S3 (console sur 9001)|
|`puppeteer`|ghcr.io/browserless/chromium|3002|Service export PDF headless|
|`redis`|redis:7-alpine|6379|Cache + queues (BullMQ)|

#### `docker-compose.yml` (environnement local)

```yaml
services:
  app:
    build: { context: ., dockerfile: docker/app.Dockerfile }
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3333
    depends_on: [api]

  api:
    build: { context: ., dockerfile: docker/api.Dockerfile }
    ports: ["3333:3333"]
    environment:
      - DATABASE_URL=postgresql://cvforge:secret@postgres:5432/cvforge
      - MINIO_ENDPOINT=minio
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - PUPPETEER_URL=http://puppeteer:3002
    depends_on: [postgres, minio, redis]

  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: cvforge
      POSTGRES_USER: cvforge
      POSTGRES_PASSWORD: secret

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]

  redis:
    image: redis:7-alpine

  puppeteer:
    build: { context: ., dockerfile: docker/puppeteer.Dockerfile }
    ports: ["3002:3002"]

volumes:
  postgres_data:
  minio_data:
```

#### Principe "local = production"

|Aspect|Local|Production|
|---|---|---|
|Services|`docker-compose.yml`|`docker-compose.prod.yml` (overrides)|
|Variables|`.env.local`|Secrets injectés (Vault / env CI)|
|Base de données|PostgreSQL dans Docker|PostgreSQL managé EU (Supabase / Neon / RDS)|
|Stockage|MinIO dans Docker|MinIO self-hosted EU ou S3 compatible|
|Reverse proxy|—|Traefik ou Nginx avec SSL Let's Encrypt|
|Build|`docker compose up --build`|CI/CD → Registry → `docker compose pull && up -d`|

> **Avantage principal** : un développeur clone le repo, lance `docker compose up`, et a l'intégralité de l'app fonctionnelle en local en moins de 5 minutes — sans rien installer à part Docker.

#### Variables d'environnement requises (`.env.example`)

```bash
# IA
OPENROUTER_API_KEY=
MISTRAL_API_KEY=           # Pour Voxtral TTS direct

# Base de données
DATABASE_URL=postgresql://cvforge:secret@postgres:5432/cvforge

# Stockage
MINIO_ENDPOINT=minio
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=cvforge

# Paiement
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Auth (Magic Link)
MAGIC_LINK_SECRET=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3333
```

---

## 3. Authentification & Rôles

### 3.1 Modes de connexion

- **Passwordless uniquement** : L'utilisateur entre son email → reçoit un magic link → est connecté. Pas de mot de passe à gérer.
- La vérification d'email est automatiquement assurée par le mécanisme passwordless.
- Connexion sociale (Google, LinkedIn) : **non prévue en MVP**, à évaluer en V2.

### 3.2 Inscription & Bootstrapping admin

> ⚠️ **Point de sécurité critique**

Le système d'inscription fonctionne selon des règles strictes pour éviter toute prise de contrôle du panel admin :

|Cas|Règle|
|---|---|
|**Premier lancement**|Le premier compte créé reçoit automatiquement le rôle `admin`. Ce mécanisme est actif **une seule fois** : dès qu'un admin existe en base, il est désactivé définitivement.|
|**Inscription utilisateur**|L'inscription publique (URL `/register`) est ouverte à tous et crée uniquement des comptes `user`. **Aucun compte `admin` ne peut être créé via cette URL**, quelles que soient les circonstances.|
|**Création de nouveaux admins**|Uniquement par **lien d'invitation nominatif** généré par un admin existant. Le lien est à usage unique, horodaté, et expiré après 48h. L'admin invité arrive sur une page d'inscription spéciale qui lui attribue le rôle `admin`.|
|**Création de nouveaux users**|Via inscription publique, OU via lien d'invitation `user` généré par un admin.|

**Règle absolue** : Le rôle `admin` n'est jamais auto-attribué après le premier bootstrap. Il ne peut être accordé que par un admin existant via invitation.

### 3.3 Rôles

|Rôle|Description|
|---|---|
|`admin`|Accès complet : panel admin, gestion users, templates, crédits|
|`user`|Accès à son espace personnel : profil, candidatures, interviews|

> **V2 envisagée** : Rôle `recruiter` pour une future extension B2B.
> **V2 envisagée** : Notion d'`organization` pour des comptes entreprise.

### 3.4 Sessions

- Token JWT (ou session cookie sécurisé) émis après validation du magic link.
- Durée de session : à définir (recommandation : 7 jours avec refresh token).
- Toute tentative d'accès à `/admin` sans rôle `admin` retourne une erreur 403 et log l'incident.

---

## 4. Onboarding utilisateur

L'onboarding se présente sous forme d'un **wizard multi-étapes** déclenché à la première connexion. Il peut être complété partiellement et repris plus tard.

### Étape 1 — Informations personnelles (obligatoires)

|Champ|Type|Obligatoire|
|---|---|---|
|Prénom|Texte|✅|
|Nom|Texte|✅|
|Ville|Texte|✅|
|Téléphone|Texte|✅|
|Email professionnel|Texte|Auto-rempli|

### Étape 2 — Liens externes

|Champ|Type|Obligatoire|
|---|---|---|
|LinkedIn|URL|❌|
|GitHub|URL|❌|
|Portfolio / Site web|URL|❌|
|Autre lien|URL (champ libre)|❌|

### Étape 3 — Informations complémentaires

|Champ|Type|Obligatoire|
|---|---|---|
|Date de naissance|Date|❌|
|Nationalité|Texte / Select|❌|
|Permis de conduire|Boolean|❌|
|Langues parlées + niveau|Multi-select|❌|
|Niveau d'études|Select|❌|
|Secteur(s) cible(s)|Multi-select|❌|
|Types de contrat recherchés|Multi-select (CDI, CDD, Freelance…)|❌|
|Disponibilité|Date / Immédiate|❌|
|Prétentions salariales|Fourchette|❌|

### Étape 4 — Import de CV existant _(optionnel)_

- L'utilisateur peut uploader un PDF ou DOCX existant.
- L'IA (Mistral) analyse le document et **pré-remplit un profil de base** automatiquement.
- L'utilisateur valide / corrige les données extraites avant de les sauvegarder.
- Si skippé : le profil de base sera créé manuellement depuis l'espace profil.

> **Note MVP** : Évaluer la complexité de l'extraction IA avant de prioriser cette étape. Si trop coûteuse en temps, déplacer en V1.1.

### Étape 5 — Récapitulatif & validation

- Résumé de toutes les informations renseignées.
- Bouton "Compléter mon profil" → redirige vers le dashboard.

---

## 5. Gestion des profils de base

Un **profil de base** est le CV socle depuis lequel l'IA génère les CV adaptés à chaque offre.

### 5.1 Règle métier

- Un utilisateur peut créer **plusieurs profils de base** (ex : "Profil Tech", "Profil Management", "Profil Freelance").
- Lors de la création d'une candidature, il sélectionne le profil de base à utiliser comme source.

### 5.2 Contenu d'un profil de base

|Section|Contenu|
|---|---|
|Titre professionnel|Texte libre|
|Accroche / Summary|Texte libre|
|Expériences professionnelles|Poste, entreprise, période, description des missions, résultats chiffrés|
|Formations|Diplôme, établissement, année, mention|
|Compétences techniques|Liste de hard skills|
|Compétences humaines|Liste de soft skills|
|Certifications|Titre, organisme, année|
|Projets personnels|Titre, description, lien|
|Loisirs / Centres d'intérêt|Texte libre|

### 5.3 Actions disponibles

- Créer un profil de base (manuellement ou via import IA)
- Modifier un profil de base
- Dupliquer un profil de base
- Supprimer un profil de base
- Définir un profil comme "favori" (utilisé par défaut)

---

## 6. Système de templates

### 6.1 Principe architectural — Tout-Puck Editor

**Puck Editor** est l'outil unique pour la création ET l'édition des templates CV/LM. Il est utilisé à deux niveaux :

- **Admin** : conçoit la mise en page visuelle du template en assemblant des blocs prédéfinis (drag & drop)
- **User** : édite le contenu de son CV/LM généré dans ce même environnement WYSIWYG

Changer de template = changer la structure Puck JSON, sans toucher aux données de contenu.

### 6.2 Pipeline de génération

```
[Profil de base] + [Texte de l'offre] + [Contexte entreprise]
                          ↓
               Prompt Mistral AI (génération)
                          ↓
              JSON de contenu normalisé (props des blocs)
                          ↓
         Merge : JSON contenu ← injecté dans → JSON template Puck
                          ↓
           Rendu React dans Puck Editor (WYSIWYG)
              ↙                        ↘
    User édite                    Puppeteer headless
    et valide                          ↓
         ↓                         Export PDF
  Sauvegarde version           (Export DOCX en V1.1)
```

### 6.3 Composants Puck custom (blocs métier CV/LM)

Ces composants React sont développés une fois et réutilisés dans tous les templates. Chaque bloc expose des `props` qui correspondent aux champs du JSON de contenu.

|Composant|Props principales|
|---|---|
|`CVHeader`|firstName, lastName, title, phone, email, city, linkedin, github|
|`SummaryBlock`|summary|
|`ExperienceItem`|company, position, startDate, endDate, description, achievements[]|
|`EducationItem`|degree, institution, year, mention|
|`SkillsList`|hardSkills[], softSkills[]|
|`CertificationItem`|title, issuer, year|
|`LanguageItem`|language, level|
|`ProjectItem`|title, description, url|
|`LMHeader`|candidate info + company info + date + object|
|`LMBody`|paragraph1, paragraph2, paragraph3|
|`LMSignature`|firstName, lastName|
|`Divider`|style (cosmétique)|
|`SectionTitle`|label, style|

> La liste des composants sera enrichie à mesure que de nouveaux templates sont créés.

### 6.4 Schéma JSON de contenu normalisé (exemple partiel)

Ce JSON est le **contrat d'interface** entre Mistral AI, le backend et Puck Editor. Il est produit par l'IA et injecté dans les `props` des blocs Puck.

```json
{
  "candidate": {
    "firstName": "",
    "lastName": "",
    "title": "",
    "summary": "",
    "phone": "",
    "email": "",
    "city": "",
    "linkedin": "",
    "github": ""
  },
  "experiences": [
    {
      "company": "",
      "position": "",
      "startDate": "",
      "endDate": "",
      "description": "",
      "achievements": []
    }
  ],
  "education": [],
  "skills": {
    "hard": [],
    "soft": []
  },
  "certifications": [],
  "languages": [],
  "atsGhostText": "Approved for the next stage"
}
```

### 6.5 Stockage des templates

|Donnée|Stockage|Format|
|---|---|---|
|Structure du template (layout Puck)|PostgreSQL|JSON|
|Fichiers assets du template (fonts, images de déco)|MinIO|Binaire|
|CV/LM générés (versions sauvegardées)|PostgreSQL|JSON (Puck data)|
|Exports PDF générés|MinIO|PDF|

> Plus de fichiers HTML en base ou dans MinIO — tout est JSON PostgreSQL.

### 6.6 Types de templates

|Type|Description|
|---|---|
|CV|Templates de mise en page pour CV|
|Lettre de motivation|Templates pour LM (template ATS par défaut en MVP)|

### 6.7 Gestion des templates (Admin uniquement en MVP)

- Créer un template dans **Puck Editor** (interface admin dédiée)
- Nommer et catégoriser (ex : "ATS", "Moderne", "Minimaliste", "Créatif")
- Définir la langue (FR, EN, ES… — un template peut être multilingue)
- Activer / désactiver (visibilité pour les utilisateurs)
- Définir un template par défaut par type (CV / LM)
- Prévisualiser avec des données fictives injectées
- Dupliquer un template existant pour en créer une variante
- Supprimer (avec vérification : template utilisé dans des candidatures ?)

### 6.8 Contrainte CSS print — format 1 page

Les templates doivent intégrer des **règles CSS print** pour garantir un rendu PDF d'une seule page :

```css
@media print {
  @page { size: A4; margin: 0; }
  body { -webkit-print-color-adjust: exact; }
  .page-break { page-break-before: always; }
}
```

Puppeteer applique ces règles lors de la génération PDF. L'objectif est de **tenir sur 1 page maximum**, l'IA étant instruite de prioriser les expériences et compétences les plus pertinentes pour l'offre.

### 6.9 Formats de sortie

|Format|Disponibilité|Méthode|
|---|---|---|
|**PDF**|MVP (V1.0)|Rendu React Puck → Puppeteer headless → PDF|
|**DOCX**|V1.1|Rendu HTML du composant React → conversion DOCX (librairie à définir)|

---

## 7. Gestion des candidatures

### 7.1 Vue liste des candidatures

- Tableau avec colonnes : Poste, Entreprise, Date, Statut, Score ATS, Actions
- Filtres : par statut, par date, par tag
- Tri : par date, par statut
- Bouton **"Nouvelle candidature"**

### 7.2 Statuts d'une candidature

```
Brouillon → Envoyée → Entretien planifié → Refus → Offre reçue
```

- Transitions manuelles par l'utilisateur
- Chaque changement de statut est horodaté et historisé

### 7.3 Création d'une candidature — Workflow étape par étape

#### Étape 1 — Informations personnelles

- Sélection du **profil de base** à utiliser
- Vérification / modification rapide des informations personnelles clés

#### Étape 2 — Détail de l'offre

|Sous-étape|Description|
|---|---|
|Lien de l'offre|L'utilisateur colle l'URL de l'offre|
|Scraping serveur|Tentative de récupération automatique du texte de l'offre|
|Fallback texte|Si le scraping échoue, champ textarea pour coller le texte manuellement|
|Fallback PDF|Import d'un PDF de l'offre _(si faisable en MVP)_|

#### Étape 3 — Enrichissement contexte entreprise

Après récupération de l'offre, recherche automatique d'informations sur l'entreprise via l'IA :

|Donnée|Utilité|
|---|---|
|Nom de l'entreprise|Affiché dans la candidature|
|Secteur d'activité|Contexte pour l'IA|
|Taille de l'entreprise|Contexte entretien|
|Actualités récentes|Préparation entretien|
|Culture d'entreprise / valeurs|Génération LM + entretien|
|Grille salariale estimée|Information candidat pour négociation|

> Ces données alimentent l'agent d'interview et sont affichées dans la fiche candidature.

#### Étape 4 — Sélection du template

- Liste des templates disponibles (CV + LM séparément)
- Prévisualisation avant sélection

#### Étape 5 — Génération IA (CV)

1. Construction du prompt avec : profil de base + texte de l'offre + contexte entreprise + template JSON
2. Appel API Mistral
3. Réception du JSON rempli
4. Sauvegarde de la version en base (`version: 1`)
5. Injection dans le template HTML → rendu

#### Étape 6 — Édition & validation du CV

- Affichage du CV généré directement dans **Puck Editor** (rendu WYSIWYG natif — même outil que la création du template)
- L'utilisateur peut modifier le contenu de chaque bloc (texte, ordre des sections, mise en avant)
- Bouton **"Valider cette version"** → sauvegarde en base comme version validée (JSON Puck complet)
- Historique des versions (v1, v2…) accessible et comparable
- Téléchargement PDF via Puppeteer (DOCX en V1.1)

### 7.4 Fiche candidature

En plus du CV et de la LM, la fiche candidature contient :

|Champ|Description|
|---|---|
|Statut|Pipeline de statuts|
|Note / Étoiles|1 à 5 étoiles|
|Tags personnalisés|Labels libres|
|Contact recruteur|Nom, email, LinkedIn (moteur de recherche intégré)|
|Notes libres|Champ texte pour notes personnelles|
|Rappels|Dates de relance, rappel d'entretien|
|Score ATS|Score calculé lors de la génération|
|Contexte entreprise|Données enrichies de l'étape 3|
|Historique interviews|Liens vers les sessions d'interview associées|

---

## 8. Génération de CV

### 8.1 Prompt système (base)

Le prompt envoyé à Mistral reprend la logique du prompt original du projet :

- Rôle : Expert en Recrutement Senior & Spécialiste ATS
- Analyse des 5 hard-skills et 3 soft-skills prioritaires de l'offre
- Adaptation du titre et de l'accroche
- Reformulation des expériences avec verbes d'action et mots-clés
- Regroupement des compétences pour les scanners ATS
- Détection de la langue de l'offre → CV rédigé dans cette langue
- Ghost writing ATS invisible (texte blanc taille 2) selon la langue
- Réponse attendue : **JSON valide** respectant le schéma normalisé

### 8.2 Coût en crédits

_(Estimation à affiner selon les coûts réels Mistral)_

|Action|Crédits estimés|
|---|---|
|Génération CV|~50 crédits|
|Régénération / nouvelle version|~50 crédits|
|Génération Lettre de motivation|~30 crédits|

> Règle de conversion : **1€ dépensé en API = 10 crédits utilisateur**
> Les crédits sont débités au moment de l'appel IA, pas à la création de la candidature.

### 8.3 Gestion des versions

- Chaque appel IA crée une nouvelle version (`v1`, `v2`…) sauvegardée en base (JSON Puck complet)
- L'utilisateur peut revenir à une version précédente et la réouvrir dans Puck Editor
- La version "active" est celle téléchargeable et utilisée pour l'interview
- Le PDF de chaque version validée est généré à la demande via Puppeteer et stocké dans MinIO

---

## 9. Lettre de motivation

### 9.1 Principes

- La lettre de motivation est **toujours attachée à une candidature**
- Elle suit le même workflow que le CV (génération IA → édition Puck Editor → téléchargement)
- Le **premier template par défaut est un template ATS** (format sobre, optimisé pour les scanners)
- Les templates LM peuvent être multilingues

### 9.2 Contenu généré et édition

- En-tête : coordonnées candidat + coordonnées entreprise + date (`LMHeader`)
- Objet : "Candidature au poste de [titre]"
- Corps : 3 paragraphes (`LMBody`) — accroche, argumentation, conclusion/call-to-action
- Signature (`LMSignature`)
- L'utilisateur édite le résultat dans **Puck Editor** (même workflow que le CV)
- Sauvegarde en JSON Puck, export PDF via Puppeteer

### 9.3 Différences avec le CV

|Dimension|CV|Lettre de motivation|
|---|---|---|
|Optimisation ATS|✅ Fort|✅ Modéré (narratif humain)|
|Longueur cible|1 page stricte|1 page|
|Format sortie|PDF + DOCX|PDF + DOCX|
|Versioning|✅|✅|

---

## 10. Mode Interview Vocal

### 10.1 Vue d'ensemble

L'utilisateur sélectionne une candidature (ou démarre en mode libre) et lance une **simulation d'entretien vocal** avec un agent IA nourri par les données de la candidature.

### 10.2 Technologies — Stack vocale 100% Mistral

La famille Voxtral couvre désormais l'entrée audio, la compréhension du langage, et la sortie audio, positionnant Mistral comme une stack vocale end-to-end complète. CVforge utilise cette stack dans son intégralité.

|Besoin|Modèle|Accès|Prix|
|---|---|---|---|
|**STT** — Transcription voix candidat|**Voxtral Small** (`voxtral-small-24b-2507`)|Via OpenRouter (`zdr: true`)|$100/M secondes|
|**LLM** — Génération questions + analyse|**Mistral Small 4** (`mistral-small-2603`)|Via OpenRouter (`zdr: true`)|$0.15/M input · $0.60/M output|
|**TTS** — Synthèse vocale agent IA|**Voxtral TTS** (`voxtral-4b-tts-2603`)|Via API Mistral directe|**$0.016 / 1 000 caractères**|

> **Voxtral TTS** a été publié le 26 mars 2026. Il offre un clonage de voix zéro-shot depuis 2-3 secondes d'audio, une latence modèle de ~90ms et un time-to-first-audio de ~0.8 seconde en PCM — adapté aux agents vocaux temps réel.

> **Note** : Voxtral TTS n'est pas encore disponible via OpenRouter (à vérifier). En attendant, il est appelé directement via l'API Mistral avec les mêmes règles de pseudonymisation (seul le texte des questions IA transite, jamais de données personnelles).

#### Pipeline complet d'un tour de parole

```
① User parle        → Navigateur capture audio (MediaRecorder API)
② Audio envoyé      → Voxtral Small STT (OpenRouter, zdr:true) → texte transcrit
③ Texte analysé     → Mistral Small 4 LLM (OpenRouter, zdr:true) → question suivante
④ Question générée  → Voxtral TTS (API Mistral) → flux audio PCM streamé
⑤ User entend       → Lecture audio dans le navigateur (Web Audio API)
                    → Boucle jusqu'à fin de session
```

#### Langues supportées par Voxtral TTS

Voxtral TTS supporte 9 langues : anglais, français, allemand, espagnol, néerlandais, portugais, italien, hindi et arabe. CVforge utilise FR et EN selon la langue de la candidature.

#### Voix disponibles

- **20 voix preset** disponibles via l'API Mistral (ton neutre, décontracté, formel…)
- Le profil d'interview sélectionné (Agressif, Passif, Standard…) détermine la voix utilisée
- Possibilité future de voice cloning custom pour personnaliser l'agent interviewer

### 10.3 Analyse de latence & stratégies d'optimisation

> ⚠️ **Point critique de l'expérience utilisateur** — La latence perçue entre la fin de la réponse du candidat et la voix de l'IA détermine si l'expérience ressemble à un vrai appel téléphonique ou à un système robotique.

#### Latence brute sans optimisation

|Étape|Composant|Latence estimée|Notes|
|---|---|---|---|
|**1** Détection fin de parole (VAD)|Navigateur WebRTC natif|~200ms|Détection silence fin de phrase|
|**2** Upload audio + STT|Voxtral Small via OpenRouter|~600–900ms|~10s audio compressé, réseau EU|
|**3** Génération question|Mistral Small 4 (LLM)|~500–800ms|Time-to-first-token ~400ms|
|**4** Synthèse vocale first chunk|Voxtral TTS streaming PCM|~800ms|Time-to-first-audio officiel|
|**5** Buffer + lecture|Web Audio API|~100ms|Buffering minimal navigateur|
|**TOTAL sans optim**||**~2,2s – 2,7s**|❌ Trop long — immersion brisée|

Un vrai recruteur répond en ~500ms. Au-delà de 1,5s de silence, le cerveau perçoit un délai artificiel.

#### Objectif cible : **< 1,2 secondes perçues**

---

#### Optimisation 1 — Streaming LLM → TTS en pipe direct 🔴 Critique

Au lieu d'attendre que le LLM finisse de générer la question complète avant de lancer le TTS, on **pipe le stream directement** : dès les premiers tokens formant une première phrase cohérente, Voxtral TTS commence à synthétiser.

```
LLM génère token par token (stream)
    → dès la 1ère phrase complète détectée (~100 tokens)
    → Voxtral TTS commence à synthétiser immédiatement
    → premier chunk audio joué AVANT que le LLM ait fini
    → l'IA semble répondre en temps réel
```

Voxtral TTS a été conçu pour ce cas (streaming PCM natif). **Gain : ~600ms**

---

#### Optimisation 2 — Streaming STT progressif pendant la parole 🔴 Critique

Plutôt qu'attendre la fin de la phrase pour uploader l'audio en bloc, on envoie des **chunks audio toutes les 500ms** pendant que l'utilisateur parle encore. Voxtral commence à transcrire avant la fin de la réponse :

```
User parle
    → chunks de 500ms envoyés en continu
    → Voxtral transcrit en rolling window
    → à la détection du silence : transcription quasi-finalisée
    → délai STT résiduel : ~150ms seulement
```

**Gain : ~400ms sur le STT**

---

#### Optimisation 3 — Pré-génération de la question suivante 🟠 Important

Pendant que Voxtral TTS joue la question N (~8s de lecture), le backend prépare **déjà la question N+1** en arrière-plan :

```
IA pose question N (lecture en cours)
    → backend génère silencieusement la question N+1
    → TTS N+1 est bufferisé avant même que l'user réponde
    → après sa réponse : seule la latence STT subsiste (~300ms)
```

**Gain : ~800ms — mais complexité dev élevée (V1.2)**

---

#### Optimisation 4 — Feedback visuel pour masquer la latence résiduelle 🟡 Toujours actif

Les ~300–500ms résiduels se masquent avec des signaux UI qui donnent l'impression que l'IA "traite en temps réel" :

|Moment|Signal visuel/audio|Effet perçu|
|---|---|---|
|Pendant la parole user|Animation microphone pulsante|"Je vous écoute"|
|Fin de parole détectée|Animation "thinking" (3 points)|"Je réfléchis"|
|Premier chunk TTS reçu|Coupure nette de l'animation → voix|Fluidité naturelle|
|Silence entre questions|Légère ambiance sonore optionnelle|Neutralise le vide|

---

#### Pipeline optimisé — Latence cible réaliste

```
User finit de parler
        ↓
[VAD + streaming STT en continu pendant la parole]    →  0ms d'attente
        ↓  ~150ms (finalisation transcription)
[Transcription prête → LLM génère en stream]
        ↓  ~400ms (premiers tokens → pipe TTS)
[Voxtral TTS first chunk audio joué]
        ↓
[User entend l'IA]

TOTAL PERÇU : ~550ms – 800ms ✅
```

---

#### Tableau récapitulatif des optimisations

|Priorité|Optimisation|Complexité|Gain|Version|
|---|---|---|---|---|
|🔴 Critique|Streaming LLM → TTS pipe|Moyenne|~600ms|MVP|
|🔴 Critique|Feedback visuel VAD + thinking|Faible|Perception|MVP|
|🔴 Critique|Streaming STT progressif (chunks)|Moyenne|~400ms|MVP|
|🟠 Important|Pré-génération question suivante|Élevée|~800ms|V1.2|

> **Toutes les optimisations critiques sont à implémenter dès le MVP** — elles définissent la qualité perçue du produit. La pré-génération sera ajoutée en V1.2 pour atteindre une expérience quasi-instantanée.

### 10.4 Profils d'interview disponibles

|Profil|Description|
|---|---|
|Standard|Entretien classique RH|
|Agressif|Questions pièges, pression, interruptions simulées|
|Passif|Recruteur peu expressif, silences, questions vagues|
|Technique|Focus hard skills et mise en situation|
|Comportemental|Questions STAR (Situation, Tâche, Action, Résultat)|

### 10.5 Déroulement d'une session

1. Sélection candidature (ou mode libre)
2. Sélection du profil d'interview
3. Définition de la durée max (recommandé : 10 minutes)
4. Briefing : affichage du contexte entreprise + poste avant de démarrer
5. **Session vocale** :
    - L'IA pose une question (Voxtral TTS streamé)
    - L'utilisateur répond (chunks audio → Voxtral STT en continu)
    - Animation feedback pendant le traitement (~550ms)
    - L'IA génère et pipe immédiatement la question suivante (LLM → TTS stream)
    - Boucle jusqu'à la durée max ou fin de questions
6. Fin de session → sauvegarde automatique

### 10.6 Données injectées dans l'agent IA

- JSON du CV validé (pseudonymisé — sans nom de famille, tél, email)
- Texte de l'offre d'emploi
- Lettre de motivation (si générée)
- Contexte entreprise (secteur, culture, actualités)
- Profil d'interview sélectionné
- Prompt système d'optimisation

### 10.7 Feedback post-interview

À la fin de la session, l'IA génère un **rapport d'analyse** :

|Métrique|Description|Note /10|
|---|---|---|
|Clarté des réponses|Structuration et compréhension|✅|
|Mots-clés métier mentionnés|Couverture des termes de l'offre|✅|
|Durée moyenne de parole par réponse|Ni trop court, ni trop long|✅|
|Hésitations détectées|Pauses, "euh", répétitions|✅|
|Pertinence par rapport à l'offre|Adéquation des réponses au poste|✅|
|**Score global**|Moyenne pondérée|✅|

- Appréciation textuelle globale générée par l'IA
- Suggestions d'amélioration concrètes
- Sauvegarde du rapport en base (lié à la candidature)
- **Réécoute de la session** : fichier audio sauvegardé dans MinIO
- **Transcription** : texte complet de l'échange consultable

### 10.8 Mode pratique libre

- Pas de candidature associée
- L'utilisateur entre un poste cible et/ou une entreprise fictive
- Même workflow que le mode candidature
- Les résultats sont sauvegardés mais non liés à une candidature

---

## 11. Système de crédits & paiement

### 11.1 Principe

- **Pas de freemium, pas d'abonnement**
- Modèle **pay-as-you-go** uniquement — achat de packs de crédits à l'usage
- Les crédits n'expirent pas

### 11.2 Coûts API réels — Base de calcul

Le parcours complet d'une candidature (enrichissement entreprise + CV + LM + interview 10 min + rapport) a été estimé à partir des prix OpenRouter en vigueur :

|Action|Modèle|Coût API réel|
|---|---|---|
|Enrichissement contexte entreprise|Mistral Small 4|~€0,0004|
|Génération CV|Mistral Small 4|~€0,0011|
|Génération Lettre de motivation|Mistral Small 4|~€0,0007|
|Interview 10 min — STT (Voxtral Small)|Voxtral Small|~€0,006|
|Interview 10 min — LLM (Mistral Small 4)|Mistral Small 4|~€0,008|
|Interview 10 min — TTS (Voxtral TTS ~1 500 chars)|Voxtral TTS|~€0,024|
|Rapport post-interview|Mistral Small 4|~€0,001|
|**Total 1 candidature complète**||**~€0,040**|
|**Total 30 candidatures complètes**||**~€1,20**|

> Ces estimations sont basées sur Mistral Small 4 à $0.15/M input · $0.60/M output, Voxtral Small à $100/M secondes audio, et **Voxtral TTS à $0.016/1 000 caractères** (sorti le 26 mars 2026).

### 11.3 Structure des frais incompressibles

Pour un pack vendu **€9,99 TTC** :

|Frais|Calcul|Montant|
|---|---|---|
|TVA 20%|€9,99 / 1,2 × 0,2|**−€1,67**|
|Stripe (1,4% + €0,25)|€9,99 × 1,4% + €0,25|**−€0,39**|
|**Revenu net**||**€7,93**|
|Coût API (30 candidatures)|~€1,20|**−€1,20**|
|**Marge nette**||**€6,73 (~84,8%)**|

> **Note Stripe** : En dessous de €5, le ticket fixe de €0,25 par transaction devient proportionnellement très lourd (26% à €1). Le minimum absolu de ticket est **€5**. €9,99 est le plancher recommandé.

### 11.4 Tarification des actions en crédits

|Action|Crédits consommés|Coût API équivalent|
|---|---|---|
|Enrichissement contexte entreprise|**1 crédit**|~€0,0004|
|Génération CV (ou nouvelle version)|**3 crédits**|~€0,0011|
|Génération Lettre de motivation|**3 crédits**|~€0,0007|
|Session interview 10 min|**10 crédits**|~€0,0088|
|Import CV existant (extraction IA)|**2 crédits**|~€0,0008|
|**1 candidature complète**|**17 crédits**|**~€0,011**|

### 11.5 Packs disponibles

|Pack|Prix TTC|Crédits|Candidatures complètes|Revenu net|Coût API|Marge|
|---|---|---|---|---|---|---|
|**Starter**|**€9,99**|550 crédits|~32 candidatures|€7,93|~€1,28|**~83%**|
|**Pro**|**€19,99**|1 400 crédits|~82 candidatures|€15,77|~€3,28|**~79%**|

> Le pack **Starter à €9,99** reste le produit d'entrée recommandé. La marge de ~83% après Stripe, TVA et coûts API dépasse largement l'objectif de 20%. L'intégration de Voxtral TTS a multiplié le coût API par ~4, mais reste négligeable face au prix de vente.

### 11.6 Paiement

- Provider : **Stripe**
- Paiement one-shot (pas d'abonnement récurrent)
- Webhooks Stripe pour crédit immédiat après paiement confirmé
- Devise : EUR (TVA 20% France incluse dans le prix affiché)

### 11.7 Historique & transparence

L'utilisateur dispose d'une page **"Mes crédits"** avec :

- Solde actuel en crédits + jauge visuelle
- Estimation du nombre de candidatures complètes restantes
- Historique complet des consommations (date, action, crédits débités, solde après)
- Historique des achats (date, pack, montant, statut Stripe)
- Bouton **"Acheter des crédits"** accessible depuis le dashboard et la page crédits
- Alerte automatique quand le solde passe sous **20 crédits** (~1 candidature)

### 11.8 Contrôle admin

- Consulter le solde de n'importe quel utilisateur
- Attribuer des crédits manuellement (compensation, test, partenariat) avec note obligatoire
- Chaque attribution manuelle est loggée (qui, quand, combien, pourquoi)

---

## 12. Dashboard utilisateur

### 12.1 Vue d'ensemble

Page d'accueil après connexion. Synthèse visuelle de l'activité de candidature.

### 12.2 KPIs affichés

|Indicateur|Description|
|---|---|
|Total candidatures|Nombre total toutes périodes confondues|
|Candidatures par statut|Répartition par statut (donut chart)|
|Taux de réponse|% candidatures ayant obtenu une réponse (hors Brouillon)|
|Score ATS moyen|Moyenne des scores ATS sur les CV générés|
|Crédits restants|Solde avec alerte si bas|
|Interviews réalisées|Nombre + score moyen post-interview|
|Candidatures ce mois|Activité du mois en cours|

### 12.3 Graphiques

- **Évolution des candidatures dans le temps** (courbe mensuelle)
- **Répartition par statut** (donut chart)
- **Progression du score ATS** au fil des versions (par candidature)
- **Scores post-interview** (historique)

### 12.4 Accès rapides

- Bouton "Nouvelle candidature"
- Bouton "Acheter des crédits"
- Dernières candidatures modifiées (liste courte)
- Rappels actifs (entretiens à venir, relances)

### 12.5 Partage social

- Génération d'une **carte visuelle partageable** (PNG/SVG) avec les stats clés
    - Ex : "X candidatures envoyées · Taux de réponse Y% · Score ATS moyen Z/100"
- Bouton **"Partager sur LinkedIn"** (lien natif LinkedIn sharing)
- Objectif : stimuler l'engagement social et la viralité organique

---

## 13. Panel Admin

### 13.1 Accès

- Route protégée `/admin` accessible uniquement au rôle `admin`
- Authentification identique (passwordless)

### 13.2 Gestion des utilisateurs

|Fonctionnalité|Description|
|---|---|
|Liste des utilisateurs|Tableau paginé avec recherche/filtre|
|Fiche utilisateur|Détail complet : profil, candidatures, crédits, activité|
|Créer un lien d'invitation|Génère une URL unique d'inscription|
|Attribuer des crédits|Ajout manuel de crédits avec note|
|Désactiver un compte|Suspension sans suppression|
|Supprimer un compte|Suppression RGPD complète|

### 13.3 Gestion des templates

|Fonctionnalité|Description|
|---|---|
|Lister les templates|Vue grille avec prévisualisation miniature|
|Créer un template|Interface Puck Editor dédiée admin — assemblage de blocs custom par drag & drop|
|Modifier un template|Réouverture dans Puck Editor (JSON chargé)|
|Dupliquer un template|Clone du JSON Puck pour créer une variante|
|Catégoriser|Tags : ATS, Moderne, Minimaliste, Créatif, etc.|
|Activer / Désactiver|Rendre visible ou non pour les utilisateurs|
|Définir template par défaut|Par type (CV / LM)|
|Prévisualiser|Injection de données fictives dans Puck + rendu live|
|Supprimer un template|Avec vérification si utilisé dans des candidatures actives|

### 13.4 Analytics & revenus

|Indicateur|Description|
|---|---|
|Utilisateurs actifs|MAU / DAU|
|Nouveaux inscrits|Par semaine / mois|
|Revenus totaux|CA par période|
|Crédits vendus vs consommés|Vue macro|
|CV générés|Volume par période|
|LM générées|Volume par période|
|Interviews réalisées|Volume par période|
|Top templates utilisés|Classement par popularité|

- Graphiques d'évolution temporelle pour chaque indicateur clé
- Export CSV des données (à prévoir)

---

## 14. Notifications & Rappels

### 14.1 Types de notifications

|Type|Déclencheur|Canal|
|---|---|---|
|Relance candidature|J+7 après envoi sans réponse|In-app + Email|
|Rappel entretien|J-1 et H-2 avant entretien planifié|In-app + Email|
|Crédits bas|Solde < 20 crédits|In-app|
|Achat de crédits confirmé|Webhook Stripe|Email|
|Nouveau template disponible|Ajout par admin|In-app|
|Rapport interview disponible|Fin de session|In-app|

### 14.2 Centre de notifications

- Cloche avec badge dans le header
- Liste des notifications avec statut lu/non lu
- Lien direct vers l'élément concerné (candidature, rapport, etc.)

### 14.3 Préférences de notifications

- L'utilisateur peut activer/désactiver chaque type de notification email
- Les notifications in-app ne peuvent pas être désactivées

---

## 15. RGPD & Conformité

> ⚠️ **Analyse RGPD formelle à réaliser avant lancement commercial**

### 15.1 Tableau de conformité général

|Obligation|Implémentation prévue|Statut|
|---|---|---|
|Hébergement EU|PostgreSQL + MinIO self-hosted EU|✅|
|Consentement|Checkbox à l'inscription (CGU + Politique de confidentialité)|À implémenter|
|Droit d'accès|Export des données personnelles|À implémenter|
|Droit à l'effacement|Suppression compte + toutes données associées|À implémenter|
|Droit à la portabilité|Export JSON des données profil + candidatures|À implémenter|
|Minimisation des données|Règles strictes sur ce qui est transmis à l'IA (voir 15.3)|✅ Défini|
|Sécurité|HTTPS, JWT, hash données sensibles|À implémenter|

---

### 15.2 OpenRouter & RGPD — Analyse et configuration

OpenRouter est une entreprise américaine (droit de New York). L'utilisation de leurs services dans le cadre d'un SaaS européen nécessite une configuration explicite.

#### Ce que fait OpenRouter par défaut ✅

- **Ne stocke pas les prompts ni les réponses** — sauf si on active explicitement le prompt logging (off par défaut)
- Collecte uniquement des **métadonnées** (nombre de tokens, latence) sans contenu
- Respecte les clauses contractuelles types (Standard Contractual Clauses) de l'UE pour les transferts hors EEA

#### Ce qu'il faut configurer obligatoirement ⚠️

|Configuration|Action|Importance|
|---|---|---|
|**ZDR (Zero Data Retention)**|Passer `"zdr": true` dans chaque requête API|🔴 Critique|
|**Prompt logging**|Ne jamais activer dans les paramètres du compte|🔴 Critique|
|**"OpenRouter use of inputs/outputs"**|Ne jamais activer (évite que les prompts soient utilisés commercialement)|🔴 Critique|
|**Routing provider**|Fixer `provider: { only: ["Mistral"] }` pour limiter aux serveurs EU Mistral|🟠 Recommandé|

#### Limite importante : EU routing

Le routage EU (données traitées exclusivement en Europe via `eu.openrouter.ai`) est réservé aux **comptes enterprise OpenRouter**. En plan standard, les requêtes peuvent transiter par des serveurs hors UE.

**Stratégie de mitigation** :

1. Fixer le provider à Mistral uniquement (serveurs EU)
2. Activer ZDR systématiquement
3. Appliquer la pseudonymisation (section 15.3) pour que les données transmises ne soient jamais directement identifiantes
4. À terme, négocier un compte enterprise OpenRouter si la volumétrie le justifie

---

### 15.3 Pseudonymisation des données transmises à l'IA

> **Principe fondamental** : L'IA ne reçoit jamais de données permettant d'identifier directement un utilisateur.

Les règles suivantes s'appliquent à **tous les appels IA** (génération CV, LM, enrichissement, interview) :

#### Données JAMAIS transmises à l'IA

|Donnée|Raison|
|---|---|
|**Nom de famille**|Donnée personnelle directement identifiante|
|**Numéro de téléphone**|Donnée personnelle directement identifiante|
|**Adresse exacte**|Donnée personnelle directement identifiante|
|**Date de naissance**|Donnée personnelle sensible|
|**Email personnel**|Donnée personnelle directement identifiante|

#### Données transmises à l'IA sous forme pseudonymisée

|Donnée brute|Ce qui est transmis|
|---|---|
|Adresse complète|**Ville uniquement** (ex : "Lyon")|
|Prénom|✅ Transmis (nécessaire pour la cohérence du CV)|
|Nom de famille|❌ Remplacé par un token générique `[CANDIDATE]` dans le prompt|
|Téléphone|❌ Non transmis — injecté localement dans le template après génération|
|Email|❌ Non transmis — injecté localement dans le template après génération|

#### Mécanisme d'injection locale post-génération

```
1. L'IA génère le JSON du CV sans les données sensibles
2. Le backend reçoit le JSON
3. Le backend injecte localement les données manquantes :
   - Nom de famille → champ `lastName` du profil en base
   - Téléphone → champ `phone` du profil en base
   - Email → champ `email` du profil en base
4. Le JSON complet est transmis à Puck Editor pour rendu
5. Aucune donnée sensible ne transit par OpenRouter/Mistral
```

#### Ce principe s'applique aussi aux interviews vocales

- Les données injectées dans le contexte de l'agent interview sont pseudonymisées selon les mêmes règles
- Les fichiers audio des réponses du candidat sont transcrits via Voxtral (STT) avec `zdr: true`
- Les transcriptions ne sont pas conservées côté OpenRouter

---

### 15.4 Protection des fichiers générés (PDF)

Les PDF générés ne doivent pas contenir de métadonnées d'identification liées à l'app :

- Supprimer les métadonnées Puppeteer par défaut (author, creator, producer)
- Ne pas inclure de tracking pixel ou d'URL de retour
- Les PDF sont stockés dans MinIO avec accès signé temporaire (URL pré-signée, expiration courte)

---

### 15.5 Points à traiter avant lancement

- [ ] Rédiger les CGU et la Politique de confidentialité (mentionner explicitement l'usage d'OpenRouter/Mistral)
- [ ] Désigner un responsable de traitement
- [ ] Réaliser un registre des traitements (inclure OpenRouter comme sous-traitant)
- [ ] Mettre en place la procédure de réponse aux demandes RGPD (accès, effacement, portabilité)
- [ ] Évaluer si un DPO est nécessaire
- [ ] Auditer les durées de conservation des données (PostgreSQL + MinIO)
- [ ] Implémenter la purge automatique des fichiers audio des interviews après X jours
- [ ] Vérifier que Stripe respecte les clauses SCCs pour les données de paiement EU
- [ ] Évaluer l'upgrade vers un compte enterprise OpenRouter pour le EU routing garanti

---

## 16. Roadmap fonctionnelle

### MVP (V1.0)

- [ ] **Setup monorepo** — pnpm workspaces + Turborepo (apps: app, landing, api + packages partagés)
- [ ] **Docker Compose local** — tous les services (app, api, landing, postgres, minio, redis, puppeteer)
- [ ] **Docker Compose prod** — overrides production, reverse proxy Traefik + SSL
- [ ] Setup design system "Papier & Crayon" — palette, typographies (Playfair Display + Inter), tokens Tailwind
- [ ] Setup shadcn/ui + composants customisés au design system
- [ ] Navigation mobile (bottom bar) + sidebar desktop
- [ ] Authentification passwordless + bootstrapping admin sécurisé (1er admin only)
- [ ] Système d'invitation admin (lien unique, usage unique, expiration 48h)
- [ ] Onboarding wizard
- [ ] Profil utilisateur (1 profil de base) — avec règles de pseudonymisation
- [ ] Intégration OpenRouter (Mistral Small 4) avec `zdr: true` systématique
- [ ] Développement des composants Puck custom (blocs CV + LM)
- [ ] Système de templates admin via Puck Editor (CV ATS + LM ATS)
- [ ] Création de candidature (scraping + fallback texte)
- [ ] Génération CV via OpenRouter → JSON pseudonymisé → injection locale → merge Puck Editor
- [ ] Édition WYSIWYG Puck Editor (user) + mode lecture mobile
- [ ] Export PDF via service Puppeteer Docker dédié (sans métadonnées identifiantes)
- [ ] Génération Lettre de motivation (même pipeline)
- [ ] Pipeline de statuts candidature
- [ ] Système de crédits + Stripe (packs Starter €9,99 / Pro €19,99)
- [ ] Page "Mes crédits" avec historique et alerte solde bas
- [ ] Dashboard utilisateur (KPIs de base)
- [ ] Panel admin (users + templates)

### V1.1

- [ ] Profils de base multiples
- [ ] Import CV existant (extraction IA pseudonymisée)
- [ ] Export DOCX
- [ ] Historique des versions CV/LM
- [ ] Recherche de recruteur
- [ ] Rappels et notifications email
- [ ] Dashboard graphiques avancés
- [ ] Carte partageable LinkedIn

### V1.2 — Interview Vocal

- [ ] Intégration Voxtral Small via OpenRouter (STT streaming progressif par chunks 500ms)
- [ ] Intégration Voxtral TTS via API Mistral (synthèse vocale)
- [ ] Pipeline streaming LLM → TTS (pipe direct, first chunk avant fin de génération)
- [ ] VAD (Voice Activity Detection) côté navigateur (WebRTC)
- [ ] Feedback visuel : animation microphone + "thinking" entre les tours
- [ ] Mode interview vocal complet
- [ ] Profils d'interview (Standard, Agressif, Passif, Technique, Comportemental)
- [ ] Rapport post-interview avec métriques et notes /10
- [ ] Réécoute audio + transcription
- [ ] Mode pratique libre
- [ ] Purge automatique des fichiers audio après délai RGPD
- [ ] Pré-génération question suivante pendant lecture TTS (V1.2 avancé — latence ~300ms)

### V2.0 (futur)

- [ ] Rôle recruteur
- [ ] Organisations / comptes entreprise
- [ ] Import PDF d'offre
- [ ] Connexion sociale (Google, LinkedIn)
- [ ] Extension browser pour scraping
- [ ] Analytics admin avancés + export CSV
- [ ] Upgrade OpenRouter enterprise (EU routing garanti)

---

_Document généré le 16/04/2026 — V0.7 : Architecture Docker monorepo, direction artistique "Papier & Crayon", Redis + Turborepo ajoutés à la stack._
