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
    - [x] ADR-027 dans `decisions/` : collecte continue (flux national France Travail et sites
          carrière), budget d'appels chiffré à partir des mesures ci-dessus, stockage limité aux
          offres qui correspondent à au moins une recherche active, récap du matin conservé.
    - [x] ADR-023 porte un renvoi vers ADR-027 ; la règle « collecte quotidienne » de
          `sprint-025.md` est marquée comme remplacée.
    - [x] Section « Licence » dans l'ADR-027 : gratuité pour le candidat (art. 5.1), pas
          d'altération du contenu, resynchronisation sous 24 h, pas de mise à disposition de la base à
          des tiers, pas d'usage commercial des coordonnées des recruteurs (art. 8). Relecture
          juridique recommandée avant la mise en production de l'option payante (US-168).
    - [ ] Le statut de l'application CVForge sur francetravail.io (homologation ou production)
          est relevé et consigné dans l'ADR. Si elle est encore en homologation : demande de
          passage en production déposée et licence de l'API acceptée (usage commercial continu),
          avec le cas d'usage « collecte toutes les 5 minutes, ≈ 600 appels/jour ».
          *2026-10-01 : homologation, rien déposé. Texte de la demande prêt dans ADR-027 ; action
          propriétaire.*
    - [x] Le débit `offres` passe de 4 à 8 appels/s (sous les 10 mesurés, pour laisser de la
          place à la vérification en direct et aux autres appels France Travail).
- [x] **[US-163]** Flux France Travail en continu, par tranches de temps
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Une boucle toutes les **5 minutes** (réglable, `JOB_STREAM_INTERVAL_MINUTES`) lit les
          offres créées depuis la fin de la tranche précédente (`minCreationDate`/
          `maxCreationDate`, ISO-8601 à la seconde), sans mot-clé ni département.
    - [x] Curseur persistant en base (fin de la dernière tranche lue avec succès) : un
          redémarrage ou une panne reprend là où la collecte s'était arrêtée, sans trou ni
          doublon. Le rattrapage après une longue panne est plafonné à 31 jours.
    - [x] Tranche redécoupée par dichotomie quand `Content-Range` annonce plus de 1 150
          offres : aucune offre perdue au pic. Couvert par un test sur un total fictif de 3 000.
    - [x] Chevauchement de 2 minutes entre deux tranches pour les offres créées pendant l'appel ;
          le dédoublonnage existant (US-111) absorbe les doublons.
    - [x] Verrou (même mécanisme que `digest-runs`) : une seule instance collecte à la fois.
    - [x] Un 429 met la boucle en pause sur `Retry-After`, sans avancer le curseur.
    - [x] Le compteur d'appels du jour est enregistré par source et visible dans l'admin des
          sources ; alerte admin à 80 % du quota mensuel s'il existe.
    - [x] Suppressions et modifications resynchronisées **au moins une fois toutes les 24 h**
          (obligation de la licence) : le flux ne lit que les créations, la passe quotidienne et la
          vérification en direct (`isStillOpen`) couvrent le reste. Une offre retirée chez France
          Travail disparaît de l'app et des alertes non encore envoyées.
          *2026-10-02 : vérifié avec US-166, une alerte dont l'offre est fermée ne part jamais.*
    - [x] La collecte par requêtes (`buildSourceQueries`) reste utilisée pour le rattrapage
          `--since=31` et pour La bonne alternance, dont l'API n'expose pas de date de création
          fine (à vérifier en direct, voir To Clarify).
- [ ] **[US-164]** Sites carrière interrogés plusieurs fois par heure
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Les entreprises suivies par au moins un candidat, ou dont une offre a correspondu dans
          les 30 derniers jours, sont lues **toutes les 30 minutes** ; les autres une fois par jour,
          comme aujourd'hui.
    - [x] Une offre est « nouvelle » si son identifiant n'a jamais été vu pour ce site ; sa date
          de détection est enregistrée à côté de la date annoncée par le logiciel de recrutement
          (Lever et Greenhouse n'en donnent pas toujours une fiable).
    - [x] Le limiteur par hôte (`board-http.ts`) est respecté ; un site qui répond 429 ou 403
          repasse au rythme quotidien pendant 24 h.
    - [ ] Aucune hausse de charge au-delà du budget fixé par l'ADR-027, vérifiée sur une journée
          de staging.
          *2026-10-01 : plafond par cycle codé et testé ; journée de staging à faire une fois le flux
          allumé (après US-165).*
- [x] **[US-165]** Correspondance au fil de l'eau
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] Chaque nouvelle offre (US-163, US-164) est comparée aux recherches actives avec le
          score déterministe existant (ROME, compétences, contrat, lieu, télétravail) : pas
          d'appel IA dans la boucle, le reclassement IA reste réservé au récap du matin.
    - [x] Seules les offres qui correspondent à au moins une recherche sont stockées ; les
          autres sont oubliées. La table `jobs` ne doit pas grossir de tout le flux national
          (≈ 10 000 à 30 000 offres par jour).
    - [x] Une offre qui dépasse le seuil d'alerte du candidat crée une correspondance marquée
          `alert`, avec sa date de publication et sa date de détection.
    - [x] L'offre est vérifiée en direct (`isStillOpen`) avant l'alerte, comme pour le récap.
    - [x] Une offre déjà envoyée en alerte ne revient pas dans le récap du lendemain.
    - [x] Délai publication → correspondance mesuré et exposé dans le cockpit admin (médiane et
          90e centile par source). Objectif : médiane sous 10 minutes pour France Travail.
- [x] **[US-166]** Alertes « nouvelle offre », sans spammer
  - Agent: `developer`
  - Critères d'acceptation :
    - [x] E-mail « Nouvelle offre pour vous » dans le gabarit commun (US-161) : intitulé,
          entreprise, lieu, « publiée il y a X min », pourquoi elle correspond, bouton
          « Postuler avec CVForge ».
    - [x] Préférences sur `/notifications` : alertes activées ou non, seuil (offres « très
          proches » seulement ou toutes), et rythme **immédiat** ou **regroupé toutes les heures**.
    - [x] Garde-fous : plafond d'alertes par jour et par candidat (valeur par défaut à fixer, voir
          To Clarify), heures calmes 21 h – 7 h (regroupées dans un envoi à 7 h), lien de
          désinscription `List-Unsubscribe` comme les autres e-mails.
    - [x] Une alerte en échec ne bloque jamais la boucle de collecte.
    - [x] Aperçu dans `email:preview`.
    - [x] Gratuites pour tous, aucun crédit consommé : seul l'enrichissement IA (US-168) est payant.
- [x] **[US-168]** Enrichissement IA des alertes : « pourquoi cette offre vaut la peine » (payant)
  - Agent: `developer` (+ `designer` pour le bloc dans l'e-mail et la carte)
  - Critères d'acceptation :
    - [x] Option « Analyse IA de mes alertes » dans les préférences, désactivée par défaut, avec le
          prix affiché : « 1 crédit par jour où au moins une alerte est analysée, analyses
          illimitées ce jour-là ». Solde vide : l'alerte part quand même, sans analyse, avec une
          mention « analyse IA non incluse ».
    - [x] Garde-fou : **20 analyses par jour et par candidat** au plus (réglable,
          `JOB_ALERT_ENRICH_DAILY_CAP`). Au-delà, les alertes partent sans analyse.
    - [x] Pour chaque offre qui passe le seuil déterministe, un appel court (profil pseudonymisé,
          comme `rerankSelection`) renvoie un JSON validé :
          - **verdict** : « à saisir », « à considérer » ou « à passer » ;
          - **pourquoi elle vaut le coup** : 2 ou 3 raisons tirées du profil et de l'offre
            (compétences qui collent, progression, salaire, lieu, taille d'entreprise) ;
          - **points de vigilance** : écarts avec le profil, exigences manquantes, indices d'une
            annonce floue ou republiée ;
          - **quoi mettre en avant** dans le CV et la lettre pour cette offre.
          Rien n'est inventé : les compétences et expériences citées doivent exister dans le
          profil, sinon le champ est écarté (même garde-fou que le reclassement).
    - [x] Avec l'option, l'IA **filtre** aussi : une offre jugée « à passer » n'est pas envoyée en
          immédiat, elle reste visible dans l'app avec son analyse. Moins d'alertes, mais les bonnes.
          Ce filtre est un **choix du candidat**, désactivable : sans lui, il reçoit toutes les
          alertes gratuites, exactement comme un candidat sans l'option. Payer ne donne accès à
          aucune offre supplémentaire ni plus tôt (règle de gratuité).
    - [x] L'analyse est présentée à côté de l'offre, jamais à sa place : l'intitulé, la
          description et les informations de l'offre restent affichés intégralement et sans
          modification, avec la mention de la source.
    - [x] Facturation : **1 crédit par jour** (jour calendaire, heure de Paris), débité après la
          **première analyse réussie** de la journée, comme `rerankSelection`. Les analyses
          suivantes du même jour sont gratuites. Un jour sans alerte analysée ne coûte rien ; un
          appel en échec ne déclenche pas le débit. Débit unique garanti par une contrainte
          d'unicité (candidat, jour) : deux alertes simultanées ne débitent pas deux crédits.
          Nouvelle action de crédit `job_alert_enrich` dans `@cvforge/types`
          (`AI_CREDIT_COSTS` = 1).
    - [x] Un candidat qui a aussi le classement IA du récap du matin paie les deux (1 + 1 crédit
          par jour au plus) : ce sont deux options distinctes.
    - [x] Chaque appel est journalisé dans `ai_usage_events` (US-154, fonctionnalité
          `job_alert_enrich`) : le cockpit montre le coût réel par jour facturé et la marge.
    - [x] L'analyse est réutilisée par « Postuler avec CVForge » : les points à mettre en avant
          alimentent la génération du CV et de la lettre, sans nouvel appel.
    - [x] L'enrichissement tourne hors de la boucle de collecte (file de travail) : un modèle lent
          ou en panne retarde l'alerte enrichie de 2 minutes au plus, au-delà elle part sans
          analyse.
    - [x] Tests : validation du JSON, champ inventé écarté, un seul débit par jour même avec des
          alertes simultanées, pas de débit sur échec, pas de débit un jour sans alerte, plafond de
          20 analyses respecté.
- [x] **[US-167]** Fraîcheur visible et réponse rapide dans l'app
  - Agent: `developer` (+ `designer` pour la carte)
  - Critères d'acceptation :
    - [x] Sur « Offres du jour », une section « Nouvelles depuis votre dernière visite » en tête,
          triée par date de publication, avec un badge « il y a X min / X h ».
    - [x] Filtre et tri « les plus récentes » sur la recherche libre (US-115).
    - [x] Depuis l'alerte, « Postuler avec CVForge » ouvre directement la candidature avec la
          génération du CV adapté lancée (parcours US-113), sans étape intermédiaire.
    - [x] Tests web sur le badge (fuseau de Paris) et sur la section « nouvelles ».

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
- ~~Statut de l'application France Travail~~ **Relevé le 2026-10-01** : homologation, demande de
  passage en production à déposer (texte dans ADR-027).

## 🔁 Workflow Runs

- 2026-10-01 — [[workflows/runs/tech-lead-20261001221038|tech-lead]] (US-162) — failed (4/5 critères, en attente du passage en production francetravail.io)
- 2026-10-01 — [[workflows/runs/developer-20261001224331|developer]] (US-163) — failed (8/9 critères ; partie alertes à vérifier avec US-165/166)
- 2026-10-01 — [[workflows/runs/developer-20261001233130|developer]] (US-164) — failed (3/4 critères ; journée de staging à faire)
- 2026-10-02 — [[workflows/runs/developer-20261002090712|developer]] (US-165) — passed
- 2026-10-02 — [[workflows/runs/developer-20261002134029|developer]] (US-166) — passed (clôt aussi US-163)
- 2026-10-02 — [[workflows/runs/developer-20261002135719|developer]] (US-168) — passed
- 2026-10-02 — [[workflows/runs/developer-20261002151155|developer]] (US-167) — passed
