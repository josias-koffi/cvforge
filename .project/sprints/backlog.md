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

## Maintenance Découverte

- 2026-06-03 — Splitter `apps/app/app/letters/[applicationId]/letter-editor.tsx` lors de la prochaine évolution LM : le fichier reste à ~611 lignes, au-dessus du seuil warning TSX, mais n'a pas été touché pendant le retrait de Puck.
- 2026-06-10 — Exclure `.agents` du script `pnpm format` ou le passer en lecture seule dans la configuration Prettier.
- 2026-06-10 — Exclure `dist`, `.next` et les artefacts de couverture du rapport Vitest racine pour mesurer uniquement les sources.

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

## ADR Watchlist

- ~~Puck Editor comme couche WYSIWYG~~ → **ADR-003 acceptée** (2026-04-20)
- Provider email pour magic links / notifications
- Librairie DOCX pour `V1.1`
- Extension browser si une stack dédiée est introduite
- OpenRouter enterprise si l'option change les garanties de déploiement ou de routing
