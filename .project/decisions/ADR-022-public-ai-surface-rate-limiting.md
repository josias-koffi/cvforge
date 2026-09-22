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
