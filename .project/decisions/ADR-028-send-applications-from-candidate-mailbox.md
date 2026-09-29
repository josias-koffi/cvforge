# ADR-028 : Les candidatures partent de la boîte mail du candidat (Gmail, Outlook)

Date : 2026-09-28
Statut : proposé

Complète ADR-023 (sources d'offres) et ADR-024 (plateforme France Travail). Ne modifie ni l'un ni
l'autre.

## Context

Le propriétaire veut qu'un candidat puisse écrire directement au recruteur depuis CVForge quand une
adresse est disponible. Aujourd'hui, le candidat génère son CV et sa lettre, les télécharge, puis
postule ailleurs. Chaque étape hors de l'app fait perdre des candidatures, et du temps, alors
qu'E27 cherche justement à faire postuler dans l'heure.

Trois contraintes cadrent le choix :

- **Licence de réutilisation des offres France Travail.** Les coordonnées du recruteur ne servent
  à aucun usage commercial (art. 8), et aucune rétribution, même indirecte, ne peut être exigée
  d'un candidat (art. 5.1). Un candidat qui écrit au recruteur d'une offre, pour cette offre,
  utilise le contact pour ce à quoi il est publié.
- **Réputation du domaine d'envoi.** Les e-mails de connexion, les alertes (E27) et les rappels
  partent de notre domaine. Des candidatures envoyées en masse depuis ce domaine le feraient
  classer en indésirable, et tout le reste avec.
- **La bonne boîte ne donne pas d'adresse.** L'API dit seulement si l'entreprise accepte les
  candidatures par e-mail (`email: "yes"`). Les employeurs « à fort potentiel » ne sont donc pas
  concernés par cette décision.

### Options comparées

| Option | Pour | Contre |
| ------ | ---- | ------ |
| Envoi depuis notre domaine, candidat en `Reply-To` | Rien à connecter pour le candidat | Réputation du domaine exposée ; le recruteur reçoit un e-mail d'un tiers, moins crédible ; CVForge devient l'expéditeur au sens juridique |
| **OAuth Gmail (`gmail.send`) et Microsoft Graph (`Mail.Send`)** | Le candidat envoie lui-même, depuis sa vraie adresse ; copie dans ses messages envoyés ; aucun impact sur notre domaine | Validation Google de l'application ; jetons à stocker ; deux fournisseurs à intégrer |
| Lien `mailto:` seul | Aucune donnée stockée, aucune validation | Pas de pièce jointe possible ; le candidat doit joindre ses fichiers à la main |
| Identifiants SMTP/IMAP du candidat | Toutes les messageries | Stocker un mot de passe de messagerie : exclu |
| Agrégateur (Nylas, Unipile…) | Une seule intégration | Payant, un sous-traitant de plus qui voit les boîtes mail |

## Decision

### 1. Envoi par l'API du fournisseur, avec la seule permission d'envoyer

- **Google** : API Gmail, permission `gmail.send`, plus `openid email` pour afficher l'adresse
  connectée. `gmail.send` est classée « sensible » : la validation OAuth de Google est
  obligatoire, mais **pas l'audit de sécurité annuel CASA**, réservé aux permissions
  « restreintes ».
- **Microsoft** : Microsoft Graph, permission déléguée `Mail.Send`, plus `offline_access` et
  `openid email`. Comptes personnels (Outlook.com, Hotmail) et professionnels.
- **Jamais de permission de lecture** (`gmail.readonly`, `gmail.modify`, `gmail.compose`,
  `Mail.Read`) : elles feraient passer Gmail en « restreint », donc sous audit CASA payant et
  annuel, et donneraient accès à toute la correspondance du candidat. Conséquence assumée : on ne
  détecte pas la réponse du recruteur, le candidat met à jour le statut lui-même.

### 2. Pas de nouvelle dépendance

Appels HTTP directs (`fetch`) aux points d'accès OAuth et d'envoi, chiffrement par `node:crypto`.
Ni `googleapis` ni SDK Microsoft : trois appels par fournisseur ne justifient pas deux SDK lourds.

### 3. Les jetons

- Le **jeton de rafraîchissement** est chiffré en AES-256-GCM avant d'être écrit en base (table
  `mail_connections`), avec une clé dédiée `MAIL_CONNECT_ENCRYPTION_KEY`, absente de la base et
  des sauvegardes. Le jeton d'accès reste en mémoire le temps de l'envoi.
- **Déconnexion** depuis l'app : révocation chez Google (point de révocation OAuth), suppression
  locale pour les deux, et lien vers la page où le candidat retire l'accès côté Microsoft.
- Un rafraîchissement refusé (`invalid_grant`) marque la connexion comme perdue ; le candidat est
  invité à se reconnecter au prochain envoi.
- La suppression du compte efface la connexion et révoque le jeton (flux RGPD existant).

### 4. Qui envoie quoi, à qui

- **Un envoi = une candidature = un destinataire**, déclenché par le candidat après un aperçu
  complet : expéditeur, destinataire, objet, message, pièces jointes. Pas de copie cachée, pas de
  liste, pas d'envoi programmé ni de relance automatique.
- **Destinataires admis** : l'adresse publiée dans l'offre France Travail (jamais pour une offre
  anonyme), une adresse présente dans le texte d'offre que le candidat a lui-même importé, ou une
  adresse saisie par le candidat. **Jamais une adresse que CVForge aurait cherchée ou devinée**
  (site d'entreprise, format `prenom.nom@`) : ce serait constituer un fichier de contacts.
- Si l'offre demande de postuler par un lien, l'envoi par e-mail n'est pas proposé.
- **Gratuit** : l'envoi ne consomme aucun crédit (licence, art. 5.1). Le CV et la lettre gardent
  leur prix.
- **Plafond** de 20 envois par jour et par candidat, pour protéger son compte des limites de Google
  et Microsoft et empêcher un usage en masse.
- L'adresse du recruteur et l'identifiant du message chez le fournisseur sont enregistrés **sur la
  candidature seulement**, et partent avec elle (purge à un an, US-170). Aucune table de
  recruteurs.

### 5. Le message

- Pièces jointes : le CV et la lettre en PDF, produits par les exports existants
  (`cv-generation.controller.ts`, `/cv/pdf` et `/letter/pdf`).
- Corps : un court message d'accompagnement pré-rempli **sans appel à l'IA** (modèle fixe avec
  l'intitulé du poste et le nom du candidat), modifiable avant envoi.
- Après l'envoi, la candidature passe en « envoyée » avec une entrée d'historique « envoyée depuis
  Gmail / Outlook le … ».

### 6. Repli pour les autres messageries

Orange, Free, Yahoo, iCloud… : téléchargement du CV et de la lettre, puis un brouillon `mailto:`
avec destinataire, objet et message pré-remplis. Le candidat joint les fichiers lui-même.

## Consequences

- **Démarches du propriétaire, avant l'ouverture à tous** :
  - Google : écran de consentement en production, domaine vérifié, politique de confidentialité et
    page d'accueil publiques, vidéo montrant l'usage de `gmail.send`. Tant que la validation n'est
    pas obtenue : 100 utilisateurs de test au plus et un écran d'avertissement.
  - Microsoft : enregistrement de l'application dans Entra ID et vérification de l'éditeur
    (compte Microsoft AI Cloud Partner Program, à confirmer). Sans elle, l'écran de consentement
    affiche « éditeur non vérifié », et certaines entreprises bloquent le consentement sans accord
    de leur administrateur.
- **Politique de confidentialité et CGU** : Google et Microsoft ajoutés comme services par
  lesquels passent les candidatures envoyées ; ce qui est stocké (adresse connectée, jeton
  chiffré) et pour combien de temps. Exigé aussi par la validation Google.
- **Nouvelle variable d'environnement** `MAIL_CONNECT_ENCRYPTION_KEY`, plus les identifiants
  OAuth des deux fournisseurs, dans `.env.example`, les fichiers Compose et Dokploy.
- **Pas de suivi des réponses** : assumé, pour rester sur une permission d'envoi seule.
- **Les employeurs de La bonne boîte ne sont pas couverts** : sans adresse, ils restent sur la
  candidature spontanée (US-120) ou sur un canal officiel à trouver (comme US-129 pour La bonne
  alternance).

## To check before implementation

- Limite de taille des pièces jointes dans `sendMail` de Microsoft Graph (envoi direct ou session
  d'upload au-delà d'un seuil) : nos PDF font quelques centaines de ko, à confirmer.
- Délai réel de la validation Google, pour caler l'ouverture au public.
- Prérequis exacts de la vérification d'éditeur Microsoft.
