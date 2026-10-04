# ADR-027 — Collecte continue des offres

- Statut : accepté
- Date : 2026-10-01
- Portée : `apps/api/src/job-search`, `apps/api/src/france-travail`, épic E27 (sprint 034)
- Remplace : la règle « collecte quotidienne » d'ADR-023 §2 et de `sprint-025.md`. Le reste
  d'ADR-023 (sources autorisées, deux niveaux d'annonces, 30 jours, vérification en direct) tient.

## Context

Aujourd'hui, la collecte tourne une fois par jour à 6 h (`DIGEST_HOUR`) et France Travail est
interrogé avec `publieeDepuis=1`. Une offre publiée à 9 h arrive chez le candidat le lendemain
matin, quand une centaine de personnes ont déjà postulé. Le propriétaire veut qu'une offre qui
correspond soit détectée **dans les 15 minutes** qui suivent sa publication (demande du
2026-09-28).

ADR-023 avait choisi le quotidien pour une raison : France Travail documentait 4 appels par
seconde. Les mesures du 2026-09-28 sur l'API Offres d'emploi v2, faites avec nos identifiants,
changent la donne :

| Mesure | Valeur |
|---|---|
| Débit par application (`clientidlimiter`) | 10 appels/s, rafale de 10 |
| Débit global (`defaultlimiter`) | 100 appels/s, partagés entre toutes les applications |
| Quota mensuel | aucun en-tête, pas de plafond fixe ; il dépend du statut (homologation ou production) |
| Nouvelles offres, France entière | 225 en 15 min, 3 197 en 1 h, 9 620 en 24 h ; plus de 3 000/h au pic en semaine |
| Délai de mise à disposition | 1 seconde : l'API est en temps réel |
| Plafond d'une recherche | 1 150 résultats (150 par page) |

Le retard vient donc uniquement de notre fréquence de collecte.

## Decision

### 1. France Travail : lire tout le flux national, trier chez nous

Toutes les 5 minutes (`JOB_STREAM_INTERVAL_MINUTES`), une requête par tranche de temps
(`minCreationDate`/`maxCreationDate`, à la seconde), **sans mot-clé ni département**. Son coût ne
dépend pas du nombre de candidats ; une requête par (métier × département) ferait croître la
facture avec chaque inscrit.

- Curseur persistant en base, fin de la dernière tranche lue avec succès. Chevauchement de 2
  minutes, absorbé par le dédoublonnage (US-111). Rattrapage plafonné à 31 jours.
- Une tranche qui annonce plus de 1 150 offres est coupée en deux jusqu'à passer sous le plafond.
- Un 429 met la boucle en pause sur `Retry-After` sans avancer le curseur.
- Une seule instance collecte à la fois : bail en base (`job_stream_cursors`), pris par un
  `UPDATE` conditionnel et expiré au bout de 10 minutes si le processus meurt. Même principe que
  `digest-runs` (la base tranche, pas la mémoire), mais une table à part : l'index « une collecte
  en cours » de `job_digest_runs` aurait bloqué le récap du matin pendant le flux.
- ~~Interrupteur `JOB_STREAM_ENABLED`, coupé par défaut, allumé en production après la purge
  (sprint 035) et le passage en production sur francetravail.io.~~ **Amendé le 2026-10-03
  (décision du propriétaire)** : pas d'interrupteur, la collecte, les alertes et l'analyse IA
  tournent toujours ; chaque candidat active ou non ses alertes et l'option IA. Mis en service
  avant la purge (US-169, US-170) et avec l'application encore en homologation : voir
  Conséquences. Le filtre de correspondance (US-165) est livré.
- Resynchronisation : chaque matin, les annonces France Travail ouvertes qu'aucune collecte n'a
  revues depuis 24 h sont redemandées une à une (`/offres/{id}`) ; fermées si elles ont disparu,
  réécrites sinon. Plafond de 20 000 par passe.

### 2. Sites carrière : toutes les 30 minutes pour les entreprises qui comptent

Les entreprises suivies par au moins un candidat, ou dont une offre a correspondu dans les 30
derniers jours, sont lues toutes les 30 minutes. Les autres restent sur le rythme quotidien. Un
site qui répond 429 ou 403 repasse au quotidien pendant 24 h.

« Suivie » n'a pas de bouton dans le produit : une entreprise est suivie quand un candidat a gardé
ou postulé à une de ses offres, ou importé une candidature depuis son site, dans les 90 derniers
jours. Les identifiants vus sur chaque site sont gardés seuls (`job_board_postings`, avec la date
de détection à côté de la date annoncée) ; la passe fréquente ne transmet que les offres jamais
vues, et SmartRecruiters ne paie plus d'appel de détail pour une offre déjà connue. Toujours
active, comme le flux France Travail ; rythme `JOB_BOARDS_INTERVAL_MINUTES`.

### 3. Budget d'appels

| Poste | Calcul | Budget |
|---|---|---|
| Flux France Travail | 288 tranches/jour × 1 à 2 pages (≈ 375 offres au pic par fenêtre de 7 min, chevauchement compris) | **300 à 600 appels/jour**, plafond d'alerte à 1 000 |
| Rattrapage 31 jours | ≈ 300 000 offres ÷ 150 + découpes | ≈ 2 500 appels, une fois, ≈ 5 min à 8/s |
| Passe quotidienne et vérification en direct | inchangées (ADR-023) | hors flux, sous le même limiteur |
| Sites carrière à 30 min | 48 lectures/jour par entreprise suivie | un cycle doit tenir en **15 min** par logiciel : ≤ 900 entreprises sur un logiciel à 1/s (Lever, Recruitee, Workable, Personio, Welcome Kit), ≤ 1 800 à 2/s (Greenhouse, Ashby, SmartRecruiters). Au-delà, les moins récemment actives repassent au quotidien et l'admin est alerté |

Débit `offres` porté de 4 à **8 appels/s** (`ft.config.ts`) : sous les 10 mesurés, pour laisser
de la place à la vérification en direct et aux autres API France Travail. Le compteur d'appels du
jour, par source, est visible dans l'admin (US-163).

### 4. Ne stocker que ce qui correspond

Chaque nouvelle offre est comparée aux recherches actives avec le score déterministe existant,
sans appel IA. **Seules les offres qui correspondent à au moins une recherche active sont
écrites** dans `job_listings` et `jobs` ; les autres sont oubliées. Le flux national représente
10 000 à 30 000 offres par jour : les stocker toutes ferait de `jobs` la première table du produit
en quelques semaines. Pour savoir qu'une offre de site carrière est « nouvelle », on garde
seulement son identifiant et sa date de première détection, sans contenu.

« Correspond » veut dire : le score déterministe du récap atteint son seuil (35) **et** l'intitulé
ou les compétences comptent. Le lieu, la fraîcheur et le contrat suffisent à franchir 35 pour
n'importe quelle offre récente près d'un candidat ; c'était acceptable sur le vivier du matin, déjà
restreint par la requête, pas sur le flux national. Au-dessus de 60 (« très proche »), l'offre,
vérifiée en direct, devient une correspondance `alert` datée (publication, détection). Le choix du
seuil par le candidat arrive avec ses préférences d'alerte (US-166). Une alerte ne sort du récap
du lendemain qu'une fois envoyée : en attente, le récap la reprend.

### 4 bis. Les alertes partent à part (US-166)

L'envoi tourne sur sa propre minuterie (toutes les minutes, bail `job_alerts`) : un serveur de
mail en panne retarde une alerte, jamais une tranche de collecte. Préférences du candidat sur
`/ma-recherche/alertes` (sur `/notifications` jusqu'au 2026-10-03) : activées par défaut (décision du propriétaire, 2026-10-02), seuil « très
proches » (60) ou « toutes » (35), rythme immédiat ou horaire. Garde-fous : 10 offres par jour en
immédiat (`JOB_ALERT_DAILY_IMMEDIATE_CAP`), au-delà regroupées toutes les heures ; rien de 21 h à
7 h, la nuit part en un e-mail à 7 h ; `List-Unsubscribe` sur chaque envoi. Une alerte plus vieille
que 24 h, ou dont l'offre a été fermée, ne part pas : le récap s'en charge. Gratuites.

### 4 ter. L'analyse IA des alertes, payante et à côté de l'offre (US-168)

Option du candidat, désactivée par défaut : 1 crédit par jour (heure de Paris) où au moins une
alerte est analysée, analyses illimitées ce jour-là, dans la limite de 20 par jour et par candidat,
appels en échec compris (`JOB_ALERT_ENRICH_DAILY_CAP`). Action de crédit `job_alert_enrich`,
distincte du reclassement du matin.

- **File de travail** : les alertes elles-mêmes, fraîches, non envoyées, non analysées. Un worker
  sur sa propre minuterie (10 s, bail `job_alert_enrich`) les traite. Le dispatcher retient une
  alerte une minute au plus pour l'attendre ; avec sa minuterie d'une minute, l'alerte enrichie est
  retardée de 2 minutes au plus, puis part sans analyse.
- **Facturation** : débit après la première analyse réussie du jour. La clé d'idempotence
  `job_alert_enrich:<candidat>:<jour>` est unique dans le registre des crédits : deux analyses
  simultanées ne débitent qu'un crédit. Un appel en échec ou une réponse invalide ne coûte rien. Solde
  vide : aucun appel, et l'alerte part avec la mention « Analyse IA non incluse ».
- **Rien d'inventé** : le profil est pseudonymisé (titre, compétences, intitulés de postes, sans
  employeur ni identité). Un point qui cite une compétence ou une expérience absente du profil est
  écarté, de même qu'un point qui attribue au candidat une compétence que l'offre demande et que
  le profil n'a pas. Sans verdict valide, l'analyse est rejetée.
- **Licence** : l'analyse est stockée à part (`job_matches.ai_analysis`) et affichée sous l'offre,
  qui reste intégrale et sourcée. Le filtre « à passer » est un choix du candidat ; sans lui, il
  reçoit toutes ses alertes gratuites. Payer ne donne accès à aucune offre de plus, ni plus tôt.
- **Réutilisation** : « Postuler » copie les points à mettre en avant sur la candidature
  (`applications.points_to_highlight`). La génération du CV et de la lettre les lit comme des
  pistes, jamais comme des faits, sans nouvel appel.
- **Coût** : chaque appel est journalisé dans `ai_usage_events` (`job_alert_enrich`). Le cockpit
  rapporte le coût de toutes les analyses à l'unité « jour facturé » pour donner la marge.

### 5. Le récap du matin reste

La tâche de 6 h continue : filet de sécurité si la boucle a été arrêtée, reclassement IA (payant)
et resynchronisation quotidienne. Une offre déjà envoyée en alerte n'y revient pas.

## Licence

Licence de réutilisation des offres France Travail. Ces règles s'appliquent à tout ce qui sort de
la collecte continue, alertes et enrichissement IA compris :

- **Gratuité pour le candidat (art. 5.1).** Voir une offre, en être alerté et suivre le lien pour
  postuler est toujours gratuit. Les crédits paient une analyse ou un document produit par l'IA,
  jamais l'accès à une offre, ni un accès plus tôt.
- **Pas d'altération du contenu.** L'offre est affichée en entier et telle quelle, avec la mention
  « France Travail » et sa date de mise à jour. L'analyse IA s'affiche à côté, jamais à la place.
- **Resynchronisation sous 24 h.** Le flux ne lit que les créations : la passe quotidienne et
  `isStillOpen` rattrapent modifications et suppressions. Une offre retirée disparaît de l'app et
  des alertes pas encore parties.
- **Pas de mise à disposition de la base à des tiers** : ni export, ni API publique, ni revente.
- **Pas d'usage commercial des coordonnées des recruteurs (art. 8)** : elles servent seulement au
  candidat qui postule à cette offre (ADR-028).

Notre lecture de l'art. 5.1 (faire payer l'analyse, pas l'offre) est une interprétation. **Une
relecture juridique est recommandée avant la mise en production de l'option payante (US-168)**,
et elle vaut aussi pour le classement IA du récap, déjà en ligne.

## Statut de l'application sur francetravail.io

Relevé le 2026-10-01 par le propriétaire : **homologation. Aucune demande de passage en production
n'a été déposée.** C'est à faire avant la mise en production du flux (US-163), avec acceptation de
la licence de l'API pour un usage commercial continu. Texte proposé pour la demande :

> Application CVForge (aide à la candidature). Nous demandons le passage en production de l'API
> Offres d'emploi v2. Cas d'usage : collecte des offres nouvellement créées toutes les 5 minutes,
> par tranches de temps (`minCreationDate`/`maxCreationDate`), sans critère de recherche, soit
> environ 300 à 600 appels par jour, au plus 8 appels par seconde. Les offres sont comparées aux
> recherches de nos utilisateurs et seules celles qui correspondent sont conservées ; elles sont
> resynchronisées au moins une fois par 24 h. Consultation et alertes gratuites pour les
> candidats, source citée et lien vers l'offre d'origine.

## Consequences

- Délai publication → alerte visé : médiane sous 15 minutes pour France Travail.
- La croissance de `jobs` suit le nombre de recherches actives, pas le flux national. La purge
  d'E28 (sprint 035) devait exister avant que le flux ne tourne ; depuis le 2026-10-03, le flux
  tourne sans elle : les offres gardées et le contact recruteur dans `job_listings.raw`
  s'accumulent jusqu'à la livraison d'US-169 et US-170, qui reste prioritaire. US-169 livrée
  le 2026-10-04 : anonymisation à la fermeture, purge à 30 jours une fois lancée à la main.
- La charge sur les sites carrière est multipliée par 48 pour les entreprises suivies ; le plafond
  par cycle (§3) protège contre un blocage par Greenhouse.
- Tant que l'application est en homologation, France Travail peut brider ou réévaluer nos quotas.
  Le compteur d'appels et la gestion des 429 couvrent le risque ; le passage en production l'écarte.
- La bonne alternance reste sur le rythme actuel tant qu'on n'a pas vérifié qu'elle filtre par date
  de création fine.
