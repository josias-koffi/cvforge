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
