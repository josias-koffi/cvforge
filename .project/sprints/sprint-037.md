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
