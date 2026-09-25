<!-- generated-by: run-agent analyst -->

# Product Backlog

> Source of truth: `.project/vision.md`

## Epics

| Epic | Horizon | Outcome | KPI dérivé de la vision | Sprints | Source |
| ---- | ------- | ------- | ----------------------- | ------- | ------ |
| E1 | MVP | Fondations monorepo, Docker local et prod | Les apps `app`, `landing`, `api`, les packages partagés et les services Docker `app`, `api`, `landing`, `postgres`, `minio`, `redis`, `puppeteer` sont présents; l'override prod couvre reverse proxy + SSL | 001-002 | vision `§2.7`, `§16` |
| E2 | MVP | Design system "Papier & Crayon" et shell applicatif responsive | La palette, les typographies, les tokens Tailwind, `shadcn/ui`, la navigation mobile et la sidebar desktop sont implémentées | 002 | vision `§2.6`, `§16` |
| E3 | MVP | Authentification passwordless et contrôle d'accès | Le premier compte devient admin une seule fois, `/register` ne crée jamais d'admin, les invitations admin sont à usage unique avec expiration 48h | 003 | vision `§3.1` à `§3.4`, `§13.1`, `§16` |
| E4 | MVP | Onboarding et profil de base pseudonymisable | L'onboarding couvre les 5 étapes prévues, un profil de base unique est éditable, et les règles de pseudonymisation sont appliquées au pipeline IA | 004 | vision `§4`, `§5`, `§15.3`, `§16` |
| E5 | MVP | Ingestion des offres et pipeline candidature | Une candidature peut être créée via scraping ou fallback texte, avec pipeline de statuts opérationnel | 005 | vision `§7`, `§16` |
| E6 | MVP | Pipeline IA texte et templates | Tous les appels OpenRouter envoient `zdr: true`; au moins 1 template CV ATS et 1 template LM ATS sont gérés côté admin via Puck | 005-006 | vision `§2`, `§6`, `§15.2`, `§16` |
| E7 | MVP | Génération CV, édition et export PDF | Un CV est généré via pipeline pseudonymisé, éditable dans Puck, consultable en lecture mobile, puis exportable en PDF sans métadonnées identifiantes | 007 | vision `§6`, `§8`, `§15.3`, `§15.4`, `§16` |
| E7-Puck | MVP | Intégration Puck Editor (admin + user) | `@measured-co/puck` est installé, le drag-and-drop admin remplace le textarea JSON, l'éditeur CV utilisateur utilise Puck en mode contenu uniquement — conformément à ADR-003 | 008 | ADR-003, vision `§6.1`, `§6.7`, `§8`, `§13.3`, `§16` |
| E8 | MVP | Lettre de motivation, crédits et paiement | La LM utilise le même pipeline que le CV; les packs `Starter 9,99 EUR` et `Pro 19,99 EUR` sont achetables et le solde de crédits est visible | 009 | vision `§9`, `§11`, `§16` |
| E9 | MVP | Dashboard, panel admin et préparation au lancement | Le dashboard expose les 7 KPI de base; le panel admin couvre users + templates; les exigences RGPD critiques avant lancement sont traitées | 010 | vision `§12.2`, `§13`, `§15.1`, `§15.5`, `§16` |
| E10 | V1.1 | Productivité candidat avancée | Les profils multiples, l'import CV, l'export DOCX, l'historique de versions et la recherche de recruteur sont disponibles | 011 | vision `§4`, `§5`, `§6.6`, `§16` |
| E11 | V1.1 | Rappels, analytics avancés et partage | Les rappels email/in-app, les graphiques avancés et la carte partageable LinkedIn sont actifs | 012 | vision `§12.3` à `§12.5`, `§14`, `§16` |
| E12 | V1.2 | Plateforme interview temps réel | Le streaming STT/TTS/LLM, le VAD et le feedback visuel tiennent l'objectif perçu `< 1,2 s` pour la boucle interview | 013 | vision `§10`, `§16` |
| E13 | V1.2 | Produit interview complet et conformité audio | Le mode interview vocal, les profils d'interview, le rapport noté, la réécoute/transcription, le mode libre et la purge audio RGPD sont disponibles | 014 | vision `§10`, `§15.5`, `§16` |
| E14 | V2.0 | Offre recruteur et extension entreprise | Les rôles recruteur, organisations, import PDF d'offre, extension browser, analytics admin avancés et étude enterprise OpenRouter sont cadrés et livrés | 015 | vision `§13.4`, `§16` |
| E15 | V2.1 | UX Redesign desktop-first + refonte interview et éditeur | App desktop-first shadcn-minimal; tables candidatures/documents; interview VAD auto sans bouton; continuité agent via messages[] Redis; Puck admin full-screen uniquement; écrans intermédiaires; dashboard épuré | 016–019 | vision `§2.5`, `§2.6`, `§6`, `§8`, `§10`, feedback 2026-04-26 |
| E16 ✅ | 022 | Supervision solde IA & pilotage revenus admin | L'admin surveille le solde OpenRouter, est alerté avant rupture, ne vend pas de crédits qu'il ne peut pas honorer, et dispose d'un dashboard de métriques produit + revenus | 022 | Hors vision v0.7, hors ADR existante — décision produit du 2026-09-17 |
| E17 ✅ | 023 | Gestion utilisateurs avancée (admin) | Recherche/filtres/pagination serveur, fiche utilisateur complète, suspension, suppression RGPD vérifiée, rétrogradation admin→user uniquement, journal d'audit, révocation de session | 023 | Complète vision `§13.2`/`§15.1` ; US-093 contraint par vision `§3.2` |
| E18 ✅ | 024 | Score ATS (produit d'appel + in-app) | Un visiteur non authentifié scanne son CV sur la landing, obtient un score et 3 points gratuitement, et déverrouille le rapport contre son email — ce qui lui crée un compte ; en in-app, chaque CV généré porte un badge de score gratuit | 024 | Complète vision `§7.1`, `§7.4`, `§12.2`, `§12.3`, `§8.1` ; **la page publique est hors vision** — décision produit du 2026-09-22 |
| E23 | 029-030 | Outils gratuits d'acquisition sur la landing | Quatre outils sans compte en plus du scan ATS (comparateur CV ↔ offre, métier qui recrute + salaire, vérification d'employeur, questions d'entretien probables) ; chacun donne un résultat utile, puis convertit par email en un compte pré-rempli avec ce que le visiteur a saisi ; le tunnel de chaque outil est mesuré de la vue à l'activation du compte | 029-030 | **Hors vision** — décision produit du 2026-09-24 ; prolonge E18 (ADR-022) et exploite E19-E21 (ADR-024 §3 : les données France Travail restent gratuites) |
| E24 | 031 | Landing : vitrine complète et pages fonctionnalités | L'accueil présente toute la recherche (offres du jour, CV et lettre, entretien, entreprises et marché) ; quatre pages dédiées indexables, illustrées par des captures de l'app, avec métadonnées, JSON-LD et sitemap | 031 | Pages marketing sur des fonctionnalités livrées — décision produit du 2026-09-25 |

## Estimate Scale

| Taille | Interprétation | Règle d'exécution |
| ------ | -------------- | ----------------- |
| `S` | 0,5 à 1 jour net | Une branche courte suffit |
| `M` | 2 à 4 jours nets | Découper en 1 à 2 PRs max |
| `L` | 5 à 8 jours nets | Sous-découpage obligatoire avant implémentation |

Référence de gate: le spec impose des branches courtes et des PRs <= 400 lignes; une story `L` ne doit donc jamais partir en un seul bloc de développement (source: spec `§4`).

## User Stories

| ID | Story | Epic | Est. | Priority | Sprint | Source |
| -- | ----- | ---- | ---- | -------- | ------ | ------ |
| US-001 | Initialiser le workspace `pnpm` et `turbo` à la racine | E1 | M | P0 | 001 | vision `§2.7`, `§16` |
| US-002 | Scaffold `apps/app`, `apps/landing` et `apps/api` | E1 | M | P0 | 001 | vision `§2`, `§2.7`, `§16` |
| US-003 | Créer `packages/ui`, `packages/types` et `packages/config` | E1 | S | P1 | 001 | vision `§2.7`, `§16` |
| US-004 | Poser Docker local et `.env.example` | E1 | M | P0 | 001 | vision `§2.7`, `§16` |
| US-005 | Finaliser `docker-compose.prod.yml` avec reverse proxy Traefik + SSL | E1 | M | P1 | 002 | vision `§2.7`, `§16` |
| US-006 | Définir les tokens design system "Papier & Crayon" | E2 | M | P0 | 002 | vision `§2.6`, `§16` |
| US-007 | Installer `shadcn/ui` et personnaliser les composants de base | E2 | M | P0 | 002 | vision `§2`, `§2.6`, `§16` |
| US-008 | Mettre en place la navigation mobile + sidebar desktop | E2 | M | P0 | 002 | vision `§2.5`, `§16` |
| US-009 | Implémenter l'auth passwordless et les sessions sécurisées | E3 | L | P0 | 003 | vision `§3.1`, `§3.4`, `§16` |
| US-010 | Sécuriser le bootstrapping du premier admin | E3 | M | P0 | 003 | vision `§3.2`, `§16` |
| US-011 | Ajouter les invitations admin/user à usage unique avec expiration 48h | E3 | M | P0 | 003 | vision `§3.2`, `§13.2`, `§16` |
| US-012 | Protéger les routes par rôles, dont `/admin` | E3 | M | P0 | 003 | vision `§3.3`, `§13.1`, `§16` |
| US-013 | Construire le wizard d'onboarding en 5 étapes | E4 | L | P0 | 004 | vision `§4`, `§16` |
| US-014 | Modéliser et éditer le profil de base unique | E4 | L | P0 | 004 | vision `§5`, `§16` |
| US-015 | Appliquer les règles de pseudonymisation pour les prompts IA | E4 | M | P0 | 004 | vision `§15.3`, `§16` |
| US-016 | Ajouter consentement et garde-fous de données nécessaires au MVP | E4 | M | P1 | 004 | vision `§15.1`, `§15.5` |
| US-017 | Intégrer OpenRouter avec `provider.only = [\"Mistral\"]` et `zdr: true` | E6 | M | P0 | 005 | vision `§2`, `§15.2`, `§16` |
| US-018 | Créer une candidature à partir d'une offre via scraping | E5 | M | P0 | 005 | vision `§7`, `§16` |
| US-019 | Ajouter le fallback texte et le fallback PDF si faisable dans le MVP | E5 | M | P1 | 005 | vision `§7`, `§16` |
| US-020 | Mettre en place le pipeline de statuts candidature | E5 | M | P0 | 005 | vision `§7`, `§16` |
| US-021 | Développer les blocs Puck custom CV et LM | E6 | L | P0 | 006 | vision `§6.1` à `§6.4`, `§16` |
| US-022 | Créer la gestion admin des templates CV ATS et LM ATS | E6 | L | P0 | 006 | vision `§6.6`, `§6.7`, `§13.3`, `§16` |
| US-023 | Gérer activation, duplication, catégorisation et défaut des templates | E6 | M | P1 | 006 | vision `§6.6`, `§13.3`, `§16` |
| US-024 | Prévisualiser les templates avec données fictives injectées | E6 | M | P1 | 006 | vision `§13.3`, `§16` |
| US-025 | Générer un CV via pipeline OpenRouter vers JSON pseudonymisé puis injection locale | E7 | L | P0 | 007 | vision `§6.2`, `§8`, `§15.3`, `§16` |
| US-026 | Permettre l'édition WYSIWYG Puck côté user + lecture mobile | E7 | L | P0 | 007 | vision `§6`, `§8`, `§16` |
| US-027 | Exporter le CV en PDF via Puppeteer sans métadonnées identifiantes | E7 | M | P0 | 007 | vision `§8`, `§15.4`, `§16` |
| US-028 | Générer la lettre de motivation avec le même pipeline documentaire | E8 | M | P0 | 007 | vision `§9`, `§16` |
| US-055 | Installer `@measured-co/puck`, créer l'adaptateur `toPuckConfig()` et migrer le JSON des templates existants | E7-Puck | S | P0 | 008 | ADR-003, vision `§6.1`, `§6.3` |
| US-056 | Intégrer Puck Editor en mode drag-and-drop dans l'interface admin de templates | E7-Puck | L | P0 | 008 | ADR-003, vision `§6.1`, `§6.7`, `§13.3` |
| US-057 | Remplacer l'éditeur de CV utilisateur par Puck Editor avec permissions de contenu uniquement | E7-Puck | M | P0 | 008 | ADR-003, vision `§6`, `§8`, `§16` |
| US-029 | Mettre en place le ledger de crédits et les règles de consommation IA | E8 | M | P0 | 009 | vision `§11`, `§16` |
| US-030 | Intégrer Stripe pour les packs `Starter` et `Pro` | E8 | M | P0 | 009 | vision `§11`, `§16` |
| US-031 | Créer la page "Mes crédits" avec historique et alerte solde bas | E8 | M | P0 | 009 | vision `§11`, `§14.1`, `§16` |
| US-032 | Exposer le dashboard utilisateur avec KPI de base et accès rapides | E9 | M | P0 | 009 | vision `§12.1` à `§12.4`, `§16` |
| US-033 | Développer le panel admin utilisateurs et crédits | E9 | L | P0 | 010 | vision `§13.2`, `§16` |
| US-034 | Finaliser les opérations avancées de gestion des templates admin | E9 | M | P0 | 010 | vision `§13.3`, `§16` |
| US-035 | Mettre en place le centre de notifications et les rappels de base | E9 | M | P1 | 010 | vision `§12.4`, `§14`, `§16` |
| US-036 | Traiter les exigences RGPD critiques avant lancement commercial | E9 | L | P0 | 010 | vision `§15.1`, `§15.5`, `§16` |
| US-037 | Ajouter les profils de base multiples | E10 | M | P1 | 011 | vision `§5.1`, `§16` |
| US-038 | Importer un CV existant avec extraction IA pseudonymisée | E10 | L | P1 | 011 | vision `§4`, `§15.3`, `§16` |
| US-039 | Ajouter l'export DOCX et l'historique des versions CV/LM | E10 | M | P1 | 011 | vision `§6.6`, `§16` |
| US-040 | Ajouter la recherche de recruteur | E10 | M | P2 | 011 | vision `§16` |
| US-041 | Envoyer les rappels et notifications email avec préférences utilisateur | E11 | M | P1 | 012 | vision `§14`, `§16` |
| US-042 | Exposer les graphiques avancés du dashboard | E11 | M | P1 | 012 | vision `§12.3`, `§16` |
| US-043 | Générer la carte partageable LinkedIn et le partage natif | E11 | M | P2 | 012 | vision `§12.5`, `§16` |
| US-044 | Intégrer Voxtral Small pour le STT streaming progressif | E12 | L | P0 | 013 | vision `§10`, `§16` |
| US-045 | Intégrer Voxtral TTS et le pipeline streaming LLM -> TTS | E12 | L | P0 | 013 | vision `§10`, `§16` |
| US-046 | Ajouter VAD navigateur et feedback visuel temps réel | E12 | M | P0 | 013 | vision `§10`, `§16` |
| US-047 | Tenir la latence perçue cible `< 1,2 s` sur la boucle interview | E12 | L | P0 | 013 | vision `§10`, `§16` |
| US-048 | Livrer le mode interview vocal complet avec profils recruteur | E13 | L | P0 | 014 | vision `§10`, `§16` |
| US-049 | Générer le rapport post-interview avec métriques et notes | E13 | M | P0 | 014 | vision `§10`, `§16` |
| US-050 | Ajouter réécoute audio, transcription, mode pratique libre, purge RGPD et pré-génération | E13 | L | P1 | 014 | vision `§10`, `§15.5`, `§16` |
| US-051 | Ajouter le rôle recruteur et les organisations / comptes entreprise | E14 | L | P1 | 015 | vision `§16` |
| US-052 | Ajouter l'import PDF d'offre et la connexion sociale à évaluer | E14 | M | P2 | 015 | vision `§3.1`, `§16` |
| US-053 | Ajouter l'extension browser pour le scraping d'offres | E14 | M | P2 | 015 | vision `§16` |
| US-054 | Ajouter analytics admin avancés, export CSV et évaluer OpenRouter enterprise | E14 | M | P2 | 015 | vision `§13.4`, `§15.5`, `§16` |
| US-060 | Refondre la navigation en sidebar desktop-first avec drawer mobile | E15 | M | P0 | 016 | vision `§2.5`, `§2.6` |
| US-061 | Convertir la liste candidatures en table filtrée avec slide-over détail | E15 | L | P0 | 016 | vision `§7` |
| US-062 | Créer l'écran détail candidature avec onglets Offre/CV/LM/Interviews/Historique | E15 | L | P0 | 016 | vision `§7`, `§8`, `§9`, `§10` |
| US-063 | Créer l'écran setup entretien `/interview/new` (sélection candidature, profil, langue) | E15 | M | P0 | 017 | vision `§10` |
| US-064 | Refondre l'Interview Studio avec VAD automatique (sans bouton push-to-talk) | E15 | L | P0 | 017 | vision `§10` |
| US-065 | Corriger la continuité de l'agent: messages[] server-side par sessionId (Redis) | E15 | M | P0 | 017 | vision `§10` |
| US-066 | Créer l'écran rapport entretien `/interview/[id]/report` | E15 | M | P1 | 017 | vision `§10` |
| US-067 | Créer le Documents Hub `/documents` avec table CV/LM et actions PDF/DOCX/Éditer | E15 | M | P0 | 018 | vision `§6`, `§8`, `§9` |
| US-068 | Remplacer l'éditeur document utilisateur par formulaire structuré (sans Puck) | E15 | L | P0 | 018 | vision `§8` ⚠️ product decision |
| US-069 | Passer l'éditeur Puck admin en mode full-screen viewport (admin-only) | E15 | M | P0 | 018 | ADR-003, vision `§6.7`, `§13.3` |
| US-070 | Refondre le Dashboard: 3 KPI + 2 tables récentes + quick actions | E15 | M | P1 | 018 | vision `§12.1`–`§12.4` |
| US-071 | Appliquer le design token shadcn-minimal à l'ensemble de l'app | E15 | M | P1 | 019 | vision `§2.6` |
| US-072 | Refondre la page Crédits avec table ledger et cards packs | E15 | S | P1 | 019 | vision `§11` |
| US-073 | Refondre la page Profil: accordions par section + switcher multi-profil | E15 | M | P1 | 019 | vision `§5`, `§5.1` |
| US-083 | Service OpenRouterBalanceService : GET https://openrouter.ai/api/v1/credits, cache mémoire TTL 5 min, pas de nouvelle dépendance (pas de cron/Redis/BullMQ) | E16 | S | P0 | 022 | décision produit 2026-09-17 |
| US-084 | Endpoint GET /admin/metrics/openrouter-balance + alerte in-app (réutilise le système notifications existant) si solde < seuil configurable (OPENROUTER_BALANCE_ALERT_THRESHOLD) | E16 | M | P0 | 022 | décision produit 2026-09-17 |
| US-085 | Garde-fou : bloquer POST /credits/checkout (503 + message explicite) si solde OpenRouter sous seuil critique | E16 | M | P1 | 022 | décision produit 2026-09-17 |
| US-086 | Dashboard admin /admin/metrics (apps/web, gabarit ADR-008) : CV/LM générés, interviews, utilisateurs actifs, crédits vendus vs consommés, CA Stripe, coût API estimé, marge nette — calculs côté apps/api | E16 | L | P1 | 022 | décision produit 2026-09-17, ADR-008 |
| US-087 | Export CSV des métriques de /admin/metrics | E16 | S | P2 | 022 | décision produit 2026-09-17 |
| US-088 | Auditer l'existant (/admin/users, US-033, US-082, US-036) vs vision §13.2/§15.1 : produire .project/audits/user-management-20260917.md listant précisément ce qui manque — aucun code | E17 | S | P0 | 023 | vision `§13.2`, `§15.1` |
| US-089 | Recherche (email), filtres (rôle, statut, solde) et pagination serveur sur la table utilisateurs, filtres reflétés dans l'URL | E17 | M | P0 | 023 | vision `§13.2` |
| US-090 | Fiche /admin/users/[id] : profil, candidatures, historique crédits, statut compte, sessions actives, actions rapides inline, WCAG 2.1 AA | E17 | L | P0 | 023 | vision `§13.2` |
| US-091 | Suspension / réactivation de compte (magic link refusé si suspendu, données intactes) | E17 | M | P0 | 023 | vision `§13.2` |
| US-092 | Suppression RGPD complète (double confirmation par saisie email) : profil, candidatures, documents, audio interviews, transactions crédits ; test d'intégration prouvant l'absence de données résiduelles | E17 | L | P0 | 023 | vision `§13.2`, `§15.1` |
| US-093 | Rétrogradation admin → user UNIQUEMENT (jamais promotion user → admin, réservée à l'invitation US-011) ; bloquée si dernier admin | E17 | S | P1 | 023 | vision `§3.2`, `§13.2` |
| US-094 | Journal d'audit /admin/audit-log (qui/quand/quoi/sur qui/note) pour suspension, réactivation, suppression, rétrogradation, octroi crédits | E17 | M | P1 | 023 | vision `§13.2` |
| US-095 | Déconnexion forcée / révocation de session depuis la fiche utilisateur | E17 | S | P2 | 023 | vision `§13.2` |
| US-096 | Hotfix §3.2 : rendre la promotion user→admin impossible par toute action admin | E17 | S | P0 | 022 | vision `§3.2` — ajout hors énoncé, validé le 2026-09-17 |
| US-097 | Moteur de score ATS : package pur, modèle normalisé, noyau déterministe, renormalisation des dimensions non observables, barème versionné | E18 | M | P0 | 024 | vision `§7.1`, `§7.4`, `§12.2`, `§12.3` |
| US-098 | Adaptateurs texte brut / `CVDocumentContent` + dimensions `keywords` (note max à 60 % de couverture) et `impact` en mode règles | E18 | M | P0 | 024 | vision `§8.1` |
| US-099 | Signaux de lisibilité machine à l'extraction PDF (couche texte, pages, colonnes, mojibake) et extraction de `extractText` en module réutilisable | E18 | M | P0 | 024 | vision `§6.4` |
| US-100 | `AtsImpactService` : volet LLM borné à la seule dimension `impact`, 4 sous-notes 0..10, clamp ±25 autour du score par règles, jamais bloquant | E18 | M | P0 | 024 | vision `§8.1`, `§15.3` |
| US-101 | Rate limiting applicatif sur les routes publiques : fenêtre glissante par IP, budget global quotidien, store derrière une interface | E18 | M | P0 | 024 | `engineering-standards.md` §7 — aucun rate limiting n'existe dans l'API |
| US-102 | `POST /public/ats-scan` : module ATS, table `ats_scans`, sniff des magic bytes, OCR désactivé, réponse gratuite sans `dimensions[]`, aucun texte de CV persisté | E18 | L | P0 | 024 | vision `§15.3` |
| US-103 | Déverrouillage par email : rapport complet immédiat + magic link en parallèle, consentement explicite, purge 30 jours | E18 | M | P0 | 024 | vision `§15.1`, `§15.3` |
| US-104 | Page publique d'analyse ATS sur la landing (FR/EN) : route BFF, dictionnaires, dropzone, jauge, rapport verrouillé, formulaire email | E18 | L | P0 | 024 | Hors vision — décision produit du 2026-09-22 |
| US-105 | Score in-app : persistance sur `applications` et `application_cv_versions`, calcul à la génération et à la sauvegarde, 0 crédit | E18 | M | P0 | 024 | vision `§7.4`, `§12.3` |
| US-106 | Badge de score ATS dans `apps/web` (colonne de liste, entête éditeur CV), WCAG 2.1 AA | E18 | S | P1 | 024 | vision `§7.1` |
| US-107 | KPI admin : score ATS moyen groupé par version de moteur, scans publics, taux de déverrouillage, conversion en compte | E18 | S | P2 | 024 | vision `§12.2` |
| US-131 | Événements de tunnel côté API : table `acquisition_events` (outil, étape, locale, `ip_hash`, aucune donnée personnelle), route `POST /public/events` rate-limitée, tunnel par outil dans `/admin/metrics` | E23 | M | P0 | 029 | vision `§12.2` ; Hors vision — décision produit du 2026-09-24 |
| US-132 | Rate limit générique : clé de budget global, limites et variables d'env par route publique ; l'ATS garde ses `ATS_*` | E23 | M | P0 | 029 | ADR-022 |
| US-133 | Service « lead » générique extrait du déverrouillage ATS : email + consentement → magic link + intention de pré-remplissage appliquée à la première connexion ; le scan ATS est retrouvé dans l'app | E23 | M | P0 | 029 | vision `§15.1` ; Hors vision — décision produit du 2026-09-24 |
| US-134 | Correctifs du tunnel ATS : `locale` transmise par la landing, erreurs traduites par code, liens depuis le Hero et la section CTA | E23 | S | P1 | 029 | Hors vision — décision produit du 2026-09-24 |
| US-135 | Hub « Outils gratuits » sur la landing FR/EN (`/fr/outils`, `/en/tools`) : entrée de menu, section home, sitemap, JSON-LD | E23 | M | P1 | 029 | Hors vision — décision produit du 2026-09-24 |
| US-136 | Comparateur CV ↔ offre : `POST /public/keyword-match` (moteur `packages/ats-score`, extraction sans OCR, 0 LLM, CV jamais persisté), page landing, CTA « Générer un CV adapté » → candidature pré-créée | E23 | L | P0 | 029 | Hors vision — décision produit du 2026-09-24 |
| US-137 | « Ce métier recrute-t-il près de chez moi ? » : autocomplete ROME public, tension, offres, demandeurs et salaire médian avec taille d'échantillon ; CTA « offres du jour par email » → projet de recherche pré-rempli | E23 | L | P1 | 030 | Hors vision — décision produit du 2026-09-24 ; ADR-024 §3 |
| US-138 | Pages SEO métier × département (ISR, sitemap, JSON-LD) générées depuis les données locales | E23 | M | P2 | 030 | Hors vision — décision produit du 2026-09-24 |
| US-139 | « Vérifier un employeur » : recherche par nom ou SIREN, fiche (effectif, NAF, Egapro, ESS, société à mission, bilan carbone, page employeur France Travail) ; CTA entreprises qui recrutent | E23 | M | P1 | 030 | Hors vision — décision produit du 2026-09-24 ; ADR-024 §3 |
| US-140 | Pages SEO entreprises (ISR, sitemap) avec sources citées | E23 | M | P2 | 030 | Hors vision — décision produit du 2026-09-24 |
| US-141 | Questions d'entretien probables : 5 questions pour un texte d'offre, un appel LLM court sous budget global quotidien et limite par IP ; CTA entretien vocal | E23 | M | P2 | 030 | Hors vision — décision produit du 2026-09-24 ; ADR-022 |
| US-142 | Socle des pages fonctionnalités : registre `lib/features.ts`, slugs FR/EN, gabarit commun, métadonnées, JSON-LD, image OG, sitemap | E24 | M | P0 | 031 | Décision produit du 2026-09-25 |
| US-143 | Page « Offres du jour » : sources, score de correspondance, classement IA avec une phrase par offre, captures | E24 | M | P0 | 031 | Décision produit du 2026-09-25 |
| US-144 | Page « CV et lettre sur mesure » : import, génération ancrée, score ATS, éditeur, traduction, export | E24 | M | P1 | 031 | Décision produit du 2026-09-25 |
| US-145 | Page « Simulation d'entretien » : voix temps réel, styles de recruteur, rapport, progression | E24 | M | P1 | 031 | Décision produit du 2026-09-25 |
| US-146 | Page « Entreprises qui recrutent et marché » : potentiel d'embauche, fiche entreprise, radar marché | E24 | M | P1 | 031 | Décision produit du 2026-09-25 |
| US-147 | Nouvelle page d'accueil « toute la recherche » et menu Fonctionnalités | E24 | L | P0 | 031 | Décision produit du 2026-09-25 |
| US-148 | Captures d'écran v2 : nouveaux écrans et captures de détail depuis le compte de démo | E24 | M | P0 | 031 | Décision produit du 2026-09-25 |
| US-153 | Analyse ATS d'un CV généré dans l'app : le badge ouvre un panneau avec les points relevés, un conseil par point, la note par critère et le plafonnement ; lien depuis la liste des candidatures | E18 | M | P1 | 031 | Complète vision `§7.1` ; décision produit du 2026-09-25 (aligner l'app sur la landing) |

## Critères d'acceptation détaillés — E16

- **US-083** : retourne `{totalCredits, totalUsage, remaining}` ; fallback stale + flag `stale:true` si échec réseau ; tests cache hit/miss/échec
- **US-084** : protégé rôle admin (403 sinon) ; alerte non dupliquée (1×/jour tant que seuil bas)
- **US-085** : test avec solde simulé = 0 → achat bloqué, bandeau front explicite
- **US-086** : fichiers ≤ 400 lignes, découpage par carte de métrique, WCAG 2.1 AA, aucune logique métier dans `apps/web`
- **US-087** : CSV horodaté, mêmes métriques que le dashboard

## Critères d'acceptation détaillés — E17

> ⚠️ **RÈGLE DE SÉCURITÉ NON NÉGOCIABLE (vision `§3.2`)** : le rôle `admin` ne peut JAMAIS être
> attribué depuis `/admin/users` ou toute action admin. Seule voie : le lien d'invitation nominatif
> (US-011). US-093 n'implémente QUE admin → user.

- **US-088** : ordre strict — obligatoire avant toute autre story E17 ; certaines (US-089 à US-095) peuvent être partiellement déjà livrées
- **US-096** : `PATCH /admin/users/:email` avec `{role:"admin"}` renvoie 400 ; aucun select de rôle dans l'UI d'édition ; test de non-régression prouvant qu'aucun chemin de service ne promeut

## Critères d'acceptation détaillés — E18

> ⚠️ **RÈGLE DE COÛT NON NÉGOCIABLE** : `POST /public/ats-scan` est la première surface IA publique
> non authentifiée du produit, sur une API sans aucun rate limiting. **US-101 est obligatoire avant
> la mise en ligne d'US-104.** L'OCR reste désactivé sur cette route tant qu'il n'y a pas de worker.

> ⚠️ **RÈGLE RGPD** : aucun texte de CV n'est jamais persisté — ni fichier, ni texte extrait, ni
> texte pseudonymisé. Seuls des scores et des codes. Contrepartie assumée : pas de préremplissage
> du profil à l'inscription.

- **Invariant du barème (toutes stories)** : une dimension non observable est **exclue et les poids
  renormalisés**, jamais notée 0. Corollaire : une règle d'absence de défaut ne crédite que s'il
  existe de la matière où ce défaut pourrait apparaître (sinon un document vide marque des points).
- **US-097** : `scoreAts` pure et déterministe ; somme des poids = 100 assertée ;
  `ATS_SCORE_ENGINE_VERSION` sur chaque résultat et persisté avec lui — sans quoi la courbe §12.3
  compare des mesures prises avec deux règles différentes. ADR-021.
- **US-098** : un CV équivalent passé par les deux adaptateurs score à **±3 points** (c'est le test
  qui verrouille la cohérence des deux surfaces) ; fixtures **synthétiques** uniquement.
- **US-099** : le comportement de l'import CV existant reste inchangé, prouvé par ses tests actuels.
- **US-100** : le modèle ne renvoie **jamais** le score global, seulement 4 sous-notes 0..10 ; le
  scoring ne peut jamais faire échouer une génération de CV ; aucun test n'appelle le réseau.
- **US-101** : middleware maison, pas `@nestjs/throttler` (le repo n'utilise pas de Guards Nest) ;
  tests à timers simulés, aucun `sleep`. ADR-022.
- **US-102** : la réponse gratuite ne contient **jamais** `dimensions[]` — le gating est serveur, pas
  un flou CSS ; test explicite que la ligne écrite ne contient aucun texte de CV ; `ip_hash` jamais
  l'IP brute.
- **US-103** : réponse identique qu'il existe ou non un compte pour cet email (pas d'énumération) ;
  consentement explicite, l'envoi du lien valant création de compte.
- **US-104** : zéro texte en dur (tout dans `content/{fr,en}.ts`) ; axe-core propre ; dropzone
  opérable au clavier, `aria-live` sur le résultat, jauge avec équivalent textuel, la couleur n'est
  jamais seul porteur de sens.
- **US-105** : `cv-generation.service.ts` est à **417 lignes**, au-delà du seuil bloquant de 400 —
  cette story doit en **extraire** du code, pas en ajouter ; OpenRouter coupé ⇒ la génération
  réussit quand même, score rendu en mode règles.

## Critères d'acceptation détaillés — E23

> ⚠️ **Hors vision.** Décision produit du 2026-09-24 : les quatre outils ont été validés par le
> propriétaire. À reporter dans `.project/vision.md` par le `product-owner`, jamais en auto-édition.

> ⚠️ **RÈGLE DE COÛT** : toute route `public/*` passe par le rate limit (US-132) **avant** sa mise
> en ligne. Seule US-141 appelle un LLM ; elle a son propre budget global quotidien.

> ⚠️ **RÈGLE RGPD (reprise d'E18)** : aucun texte de CV n'est persisté. Le pré-remplissage à
> l'inscription ne porte que sur ce que le visiteur a saisi hors CV : texte d'offre, code ROME et
> lieu, SIREN, identifiant de scan.

Critères communs à chaque outil (US-136, US-137, US-139, US-141) :
- utilisable sans compte, en FR et en EN, sans texte en dur (`content/{fr,en}.ts`, test de parité) ;
- événements US-131 émis à chaque étape : vue, résultat affiché, clic CTA, email saisi ;
- WCAG 2.1 AA (axe-core propre, `aria-live` sur le résultat), `prefers-reduced-motion` respecté ;
- source citée dès que la donnée vient de France Travail ou d'une API de l'État ;
- page déclarée dans `sitemap.ts`, métadonnées via `pageMetadata()`.

- **US-131** : aucune IP brute, aucun email, aucun texte libre dans `acquisition_events` ;
  l'activation du compte se lit par jointure, comme `readAtsCounters` ; le tunnel admin affiche
  vue → résultat → email → compte activé pour chaque outil, ATS inclus.
- **US-132** : les limites et l'ATS existant restent inchangés (tests actuels verts) ; une nouvelle
  route s'ajoute par configuration, sans copier le middleware ; tests à timers simulés.
- **US-133** : réponse identique qu'un compte existe ou non (pas d'énumération) ; l'intention de
  pré-remplissage expire avec le magic link ; ATS migré sur ce service sans régression.
- **US-134** : un scan fait depuis `/en/…` est stocké en `en` ; aucune erreur française sur la
  version EN.
- **US-136** : 0 appel LLM, prouvé par test ; la réponse liste les mots-clés présents et
  manquants et un taux de couverture ; après inscription, la candidature existe avec le texte de
  l'offre, sans crédit consommé.
- **US-137** : 0 appel France Travail à la requête, lecture des copies locales uniquement ; un
  salaire n'est affiché qu'au-dessus d'une taille d'échantillon minimale, sinon message explicite.
- **US-138 / US-140** : pas de page générée sans données (pas de contenu mince) ; canonical et
  hreflang corrects.
- **US-139** : fonctionne sans clé API (sources publiques) ; une entreprise inconnue renvoie un
  message clair, pas une erreur.
- **US-141** : panne OpenRouter ⇒ message propre, jamais une 500 ; budget épuisé ⇒ 503 avec
  `Retry-After`.

## Statut E18

**Livré le 2026-09-22**, US-097 à US-107 incluses. Barème en version **1.1.0** (les plafonds de
défauts rédhibitoires, voir l'amendement d'ADR-021).

Restes hors code avant mise en ligne :
- **`ENABLE_ZDR_CHAT=true` en production** — la vision `§15.3` l'exige, il est à `false` en dev.
- Renseigner `ATS_IP_HASH_SECRET` (sinon le sel est régénéré à chaque redémarrage : les hachages
  cessent d'être comparables, ce qui n'expose rien mais rend la forensique inutile).
- Décider du timeout global au reverse proxy (écart assumé d'US-102).
- Le barème n'est étalonné sur **aucun CV réel d'utilisateur** : à réviser sur retours terrain, en
  bumpant la version.

## Statut E16/E17

**Livrés tous les deux le 2026-09-17** (sprints 022 et 023), US-083 à US-096 incluses.
Restes hors code : provisionner `OPENROUTER_MANAGEMENT_API_KEY`, et trancher la consolidation de
`GET /credits/admin/users` (encore utilisée par `apps/app`, v1 gelée).

## Notes d'implémentation E16/E17 (audit du 2026-09-17)

L'énoncé des stories est conservé verbatim ; ces écarts avec le code réel sont à intégrer à l'exécution.

| Story | Énoncé | Réalité du code |
| ----- | ------ | --------------- |
| US-083 | `GET /api/v1/credits` avec la clé existante | Exige une **management key** ; `OPENROUTER_API_KEY` (clé d'inférence) reçoit un **403**. → nouvelle var `OPENROUTER_MANAGEMENT_API_KEY` |
| US-084 | « réutilise le système notifications existant » | Ce système n'a **aucun chemin d'écriture** (dérivation paresseuse à la lecture, `ensureDueNotifications`), 2 types seulement, par utilisateur, sans audience admin, sans contrainte d'unicité → méthode de création publique + nouveau type + fan-out via `AuthService.listAccounts()` + garde de déduplication. Déclencheur : `setInterval` quotidien (pattern maison `interview-purge.service.ts`, Node pur, pas d'ADR) |
| US-085 | « bloquer `POST /credits/checkout` » | Cette route n'existe pas. Le checkout est `POST /billing/checkout-sessions` (`apps/api/src/billing/billing.controller.ts:33`), point d'accroche `checkout.service.ts:30-34` |
| US-086 | « utilisateurs actifs » | Aucune colonne `lastLoginAt`/`lastSeenAt` → à dériver d'une fenêtre d'activité (ledger/candidatures) ou nouvelle colonne. « coût API estimé » : le coût par génération n'est pas persisté ; seul `total_usage` OpenRouter (cumul, **USD**) existe, alors que le CA est en **EUR cents** |
| US-089 | pagination serveur | Aujourd'hui `listAccounts()` puis filtre/tri/pagination **en JS**, + 1 requête `getSummaryForUser` **par compte** (`apps/api/src/credits/admin-user-directory.ts:33-83`) → pousser en SQL |
| US-091/095 | suspension / révocation | Sessions = **cookie HMAC sans état**, aucune table, aucune révocation possible ; un suspendu garde l'accès jusqu'à 7 j. Décision d'archi à instruire par US-088 (colonne `sessionEpoch`/`revokedAt` vs table de sessions) ; `auth_accounts` n'a pas de colonne `status` |
| US-092 | purge RGPD | `PrivacyService.purgeAccount` couvre candidatures, notifications, profils, ledger, compte auth — **mais pas** `interview_sessions`/`interview_chunks` (pas de `deleteByUserEmail` sur `InterviewStore`) ni `credit_orders` |

Contexte persistance : la migration ADR-011 est **terminée** — tous les modules sont sur un
`*.pg-store.ts` (migrations `0000`→`0010`). E16/E17 travaillent en SQL, pas sur des stores JSON.

## Maintenance Découverte

- 2026-06-03 — Splitter `apps/app/app/letters/[applicationId]/letter-editor.tsx` lors de la prochaine évolution LM : le fichier reste à ~611 lignes, au-dessus du seuil warning TSX, mais n'a pas été touché pendant le retrait de Puck.
- 2026-06-10 — Exclure `.agents` du script `pnpm format` ou le passer en lecture seule dans la configuration Prettier.
- 2026-06-10 — Exclure `dist`, `.next` et les artefacts de couverture du rapport Vitest racine pour mesurer uniquement les sources.
- 2026-06-10 — Décider du devenir de `app/onboarding/wizard.tsx`: `/` redirige désormais vers `/dashboard`; supprimer le wizard legacy ou l'exposer comme parcours volontaire depuis `/profile`.
- 2026-06-10 — Remplacer les liens internes restants vers `/` par leur destination explicite (`/dashboard` ou landing) pour éviter une redirection intermédiaire.
- 2026-07-10 — US-075 : `share-card-content.ts` (`buildDashboardSharePageUrl`, `buildLinkedInShareUrl`) n'a plus d'appelant depuis le retrait de la carte LinkedIn du dashboard ; nettoyer quand `/share/*` sera replanifié.
- 2026-07-10 — US-075 : `/share/dashboard` n'a plus de point d'entrée dans l'app (route/page/OG image conservées mais orphelines) ; décider de restaurer un accès ou de dépréciter la route.
- 2026-09-22 — ~~Les deux trous du pipeline de déploiement~~ → **corrigés**. (1) Chaque conteneur expose désormais le build qu'il sert (`APP_VERSION` → `/health` côté api, `/version` côté web) et le déploiement **échoue** si ce n'est pas le tag publié : c'est ce qui manquait quand staging a servi une image vieille de cinq déploiements tous « réussis » — le smoke test vérifiait bien le web, mais `/login` répond identiquement sur l'ancienne image. *(Ma note initiale disait que le smoke test ne couvrait que l'API : c'était faux.)* (2) Nouveau job `verify-image` : l'image API est démarrée contre un PostgreSQL 16 jetable, migrations comprises, **avant** `tofu apply` — un crash au boot ou une migration cassée arrête le pipeline au lieu d'abîmer l'environnement.
- 2026-09-17 — `pnpm build` échoue sur `apps/app` (v1 gelée) : `app/credits/**` référence `CreateCheckoutSessionRequest["packId"]`, champ supprimé de `@cvforge/types` par la refonte des offres de crédits. Panne préexistante, indépendante de E16/E17. Décider entre corriger la v1 ou la retirer du pipeline `build` (cf. contexte §6.2 « retrait de `apps/app` »).

- 2026-09-21 — **Le ZDR est désactivé et la chaîne de repli sort de l'UE, contre la vision `§15.2`.** `ENABLE_ZDR_CHAT=false` et `ENABLE_ZDR_STT=false` dans `.env.example` comme en réel, et les modèles de repli (`openai/gpt-4.1-nano`, `google/gemini-2.5-flash`, plus les modèles voix/STT d'OpenAI) sont hors Union européenne, alors que la vision prescrit « activer ZDR systématiquement » et `provider.only = ["Mistral"]`. La politique de confidentialité publiée ce jour **dit la vérité plutôt que de promettre le zéro-rétention** : elle nomme OpenRouter, OpenAI, Google et Mistral, et assume les transferts hors UE sous clauses contractuelles types. À arbitrer : réactiver le ZDR sur le chat (l'endpoint transcription n'accepte pas de filtre provider, cf. `ADR-013`), et décider si la chaîne de repli doit être restreinte à l'UE au prix de la disponibilité. Toute décision change le texte de la politique, qui s'édite désormais depuis `/admin/legal`.

- **Rate limit (revue US-132)** : `/public/ats-scan/` (barre oblique finale) correspond aux deux motifs Nest, donc le middleware s'exécute deux fois et compte la requête double. Préexistant ; la landing n'utilise jamais ce chemin.

- **Landing, contraste (revue US-134)** : le paragraphe `cta.body` de `components/sections/cta.tsx` (`text-lg opacity-85`, blanc à 85 % sur le bleu primaire) tombe à environ 4,06:1, sous les 4,5:1 exigés pour du texte de 18 px non gras. Préexistant : le choix visuel revient au designer.
- **Landing, focus du résultat ATS (revue US-136)** : `components/ats/ats-checker.tsx` focalise le résultat dans un `requestAnimationFrame` lancé depuis `analyse()`. Sur le comparateur, ce motif s'exécutait avant que React monte le panneau, et le focus restait sur le `body` (vérifié au navigateur). Le comparateur utilise désormais un `useEffect` sur le résultat. Le checker ATS a probablement le même défaut : à vérifier, puis corriger de la même façon.
- **Comparateur, vocabulaire de l'offre (US-136)** : les termes sont les mots de 4 lettres et plus, moins les mots vides d'offre et les verbes en « -ez ». Des mots de prose passent encore (« bases », « code », « revues »). Deux pistes : une liste de mots vides plus riche, ou des groupes nominaux. Un changement dans `offerTerms` modifie aussi la dimension `keywords`, donc demande de monter `ATS_SCORE_ENGINE_VERSION`.
- **API, taille (US-136)** : `applications.service.ts` passe de 767 à 669 lignes (structuration de l'offre sortie dans `offer-structuring.ts`). Il reste au-dessus de la cible de 300.

## Clarifications Pendantes

- Choisir le provider email pour magic links et notifications. La vision cite seulement un exemple: `Resend` (source: vision `§2`)
- Fixer la durée de session finale; la vision ne donne qu'une recommandation de `7 jours` avec refresh token (source: vision `§3.4`)
- Revalider pendant `Sprint 010` si l'import CV reste soutenable en `V1.1` compte tenu de la complexité d'extraction IA (source: vision `§4`)
- Sélectionner la librairie de conversion `DOCX` pendant `Sprint 010` (source: vision `§6.6`)

## Notes d'ordonnancement

- `E3` doit être livré avant `E9` pour sécuriser `/admin`
- `E6` doit précéder `E7` et `E8`
- `E9` clôt le MVP
- `E12` et `E13` sont volontairement séparés à cause des risques de latence et de streaming

## Dependency Matrix

| Epic | Dépend de | Pourquoi |
| ---- | --------- | --------- |
| `E2` | `E1` | Le design system dépend du monorepo, des packages partagés et du shell existant |
| `E3` | `E1`, `E2` | L'auth et les contrôles d'accès doivent s'intégrer aux apps et à la navigation |
| `E4` | `E3` | L'onboarding et le profil suivent la création de compte |
| `E5` | `E4` | La candidature exploite les données profil et préférences candidat |
| `E6` | `E2`, `E4` | Les templates et prompts consomment les données profil et le design document |
| `E7` | `E5`, `E6` | Génération, édition et PDF exigent une offre et un pipeline template/IA stable |
| `E8` | `E7` | Les crédits monétisent des actions documentaires déjà en place |
| `E9` | `E3`, `E5`, `E6`, `E8` | Dashboard et admin nécessitent auth, données métier, templates et crédits |
| `E10` | `E7` | L'import CV, DOCX et l'historique prolongent le pipeline documentaire |
| `E11` | `E9` | Les analytics avancées et rappels s'appuient sur les données du MVP |
| `E12` | `E3`, `E4` | L'interview vocal requiert auth, profil et fondations UX stables |
| `E13` | `E12` | Les fonctions interview avancées dépendent du socle temps réel |
| `E14` | `E5`, `E9` | Le versant recruteur/entreprise dépend des workflows candidature et admin |
| `E15` | `E2`, `E12`, `E13` | La refonte UX s'appuie sur le design system, le pipeline interview et les écrans documentaires existants |
| `E16` | `E8`, `E9` | La supervision du solde et les métriques de revenus s'appuient sur le ledger crédits, les commandes Stripe et le panel admin |
| `E17` | `E3`, `E9` | La gestion utilisateurs avancée prolonge l'auth/les rôles et le panel admin utilisateurs |
| `E18` | `E3`, `E7`, `E10` | Le score réutilise l'extraction de texte de l'import CV (`E10`), le pipeline documentaire pour le badge in-app (`E7`), et l'auth magic link (`E3`) pour convertir un visiteur en compte |
| `E23` | `E3`, `E18`, `E19`, `E20`, `E21` | Les outils réutilisent le rate limit et le déverrouillage d'E18, l'auth magic link (`E3`), les offres du jour (`E19`), les fiches entreprises (`E20`), le référentiel ROME et le radar marché (`E21`) |

## Technical Gates

| Sprint | Gate technique | Owner recommandé |
| ------ | -------------- | ---------------- |
| `002` | Valider tokens design system + accessibilité shell | `designer` + `qa-reviewer` |
| `003` | Valider sécurité auth, sessions et autorisations | `tech-lead` + `qa-reviewer` |
| `005` | Valider `zdr: true`, prompt logging off, pseudonymisation | `tech-lead` |
| `007` | Valider export PDF sans fuite de données identifiantes | `tech-lead` + `qa-reviewer` |
| `008` | Valider intégration Puck Editor — migration JSON, SSR constraint, permissions user | `tech-lead` |
| `009` | Valider ledger crédits et webhooks Stripe | `tech-lead` |
| `010` | Gate RGPD de lancement MVP | `tech-lead` + `product-owner` |
| `013` | Gate observabilité et latence interview | `tech-lead` + `analyst` |
| `014` | Gate purge audio et conservation RGPD | `tech-lead` |
| `017` | Gate continuité agent interview (messages[] Redis) + VAD auto | `tech-lead` + `qa-reviewer` |
| `018` | Gate cohérence Puck admin-only: aucune surface Puck côté user | `tech-lead` + `qa-reviewer` |
| `024` | Gate coût surface IA publique : rate limit par IP **et** budget global quotidien vérifiés en conditions réelles avant mise en ligne ; OCR désactivé sur la route publique | `tech-lead` |
| `024` | Gate RGPD scan anonyme : aucune ligne `ats_scans` ne contient de texte de CV (test d'intégration) | `tech-lead` + `qa-reviewer` |
| `024` | Gate résilience scoring : OpenRouter coupé ⇒ la génération de CV réussit, score rendu en mode règles | `tech-lead` |
| `029` | Gate mesure : le tunnel de chaque outil est visible dans `/admin/metrics` avant d'en ajouter un autre | `analyst` + `tech-lead` |
| `030` | Gate coût : budget global et limite par IP vérifiés sur la route LLM d'US-141 avant mise en ligne | `tech-lead` |

## ADR Watchlist

- Direction visuelle "Papier & Crayon raffiné" vs mobile-first (vision `§2.5`/`§2.6`) : décision produit desktop-first actée depuis 2026-04-26 (sprint 016) mais jamais formalisée en ADR — à écrire avant le prochain freeze de vision.
- **Page publique d'analyse ATS (E18)** : fonctionnalité **absente de la vision**, qui ne prévoit le score qu'en in-app. Décidée avec le propriétaire le 2026-09-22 — à reporter dans `.project/vision.md` par le `product-owner` (hard rule : jamais d'auto-édition de la vision).
- **Outils gratuits d'acquisition (E23)** : **absents de la vision**. Décidés avec le propriétaire le 2026-09-24 — à reporter dans `.project/vision.md` par le `product-owner`. Mesure par événements côté API, sans outil tiers : pas d'ADR analytics tant que ce choix tient.
- **ADR-021** ✅ écrit — moteur ATS : package pur, barème versionné, LLM borné à une dimension.
- **ADR-022** ✅ écrit — surface IA publique : rate limiting sans Redis ni throttler, budget global, OCR désactivé, rétention zéro.
- **Rate limit en mémoire = mono-instance.** Valide tant que l'API tourne en une instance ; le jour du scale-out, le `RateLimitStore` bascule sur Redis (déjà provisionné dans `docker-compose.yml`, lu nulle part aujourd'hui) — ADR à ce moment-là.
- ~~Puck Editor comme couche WYSIWYG~~ → **ADR-003 acceptée** (2026-04-20)
- Provider email pour magic links / notifications
- Librairie DOCX pour `V1.1`
- Extension browser si une stack dédiée est introduite
- OpenRouter enterprise si l'option change les garanties de déploiement ou de routing
- E16 — clé de management OpenRouter (`OPENROUTER_MANAGEMENT_API_KEY`) : nouveau secret uniquement, pas de nouvelle dépendance, **pas d'ADR requise**
- E17 — révocation de session (US-091/095) : colonne `sessionEpoch`/`revokedAt` sur `auth_accounts` vs table de sessions dédiée — arbitrage à porter par l'audit US-088
