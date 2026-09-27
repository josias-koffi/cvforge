# ADR-025 — Les logos des entreprises, et Redis comme cache

- Statut : proposé
- Date : 2026-09-24
- Portée : `apps/api/src/company-logos` (nouveau), `apps/api/src/shared/redis` (nouveau),
  `apps/api/src/companies`, `apps/api/src/job-search`, `apps/web/app/api/company-logos` (nouveau),
  migration 0042.

## Context

Les cartes d'offres, les cartes « Entreprises qui recrutent » et la fiche entreprise montrent
l'initiale de l'entreprise. Le propriétaire veut ses logos.

Aucune source déjà branchée ne donne un logo pour une entreprise identifiée par son SIRET. Les
mesures ont été faites le 2026-09-24 :
- **L'API Recherche d'entreprises** ne donne ni logo ni site web. SPIKE-005 l'avait déjà établi.
- **Synthèse Pages employeurs** ne dit que si un logo existe (`logoUpdated`), sans URL.
- **Offres d'emploi v2** donne `entreprise.logo` sur environ 13 % des offres (19 sur 150 dans le
  Nord), sans SIRET. L'URL se lit **sans jeton** (PNG, environ 70 Ko, 1150 px).
- **Wikidata** relie un SIREN (P1616) à un logo (P154), un fichier de Wikimedia Commons, libre de
  réutilisation. Sur les 287 SIREN en base, 67 ont un élément Wikidata et **17 ont un logo**. Ce
  sont les grands groupes : Société Générale, BNP Paribas, OVH, Crédit Lyonnais, Thales…
- Rapprocher les entreprises des offres France Travail par leur nom ne donne rien : **7 sur 289**
  correspondent, et environ une sur huit de celles-là aurait un logo.

Un service commercial (Brandfetch, logo.dev) couvrirait bien plus, mais il demande une clé, un
budget et une recherche par nom. Or SPIKE-005 a montré qu'une recherche par nom tombe sur des
homonymes (« Open » à Dublin). Il est écarté pour l'instant.

Une page de 24 cartes demanderait 24 images à France Travail à chaque affichage. Redis est prévu
par la vision (« Cache API ») et provisionné dans docker-compose, mais aucun code ne le lit : ce
serait son premier client.

## Decision

1. **Deux sources, gratuites et sans clé** :
   - le champ `entreprise.logo` d'Offres v2, lu à la collecte et gardé sur l'offre
     (`jobs.company_logo_url`) ;
   - Wikidata, lu par la passe mensuelle des entreprises (`companies.logo_url`), **par l'API du
     wiki** (`haswbstatement:P1616=…` puis `wbgetentities`). Le point SPARQL
     (`query.wikidata.org`) a été essayé puis abandonné : il a cessé de répondre pendant plusieurs
     minutes le 2026-09-24, alors que l'API répondait en une seconde.

   Les offres collectées avant ce changement gardent déjà leur logo dans `job_listings.raw` : la
   migration 0042 le recopie.
2. **Les images passent par un proxy de l'API, `GET /company-logos?src=`**, réservé aux sessions
   connectées. Le navigateur y accède par une route Next (`/api/company-logos`), car le cookie de
   session est httpOnly. Le proxy :
   - ne va chercher que les préfixes autorisés (logos de France Travail, miniatures de Commons),
     sans suivre de redirection ;
   - n'accepte que des images matricielles (PNG, JPEG, WebP, GIF) de 512 Ko au plus. Pour
     Commons, c'est la miniature PNG de 120 px, jamais le SVG, qui peut porter du script.
3. **Redis sert de cache, et de cache seulement.** Client `ioredis`, module global `RedisModule`.
   - Un logo trouvé est gardé 30 jours, un logo absent un jour.
   - Rien dans Redis n'est la seule copie de quoi que ce soit : sans `REDIS_URL`, ou Redis
     injoignable, chaque logo est relu à la source. La page est plus lente, jamais cassée.
   - Les commandes ne sont pas mises en file quand Redis est déconnecté, et échouent après une
     tentative.
4. **L'initiale reste le repli**, pendant le chargement et quand il n'y a pas de logo. Une
   entreprise anonyme n'a jamais de logo : il la nommerait quand même.

## Consequences

- Environ 7 % des offres France Travail en base ont un logo, et 17 entreprises sur 287. La plupart
  des cartes gardent leur initiale.
- `companies.logo_read_at` à NULL rend une entreprise « à relire ». Toutes celles déjà lues le
  redeviennent une fois, pour leur logo, puis tous les mois. Si Wikidata échoue, l'entreprise reste
  à relire à la passe suivante (100 par heure au plus), comme pour les pages employeurs.
- Redis a maintenant un client. `RateLimitStore` (ADR-022) pourra s'appuyer sur `REDIS` quand
  l'API passera à plusieurs instances.
- En local, `REDIS_URL=redis://redis:6379` ne se résout que dans Docker. Une API lancée sur l'hôte
  tourne sans cache : elle écrit un avertissement, et un seul.

## À reconsidérer si

- la couverture paraît trop faible à l'usage. Il faudrait alors choisir un service commercial, avec
  une vérification du domaine pour écarter les homonymes, et décider du budget ;
- d'autres sources d'offres (Greenhouse, SmartRecruiters…) exposent un logo : il suffira de le
  mettre dans `companyLogoUrl` et d'ajouter leur préfixe à la liste autorisée.
