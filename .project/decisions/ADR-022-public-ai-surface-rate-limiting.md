# ADR-022 — Surface IA publique non authentifiée : rate limiting sans Redis ni throttler

- Statut : accepté
- Date : 2026-09-22
- Portée : `apps/api/src/shared/rate-limit`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`

## Context

`POST /public/ats-scan` (US-102) est la **première surface IA publique non authentifiée** du produit : un upload de 5 Mo, un parsing PDF et un appel de modèle payant, sans session derrière. Or l'API n'avait **aucun rate limiting** — ni middleware, ni `@nestjs/throttler` ; les seules occurrences de « rate limit » dans le code concernaient les 429 renvoyés *par* OpenRouter.

Trois risques distincts, qu'il ne faut pas confondre :

1. **L'abus individuel** — un visiteur qui relance des dizaines de scans.
2. **La facture** — un botnet distribué, contre lequel une limite par IP ne fait rien.
3. **Le CPU** — l'OCR (Tesseract, jusqu'à 4 pages) coûte des secondes de calcul sur le process API, sans file de jobs pour l'absorber.

## Decision

### 1. Un middleware maison, pas `@nestjs/throttler`

Le throttler s'installe comme **Guard global**. Or ce dépôt n'utilise délibérément aucun Guard Nest : chaque handler appelle `requireSession()` / `requireAdminSession()` (`auth/request-session.ts`). L'adopter coûterait une dépendance **et** une incohérence structurelle durable, pour ~120 lignes qu'on écrit sur le modèle exact de `SessionStateMiddleware`, déjà en place.

Le middleware est **scopé à la seule route de scan** (`public/ats-scan`), pas appliqué globalement : c'est la seule route publique qui dépense du CPU et des crédits modèle, les autres (`public/legal`, `public/credit-offers`) sont des lectures bon marché.

### 2. Deux limites par IP, plus un budget global — trois réponses distinctes

| Portée | Défaut | Réponse |
|---|---|---|
| Par IP, fenêtre glissante d'1 h | 3 | `429` + `Retry-After` |
| Par IP, fenêtre glissante de 24 h | 10 | `429` + `Retry-After` |
| **Global, 24 h** | 300 | `503` |

Le budget global est **le vrai stop-loss** : une limite par IP ne survit pas à un botnet, et chaque scan coûte un appel de modèle. Il est vérifié **avant** les règles par IP — un visiteur légitime, bien dans son quota, reçoit quand même `503` une fois le budget du jour épuisé. C'est délibéré : mieux vaut fermer le produit d'appel pour la journée que recevoir une facture non bornée.

Les deux réponses sont sémantiquement différentes et doivent le rester : `429` dit « vous en avez trop demandé », `503` dit « le service est indisponible », ce qui est exact et n'accuse pas le visiteur.

### 3. Une requête rejetée n'est pas comptée

Les hits ne sont enregistrés qu'une fois **toutes** les règles passées. Autrement, un client qui martèle la route repousse sa propre fenêtre à chaque tentative et n'en sort jamais — un bannissement de fait, non voulu et très difficile à diagnostiquer côté support.

### 4. En mémoire, derrière une interface — et Redis plus tard

`RateLimitStore` est une interface ; `MemoryRateLimitStore` en est la seule implémentation aujourd'hui.

**Redis n'est pas introduit maintenant**, bien qu'il soit provisionné dans `docker-compose.yml` : `REDIS_URL` n'est lu nulle part dans le code, l'API tourne en une instance, et l'ajouter ici signifierait une dépendance, une surface d'attaque et un mode de panne supplémentaires pour un problème qu'on n'a pas encore. L'interface fait de `RedisRateLimitStore` un remplacement d'une ligne le jour du scale-out.

L'horloge est injectée par token (`RATE_LIMIT_CLOCK`), pas en paramètre par défaut : Nest instancie le middleware et tente de résoudre chaque paramètre du constructeur — un type fonction nu ne lui donne aucun token à chercher et **le conteneur refuse de démarrer**. C'est le piège que documente déjà `SessionStateMiddleware`. Bénéfice collatéral : les tests avancent le temps au lieu de l'attendre, sans `sleep` ni faux timers.

### 5. OCR désactivé sur la route publique

Décidé en US-099 et rappelé ici parce que c'est une mesure de coût, pas de qualité : `extractCvText(file, { allowOcr: false })`. Un PDF sans couche texte ne produit pas une erreur mais un score calculé sur les seuls signaux fichier, `machineReadability` au plancher. C'est gratuit en CPU **et** c'est le meilleur moment produit de la page.

### 6. Rétention zéro

Aucun texte de CV n'est persisté par le scan public — ni fichier, ni texte extrait, ni texte pseudonymisé. Seuls le `AtsScoreResult` (des nombres et des codes) et un `ip_hash` (jamais l'IP brute). Cela supprime toute la discussion DPIA sur les CV de non-utilisateurs, et c'est un argument de confiance à afficher sur la page. Contrepartie assumée : pas de préremplissage du profil à l'inscription.

## Consequences

**Positives**
- La facture est bornée par construction, indépendamment de la forme du trafic.
- Aucune dépendance ajoutée, aucune entorse au style du dépôt (pas de Guards).
- Les limites sont pilotables par env (`ATS_PUBLIC_HOURLY_LIMIT`, `ATS_PUBLIC_DAILY_LIMIT`, `ATS_PUBLIC_DAILY_BUDGET`) sans redéploiement de code.
- Une valeur d'env malformée retombe sur le défaut, **jamais sur « pas de limite »** : une faute de frappe ne doit pas ouvrir la porte d'une route IA publique.

**Négatives / limites assumées**
- **Mono-instance.** Les compteurs ne sont ni partagés entre réplicas ni persistés : un redémarrage remet le budget du jour à zéro. Acceptable pour un stop-loss (un redémarrage occasionnel ne double qu'une journée), inacceptable dès la seconde instance → basculer sur Redis.
- **`trust proxy` vaut 1.** Si l'infrastructure ajoute un hop, le premier saut de `X-Forwarded-For` cesse d'être le client. À revoir avec toute évolution du reverse proxy.
- Un `X-Forwarded-For` est falsifiable par un client qui atteindrait l'API directement. Le budget global borne les dégâts dans tous les cas, et la route n'est pas censée être joignable hors du proxy.
- Les visiteurs derrière un même NAT d'entreprise partagent un quota. À 3/h le cas reste théorique pour un produit d'appel grand public.

## Alternatives considered

- **`@nestjs/throttler`** : rejeté — modèle Guard incompatible avec le style du dépôt, pour un gain quasi nul sur ~120 lignes.
- **Rate limiting au reverse proxy (nginx/Dokploy)** : rejeté comme *seule* mesure — il ignore le budget global et la distinction 429/503, et la configuration vivrait hors du dépôt, invisible aux tests. Reste un complément utile.
- **Compter le budget en base (`ats_scans` du jour)** : plus robuste au redémarrage, mais une requête SQL sur chaque requête publique, et une dépendance à une table que la US suivante n'a pas encore créée. À reconsidérer si les redémarrages s'avèrent fréquents.
- **Redis maintenant** : rejeté, voir §4. Repoussé derrière l'interface, pas écarté.
- **Ne compter que les requêtes acceptées côté client (cookie / jeton)** : rejeté, trivialement contournable sur une route publique.

## Amendement du 2026-09-24 — une politique par route publique (US-132)

Le middleware n'est plus propre au scan ATS. Chaque route publique limitée déclare une **politique** dans `apps/api/src/shared/rate-limit/rate-limit.policies.ts` : ses routes Nest, la reconnaissance de son chemin, ses limites par IP, son budget global (ou aucun) et ses messages. `AppModule` applique le middleware à l'union des routes déclarées. Ajouter une route revient à ajouter une politique.

| Politique | Par IP | Budget global | Variables |
|---|---|---|---|
| `events` (`POST /public/events`, E23) | 60 / h, 300 / 24 h | 20 000 / 24 h | `PUBLIC_EVENTS_*` |
| `unlock` | 10 / h, 30 / 24 h | aucun | `ATS_UNLOCK_*` |
| `scan` | 3 / h, 10 / 24 h | 300 / 24 h | `ATS_PUBLIC_*` |

- **Rien ne change pour l'ATS** : clés `scan:<ip>`, `unlock:<ip>` et `global:ats-scan`, variables et messages identiques. Les tests existants passent sans modification.
- **La dernière politique, le scan, sert par défaut.** C'est la plus stricte : une route branchée sans politique propre est freinée fortement, jamais laissée libre.
- **Un compteur par politique** : les événements du tunnel ne consomment ni le quota de scans ni le budget du scan, et inversement.

### Qui est le visiteur, derrière Cloudflare

Les domaines passent par le proxy Cloudflare, puis par le Traefik de Dokploy. Le premier saut de `X-Forwarded-For` reçu par la landing est alors :
- soit le nœud Cloudflare, si Traefik n'accorde pas sa confiance à Cloudflare : un compteur partagé par beaucoup de visiteurs ;
- soit une valeur écrite par le visiteur, si Traefik lui accorde sa confiance.

La BFF de la landing lit donc l'IP dans l'en-tête que désigne `CLIENT_IP_HEADER`, fixé à `cf-connecting-ip` dans les fichiers compose de production. En son absence, elle revient à `X-Forwarded-For`.

Côté API, l'accès public passe par Traefik, qui remplace par défaut les `X-Forwarded-*` d'une source non déclarée fiable.

### Le relais signé de la landing vers l'API

Sur Dokploy, la landing joint l'API par son **domaine public**, pas par le nom de service : l'alias `api` est partagé entre la production et le staging (voir `infra/compose/dokploy-stack.yml`). La requête retraverse donc Traefik, qui remplace le `X-Forwarded-For` posé par la landing. Tous les visiteurs de la landing partageaient ainsi **un seul compteur par IP**, y compris pour le scan ATS.

La landing relaie donc aussi l'adresse du visiteur dans `x-cvforge-client-ip`, accompagnée de `x-cvforge-proxy-secret`. L'API ne croit cette adresse que si le secret vaut `LANDING_PROXY_SECRET`, comparé en temps constant (`apps/api/src/shared/rate-limit/client-ip.ts`). Sans secret configuré des deux côtés, le relais est ignoré et rien ne change. Le secret ne voyage que de serveur à serveur, en HTTPS, et n'atteint jamais le navigateur.

Chemin du secret : secret GitHub `LANDING_PROXY_SECRET`, puis `TF_VAR_landing_proxy_secret`, puis l'`env` Dokploy, puis les conteneurs `api` et `landing`.

Au passage, les conteneurs `api` ne recevaient ni `ATS_IP_HASH_SECRET` ni les limites `ATS_PUBLIC_*` : Terraform les écrivait dans le `.env` du projet, mais la liste `environment` du service ne les nommait pas. Ils y sont désormais listés.

**À vérifier en production, hors dépôt** :
- `CF-Connecting-IP` arrive bien à la landing ;
- l'origine n'accepte que les plages Cloudflare (sinon l'en-tête est falsifiable par un appel direct à l'origine, borné par le budget global) ;
- le Traefik de Dokploy ne déclare ni `forwardedHeaders.trustedIPs` ni `insecure`.

## Amendement 2026-09-24 (bis) — comparateur CV ↔ offre (US-136)

Deux politiques s'ajoutent avant celle du scan ATS, qui reste la politique par défaut :
- **`keyword-match`** (`POST public/keyword-match`) : 10 par heure et 30 par jour et par IP, plus un budget global de 2 000 par jour. La route n'appelle aucun modèle, mais l'analyse d'un PDF consomme du CPU sur le processus de l'API. Variables `PUBLIC_KEYWORD_MATCH_HOURLY_LIMIT`, `PUBLIC_KEYWORD_MATCH_DAILY_LIMIT` et `PUBLIC_KEYWORD_MATCH_DAILY_BUDGET`, facultatives.
- **`keyword-match-lead`** (`POST public/keyword-match/lead`) : 5 par heure et 20 par jour et par IP, sans budget global, parce que la route envoie un email. Variables `PUBLIC_KEYWORD_MATCH_LEAD_HOURLY_LIMIT` et `PUBLIC_KEYWORD_MATCH_LEAD_DAILY_LIMIT`, facultatives.

**Seul coût de modèle** : quand le lien est consommé, la candidature offerte déclenche une extraction structurée de l'offre (un appel court), payée par la plateforme et sans débit de crédit. Ce coût est borné par la politique `keyword-match-lead` et par le fait qu'un lien ne sert qu'une fois. Si le modèle échoue, la candidature est créée depuis le texte seul.

Le coût de l'extraction offerte à l'inscription a été validé par le propriétaire le 2026-09-24.

La règle « aucun texte de CV persisté » est vérifiée par `apps/api/src/leads/public-tools.rgpd.test.ts`. Le test fait tourner tous les outils publics sur Postgres (scan ATS, déblocage, événements, comparateur, lead, consommation des liens), puis relit chaque table.

## Amendement 2026-09-24 (ter) — `CLIENT_IP_HEADER` devient opt-in

Constat sur la staging après le déploiement du sprint 029. Les enregistrements DNS sont en nuage gris (`cloudflare_proxied = false` dans `infra/terraform`, le temps de l'émission des certificats), mais la landing croyait par défaut `cf-connecting-ip`. Un visiteur qui envoie cet en-tête lui-même, avec une valeur différente à chaque appel, n'était jamais limité (8 réponses 400 au lieu de 429). Un `X-Forwarded-For` forgé, lui, est bien écrasé par Traefik (429, en direct comme via la landing).

Le défaut est désormais vide : la landing lit le `X-Forwarded-For` réécrit par Traefik. `cf-connecting-ip` ne s'active qu'avec la variable d'environnement GitHub `CLIENT_IP_HEADER` (puis `TF_VAR_client_ip_header`), à poser **uniquement** quand `cloudflare_proxied = true` **et** que l'origine n'accepte que les plages Cloudflare.

