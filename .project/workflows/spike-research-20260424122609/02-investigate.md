# Stage 2 — Investigate

Agent: `analyst`
Verdict: passed

Constat repo: la candidature gère aujourd'hui l'import d'offre, le statut, le profil actif, le CV/LM et les KPI, mais aucun champ `recruiterContact` n'existe encore dans les types, l'API ou l'UI. La vision place pourtant ce contact dans la fiche candidature et prévoit la recherche en `V1.1`.

Cadre recommandé:
- point d'entrée: bouton `Rechercher un recruteur` dans la fiche candidature, visible après création du brouillon;
- préremplissage: `companyName`, `title`, `location`, domaine de l'offre, profil actif;
- résultat: liste courte de contacts potentiels avec `name`, `role`, `linkedinUrl`, `email`, `sourceUrl`, `confidence`, `lastVerifiedAt`;
- action utilisateur: sélectionner, corriger manuellement si besoin, puis enregistrer sur la candidature;
- réusage: injecter le contact choisi dans la fiche candidature, les rappels et l'en-tête de LM.

Sources autorisées:
- URL de l'offre et domaine de l'entreprise;
- pages publiques de l'entreprise (`team`, `about`, `contact`, `careers`);
- résultats de moteur de recherche public pointant vers des profils publics;
- éventuels emails explicitement publiés sur une source publique.

Limites à documenter:
- aucune garantie d'exhaustivité ni d'exactitude;
- pas de scraping derrière authentification, CAPTCHA ou conditions restrictives;
- pas de génération spéculative d'email si l'adresse n'est pas publiée;
- validation humaine obligatoire avant sauvegarde ou usage.

Tradeoff principal: une recherche assistée est compatible `V1.1`; une recherche enrichie en base tierce ou rôle recruteur complet relève plutôt de `V2.0`.
