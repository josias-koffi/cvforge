# Extension Chrome JobSpark : texte de confidentialité

Date : 2026-11-27 · Périmètre : E33, US-195 à US-210 et US-205.

À coller dans `/admin/legal` › Politique de confidentialité, dans la section « Destinataires des
données » (après le paragraphe « Agents connectés » de `docs/agent-mcp.md`), puis la ligne de
durées de conservation dans la section correspondante. Le même texte sert de politique de
confidentialité pour la fiche Chrome Web Store (US-201) : son lien public est exigé par Google.

## Ce que l'extension fait des données (référence pour la relecture)

| Donnée | Où | Envoyée à | Conservée |
|---|---|---|---|
| Texte de la page d'offre (au clic « Préparer ») | navigateur → JobSpark | JobSpark, puis le fournisseur IA pour l'analyse | avec la candidature |
| Contenu du formulaire du recruteur et données du candidat (au clic « Remplir », ou dans une file lancée par le candidat) | navigateur → JobSpark `/agent/llm` | fournisseur IA choisi par JobSpark (OpenRouter, `gpt-4.1-mini` par défaut) ; avec une clé personnelle, directement le fournisseur de cette clé | non conservé par JobSpark (seul un compteur d'appels par session) |
| Réponses rédigées aux questions ouvertes (US-208) | modèle → page | — | la version envoyée est gardée comme réponse enregistrée |
| Réponses enregistrées (prétentions, préavis…) | JobSpark | — | jusqu'à modification ou suppression du compte |
| Preuve d'envoi : adresse du formulaire, page de confirmation, capture d'écran de l'onglet, champs remplis, documents | navigateur → JobSpark | — | avec la candidature (supprimée avec elle, ou avec le compte) |
| Sonde de la pastille (US-207) : nombre de champs, présence d'un champ fichier, lien « Postuler » | dans la page, à chaque chargement | rien (calcul local) | non conservée |
| Carte des formulaires (US-205) : site, forme des champs (balise, type, nom sans identifiants, mots du libellé), nom de la donnée reçue | navigateur → JobSpark | — | jusqu'à suppression du compte (votes liés au compte) ; statistique « remplissage avec ou sans IA » par site, sans candidat |
| Clé IA personnelle | navigateur uniquement (`chrome.storage.local`) | le fournisseur de cette clé | jusqu'à ce que le candidat la retire |
| État de la file de candidatures | navigateur uniquement (`chrome.storage.session`) | — | effacé à la fermeture de Chrome |

Jamais : lecture des mots de passe ou des champs cachés, script sur LinkedIn et Indeed (US-210),
envoi d'une candidature sans clic du candidat, contournement d'un captcha.

## Texte français

> **Extension Chrome JobSpark.** Si vous installez l'extension et la connectez à votre compte,
> elle agit dans votre navigateur, à votre demande :
>
> - **Préparer une candidature** : le texte de la page d'offre ouverte est envoyé à JobSpark pour
>   l'analyser et générer votre CV et votre lettre, comme une offre importée depuis le site.
> - **Remplir un formulaire** : pour remplir le formulaire du recruteur, le contenu de ce
>   formulaire et les données de votre profil et de vos réponses enregistrées sont transmis à
>   notre fournisseur d'IA, via JobSpark, le temps du remplissage ; JobSpark ne les conserve pas.
>   Si vous utilisez votre propre clé d'IA, ils sont envoyés directement au fournisseur de cette
>   clé, selon ses conditions, et la clé reste dans votre navigateur. Les réponses rédigées pour
>   les questions ouvertes vous sont montrées avant l'envoi ; la version envoyée est gardée parmi
>   vos réponses enregistrées.
> - **Envoyer** : rien n'est envoyé sans votre clic sur « Valider et envoyer ». Nous gardons alors
>   une preuve de l'envoi avec la candidature : adresse du formulaire, page de confirmation,
>   capture d'écran de l'onglet, champs remplis et documents joints.
> - **Pastille sur l'icône** : à chaque page chargée, et seulement si vous avez autorisé l'accès
>   aux pages, l'extension compte les champs de la page et repère un lien « Postuler » pour
>   afficher une pastille. Ce calcul reste dans votre navigateur : aucune valeur n'est lue, rien
>   n'est envoyé.
> - **Carte des formulaires** : après un remplissage, l'extension indique à JobSpark quels champs
>   du site ont reçu quelles données (par exemple « ce champ reçoit l'e-mail »), jamais leur
>   valeur, pour remplir plus vite et sans IA les formulaires du même site, pour vous et pour les
>   autres candidats. Ces indications sont liées à votre compte et effacées avec lui.
>
> L'extension ne lit jamais les mots de passe ni les champs cachés, et n'agit pas sur LinkedIn ni
> sur Indeed, dont les conditions l'interdisent. Vous pouvez retirer l'accès aux pages ou
> désinstaller l'extension à tout moment depuis Chrome.

Ligne à ajouter aux durées de conservation :

> Extension Chrome : preuves d'envoi conservées avec la candidature (et supprimées avec elle ou
> avec le compte) ; réponses enregistrées jusqu'à leur modification ou la suppression du compte ;
> carte des formulaires jusqu'à la suppression du compte ; contenu des formulaires transmis à
> l'IA non conservé par JobSpark.

## English version (same document, English field)

> **JobSpark Chrome extension.** If you install the extension and connect it to your account, it
> acts in your browser, at your request:
>
> - **Preparing an application**: the text of the open job page is sent to JobSpark to analyse it
>   and generate your CV and cover letter, as with an offer imported on the website.
> - **Filling a form**: to fill the recruiter's form, the form's content and the data from your
>   profile and saved answers are passed to our AI provider, through JobSpark, for the time of the
>   fill; JobSpark does not keep them. If you use your own AI key, they go straight to that key's
>   provider, under its terms, and the key stays in your browser. Answers drafted for open
>   questions are shown to you before sending; the version sent is kept among your saved answers.
> - **Sending**: nothing is sent until you click "Valider et envoyer" (Confirm and send). We then
>   keep a proof of the sending with the application: the form's address, the confirmation page, a
>   screenshot of the tab, the filled fields and the attached documents.
> - **Icon badge**: on each page load, and only if you allowed page access, the extension counts
>   the page's fields and looks for an "Apply" link to show a badge. This stays in your browser:
>   no value is read and nothing is sent.
> - **Form map**: after a fill, the extension tells JobSpark which fields of the site received
>   which data (for example "this field takes the e-mail address"), never their value, so that
>   forms of the same site are filled faster and without AI, for you and for other candidates.
>   This information is linked to your account and erased with it.
>
> The extension never reads passwords or hidden fields, and does not act on LinkedIn or Indeed,
> whose terms forbid it. You can withdraw page access or uninstall the extension at any time from
> Chrome.

Retention line:

> Chrome extension: proofs of sending kept with the application (and deleted with it or with the
> account); saved answers until changed or the account is deleted; form map until the account is
> deleted; form content passed to the AI not kept by JobSpark.

## Chrome Web Store (US-201) : déclarations de la fiche

- **Objet unique** : préparer et remplir les candidatures du candidat sur les sites des recruteurs.
- **Permissions** : `storage` (clé IA perso, état de la file), `identity` (connexion OAuth),
  `sidePanel` (panneau), `scripting` (lire et remplir le formulaire, sonde de pastille),
  `notifications` (fin de file), `<all_urls>` facultatif, demandé au premier usage (sites des
  recruteurs, quels qu'ils soient).
- **Données collectées** : informations personnelles (identité, coordonnées, via le compte),
  contenu web (formulaires et pages d'offre, au clic), activité utilisateur : non. Pas de vente,
  pas d'usage sans rapport avec l'objet, pas d'usage pour le crédit.
