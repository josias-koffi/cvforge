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
| E27 | 034 | Offres en temps réel | Une offre qui correspond est détectée dans les 15 minutes qui suivent sa publication (flux national France Travail toutes les 5 minutes, sites carrière suivis toutes les 30 minutes), le candidat reçoit une alerte gratuite et postule en un clic ; l'analyse IA de l'alerte (pourquoi elle vaut le coup) est l'option payante ; le récap du matin reste | 034 | Change le périmètre d'E19 (ADR-023 → ADR-027) — demande propriétaire du 2026-09-28 |
| E28 | 035 | Durées de conservation des offres et des candidatures | Une offre fermée est anonymisée tout de suite (licence France Travail), toute offre est purgée après 30 jours sauf si une candidature active s'y rattache, et une candidature sans activité depuis un an est supprimée après un rappel ; la politique de confidentialité l'annonce | 035 | Demande propriétaire du 2026-09-28 ; à livrer avant E27 |
| E29 | 036 | Postuler depuis sa propre boîte mail | Le candidat connecte Gmail ou Outlook (permission d'envoi seule) et envoie CV et lettre au recruteur depuis CVForge, depuis sa vraie adresse ; brouillon pré-rempli pour les autres messageries ; envoi gratuit, un destinataire par envoi, 20 par jour | 036 | **Hors vision** — demande propriétaire du 2026-09-28 ; ADR-028 |
| E30 | 037 | Plus d'entreprises : Workday et les logiciels vus sur JobTeaser | Les offres que JobTeaser relaie sont lues à la source, dans le logiciel de recrutement de l'entreprise : adaptateur Workday (sitemap + `JobPosting`), adaptateurs Workable, Recruitee, Personio et Welcome Kit, ajout en masse d'entreprises depuis l'admin ; `robots.txt` respecté, CGU relues, retrait sur demande, affichage minimal ; JobTeaser n'est jamais lu par un programme | 037 | Demande propriétaire du 2026-09-28 ; ADR-029 ; étend E19/E20 |

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
| US-160 | Entretien vocal en direct via OpenAI Realtime (WebRTC) : coupure native du recruteur, fin de tour sémantique, suivi serveur (agenda, transcription, raccrochage), coût par appel — ADR-026 | E12 | L | P0 | — | Demande propriétaire du 2026-09-25 |
| US-162 | ADR-027 « Collecte continue », amendement d'ADR-023, application France Travail passée en production, débit `offres` porté à 8 appels/s | E27 | S | P0 | 034 | Demande propriétaire du 2026-09-28 |
| US-163 | Flux France Travail en continu : tranches de 5 minutes par `minCreationDate`/`maxCreationDate` sur toute la France, curseur persistant, redécoupage au-delà de 1 150 offres, verrou, compteur d'appels | E27 | L | P0 | 034 | Demande propriétaire du 2026-09-28 |
| US-164 | Sites carrière des entreprises suivies lus toutes les 30 minutes, date de détection enregistrée, repli quotidien sur 429/403 | E27 | M | P1 | 034 | Demande propriétaire du 2026-09-28 |
| US-165 | Correspondance au fil de l'eau : score déterministe sur chaque nouvelle offre, stockage limité aux offres qui correspondent, vérification en direct, délai publication → correspondance mesuré | E27 | M | P0 | 034 | Demande propriétaire du 2026-09-28 |
| US-166 | Alertes « nouvelle offre » par e-mail, gratuites pour tous : immédiat ou regroupé à l'heure, seuil, plafond quotidien, heures calmes, désinscription | E27 | M | P0 | 034 | Demande propriétaire du 2026-09-28 |
| US-167 | Fraîcheur dans l'app : section « Nouvelles depuis votre dernière visite », badge « il y a X min », tri « les plus récentes », postuler en un clic depuis l'alerte | E27 | M | P1 | 034 | Demande propriétaire du 2026-09-28 |
| US-168 | Enrichissement IA des alertes (payant) : verdict « à saisir / à considérer / à passer », pourquoi l'offre vaut le coup, points de vigilance, quoi mettre en avant ; filtre les alertes « à passer » ; 1 crédit par jour où au moins une alerte est analysée (illimité ce jour-là, plafond de 20), action `job_alert_enrich` journalisée dans `ai_usage_events` | E27 | M | P0 | 034 | Demande propriétaire du 2026-09-28 — alertes gratuites, analyse IA à 1 crédit/jour |
| US-169 | Anonymiser les offres à leur fermeture (contact recruteur et entreprise retirés de `job_listings.raw`) et purger chaque jour les offres de plus de 30 jours non rattachées à une candidature active ; rattrapage `jobs:purge --dry-run` | E28 | M | P0 | 035 | Demande propriétaire du 2026-09-28 — licence France Travail |
| US-170 | Supprimer les candidatures sans modification depuis un an (versions, entretiens, fichiers), rappel par e-mail et dans l'app 15 jours avant, politique de confidentialité mise à jour avant activation | E28 | M | P0 | 035 | Demande propriétaire du 2026-09-28 — RGPD, durée de conservation |
| US-171 | Connecter sa boîte Gmail (`gmail.send` seule) : table `mail_connections`, jeton chiffré AES-256-GCM, déconnexion avec révocation, purge RGPD | E29 | M | P0 | 036 | Demande propriétaire du 2026-09-28 ; ADR-028 |
| US-172 | Connecter sa boîte Outlook via Microsoft Graph (`Mail.Send` seule), comptes personnels et professionnels, refus administrateur géré | E29 | M | P0 | 036 | Demande propriétaire du 2026-09-28 ; ADR-028 |
| US-173 | Envoyer sa candidature au recruteur : aperçu obligatoire, CV et lettre en PDF, un destinataire, gratuit, 20 envois par jour, statut « envoyée » et historique | E29 | L | P0 | 036 | Demande propriétaire du 2026-09-28 ; ADR-028 |
| US-174 | Repli pour les autres messageries : téléchargement des PDF et brouillon `mailto:` pré-rempli | E29 | S | P1 | 036 | Demande propriétaire du 2026-09-28 ; ADR-028 |
| US-175 | Démarches : validation Google `gmail.send`, vérification éditeur Microsoft, politique de confidentialité et CGU, variables d'environnement | E29 | S | P0 | 036 | Demande propriétaire du 2026-09-28 ; ADR-028 |
| US-176 | ADR-029 « Lire les sites carrière sans API officielle » : Workday par sitemap et `JobPosting`, User-Agent `JobSparkBot`, `robots.txt` bloquant, registre de conformité, retrait sous 48 h, affichage minimal, JobTeaser jamais lu automatiquement | E30 | S | P0 | 037 | Demande propriétaire du 2026-09-28 |
| US-177 | Règles de collecte sur tous les sites carrière : User-Agent, `robots.txt` en cache 24 h, statut de conformité `ok`/`a_relire`/`exclue` dans `job_boards`, relecture des CGU détectées, retrait sur demande | E30 | M | P0 | 037 | Demande propriétaire du 2026-09-28 ; avant US-164 |
| US-178 | Adaptateur Workday : détection `{tenant}.wd{N}.myworkdayjobs.com`, sitemap puis `JobPosting` des offres nouvelles, filtre France et 30 jours, contrat déduit du titre, offres gardées seulement si elles correspondent à une recherche active | E30 | M | P0 | 037 | Demande propriétaire du 2026-09-28 ; banc d'essai sur 5 entreprises |
| US-179 | Ajout en masse d'entreprises (100 URL d'offres) dans `/admin/job-search`, tableau « Logiciels à couvrir », Common Crawl sur `*.myworkdayjobs.com` | E30 | S | P1 | 037 | Demande propriétaire du 2026-09-28 |
| US-180 | Adaptateurs Workable, Recruitee, Personio et Welcome Kit (reconnus mais jamais collectés), conditions d'utilisation relues avant production | E30 | M | P1 | 037 | Décision du 2026-09-22 restée sans adaptateur |

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
| `E27` | `E19`, `E20`, `E26` | Le flux réutilise les sources, le dédoublonnage, le score et la vérification en direct d'E19, le registre des sites carrière (`E20`) et le cockpit admin (`E26`) pour le délai de détection |
| `E28` | `E19`, `E9` | La purge s'appuie sur les offres et correspondances d'E19 et sur le flux de suppression RGPD existant (`E9`) ; elle précède `E27`, qui multiplie le volume d'offres |
| `E29` | `E3`, `E7`, `E9`, `E19` | L'envoi réutilise l'auth et le flux de suppression RGPD (`E3`, `E9`), les exports PDF du CV et de la lettre (`E7`) et le contact recruteur des offres France Travail (`E19`) |
| `E30` | `E19`, `E20`, `E27` | Les adaptateurs s'ajoutent aux sources et au registre des sites carrière (`E19`, `E20`) ; les règles de collecte (US-177) doivent précéder la lecture toutes les 30 minutes d'`E27` (US-164) |

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

---

# Sprint 020

## 🎯 Sprint Goal

Rationalisation UI/UX desktop-first (1/2) — écrans d'entrée et de pilotage : login/register, dashboard, notifications, onboarding. Direction "Papier & Crayon raffiné, brutally minimal" (voir `.project/designs/frontend-rationalization-20260709.md`) — **remplace** US-070/071 de sprint 019, qui devient obsolète pour ces écrans.

## 📅 Period

- Start: 2026-07-13
- End: 2026-07-26

## ✅ Tasks (3–8 max)

- [x] **[US-074]** Refondre Login / Register pour le desktop
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] `/login/request`, `/login/check-email`, `/login/success` centrés en colonne étroite (max 420px), pas de mise en page mobile étirée sur grand écran
    - [x] `/register/invitation/accept` reprend le même gabarit (rôle/expiration en lecture, action unique)
    - [x] Consentement RGPD (US-016) conservé inline, sans régression
    - [x] Tokens `design-system.ts` réutilisés — aucune nouvelle couleur/police introduite
    - [x] WCAG 2.1 AA : labels associés, focus visible, contraste ≥4.5:1
  - Source: `.project/designs/frontend-rationalization-20260709.md` §1, vision `§3`

- [x] **[US-075]** Refondre le Dashboard : 3 KPI + 2 tables + quick actions
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] `dashboard/page.tsx` (672 lignes) scindé en `kpi-row.tsx`, `recent-tables.tsx`, `quick-actions.tsx` (chacun <300 lignes)
    - [x] 3 KPI cards en ligne : candidatures actives, crédits restants, prochaine interview
    - [x] Table "Candidatures récentes" (5 dernières : Poste, Statut, Date)
    - [x] Table "Sessions entretien récentes" (5 dernières : Candidature, Score, Date)
    - [x] Quick actions : "Nouvelle candidature", "Commencer un entretien", "Acheter des crédits"
    - [x] Responsive : stacked mobile, 2-col tablet, 3-col desktop
  - Source: absorbe US-070 (sprint 019, non exécutée), vision `§12.1`–`§12.4`

- [x] **[US-076]** Refondre `/notifications` en liste dense groupée par jour
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Liste triée par date décroissante, non-lu en tête avec pastille visible
    - [x] Groupement visuel par jour (aujourd'hui / hier / plus ancien)
    - [x] Carte "Préférences email" (US-041, déjà livrée) repositionnée en pied de liste, format dense
    - [x] Lien direct vers la candidature liée conservé
    - [x] WCAG 2.1 AA : `aria-live` sur le compteur non-lu, focus visible
  - Source: `.project/designs/frontend-rationalization-20260709.md` §8, vision `§14`

- [ ] **[US-077]** Scinder et resserrer l'onboarding pour le desktop
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `onboarding/wizard.tsx` (670 lignes) scindé en un composant par étape : `step-identity.tsx`, `step-links.tsx`, `step-extra.tsx`, `step-import.tsx`, `step-recap.tsx` (chacun <300 lignes)
    - [ ] Largeur desktop resserrée (≈600px centré) au lieu du plein-écran mobile actuel
    - [ ] Progression visible en haut (pas de barre latérale dédiée)
    - [ ] Reprise de session (résumé local, US-013) non régressée
    - [ ] Aucune perte de logique métier (`draft.ts`, `wizard-state.ts` inchangés)
  - Source: `.project/designs/frontend-rationalization-20260709.md` §10, vision `§4`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] Aucun fichier touché ne dépasse 400 lignes après refonte (spec §9)
- [ ] Rapport de contraste WCAG 2.1 AA passé sur les 4 écrans

## 🚧 Risks

- US-075/077 : scinder de gros fichiers en composants peut introduire des régressions de state partagé (formulaires, drafts) — couvrir par les tests existants avant de merger.
- US-074 : ne pas casser le flux magic-link (`/auth/callback`) qui reste hors périmètre visuel de ce sprint.

## ⚠️ To Clarify

- Aucune — voir `.project/workflows/analyst-designer-20260709205519/` pour l'audit complet ayant mené à ce découpage.

## 🔁 Suite

Sprint 021 couvre le reste du périmètre : CV, Letters, Credits, Profile, Admin.

## 🔁 Workflow Runs

- 2026-07-09 — [[workflows/runs/analyze-design-dev-review-20260709210000|analyze-design-dev-review]] (US-074) — passed
- 2026-07-10 — [[workflows/runs/analyze-design-dev-review-20260710010750|analyze-design-dev-review]] (US-075) — passed
- 2026-07-10 — [[workflows/runs/analyze-design-dev-review-20260710123525|analyze-design-dev-review]] (US-076) — passed


---

<!-- generated-by: run-workflow analyst-designer (analyst-designer-20260709205519) -->

# Sprint 021

## 🎯 Sprint Goal

Rationalisation UI/UX desktop-first (2/2) — écrans documentaires et administratifs : CV, Letters, Credits, Profile, Admin. Absorbe et remplace US-067, US-068, US-069, US-071 (partiel), US-072, US-073 de sprint 018/019, adaptés à la direction "Papier & Crayon raffiné" (`.project/designs/frontend-rationalization-20260709.md`) — pas de palette shadcn-minimal générique, pas de route `/documents`.

## 📅 Period

- Start: 2026-07-27
- End: 2026-08-09

## ✅ Tasks (3–8 max)

- [ ] **[US-078]** Refondre `/cv` : table des CV + éditeur formulaire/aperçu
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `/cv` liste en table : Titre, Candidature liée, Dernière modif, Actions (PDF, DOCX, Éditer)
    - [ ] Filtre et tri par date de modification
    - [ ] `/cv/[applicationId]` : formulaire structuré à gauche, aperçu sticky à droite (pas de Puck côté user)
    - [ ] Aucune nouvelle route `/documents` créée
    - [ ] Composant Puck non chargé dans le bundle user (vérifié par bundle analysis)
  - Source: absorbe US-067/068 (adaptées), vision `§6`, `§8`, `§9`

- [ ] **[US-079]** Refondre `/letters` : table des LM + éditeur formulaire/aperçu
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `/letters` liste en table, même gabarit que `/cv` (Titre, Candidature, Dernière modif, Actions)
    - [ ] `/letters/[applicationId]` : formulaire structuré + aperçu sticky, cohérent avec `/cv/[applicationId]`
    - [ ] Aucune nouvelle route `/documents` créée
  - Source: miroir US-078, vision `§9`

- [ ] **[US-080]** Refondre `/credits` : balance proéminente + table ledger
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Balance card grande en haut, alerte solde bas si `isLowBalance = true`
    - [ ] Cards packs en ligne (Starter 9,99€/550 crédits, Pro 19,99€/1400 crédits)
    - [ ] Table ledger : Date, Action, Montant (+/−), Solde après opération — triée décroissante, paginée
    - [ ] Tokens `design-system.ts` réutilisés (pas de palette shadcn-minimal)
  - Source: reprend US-072 (sprint 019), vision `§11`

- [ ] **[US-081]** Refondre `/profile` : colonne profils + accordions
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Colonne gauche 240px : liste des profils, profil actif mis en évidence, bouton "Nouveau profil"
    - [ ] Colonne droite : accordions Identité, Expériences, Formation, Compétences, Langues, Préférences
    - [ ] Import CV accessible dans l'accordion Identité
    - [ ] Switch de profil sans rechargement de page ; confirmation si données non sauvegardées
    - [ ] Chaque accordion se ferme après sauvegarde
  - Source: reprend US-073 (sprint 019), vision `§5`, `§5.1`

- [ ] **[US-082]** Refondre `/admin` : table utilisateurs desktop + finaliser Puck full-screen
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `/admin` : cards utilisateurs remplacées par une table (email, rôle, solde, dernière activité, actions), filtre conservé
    - [ ] Formulaire d'octroi de crédits (note obligatoire) accessible en ligne ou en panneau latéral, sans page dédiée
    - [ ] `/admin/templates/[id]/edit` en Puck plein écran (`100vw × 100vh`), layout dédié sans shell, admin-only, redirection 403 si `user`
    - [ ] `/admin/templates` (librairie + création) inchangé dans sa structure
  - Source: reprend US-069 (sprint 018), ajoute la table utilisateurs, vision `§6.7`, `§13.3`, ADR-003

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] Gate : aucune surface Puck côté user (bundle analysis)
- [ ] Rapport de contraste WCAG 2.1 AA passé sur les 5 écrans
- [ ] E15 (refonte UX) entièrement livré (sprints 016, 020, 021)

## 🚧 Risks

- US-078/079 : retirer Puck de l'éditeur user peut casser des documents existants générés avec un layout Puck — prévoir migration lecture-seule pour les anciens documents (risque déjà identifié en sprint 018).
- US-081 : le switch de profil sans navigation doit éviter la perte de données non sauvegardées.

## ⚠️ To Clarify

- Aucune — voir `.project/workflows/analyst-designer-20260709205519/` pour l'audit complet.


---

<!-- generated-by: plan « Outils gratuits d'acquisition » (demande propriétaire 2026-09-24) — brouillon -->

# Sprint 029 — Mesurer le tunnel, puis un deuxième outil gratuit : le comparateur CV ↔ offre

## 🎯 Sprint Goal

Épic **E23 — Outils gratuits d'acquisition**. Poser le socle commun à tous les outils gratuits de
la landing (mesure du tunnel, rate limit par route, conversion par email avec pré-remplissage),
corriger les fuites du tunnel ATS, et livrer le premier nouvel outil : le comparateur CV ↔ offre.

> ⚠️ Absent de `.project/vision.md`. Décision produit du 2026-09-24. À reporter par le Product
> Owner, jamais en auto-édition.

> ⚠️ **Brouillon.** Période à fixer. Constat de départ (sprint-024) : 7 scans, 3 déverrouillages,
> 0 lead converti, et aucune mesure côté front. D'où l'ordre : mesurer d'abord.

## ✅ Tasks

- [x] **[US-131]** Événements de tunnel côté API
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Table `acquisition_events` : outil, étape, locale, `ip_hash`, date. Aucune IP brute,
          aucun email, aucun texte libre.
    - [x] `POST /public/events` appelée par la landing via une route BFF, bornée par des valeurs
          fermées et un dédoublonnage par jour, outil, étape et `ip_hash` (amendé le 2026-09-24 :
          le rate limit par route n'existe qu'avec US-132, qui l'applique à cette route).
    - [x] Étapes : `view`, `result`, `cta_click`, `email_submitted` ; l'activation du compte se
          lit par jointure sur l'email, comme `readAtsCounters` (`metrics.pg-store.ts`).
    - [x] Tunnel par outil dans `/admin/metrics`, ATS inclus.
- [x] **[US-132]** Rate limit générique par route publique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] `rate-limit.middleware.ts` et `rate-limit.config.ts` prennent une clé de budget global
          et des limites par route ; une route s'ajoute par configuration dans `app.module.ts`.
    - [x] L'ATS garde ses variables `ATS_*` et son comportement, prouvé par ses tests actuels.
    - [x] Tests à timers simulés, aucun `sleep`. ADR-022 amendée si le contrat change.
    - [x] `POST /public/events` (US-131) est enregistrée dans le rate limit, avec ses propres
          limites.
    - [x] La landing lit l'IP du visiteur dans un en-tête configurable (`CLIENT_IP_HEADER`),
          `cf-connecting-ip` en production derrière Cloudflare (revue US-131, scindé le 2026-09-24 :
          la vérification en production passe au DoD du sprint).
    - [x] La landing relaie l'IP du visiteur à l'API dans un en-tête signé (`LANDING_PROXY_SECRET`),
          seul cru par l'API : Traefik écrase `X-Forwarded-For` sur le domaine public (revue US-132,
          décision du propriétaire le 2026-09-24).
- [x] **[US-133]** Service « lead » générique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Extrait de `ats-unlock.service.ts` : email + consentement explicite → magic link, réponse
          identique qu'un compte existe ou non.
    - [x] Accepte une intention de pré-remplissage typée (offre, ROME + lieu, SIREN, scan ATS),
          appliquée à la première connexion, expirée avec le magic link.
    - [x] Aucun texte de CV dans l'intention (règle RGPD d'E18).
    - [x] L'ATS est migré sur ce service ; son scan se retrouve dans l'app après inscription.
- [x] **[US-134]** Correctifs du tunnel ATS
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] La landing envoie `locale` (`lib/ats-client.ts`) ; un scan fait depuis `/en/…` est
          stocké en `en`.
    - [x] Les erreurs sont traduites côté landing à partir d'un code, plus de message français sur
          la version EN.
    - [x] Lien vers l'outil depuis le Hero et depuis la section CTA de la home.
    - [x] `ats-checker.tsx` (317 lignes) redescend sous 300, et le branchement des 4 événements
          d'US-131 est testé (revue US-131).
- [x] **[US-135]** Hub « Outils gratuits »
  - Agent: `designer` puis `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Page `/fr/outils` et `/en/tools` (slugs dans `lib/i18n.ts`, rewrites dans
          `next.config.ts`), sitemap, `pageMetadata()`, JSON-LD.
    - [x] Entrée de menu dans `site-header.tsx` et section sur la home.
    - [x] Les outils pas encore livrés n'apparaissent pas.
- [x] **[US-136]** Comparateur CV ↔ offre
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] `POST /public/keyword-match` : CV PDF/DOCX + texte d'offre ; réutilise `extractCvText`
          sans OCR et `packages/ats-score` (`extractKeywords`, dimension `keywords`).
    - [x] 0 appel LLM, prouvé par test ; CV jamais persisté.
    - [x] Résultat : taux de couverture, mots-clés présents et manquants.
    - [x] CTA « Générer un CV adapté à cette offre » → service lead (US-133) ; après inscription,
          la candidature existe avec le texte de l'offre, sans crédit consommé.
    - [x] À trancher au design : page dédiée ou onglet de la page ATS (qui accepte déjà une offre).
  - Découpage obligatoire (story `L`) : API d'abord, page ensuite.

Critères communs aux outils : voir `backlog.md`, « Critères d'acceptation détaillés — E23 ».

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green
- [x] QA review
- [x] Gate mesure : le tunnel ATS et celui du comparateur sont lisibles dans `/admin/metrics`
- [x] Gate RGPD : aucune ligne écrite ne contient de texte de CV (test d'intégration)
      → `apps/api/src/leads/public-tools.rgpd.test.ts` : tous les outils de bout en bout sur Postgres
      (PGlite), puis relecture de chaque table ; une fuite injectée est bien détectée.
- [ ] Exploitation : en production, l'en-tête `CF-Connecting-IP` arrive à la landing et l'origine
      n'accepte que Cloudflare ; Traefik (Dokploy) ne déclare ni `trustedIPs` ni `insecure` (US-132)
      → 2026-09-24 : Traefik vérifié (pas de `forwardedHeaders`, seul `api.insecure`). Les DNS sont
      en nuage gris : `CLIENT_IP_HEADER` est désormais vide par défaut (un `cf-connecting-ip` forgé
      contournait les limites sur la staging, ADR-022 ter). À poser à `cf-connecting-ip` avec le
      passage en orange.
- [ ] Exploitation : le secret GitHub `LANDING_PROXY_SECRET` est créé (production et staging), et
      un scan depuis deux IP différentes compte sur deux compteurs distincts (US-132)

## 🔁 Workflow Runs
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924143552|analyze-design-dev-review]] (US-131) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924145528|analyze-design-dev-review]] (US-132) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924155415|analyze-design-dev-review]] (US-133) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924162332|analyze-design-dev-review]] (US-134) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924164112|analyze-design-dev-review]] (US-135) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924173554|analyze-design-dev-review]] (US-136) — passed

---

<!-- generated-by: plan « Outils gratuits d'acquisition » (demande propriétaire 2026-09-24) — brouillon -->

# Sprint 030 — Métier, employeur, entretien : trois outils gratuits et leurs pages SEO

## 🎯 Sprint Goal

Épic **E23 — Outils gratuits d'acquisition**. Transformer les données déjà collectées (radar
marché, ROME, fiches entreprises) en outils sans compte et en pages indexables, et ajouter un
outil d'entretien qui mène vers l'entretien vocal.

> ⚠️ Absent de `.project/vision.md`. Décision produit du 2026-09-24. À reporter par le Product
> Owner, jamais en auto-édition.

> ⚠️ **Brouillon.** Dépend du sprint 029 (mesure, rate limit, service lead). Période à fixer.

## ✅ Tasks

- [ ] **[US-137]** « Ce métier recrute-t-il près de chez moi ? »
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Autocomplete ROME public, lu dans la copie locale (`rome-appellations.pg-reader.ts`).
    - [ ] Pour un métier et un département : tension 1 à 5, volume d'offres, demandeurs
          (`market-stats.service.ts`), salaire médian avec taille d'échantillon.
    - [ ] 0 appel France Travail à la requête ; source France Travail citée (ADR-024).
    - [ ] Salaire masqué sous une taille d'échantillon minimale, avec message explicite.
    - [ ] CTA « Recevoir chaque matin les offres de ce métier » → service lead ; après
          inscription, le projet de recherche est pré-rempli (ROME + lieu) et le digest E19 part.
  - Découpage obligatoire (story `L`) : API d'abord, page ensuite.
- [ ] **[US-138]** Pages SEO métier × département
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Pages ISR générées depuis les données locales, sitemap, JSON-LD, canonical et hreflang.
    - [ ] Pas de page sans données.
  - À décider : le volume de pages indexées au lancement (tous les couples ou les plus demandés).
- [ ] **[US-139]** « Vérifier un employeur »
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Recherche par nom ou SIREN ; fiche : effectif, NAF, Egapro, ESS, société à mission,
          bilan carbone, page employeur France Travail (`companies/`).
    - [ ] Fonctionne sans clé API ; sources citées.
    - [ ] Entreprise inconnue : message clair, pas d'erreur.
    - [ ] CTA vers les entreprises qui recrutent (E20) → service lead.
  - À vérifier : les quotas de recherche-entreprises.api.gouv.fr pour un appel à la demande.
- [ ] **[US-140]** Pages SEO entreprises
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Pages ISR avec sources citées, sitemap, canonical et hreflang.
    - [ ] Seules les entreprises déjà en base sont générées.
- [ ] **[US-141]** Questions d'entretien probables
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Pour un texte d'offre : 5 questions, un appel LLM court via `OpenRouterService`, prompt
          dérivé de `interview.prompts.ts`, sortie en schéma JSON strict.
    - [ ] Budget global quotidien et limite par IP (US-132) ; budget épuisé ⇒ 503 avec
          `Retry-After`.
    - [ ] Panne OpenRouter ⇒ message propre, jamais une 500.
    - [ ] CTA « S'entraîner à l'oral avec un recruteur IA » → service lead.

Critères communs aux outils : voir `backlog.md`, « Critères d'acceptation détaillés — E23 ».

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] QA review
- [ ] Gate coût : budget global et limite par IP vérifiés sur la route LLM d'US-141 avant mise en
      ligne

<!-- generated-by: plan « Offres en temps réel » (demande propriétaire 2026-09-28) -->

# Sprint 034 — Être parmi les premiers à postuler

## 🎯 Sprint Goal

Épic **E27 — Offres en temps réel**. Aujourd'hui, la collecte tourne une fois par jour à 6 h
(`DIGEST_HOUR`, `job-digest.service.ts`) et France Travail est interrogé avec `publieeDepuis=1`.
Une offre publiée à 9 h arrive donc chez le candidat le lendemain matin, quand une centaine de
personnes ont déjà postulé. À l'issue du sprint, une offre qui correspond est détectée **dans les
15 minutes** qui suivent sa publication, le candidat reçoit une alerte, et un clic enchaîne sur
« Postuler avec CVForge ». Le récap du matin reste, comme filet de sécurité.

**Modèle de prix (décision du propriétaire, 2026-09-28)** : les alertes sont **gratuites pour
tous**, immédiates ou regroupées. Ce qui est payant, c'est l'**enrichissement IA** des alertes
(US-168) : l'IA dit pourquoi cette offre-là vaut la peine d'être prise, ou pas. C'est notre valeur
ajoutée par rapport à une alerte LinkedIn ou France Travail.

Cible front : `apps/web`. `apps/app` est gelée, non touchée.

> ⚠️ **Change le périmètre d'E19** : ADR-023 et la règle « la collecte est quotidienne » de
> `sprint-025.md` sont à amender (US-162). Demande explicite du propriétaire le 2026-09-28. À
> reporter dans la vision par le Product Owner, jamais en auto-édition (hard rule).

> ⚠️ **RÈGLE DE GRATUITÉ (licence de réutilisation des offres France Travail, art. 5.1)** :
> « aucune rétribution, directe ou indirecte, ne peut être exigée des personnes à la recherche d'un
> emploi » et « il est interdit […] de vendre des offres d'emploi, quel que soit le support ». Voir
> une offre, en être alerté et accéder au lien pour postuler reste **toujours gratuit**. Les crédits
> paient une analyse ou un document produit par l'IA, jamais l'accès à une offre. L'analyse IA
> s'ajoute à l'offre : elle ne remplace ni ne modifie son contenu (« ne pas altérer le Contenu »,
> « la totalité du Contenu » affichée sur chaque offre). Source « France Travail » et date de mise
> à jour citées sur chaque offre.

> ⚠️ **RÈGLE DE SOURCES inchangée** : uniquement France Travail, La bonne alternance et les
> endpoints publics des logiciels de recrutement. Pas de LinkedIn, ni en direct ni par un
> revendeur (Fantastic.jobs, Apify, TheirStack : payants, et leur contenu LinkedIn est scrapé).
> Le site carrière de l'entreprise publie **avant** LinkedIn : c'est là qu'on gagne la course.

## 📐 Mesures sur l'API Offres d'emploi v2 (2026-09-28, lundi 11 h 30, heure de Paris)

Relevées en direct avec les identifiants du projet, en lecture seule :

| Mesure | Valeur | Conséquence |
| ------ | ------ | ----------- |
| Débit par application (`x-ratelimit-*-clientidlimiter`) | **10 appels/s** en continu, rafale de 10 | Le code est réglé à 4/s (`ft.config.ts`, commentaire « documenté : 4 ») : la marge est large |
| Débit global partagé (`defaultlimiter`) | 100 appels/s, rafale de 100 | Partagé entre toutes les applications : un 429 reste possible, `Retry-After` déjà géré |
| Quota mensuel | **Aucun en-tête**. Pas de plafond mensuel fixe : les quotas dépendent de l'application (homologation ou production), et le passage en production permet d'en obtenir de plus élevés | Nos ≈ 9 000 à 18 000 appels/mois restent modestes ; le « 100 000/mois » des blogs n'est pas une limite officielle |
| Nouvelles offres (`minCreationDate`/`maxCreationDate`, France entière, sans filtre) | 225 en 15 min, 3 197 en 1 h, 4 808 en 3 h, 9 620 en 24 h (dimanche compris) | Un pic en semaine peut dépasser 3 000/h |
| Délai de mise à disposition | Offre créée à 09:32:33, visible à 09:32:34 | L'API est en temps réel : seule notre fréquence de collecte crée le retard |
| Plafond d'une recherche | 1 150 résultats (`range` 0-1149, 150 par page) | Au pic, une fenêtre d'une heure déborde : il faut des tranches de temps courtes |

**Conséquence de conception : lire tout le flux national, puis trier chez nous.** Une requête par
tranche de temps, sans mot-clé ni département, coûte le même nombre d'appels quel que soit le
nombre de candidats. Toutes les 5 minutes, ça donne 1 ou 2 pages au pic, soit **environ 300 à
600 appels par jour** (≈ 9 000 à 18 000 par mois). Une requête par (métier × département) ferait
croître la facture avec chaque nouveau candidat.

> **Prérequis** : sprint 035 (E28, durées de conservation) livré avant, pour que la purge des
> offres existe quand le flux continu fait grossir la base.

## 📅 Period

- Start: à planifier après validation du propriétaire
- End: —

## ✅ Tasks (3–8 max)

> **Ordre strict** : US-162 (cadre et ADR) → US-163 (flux France Travail) → US-164 (sites
> carrière) → US-165 (correspondance au fil de l'eau) → US-166 (alertes gratuites) → US-168
> (enrichissement IA payant) → US-167 (surfaces web).

- [ ] **[US-162]** ADR-027 « Collecte continue » et amendement d'ADR-023
  - Agent: `tech-lead`
  - Critères d'acceptation :
    - [ ] ADR-027 dans `decisions/` : collecte continue (flux national France Travail et sites
          carrière), budget d'appels chiffré à partir des mesures ci-dessus, stockage limité aux
          offres qui correspondent à au moins une recherche active, récap du matin conservé.
    - [ ] ADR-023 porte un renvoi vers ADR-027 ; la règle « collecte quotidienne » de
          `sprint-025.md` est marquée comme remplacée.
    - [ ] Section « Licence » dans l'ADR-027 : gratuité pour le candidat (art. 5.1), pas
          d'altération du contenu, resynchronisation sous 24 h, pas de mise à disposition de la base à
          des tiers, pas d'usage commercial des coordonnées des recruteurs (art. 8). Relecture
          juridique recommandée avant la mise en production de l'option payante (US-168).
    - [ ] Le statut de l'application CVForge sur francetravail.io (homologation ou production)
          est relevé et consigné dans l'ADR. Si elle est encore en homologation : demande de
          passage en production déposée et licence de l'API acceptée (usage commercial continu),
          avec le cas d'usage « collecte toutes les 5 minutes, ≈ 600 appels/jour ».
    - [ ] Le débit `offres` passe de 4 à 8 appels/s (sous les 10 mesurés, pour laisser de la
          place à la vérification en direct et aux autres appels France Travail).
- [ ] **[US-163]** Flux France Travail en continu, par tranches de temps
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Une boucle toutes les **5 minutes** (réglable, `JOB_STREAM_INTERVAL_MINUTES`) lit les
          offres créées depuis la fin de la tranche précédente (`minCreationDate`/
          `maxCreationDate`, ISO-8601 à la seconde), sans mot-clé ni département.
    - [ ] Curseur persistant en base (fin de la dernière tranche lue avec succès) : un
          redémarrage ou une panne reprend là où la collecte s'était arrêtée, sans trou ni
          doublon. Le rattrapage après une longue panne est plafonné à 31 jours.
    - [ ] Tranche redécoupée par dichotomie quand `Content-Range` annonce plus de 1 150
          offres : aucune offre perdue au pic. Couvert par un test sur un total fictif de 3 000.
    - [ ] Chevauchement de 2 minutes entre deux tranches pour les offres créées pendant l'appel ;
          le dédoublonnage existant (US-111) absorbe les doublons.
    - [ ] Verrou (même mécanisme que `digest-runs`) : une seule instance collecte à la fois.
    - [ ] Un 429 met la boucle en pause sur `Retry-After`, sans avancer le curseur.
    - [ ] Le compteur d'appels du jour est enregistré par source et visible dans l'admin des
          sources ; alerte admin à 80 % du quota mensuel s'il existe.
    - [ ] Suppressions et modifications resynchronisées **au moins une fois toutes les 24 h**
          (obligation de la licence) : le flux ne lit que les créations, la passe quotidienne et la
          vérification en direct (`isStillOpen`) couvrent le reste. Une offre retirée chez France
          Travail disparaît de l'app et des alertes non encore envoyées.
    - [ ] La collecte par requêtes (`buildSourceQueries`) reste utilisée pour le rattrapage
          `--since=31` et pour La bonne alternance, dont l'API n'expose pas de date de création
          fine (à vérifier en direct, voir To Clarify).
- [ ] **[US-164]** Sites carrière interrogés plusieurs fois par heure
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Les entreprises suivies par au moins un candidat, ou dont une offre a correspondu dans
          les 30 derniers jours, sont lues **toutes les 30 minutes** ; les autres une fois par jour,
          comme aujourd'hui.
    - [ ] Une offre est « nouvelle » si son identifiant n'a jamais été vu pour ce site ; sa date
          de détection est enregistrée à côté de la date annoncée par le logiciel de recrutement
          (Lever et Greenhouse n'en donnent pas toujours une fiable).
    - [ ] Le limiteur par hôte (`board-http.ts`) est respecté ; un site qui répond 429 ou 403
          repasse au rythme quotidien pendant 24 h.
    - [ ] Aucune hausse de charge au-delà du budget fixé par l'ADR-027, vérifiée sur une journée
          de staging.
- [ ] **[US-165]** Correspondance au fil de l'eau
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Chaque nouvelle offre (US-163, US-164) est comparée aux recherches actives avec le
          score déterministe existant (ROME, compétences, contrat, lieu, télétravail) : pas
          d'appel IA dans la boucle, le reclassement IA reste réservé au récap du matin.
    - [ ] Seules les offres qui correspondent à au moins une recherche sont stockées ; les
          autres sont oubliées. La table `jobs` ne doit pas grossir de tout le flux national
          (≈ 10 000 à 30 000 offres par jour).
    - [ ] Une offre qui dépasse le seuil d'alerte du candidat crée une correspondance marquée
          `alert`, avec sa date de publication et sa date de détection.
    - [ ] L'offre est vérifiée en direct (`isStillOpen`) avant l'alerte, comme pour le récap.
    - [ ] Une offre déjà envoyée en alerte ne revient pas dans le récap du lendemain.
    - [ ] Délai publication → correspondance mesuré et exposé dans le cockpit admin (médiane et
          90e centile par source). Objectif : médiane sous 10 minutes pour France Travail.
- [ ] **[US-166]** Alertes « nouvelle offre », sans spammer
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] E-mail « Nouvelle offre pour vous » dans le gabarit commun (US-161) : intitulé,
          entreprise, lieu, « publiée il y a X min », pourquoi elle correspond, bouton
          « Postuler avec CVForge ».
    - [ ] Préférences sur `/notifications` : alertes activées ou non, seuil (offres « très
          proches » seulement ou toutes), et rythme **immédiat** ou **regroupé toutes les heures**.
    - [ ] Garde-fous : plafond d'alertes par jour et par candidat (valeur par défaut à fixer, voir
          To Clarify), heures calmes 21 h – 7 h (regroupées dans un envoi à 7 h), lien de
          désinscription `List-Unsubscribe` comme les autres e-mails.
    - [ ] Une alerte en échec ne bloque jamais la boucle de collecte.
    - [ ] Aperçu dans `email:preview`.
    - [ ] Gratuites pour tous, aucun crédit consommé : seul l'enrichissement IA (US-168) est payant.
- [ ] **[US-168]** Enrichissement IA des alertes : « pourquoi cette offre vaut la peine » (payant)
  - Agent: `developer` (+ `designer` pour le bloc dans l'e-mail et la carte)
  - Critères d'acceptation :
    - [ ] Option « Analyse IA de mes alertes » dans les préférences, désactivée par défaut, avec le
          prix affiché : « 1 crédit par jour où au moins une alerte est analysée, analyses
          illimitées ce jour-là ». Solde vide : l'alerte part quand même, sans analyse, avec une
          mention « analyse IA non incluse ».
    - [ ] Garde-fou : **20 analyses par jour et par candidat** au plus (réglable,
          `JOB_ALERT_ENRICH_DAILY_CAP`). Au-delà, les alertes partent sans analyse.
    - [ ] Pour chaque offre qui passe le seuil déterministe, un appel court (profil pseudonymisé,
          comme `rerankSelection`) renvoie un JSON validé :
          - **verdict** : « à saisir », « à considérer » ou « à passer » ;
          - **pourquoi elle vaut le coup** : 2 ou 3 raisons tirées du profil et de l'offre
            (compétences qui collent, progression, salaire, lieu, taille d'entreprise) ;
          - **points de vigilance** : écarts avec le profil, exigences manquantes, indices d'une
            annonce floue ou republiée ;
          - **quoi mettre en avant** dans le CV et la lettre pour cette offre.
          Rien n'est inventé : les compétences et expériences citées doivent exister dans le
          profil, sinon le champ est écarté (même garde-fou que le reclassement).
    - [ ] Avec l'option, l'IA **filtre** aussi : une offre jugée « à passer » n'est pas envoyée en
          immédiat, elle reste visible dans l'app avec son analyse. Moins d'alertes, mais les bonnes.
          Ce filtre est un **choix du candidat**, désactivable : sans lui, il reçoit toutes les
          alertes gratuites, exactement comme un candidat sans l'option. Payer ne donne accès à
          aucune offre supplémentaire ni plus tôt (règle de gratuité).
    - [ ] L'analyse est présentée à côté de l'offre, jamais à sa place : l'intitulé, la
          description et les informations de l'offre restent affichés intégralement et sans
          modification, avec la mention de la source.
    - [ ] Facturation : **1 crédit par jour** (jour calendaire, heure de Paris), débité après la
          **première analyse réussie** de la journée, comme `rerankSelection`. Les analyses
          suivantes du même jour sont gratuites. Un jour sans alerte analysée ne coûte rien ; un
          appel en échec ne déclenche pas le débit. Débit unique garanti par une contrainte
          d'unicité (candidat, jour) : deux alertes simultanées ne débitent pas deux crédits.
          Nouvelle action de crédit `job_alert_enrich` dans `@cvforge/types`
          (`AI_CREDIT_COSTS` = 1).
    - [ ] Un candidat qui a aussi le classement IA du récap du matin paie les deux (1 + 1 crédit
          par jour au plus) : ce sont deux options distinctes.
    - [ ] Chaque appel est journalisé dans `ai_usage_events` (US-154, fonctionnalité
          `job_alert_enrich`) : le cockpit montre le coût réel par jour facturé et la marge.
    - [ ] L'analyse est réutilisée par « Postuler avec CVForge » : les points à mettre en avant
          alimentent la génération du CV et de la lettre, sans nouvel appel.
    - [ ] L'enrichissement tourne hors de la boucle de collecte (file de travail) : un modèle lent
          ou en panne retarde l'alerte enrichie de 2 minutes au plus, au-delà elle part sans
          analyse.
    - [ ] Tests : validation du JSON, champ inventé écarté, un seul débit par jour même avec des
          alertes simultanées, pas de débit sur échec, pas de débit un jour sans alerte, plafond de
          20 analyses respecté.
- [ ] **[US-167]** Fraîcheur visible et réponse rapide dans l'app
  - Agent: `developer` (+ `designer` pour la carte)
  - Critères d'acceptation :
    - [ ] Sur « Offres du jour », une section « Nouvelles depuis votre dernière visite » en tête,
          triée par date de publication, avec un badge « il y a X min / X h ».
    - [ ] Filtre et tri « les plus récentes » sur la recherche libre (US-115).
    - [ ] Depuis l'alerte, « Postuler avec CVForge » ouvre directement la candidature avec la
          génération du CV adapté lancée (parcours US-113), sans étape intermédiaire.
    - [ ] Tests web sur le badge (fuseau de Paris) et sur la section « nouvelles ».

## 📊 Sprint DoD

- [ ] Sur staging pendant une journée ouvrée : médiane publication → alerte sous 15 minutes pour
      France Travail, aucun 429 persistant, budget d'appels respecté.
- [ ] `pnpm lint` et `pnpm test` verts (API et web).
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Quotas France Travail propres à l'application** : pas de plafond mensuel fixe, mais une
  application en homologation peut être bridée ou réévaluée par France Travail. Le compteur
  d'appels (US-163) et la gestion des 429 existante (`Retry-After`, pause de la source) couvrent
  le risque ; le passage en production (US-162) l'écarte.
- **Marge de l'analyse IA** : un appel coûte ≈ 0,0004 $ (`mistralai/mistral-small-2603`,
  ≈ 1 500 tokens en entrée, 300 en sortie, tarif OpenRouter du 2026-09-28). Au plafond de 20
  analyses, une journée coûte ≈ 0,8 c€ pour 1 crédit vendu 3,4 à 6,6 c€ selon le pack (base
  locale, à revérifier en prod). Un changement de modèle par défaut doit être revérifié dans le
  cockpit.
- **Spam** : trop d'alertes et le candidat désactive tout, ou les e-mails partent en indésirable
  et dégradent la réputation du domaine d'envoi. D'où le plafond, les heures calmes et le mode
  regroupé.
- **Charge sur les sites carrière** : lire un site toutes les 30 minutes au lieu d'une fois par
  jour multiplie les appels par 48. Greenhouse bloque une IP qui insiste : limiter aux
  entreprises réellement suivies.
- **Offres republiées** : certaines agences republient la même annonce tous les jours avec une
  nouvelle `dateCreation`. Le dédoublonnage (US-111) doit les attraper, sinon elles déclenchent
  une alerte chaque matin.

## ⚠️ To Clarify

- **Option payante et licence France Travail** : l'art. 5.1 interdit toute rétribution, même
  indirecte, exigée d'un candidat. Notre lecture : faire payer une analyse IA, comme un CV ou une
  lettre, reste possible tant que l'offre, l'alerte et le lien pour postuler restent gratuits. C'est
  une interprétation, pas un avis juridique : **à faire valider** (juriste, ou question écrite à
  France Travail via francetravail.io) avant d'activer US-168 en production. Le même point vaut
  pour le classement IA payant du récap du matin, déjà en ligne (US-112).

- ~~Réservé à l'offre payante ?~~ **Tranché le 2026-09-28** : alertes gratuites dans tous les
  cas ; l'enrichissement IA est payant (US-168).
- ~~Prix de l'enrichissement~~ **Tranché le 2026-09-28** : 1 crédit par jour où au moins une
  alerte est analysée, analyses illimitées ce jour-là (plafond technique de 20). 1 crédit par
  alerte a été écarté : environ 300 crédits par mois pour 10 alertes par jour, soit presque tout
  le pack « Recherche active ». Coût réel à confirmer dans le cockpit après une semaine.
- **Plafond d'alertes par jour** : proposition 10 en immédiat, au-delà basculement automatique en
  regroupé.
- **Notification push web** (PWA, service worker) : plus rapide que l'e-mail, mais c'est une
  nouvelle brique, qui n'existe pas encore dans `apps/web`. Proposée pour un sprint suivant.
- **La bonne alternance** : vérifier en direct si elle filtre par date de création fine ; sinon
  elle reste sur le rythme actuel.
- **Statut de l'application France Travail** : homologation ou production ? À lire dans l'espace
  développeur de francetravail.io (le propriétaire seul y a accès).

## 🔁 Workflow Runs

— aucun pour l'instant.

<!-- generated-by: plan « Durées de conservation » (demande propriétaire 2026-09-28) -->

# Sprint 035 — Ne garder que ce qui sert

## 🎯 Sprint Goal

Épic **E28 — Durées de conservation des offres et des candidatures**. Aujourd'hui, rien n'est
jamais supprimé : une offre fermée garde son `closed_at` et sa réponse brute (`job_listings.raw`),
**coordonnées du recruteur comprises** (141 offres France Travail sur 2 722 en base locale portent
un e-mail de recruteur), et une candidature vit aussi longtemps que le compte. À l'issue du sprint :

- une offre est anonymisée dès sa fermeture, puis supprimée après 30 jours, sauf si une
  candidature active s'y rattache ;
- une candidature sans activité depuis un an est supprimée, après un avertissement ;
- la politique de confidentialité annonce ces durées.

Indépendant d'E27 : **à livrer avant le sprint 034**. Le flux continu d'E27 fera entrer beaucoup
plus d'offres en base, et la purge doit exister avant.

> ⚠️ **Licence de réutilisation des offres France Travail** : le contenu d'une offre supprimée
> qu'on conserve doit être anonymisé (nom, description et URL de l'entreprise, personne à
> contacter, téléphone), et les coordonnées des recruteurs ne servent à aucun usage commercial
> (art. 8). Vérifié le 2026-09-28 : le module `leads` et les modules entreprises ne réutilisent
> aucune coordonnée de recruteur ; seule la fiche d'offre les montre au candidat, pour postuler.

## 📅 Period

- Start: à planifier, avant le sprint 034
- End: —

## ✅ Tasks (3–8 max)

- [x] **[US-169]** Anonymiser les offres fermées et purger les offres de plus de 30 jours
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] **Anonymisation à la fermeture** : quand une annonce passe `closed_at`, son `raw` perd le
          contact (`contact.*` : nom, courriel, coordonnées, téléphone) et les champs d'entreprise
          (nom, description, URL, logo) ; les mêmes champs sont vidés dans `jobs` si toutes ses
          annonces sont fermées. Couvert par un test sur une réponse France Travail réelle
          (fixture) et une annonce de logiciel de recrutement.
    - [x] **Purge quotidienne** (même verrou que `job_digest_runs`) : une offre (`jobs`) est
          supprimée, avec ses annonces, liens et correspondances en cascade, quand **sa date de
          publication (ou, à défaut, de première détection) dépasse 30 jours**, ou quand elle est
          fermée depuis plus de 30 jours,
          **sauf** si une correspondance la relie à une candidature **active** (brouillon, envoyée,
          entretien prévu), via `job_matches.application_id`.
    - [x] Une offre conservée pour une candidature active est anonymisée à sa fermeture comme les
          autres, puis purgée au premier passage où la candidature n'est plus active (refusée,
          offre reçue, supprimée).
    - [x] Une candidature ne dépend pas de l'offre purgée : elle garde sa propre copie
          (`raw_offer_text`, `extracted`). Vérifié par un test : la page candidature, la
          génération du CV et de la lettre, et l'entretien fonctionnent après la purge de l'offre.
          _Vérifié : test PGlite (la candidature relue par son store après la purge est entière) ;
          aucun module candidature, génération ou entretien ne lit `jobs` ni `job_matches`._
    - [x] **Rattrapage une seule fois** : les annonces déjà fermées sont anonymisées et les offres
          de plus de 30 jours purgées, par un script relançable (`jobs:purge --dry-run` pour
          compter avant d'agir).
          _La purge quotidienne ne démarre qu'après une première purge lancée à la main
          (`jobs:purge`), une fois le `--dry-run` relu (DoD). Base locale le 2026-10-04 : 4
          annonces à anonymiser, 376 offres sur 3 050 à purger, aucune gardée._
    - [x] Le nombre d'offres anonymisées et purgées par passage est journalisé et visible dans
          l'admin des sources.
    - [x] La fenêtre de 30 jours est une constante partagée avec la règle de fraîcheur d'E19
          (aucune offre de plus de 30 jours proposée), pas un second chiffre.
- [ ] **[US-170]** Supprimer les candidatures sans activité depuis un an
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Une candidature dont la **dernière modification** (`updated_at`) date de plus d'un an est
          supprimée, quel que soit son statut : versions de CV et de lettre (cascade existante),
          sessions et rapports d'entretien rattachés, fichiers stockés s'il y en a, correspondance
          d'offre détachée.
    - [ ] Une ouverture de la candidature ne compte pas comme une activité ; un changement de
          statut, une génération ou une modification, si.
    - [ ] **Avertissement 15 jours avant**, par e-mail (gabarit commun, US-161) et dans l'app :
          liste des candidatures concernées, avec un lien pour les garder (toute modification repousse
          l'échéance) ou télécharger leurs documents. Désactivable dans `/notifications` comme les
          autres e-mails, sauf qu'on ne peut pas désactiver la suppression elle-même.
    - [ ] Tâche quotidienne sur le modèle d'`AtsPurgeService` (au démarrage du module, puis toutes
          les 24 h), avec un mode `--dry-run`.
    - [ ] Les métriques admin qui comptent les candidatures (cockpit E26, KPI) restent justes :
          les agrégats historiques ne sont pas recalculés à partir des lignes supprimées, ou la
          baisse est documentée dans le cockpit.
    - [ ] `privacy-retention-policy.ts` porte les deux nouvelles règles (offres 30 jours,
          candidatures un an après la dernière activité).
    - [ ] Politique de confidentialité mise à jour depuis `/admin/legal`, section « Combien de
          temps nous les gardons » : « Vos candidatures : un an après leur dernière modification,
          avec un rappel quinze jours avant. » **Publiée avant l'activation de la purge.**
    - [ ] Tests : seuil d'un an, avertissement envoyé une seule fois, candidature modifiée après
          l'avertissement conservée, suppression complète (aucune ligne restante dans les tables
          liées).

## 📊 Sprint DoD

- [ ] `--dry-run` lancé en staging puis en prod, chiffres relus par le propriétaire avant la
      première vraie purge.
- [ ] `pnpm lint` et `pnpm test` verts.
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Suppression irréversible** : une erreur de requête efface des candidatures en cours. D'où le
  `--dry-run` obligatoire avant la première exécution, et des tests qui vérifient ce qui est
  **conservé**, pas seulement ce qui est supprimé.
- **Sauvegardes** : une candidature supprimée survit dans les sauvegardes de la base jusqu'à leur
  rotation. À mentionner dans la politique de confidentialité si la rotation dépasse quelques
  semaines.

## ⚠️ To Clarify

- **« Plus d'un an »** : compté depuis la **dernière modification** et non la création, pour ne
  pas supprimer une candidature encore suivie. Proposition à confirmer par le propriétaire.
- **Candidature avec une offre d'emploi reçue** : la supprimer aussi au bout d'un an sans
  activité ? Proposition : oui, la règle est la même pour tous les statuts, et l'avertissement
  laisse le temps de télécharger les documents.

## 🔁 Workflow Runs

— aucun pour l'instant.

<!-- generated-by: plan « Postuler depuis sa boîte mail » (demande propriétaire 2026-09-28) -->

# Sprint 036 — Postuler depuis sa propre boîte mail

## 🎯 Sprint Goal

Épic **E29 — Postuler depuis sa propre boîte mail**. À l'issue du sprint, un candidat connecte son
Gmail ou son Outlook une fois, puis envoie sa candidature (CV et lettre en PDF) au recruteur depuis
CVForge, **comme s'il l'envoyait lui-même** : le message part de sa vraie adresse et apparaît dans
ses messages envoyés. Pour les autres messageries, un brouillon pré-rempli prend le relais.

Décision d'architecture : **ADR-028** (`decisions/ADR-028-send-applications-from-candidate-mailbox.md`).

Cible front : `apps/web`. `apps/app` est gelée, non touchée.

> ⚠️ **Absent de la vision.** Demande explicite du propriétaire le 2026-09-28. À reporter dans la
> vision par le Product Owner, jamais en auto-édition (hard rule).

> ⚠️ **RÈGLES (ADR-028 §1 et §4)** : permission d'**envoi** seule, jamais de lecture de la boîte.
> Un envoi = une candidature = un destinataire, après aperçu. Envoi **gratuit** (licence France
> Travail, art. 5.1). Jamais d'adresse cherchée ou devinée par CVForge. Plafond de 20 envois par
> jour.

## 📅 Period

- Start: à planifier — la validation Google peut prendre plusieurs semaines, US-175 est à lancer
  dès l'accord sur l'ADR
- End: —

## ✅ Tasks (3–8 max)

> **Ordre** : US-175 (démarches, longues) démarre en premier et en parallèle. Puis US-171
> (connexion Google et socle), US-172 (Microsoft), US-173 (envoi), US-174 (repli).

- [ ] **[US-171]** Connecter sa boîte Gmail (socle commun des connexions)
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Table `mail_connections` (candidat, fournisseur, adresse connectée, jeton de
          rafraîchissement **chiffré AES-256-GCM**, état `active` / `lost`, dates), sans clé
          étrangère vers les profils (même règle que `search_projects`).
    - [ ] Chiffrement par `node:crypto` avec `MAIL_CONNECT_ENCRYPTION_KEY` ; sans clé, la
          fonctionnalité est inerte (aucun bouton, aucune erreur au démarrage). Test : le jeton
          écrit en base n'est jamais lisible en clair.
    - [ ] Flux OAuth Google avec `state` et PKCE, permissions `openid email` et `gmail.send`
          **uniquement** ; un test échoue si une autre permission Gmail est demandée.
    - [ ] Section « Messagerie connectée » dans les paramètres du compte : adresse connectée,
          bouton « Déconnecter » (révocation chez Google + suppression locale).
    - [ ] `invalid_grant` au rafraîchissement : connexion marquée `lost`, reconnexion proposée
          au prochain envoi.
    - [ ] Suppression du compte : connexions effacées et jetons révoqués (flux RGPD existant,
          test de résidu vert).
    - [ ] Aucun appel HTTP réel dans les tests (client injecté), pas de SDK Google (ADR-028 §2).
- [ ] **[US-172]** Connecter sa boîte Outlook (Microsoft 365, Outlook.com, Hotmail)
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Flux OAuth Microsoft (point d'accès `common`, comptes personnels et professionnels),
          permissions `openid email offline_access Mail.Send` uniquement.
    - [ ] Même socle que US-171 : stockage chiffré, état `lost`, déconnexion (suppression locale
          et lien vers la page Microsoft de retrait des autorisations), purge RGPD.
    - [ ] Consentement refusé par l'administrateur d'une entreprise : message clair qui propose
          le repli (US-174), pas d'erreur technique affichée.
- [ ] **[US-173]** Envoyer sa candidature au recruteur depuis CVForge
  - Agent: `developer` (+ `designer` pour l'aperçu)
  - Critères d'acceptation :
    - [ ] Bouton « Envoyer au recruteur » sur la candidature, visible seulement si une adresse
          est admise (ADR-028 §4) : contact de l'offre France Travail (jamais pour une offre
          anonyme), adresse présente dans le texte d'offre importé par le candidat, ou adresse
          saisie par le candidat. Masqué si l'offre demande de postuler par un lien.
    - [ ] **Aperçu obligatoire** avant envoi : expéditeur, destinataire, objet, message, pièces
          jointes (CV et lettre en PDF, exports existants). Tout est modifiable sauf l'expéditeur.
    - [ ] Message d'accompagnement pré-rempli **sans appel IA** (modèle fixe : poste, nom du
          candidat), objet « Candidature — <intitulé du poste> ».
    - [ ] Envoi par l'API Gmail (message MIME en base64url) ou Graph `sendMail`, avec les deux
          PDF en pièces jointes. Un seul destinataire, ni copie ni copie cachée.
    - [ ] **Gratuit** : aucun crédit consommé par l'envoi. Un CV ou une lettre pas encore générés
          sont proposés à la génération, au prix habituel, avant l'aperçu.
    - [ ] **Plafond de 20 envois par jour** et par candidat, message explicite quand il est
          atteint.
    - [ ] Après succès : candidature en « envoyée », entrée d'historique « envoyée depuis Gmail /
          Outlook le … », adresse du destinataire et identifiant du message enregistrés **sur la
          candidature seulement** (purgés avec elle, US-170).
    - [ ] Échec du fournisseur (quota, jeton perdu, pièce jointe refusée) : rien n'est marqué
          envoyé, l'erreur dit quoi faire (reconnecter, réessayer, passer au repli).
    - [ ] Un deuxième envoi de la même candidature demande une confirmation (« déjà envoyée le … »).
    - [ ] Tests : construction MIME (accents dans l'objet et le nom, pièces jointes), plafond,
          aucun débit de crédits, offre anonyme sans bouton, historique.
- [ ] **[US-174]** Repli pour les autres messageries
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Sans connexion Gmail ou Outlook : « Préparer l'e-mail » télécharge le CV et la lettre,
          puis ouvre un brouillon `mailto:` avec destinataire, objet et message pré-remplis.
    - [ ] Le candidat est prévenu qu'il doit joindre les fichiers lui-même ; un bouton « Je l'ai
          envoyée » passe la candidature en « envoyée ».
    - [ ] Proposé aussi quand la connexion est perdue ou refusée par l'entreprise.
- [ ] **[US-175]** Démarches Google, Microsoft et documents légaux
  - Agent: `product-owner` (actions du propriétaire, suivies ici)
  - Critères d'acceptation :
    - [ ] Projet Google Cloud : écran de consentement OAuth, domaine vérifié, demande de
          validation pour `gmail.send` déposée avec la vidéo de démonstration.
    - [ ] Application Entra ID enregistrée ; vérification de l'éditeur Microsoft lancée
          (prérequis à confirmer, ADR-028 « To check »).
    - [ ] Politique de confidentialité mise à jour depuis `/admin/legal` : Google et Microsoft
          comme services d'envoi, données stockées (adresse connectée, jeton chiffré), durée
          (jusqu'à la déconnexion ou la suppression du compte), permission d'envoi seule. Publiée
          **avant** l'ouverture au public.
    - [ ] CGU : le candidat est l'expéditeur et reste responsable du contenu envoyé et des
          adresses qu'il saisit.
    - [ ] Variables ajoutées à `.env.example`, Compose et Dokploy : identifiants OAuth Google et
          Microsoft, `MAIL_CONNECT_ENCRYPTION_KEY`.

## 📊 Sprint DoD

- [ ] Envoi réel vérifié depuis un compte Gmail de test et un compte Outlook.com vers une adresse
      de test : pièces jointes lisibles, accents corrects, message présent dans « Envoyés ».
- [ ] `pnpm lint` et `pnpm test` verts (API et web).
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Validation Google longue** : tant qu'elle n'est pas obtenue, 100 utilisateurs de test au plus
  et un écran d'avertissement. Microsoft et le repli fonctionnent pendant ce temps.
- **Mauvais usage** : un candidat qui arrose des recruteurs se fait bloquer par son fournisseur,
  et l'image de CVForge en pâtit. D'où l'aperçu obligatoire, un destinataire par envoi et le
  plafond quotidien.
- **Fuite de jetons** : un jeton d'envoi volé permet d'écrire au nom du candidat. D'où le
  chiffrement, une clé hors base et hors sauvegardes, la permission d'envoi seule et la
  révocation à la déconnexion.

## ⚠️ To Clarify

- **Employeurs à fort potentiel (La bonne boîte)** : pas d'adresse fournie par l'API, donc hors
  de cette épic. Canal officiel d'envoi à rechercher dans le catalogue France Travail.
- **Plafond de 20 envois par jour** : à confirmer par le propriétaire.

## 🔁 Workflow Runs

— aucun pour l'instant.

<!-- generated-by: plan « Plus d'entreprises : Workday et les logiciels des offres JobTeaser » (demande propriétaire 2026-09-28) -->

# Sprint 037 — Aller chercher les offres là où les entreprises les publient

## 🎯 Sprint Goal

Épic **E30 — Plus d'entreprises : Workday et les logiciels de recrutement vus sur JobTeaser**.
Le propriétaire trouve sur JobTeaser beaucoup d'offres d'entreprises que JobSpark n'a pas. JobTeaser
reste exclu (ADR-023 : pas d'API, CGU contre le scraping), mais ses offres renvoient presque toutes
vers le logiciel de recrutement de l'entreprise (ex. `cc.wd3.myworkdayjobs.com/…?source=Jobteaser`).
On va lire ce logiciel directement. À l'issue du sprint :

- les grands groupes sur **Workday** (Chanel, Sanofi, Airbus, Michelin…) sont collectés ;
- les quatre logiciels déjà reconnus mais jamais lus (Workable, Recruitee, Personio, Welcome Kit)
  le sont aussi ;
- chaque site est lu **selon ses propres règles** : `robots.txt` respecté, CGU relues quand il en
  affiche, retrait sur simple demande ;
- le propriétaire ajoute d'un coup les entreprises repérées en naviguant (liens « Postuler »), et
  l'admin montre quels logiciels restent à couvrir ;
- seules les offres qui correspondent aux recherches des candidats sont gardées.

Le produit s'appelle désormais **JobSpark** (ex-CVSpark) : le robot se présente comme `JobSparkBot`.

> ⚠️ **JobTeaser n'est jamais lu par un programme.** La découverte passe par le propriétaire (qui
> navigue et colle des liens), les imports des candidats et Common Crawl sur les domaines des
> logiciels de recrutement. Aucune requête automatique vers `jobteaser.com`.

## 🔬 Banc d'essai du 2026-09-28 (5 entreprises sur Workday, `JobSparkBot/0.1`, 1 requête/s)

| Entreprise | `robots.txt` | Lien légal sur le site carrière | Offres (API / sitemap) | `JobPosting` |
|---|---|---|---|---|
| Thales | ❌ interdit `/Careers/`, son propre site | confidentialité | 2000+ / aucun | non lu |
| Sanofi | ✅ | confidentialité | 841 / 100 | complet |
| Airbus | ✅ (interdit `/Airbus_Specific/`) | confidentialité candidats | 2000+ / 100 | complet |
| Chanel | ✅ | confidentialité | 1151 / 100 | employeur vide |
| Michelin | ✅ (interdit `/forum/`) | aucun | 739 / 100 | employeur vide sur les offres FR |

Constats : aucune CGU sur les sites carrière (seulement des politiques de confidentialité) ; les
CGU de workday.com ne couvrent que les pages qui y renvoient, et ces sites n'y renvoient pas ; le
sitemap ne liste que les **100 offres les plus récentes**, triées par date (dates vérifiées contre
« Posted Today ») ; `employmentType` vaut toujours `FULL_TIME`, même pour un CDD ou un stage ;
titres avec entités HTML (`&amp;`) ; beaucoup d'offres hors de France. 44 requêtes en 66 s.

## 📅 Period

- Start: à planifier — **US-177 avant US-164** (sprint 034), qui multiplie les passages sur les
  sites carrière
- End: —

## ✅ Tasks (3–8 max)

> **Ordre** : US-176 (règles) → US-177 (règles appliquées à toutes les sources) → US-178
> (Workday) et US-179 (découverte) en parallèle → US-180 (quatre adaptateurs).

- [ ] **[US-176]** ADR-029 « Lire les sites carrière sans API officielle »
  - Agent: `tech-lead`
  - Critères d'acceptation :
    - [ ] ADR-029 dans `decisions/`, avec renvoi depuis ADR-023 : Workday lu par son **sitemap et
          les données `JobPosting`** des pages d'offre (faites pour Google for Jobs), pas par
          l'endpoint interne `/wday/cxs/` ; les constats du banc d'essai ci-dessus y figurent.
    - [ ] Règles communes à **toutes** les sources « sites carrière » : User-Agent
          `JobSparkBot/1.0 (+<page de contact>)`, `robots.txt` bloquant, 1 requête/s par hôte,
          registre de conformité par entreprise, retrait sous 48 h sur demande, affichage minimal.
    - [ ] **Affichage minimal** défini : pour une source sans API officielle, la fiche montre
          titre, entreprise, lieu, date, type de contrat, un extrait (300 caractères au plus) et le
          lien vers l'offre d'origine ; la description complète n'est jamais republiée. Elle reste
          utilisable en interne pour la correspondance et la génération du CV et de la lettre à la
          demande du candidat.
    - [ ] JobTeaser : la règle « aucune lecture automatique » est écrite noir sur blanc, avec les
          trois voies de découverte autorisées (propriétaire, imports, Common Crawl).
    - [ ] Relecture juridique recommandée avant la mise en production, comme pour ADR-027.
- [ ] **[US-177]** Règles de collecte appliquées à tous les sites carrière
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `board-http.ts` envoie le User-Agent `JobSparkBot` à Greenhouse, Lever, Ashby,
          SmartRecruiters et aux nouveaux adaptateurs.
    - [ ] `robots.txt` lu par hôte, gardé 24 h en cache ; une URL interdite n'est pas appelée,
          l'entreprise passe `exclue (robots.txt)` et l'admin l'affiche. Test avec le
          `robots.txt` réel de Thales en fixture.
    - [ ] `job_boards` gagne un statut de conformité (`ok`, `a_relire`, `exclue`), une note et une
          date de relecture ; seules les entreprises `ok` sont collectées.
    - [ ] Une entreprise nouvellement ajoutée dont le site carrière affiche un lien de CGU ou de
          conditions d'utilisation (hors politique de confidentialité) arrive en `a_relire` ;
          l'admin montre le lien et deux boutons « valider » / « exclure ».
    - [ ] **Retrait sur demande** : l'admin exclut une entreprise avec un motif ; ses offres
          disparaissent de l'app au prochain passage et elle ne peut plus être réinscrite par
          Common Crawl ni par un import. La page de contact le mentionne.
    - [ ] L'affichage minimal d'ADR-029 s'applique aux fiches d'offre des sources concernées.
- [ ] **[US-178]** Adaptateur Workday
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `detectAtsBoard` reconnaît `{tenant}.wd{N}.myworkdayjobs.com/[{langue}/]{site}/job/…` ;
          le jeton garde l'hôte complet et le site (ex. `cc.wd3/ChanelCareers`) ; le paramètre
          `?source=…` est ignoré.
    - [ ] Lecture : sitemap du site (déclaré dans `robots.txt`), puis la page de chaque offre
          **jamais vue** pour son `JobPosting` ; une offre déjà connue n'est pas relue.
    - [ ] Seules les offres en France (ou en télétravail) sont gardées ; les offres de plus de
          30 jours sont ignorées (constante partagée avec US-169).
    - [ ] Type de contrat déduit du titre et de la description (CDI, CDD, stage, alternance,
          intérim), `employmentType` n'étant pas fiable ; entreprise prise dans le registre quand
          `hiringOrganization` est vide ; entités HTML décodées.
    - [ ] Tests sur des pages réelles en fixtures (Chanel, Airbus, Michelin) et sur le
          `robots.txt` de Thales (entreprise exclue, aucun appel).
    - [ ] Les offres lues passent par la même correspondance que les autres sources : **seules
          celles qui correspondent à au moins une recherche active d'un candidat sont gardées**.
- [ ] **[US-179]** Ajouter des entreprises en masse et voir les logiciels manquants
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Dans `/admin/job-search`, un champ accepte jusqu'à 100 URL d'offres (une par ligne) et
          rend un rapport : ajoutées, déjà connues, exclues, **logiciel non reconnu** (avec l'hôte).
    - [ ] Un tableau « Logiciels à couvrir » compte les hôtes non reconnus rencontrés (ajouts
          admin et imports des candidats), triés par nombre d'entreprises, pour décider des
          prochains adaptateurs.
    - [ ] Common Crawl interroge aussi `*.myworkdayjobs.com/*` ; les entreprises trouvées passent
          par les règles d'US-177 avant toute collecte.
    - [ ] Une offre importée par un candidat depuis Workday inscrit l'entreprise (origine
          `user`), comme pour les autres logiciels.
- [ ] **[US-180]** Adaptateurs Workable, Recruitee, Personio et Welcome Kit
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Les quatre logiciels, déjà reconnus par `detectAtsBoard` et retenus le 2026-09-22, ont
          un adaptateur par leur endpoint public ; les entreprises déjà inscrites pour eux sont
          collectées sans nouvelle inscription.
    - [ ] Les conditions d'utilisation de chaque endpoint public sont relues et consignées dans
          ADR-029 avant la mise en production ; un logiciel dont les conditions interdisent l'usage
          reste reconnu mais non collecté.
    - [ ] Mêmes règles qu'US-177 et même filtre France/30 jours qu'US-178, tests sur réponses
          réelles en fixtures.

## 📊 Sprint DoD

- [ ] **Mesure de couverture** : le propriétaire colle 50 liens « Postuler » repérés sur JobTeaser ;
      le rapport d'US-179 donne la part d'entreprises collectées avant et après le sprint.
- [ ] Une journée de staging sans hausse de charge au-delà du budget d'ADR-027.
- [ ] `pnpm lint` et `pnpm test` verts.
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Droit de l'employeur sur ses offres** (droit d'auteur, droit du producteur de base de
  données) : c'est lui, pas Workday, qui peut se plaindre. D'où l'affichage minimal et le retrait
  sous 48 h.
- **Sitemap limité à 100 offres** : une entreprise qui publie plus de 100 offres entre deux
  passages en perdrait. Peu probable toutes les 30 min (US-164), à surveiller sur Airbus et Chanel.
- **Pages Workday changeantes** : le `JobPosting` est stable (standard schema.org), mais un
  locataire peut désactiver son sitemap. L'échec est compté comme pour les autres sources.

## ⚠️ To Clarify

- **Recherche ciblée Workday** : l'endpoint `/wday/cxs/` accepte une recherche par mot-clé et par
  pays, ce qui permettrait de ne demander que les offres des métiers recherchés par nos candidats
  (et de dépasser la limite de 100). Il n'est pas interdit par les `robots.txt` testés, mais c'est
  l'API interne du site, pas une publication. Proposition : sitemap d'abord, recherche ciblée
  seulement si la mesure de couverture le justifie, et après décision du propriétaire.
- **Page de contact du robot** : l'URL à mettre dans le User-Agent (domaine JobSpark à confirmer).
- **Affichage minimal pour Greenhouse, Lever, Ashby, SmartRecruiters** : ces API sont publiées par
  l'entreprise pour diffuser ses offres ; proposition : garder l'affichage complet pour elles.

## 🔁 Workflow Runs

— aucun pour l'instant.
