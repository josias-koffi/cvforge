# ADR-023 — D'où viennent les offres d'emploi

- Statut : accepté
- Date : 2026-09-22
- Portée : `apps/api/src/job-search`, `apps/api/src/search-projects`, épic E19 (sprint 025)

## Context

« Offres du jour » propose chaque matin au candidat une sélection d'offres qui correspondent à son
profil. Encore faut-il des offres. Les sites que les candidats citent spontanément — LinkedIn,
Welcome to the Jungle, Indeed, JobTeaser — n'ont **aucune API publique de recherche d'offres**, et
leurs conditions d'utilisation interdisent de les scraper. Les y prendre quand même se paie deux
fois : en blocages techniques, et en risque juridique pour un produit payant.

Trois questions à trancher : **où** prendre les offres, **comment** les servir (en direct ou
stockées), et **combien de temps** les garder valables.

## Decision

### 1. Uniquement des sources gratuites dont les conditions autorisent notre usage

| Source | Statut | Raison |
|---|---|---|
| **France Travail — Offres d'emploi v2** | Activée, source principale | API officielle gratuite, environ 300 000 offres, partenaires inclus. Licence de réutilisation : citer la source et renvoyer vers l'offre d'origine. |
| **La bonne alternance** | **Écrite le 2026-09-23**, inerte tant qu'aucune clé n'est posée | API de service public, gratuite, clé personnelle (`LA_BONNE_ALTERNANCE_API_KEY`). 60 appels par minute. **Aucune recherche par mots-clés** : la requête ne porte que le département, le tri fin se fait localement. N'est appelée que pour les recherches qui demandent une alternance, puisqu'elle ne renvoie que cela. Contrat lu sur leur description OpenAPI en direct. |
| **Logiciels de recrutement** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, Personio, Welcome Kit) | Activés | Endpoints publics, sans clé, prévus pour diffuser les offres d'une entreprise. Descriptions complètes et lien de candidature direct. |
| **Adzuna** | **Écartée tant qu'il n'y a pas d'accord écrit** — rien n'est codé | Ses CGU limitent l'usage commercial à 14 jours d'essai ; au-delà, un accord écrit est exigé. Quotas très bas (250 appels par jour). La décision est confirmée : pas de code actif avant l'accord. *(Cette ligne annonçait « codée mais désactivée » ; aucun fichier n'existait. Corrigé le 2026-09-23.)* |
| LinkedIn, Welcome to the Jungle, Indeed, JobTeaser | Exclus | Pas d'API publique d'offres, et CGU contre le scraping. |
| TheirStack, Mantiks, acteurs Apify | Exclus | Payants, et ils revendent du contenu scrapé : le risque juridique est seulement déplacé. |

La liste des entreprises dont on lit la page carrière est construite sans scraper de moteur de
recherche : index **Common Crawl** (archive publique), liens contenus dans les offres France Travail,
et candidatures importées par les utilisateurs. Google est écarté : son API Custom Search est fermée
aux nouveaux clients et s'arrête le 1er janvier 2027.

### 2. Les offres sont stockées chez nous, jamais interrogées à l'affichage

Une collecte quotidienne, groupée par requête et non par candidat, écrit dans `job_listings`. Les
raisons, dans l'ordre d'importance :

1. **Les quotas.** France Travail documente **4 appels par seconde et par application**, et
   1 150 résultats par recherche. Un appel par ouverture de page épuiserait ces limites dès que le produit aurait des
   utilisateurs.
2. **Les logiciels de recrutement ne se cherchent pas.** Ils exposent la liste d'une entreprise, sans
   filtre : il faut de toute façon tout récupérer et filtrer chez nous.
3. **Le dédoublonnage, le score et la règle « jamais deux fois la même offre »** ont besoin d'un état
   local.

Toutes les requêtes sortantes passent par un limiteur par source, avec attente croissante sur 429.

### 3. Une offre, plusieurs annonces

Une même offre paraît souvent sur France Travail **et** sur le site de l'entreprise. Deux niveaux :
`job_listings` (une annonce par source) et `jobs` (l'offre unique, montrée au candidat, avec tous ses
liens). Le rattachement va du plus sûr au plus flou : même lien, puis entreprise + intitulé +
département normalisés, puis similarité d'intitulé **et** de description, au sein d'une même
entreprise et d'un même département. Tout est calculé dans l'application : pas d'extension Postgres.

### 4. Rien de plus de 30 jours

L'âge d'une offre est la plus ancienne date entre sa publication à la source et notre première
collecte ; une annonce republiée à l'identique garde la date d'origine. Au-delà de 30 jours, l'offre
n'est plus proposée. Avant d'être montrée, et de nouveau au clic sur « Postuler », une offre est
vérifiée en direct : si elle a disparu, aucun crédit n'est consommé.

### 5. Quatre logiciels de recrutement collectés, quatre enregistrés

Greenhouse, Lever, Ashby et SmartRecruiters ont un adaptateur écrit sur leur format réel. Workable,
Recruitee, Personio et Welcome Kit sont **reconnus et enregistrés** mais pas encore collectés : leurs
formats n'ont pas pu être vérifiés sur des données réelles (listes vides, sous-domaines introuvables),
et Personio sert du XML, ce qui demanderait une dépendance de plus. Enregistrer sans collecter coûte
une ligne en base et évite de redécouvrir ces entreprises plus tard.

## Consequences

- La V1 fonctionne sans Adzuna. Le jour où le propriétaire obtient un accord écrit, l'adaptateur
  reste à écrire — il ne suffit pas d'une variable d'environnement, contrairement à ce que cette
  décision laissait entendre.
- **Le registre d'entreprises ne se remplit pas tout seul.** Tant qu'il est vide, les adaptateurs
  des logiciels de recrutement ne ramènent rien, sans lever d'erreur : c'est ce qui s'est produit en
  staging. Il est désormais alimenté par (1) une liste de départ livrée avec le code, dont chaque
  jeton a été vérifié en direct, (2) les liens d'origine portés par les offres France Travail,
  enregistrés à chaque collecte, (3) les candidatures importées, (4) la découverte Common Crawl,
  lancée à la main.
- **Lever interdit le robot de Common Crawl** : ses entreprises n'arriveront que par les liens des
  offres France Travail et par les candidatures des utilisateurs. Couverture plus lente à monter.
- Les mentions de source sont obligatoires dans l'app et dans l'e-mail, et le lien renvoie toujours
  vers l'offre d'origine.
- Le stockage impose une purge (60 jours) et des index ; `job_listings` est la table qui grossira le
  plus vite du produit.
- Les offres de stage restent moins bien couvertes que les CDI : JobTeaser est hors d'atteinte, et
  France Travail en publie peu. Les logiciels de recrutement compensent en partie.
