# Connecter son agent IA (serveur MCP)

Un candidat branche son propre agent sur JobSpark — Claude Code, avec
l'extension Claude in Chrome pour postuler sur les sites des recruteurs.
L'agent fait ce que le candidat fait dans l'app, dans les limites du jeton.
Décision : `ADR-032`. Épic : `E32`, sprint 038.

## Pour le candidat

1. **Mon compte › Agents connectés** (`/compte/agents`) : choisir un nom, des
   permissions (« Assistant complet », « Extension JobSpark » ou « Lecture
   seule »), une durée (7, 30 ou 90 jours) et un plafond de crédits par jour.
2. Copier la commande affichée **une seule fois** et la lancer dans un terminal :

   ```bash
   claude mcp add --transport http jobspark https://<api>/mcp \
     --header "Authorization: Bearer jsk_…"
   ```

3. Dans Claude Code, demander par exemple :
   - « Montre-moi mon solde et mes alertes non lues. »
   - « Relis mes expériences et aide-moi à chiffrer les résultats. » L'agent
     demande les chiffres et n'en invente aucun.
   - « Trouve des offres de développeur à Nantes publiées cette semaine,
     postule à la meilleure, génère le CV et la lettre. »
   - « Télécharge le CV en PDF et dépose ma candidature sur le site du
     recruteur. » Pour cette étape, Claude Code passe par Chrome.
4. Le tableau « Activité récente » montre chaque action. Un jeton se révoque
   en un clic. « Me déconnecter partout » et la suspension du compte coupent
   aussi les jetons.

## Outils exposés

| Outil | Permission | Crédits |
|---|---|---|
| `get_account_overview`, `get_credit_balance`, `list_credit_history` | `credits:read` | 0 |
| `get_profile` | `profile:read` | 0 |
| `update_experience`, `add_experience`, `remove_experience`, `update_profile_sections` | `profile:write` | 0 |
| `search_offers`, `get_daily_offers`, `list_recent_offers` | `jobs:read` | 0 |
| `list_job_alerts`, `mark_alert_read` | `notifications:read` | 0 |
| `list_applications`, `get_application`, `get_cv`, `get_cover_letter`, `get_document_download_url` | `applications:read` | 0 |
| `update_application_status` | `applications:write` | 0 |
| `apply_to_offer`, `import_offer` | `applications:write` + `documents:generate` | 1 (0 si déjà candidaté) |
| `generate_cv`, `generate_cover_letter` | `documents:generate` | 3 |

Un agent ne voit que les outils que son jeton permet. Aucun outil ne
supprime le compte, n'exporte les données, n'achète de crédits, n'envoie
d'e-mail ni ne touche à l'administration, même sur un compte admin. Le nom,
l'e-mail et le téléphone du profil se lisent mais ne se modifient pas.

## Ce qui protège le compte

- **Le jeton** (`jsk_` + 32 octets) n'est stocké que sous forme de SHA-256
  (`agent_tokens`) et n'ouvre que `/mcp` : le reste de l'API n'accepte que le
  cookie de session.
- **Plafond de crédits par jeton** : chaque appel payant réserve son coût sur
  la journée (UTC) en une seule requête SQL, et le rend s'il échoue. Le solde
  réel reste vérifié par les crédits habituels.
- **Débit** : 60 appels par minute et 1 000 par jour par jeton, en plus des
  limites IA par compte.
- **Contenu non fiable** : les offres et les entreprises sont renvoyées entre
  `<untrusted_offer_content>`, et les instructions du serveur disent à l'agent
  de ne jamais suivre ce qui s'y trouve.
- **Version du profil** : une écriture est refusée (409) si le profil a changé
  depuis que l'agent l'a lu (`meta.lastSavedAt`).
- **Fichiers** : `get_document_download_url` donne un lien signé
  (`GET /mcp/files/:token`), valable 10 minutes et une seule fois, lié au
  compte.
- **Journal** : `agent_tool_calls` (outil, issue, crédits, durée), sans aucun
  contenu, effacé après 90 jours et avec le compte.
- **Origine** : une requête qui porte un en-tête `Origin` absent de
  `MCP_ALLOWED_ORIGINS` est refusée (403). Claude Code n'en envoie pas. La
  future extension JobSpark (E33) y ajoutera son `chrome-extension://<id>`.
  `/mcp` n'a pas de CORS, et c'est voulu.

## Exploitation

- `MCP_ALLOWED_ORIGINS` : liste séparée par des virgules, vide par défaut.
- L'URL des liens de téléchargement vient de `NEXT_PUBLIC_API_URL`, la clé de
  signature est dérivée de `AUTH_SESSION_SECRET`.
- Les liens déjà utilisés sont gardés en mémoire : c'est valable tant que
  l'API tourne sur une seule instance.
- Transport : Streamable HTTP **sans état** (`POST /mcp`, réponses JSON).
  `GET` et `DELETE /mcp` répondent 405.

## Texte de confidentialité à ajouter (`/admin/legal` › Politique de confidentialité, section « Destinataires des données »)

> **Agents connectés.** Si vous créez un jeton d'agent dans « Agents
> connectés », l'agent IA de votre choix (par exemple Claude Code) peut lire
> et utiliser les données de votre compte dans les limites des permissions
> que vous avez cochées : profil (dont nom, e-mail et téléphone), offres,
> alertes, candidatures, CV, lettres et solde de crédits. Ces données sont
> alors traitées par le fournisseur de cet agent, selon ses propres
> conditions ; JobSpark n'a pas de contrôle sur ce traitement. Nous ne
> conservons qu'une empreinte du jeton (jamais le jeton lui-même) et un
> journal des actions de l'agent (nom de l'action, résultat, crédits
> dépensés, date), sans leur contenu, pendant 90 jours. Vous pouvez révoquer
> un jeton à tout moment ; la suppression de votre compte efface les jetons et
> le journal.

Ligne à ajouter à la section sur les durées de conservation, si la politique en a une :

> Jetons d'agent : empreinte conservée jusqu'à révocation, expiration ou
> suppression du compte ; journal des actions des agents : 90 jours.

### Version anglaise (même document, champ anglais)

> **Connected agents.** If you create an agent token under "Agents
> connectés" (Connected agents), the AI agent of your choice (for example
> Claude Code) can read and use your account data within the permissions you
> selected: your profile (including your name, e-mail address and phone
> number), job offers, alerts, applications, CVs, cover letters and credit
> balance. This data is then processed by that agent's provider, under its
> own terms; JobSpark has no control over that processing. We only keep a
> fingerprint of the token (never the token itself) and a log of the agent's
> actions (action name, outcome, credits spent, date), without their content,
> for 90 days. You can revoke a token at any time; deleting your account
> erases your tokens and the log.

Retention line:

> Agent tokens: fingerprint kept until revoked, expired or the account is
> deleted; agent activity log: 90 days.
