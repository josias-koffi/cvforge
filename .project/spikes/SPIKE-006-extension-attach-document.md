# SPIKE-006 — Extension JobSpark : page-agent, IA par le service worker, dépôt du CV

**Date** : 2026-11-26
**Sprint** : 040 / US-194
**Agent** : developer
**Décision liée** : [[decisions/ADR-034-chrome-extension-applies-for-the-candidate]]

---

## Le résultat

**Le CV se dépose sur 6 plateformes de recrutement sur 7 testées.** Les trois doutes de l'étude du 2026-11-25 sont
levés.

| Doute                                                     | Résultat                                                                                                                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les outils personnalisés de page-agent dans une extension | ✅ `attach_document` ajouté par `customTools` ; l'outil de clic interne remplacé par une version qui refuse le bouton d'envoi                                                                       |
| Les appels IA passent par le service worker               | ✅ `customFetch` (page-agent 1.12.4) relaie chaque appel au service worker, qui ajoute la clé. **0 requête vers OpenRouter partie de la page**, et la clé n'est jamais envoyée au script de la page |
| Le dépôt du PDF sur les vrais formulaires                 | ✅ sur 6 plateformes, ❌ Workday (voir plus bas)                                                                                                                                                    |

## Décision : GO

On construit l'extension comme le prévoit ADR-034, avec les correctifs listés plus bas.

## Comment le dépôt fonctionne

1. Le service worker télécharge le PDF à partir du lien signé. Grâce à `host_permissions`, il n'y a pas de CORS. Un
   vrai lien de la préprod (CV de 23 Ko) a été vérifié.
2. Il transmet les octets au script injecté dans l'onglet du recruteur.
3. Le script cherche les `<input type="file">`, y compris dans les shadow roots ouverts. Il choisit le champ d'après
   le texte le plus proche : libellé, attributs, puis les blocs parents tant qu'ils restent petits. Un parent qui
   contient tout le formulaire ferait prendre le champ « CV » pour celui de la lettre.
4. Il dépose le fichier avec un `DataTransfer` et le setter `files` du prototype, à cause de React. Puis il déclenche
   `input` et `change`.
5. En dernier recours, il simule un dépôt (`dragenter`/`dragover`/`drop`) sur une zone de glisser-déposer.

## Plateformes testées (aucun envoi, identité fictive « Candidat Test »)

| Plateforme      | Offre                                    | Dépôt | La page montre le fichier             | Anti-robot vu sur la page                    |
| --------------- | ---------------------------------------- | ----- | ------------------------------------- | -------------------------------------------- |
| Greenhouse      | Dataiku                                  | ✅    | ✅ (le champ est remplacé par le nom) | reCAPTCHA Enterprise                         |
| Lever           | Agicap                                   | ✅    | ✅ (« Analyzing resume… »)            | hCaptcha                                     |
| Ashby           | Qonto                                    | ✅    | ✅                                    | reCAPTCHA Enterprise                         |
| Recruitee       | Aubay                                    | ✅    | ✅                                    | hCaptcha (domaine Recruitee)                 |
| Workable        | Hugging Face                             | ✅    | ✅                                    | —                                            |
| SmartRecruiters | Devoteam (même formulaire que Wavestone) | ✅    | ✅ (`spl-dropzone` en shadow DOM)     | **DataDome** : bloque le Chromium automatisé |
| Workday         | Sanofi                                   | ❌    | page blanche en navigateur automatisé | compte candidat obligatoire pour postuler    |

- Les tests ont tourné dans le Chromium de Playwright, avec l'extension chargée (`test/harness.mjs`).
- SmartRecruiters présente un CAPTCHA DataDome au navigateur automatisé : on ne le contourne pas. Le même code de
  dépôt a été injecté dans le vrai Chrome du propriétaire, où le formulaire s'ouvre sans CAPTCHA : le champ « CV »
  affiche le fichier. L'extension tournera dans ce vrai Chrome.
- Agent complet (page-agent + `anthropic/claude-haiku-5.5` par OpenRouter) :
  - sur le formulaire de test : prénom, nom, e-mail, téléphone, CV dans un champ caché, lettre par glisser-déposer,
    en 7 étapes ;
  - sur Ashby (Qonto) : 4 champs, le CV, et **13 questions laissées vides et listées** car absentes des données.
    Aucun envoi.

## Ce que le prototype a appris (à intégrer)

1. **Vérifier le dépôt par la réaction de la page, pas par `input.files`.** SmartRecruiters vide le champ après
   l'avoir lu. Le prototype annonçait alors un échec alors que le fichier était bien pris. Il faut contrôler que le nom
   du fichier apparaît sur la page, ou dans l'état du composant.
2. **Les CAPTCHA reviennent au candidat, toujours.** Cinq plateformes sur six chargent un CAPTCHA invisible qui peut
   se déclencher à l'envoi. L'agent s'arrête et passe la main, il ne résout jamais un CAPTCHA. Conséquence pour ADR-034
   §6 : au palier 3, un envoi peut rester en attente d'un geste du candidat. Il faut le dire dans l'interface et dans la
   vidéo.
3. **Workday sort du parcours autonome.** Chaque entreprise demande un compte candidat à créer, et créer un compte est
   une décision du candidat. À traiter à part : connexion du candidat, puis l'agent remplit.
4. **Bandeau cookies : l'agent a cliqué « Accept All ».** Il faut une consigne et un outil qui refusent le non
   essentiel par défaut (« Nécessaires uniquement »).
5. **Les réponses types d'US-197 doivent couvrir ce que demandent les vrais formulaires** : entreprise actuelle,
   localisation, mobilité ou relocalisation, visa ou autorisation de travail, « comment avez-vous connu l'offre »,
   liens LinkedIn/GitHub/portfolio, niveau d'anglais, mode de travail souhaité. Les questions ouvertes (« votre plus
   belle réussite… ») demandent un brouillon tiré du profil, validé par le candidat.
6. **Le garde-fou de clic lit un champ privé de page-agent** (`pageController.simplifiedHTML`) pour connaître le
   bouton visé. Ça marche en 1.12.4, mais c'est fragile : dans le produit, retrouver l'élément par le DOM, ou passer
   par `pnpm patch` pour exposer un accesseur.
7. **Confidentialité : le lien de téléchargement signé contient l'e-mail du candidat en clair** (charge utile base64
   du jeton dans `/mcp/files/…`, `signed-files.ts`). Ce lien passera par l'extension et pourra finir dans des journaux.
   Il faut le remplacer par un identifiant opaque. Ticket à ouvrir hors E33.
8. **WXT n'a pas été essayé** : le prototype est assemblé avec esbuild. WXT reste le choix d'ADR-034, à valider
   dans US-195.

## Où est le prototype

`~/perso/projets/jobspark-e33-proto/`, en dehors du monorepo, jetable :

- `src/attach.js` : choix du champ, dépôt, glisser-déposer ;
- `src/content.js` : page-agent, `attach_document`, garde-fou de clic ;
- `src/sw.js` : relais IA, téléchargement du document ;
- `test/harness.mjs` : charge l'extension dans Chromium et lance un scénario (`attach`, `run`, `guard`) ;
- `fixtures/` : formulaire de test et PDF fictifs.
