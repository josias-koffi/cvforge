import { WELCOME_APPLICATIONS } from "@cvforge/types"

import { companyCheckFr } from "./company-check/fr"
import { featurePagesFr } from "./feature-pages/fr"
import { interviewQuestionsFr } from "./interview-questions/fr"
import type { LandingDictionary } from "./types"

/** Copy source: .project/marketing/cvspark-storytelling.md */
export const fr: LandingDictionary = {
  meta: {
    title: "CVSpark — Les bonnes offres, le bon CV, l'entretien préparé",
    description:
      "CVSpark trouve chaque matin les offres qui vous correspondent, adapte votre CV et votre lettre à chacune, et vous entraîne à l'entretien avec un recruteur IA. Sans abonnement.",
    ogAlt: "CVSpark, l'étincelle entre votre profil et l'offre",
  },
  nav: {
    product: "Fonctionnalités",
    features: "Vue d'ensemble",
    howItWorks: "Comment ça marche",
    pricing: "Tarifs",
    faq: "FAQ",
    ats: "Test ATS gratuit",
    tools: "Outils gratuits",
    story: "Notre histoire",
    login: "Connexion",
    start: "Commencer",
    openMenu: "Ouvrir le menu",
    toggleTheme: "Changer de thème",
    switchLanguage: "Switch to English",
    home: "Accueil CVSpark",
  },
  hero: {
    badge: "Nouveau · Vos offres du jour, classées par l'IA",
    title: "Les bonnes offres. Le bon CV.",
    titleAccent: "Une étincelle.",
    subtitle:
      "Chaque matin, CVSpark trouve les offres qui vous correspondent et vous dit pourquoi. Un clic, et votre CV et votre lettre sont adaptés à l'offre. Il ne reste qu'à répéter l'entretien, à voix haute.",
    primaryCta: "Commencer gratuitement",
    secondaryCta: "Voir comment ça marche",
    atsPrompt: "Pas encore prêt ?",
    atsLink: "Testez votre CV gratuitement",
    highlights: [
      `${WELCOME_APPLICATIONS} candidatures offertes`,
      "Sans abonnement",
      "Offres du jour gratuites",
    ],
    screenshotAlt:
      "Offres du jour dans CVSpark : offres classées pour le profil, avec score de correspondance",
  },
  problem: {
    eyebrow: "Le constat",
    title: "Le problème n'est pas votre profil. C'est le temps.",
    body: "Fouiller dix sites d'annonces, trier ce qui vous correspond, réécrire le CV, refaire la lettre, préparer l'entretien… À chaque candidature, le même travail mécanique. CVSpark s'en charge, vous gardez le jugement.",
    before: {
      label: "Sans CVSpark",
      items: [
        "Des alertes qui déversent cent annonces",
        "Une soirée par candidature",
        "Une lettre générique, faute de temps",
        "L'entretien découvert le jour J",
      ],
    },
    after: {
      label: "Avec CVSpark",
      items: [
        "Dix offres choisies chaque matin, avec leur raison",
        "Un CV adapté en quelques secondes",
        "Une lettre qui cite le poste et l'entreprise",
        "Un entretien répété à voix haute, avec un rapport noté",
      ],
    },
  },
  journey: {
    eyebrow: "Comment ça marche",
    title: "Toute votre recherche, au même endroit",
    subtitle:
      "De l'offre repérée au matin à l'entretien réussi, sans jongler entre dix outils.",
    learnMore: "En savoir plus",
    steps: [
      {
        label: "Trouver",
        title: "Les offres viennent à vous",
        body: "Chaque matin, une sélection d'offres qui vous correspondent, classée par l'IA avec une phrase par offre. Et les entreprises qui recrutent sans annonce.",
        alt: "Offres du jour classées avec leur score de correspondance",
      },
      {
        label: "Postuler",
        title: "Un CV et une lettre adaptés en un clic",
        body: "Depuis une offre, CVSpark reprend votre profil, fait remonter ce qui compte et rédige CV et lettre, prêts pour l'ATS.",
        alt: "Éditeur de CV avec l'aperçu A4 du document adapté",
      },
      {
        label: "S'entraîner",
        title: "L'entretien, répété à voix haute",
        body: "Un recruteur IA qui connaît l'offre vous interroge à l'oral. À la fin, un rapport noté et votre progression.",
        alt: "Rapport d'entretien avec note globale et radar des dimensions",
      },
      {
        label: "Suivre",
        title: "Chaque candidature à sa place",
        body: "Statuts, documents, relances et tableau de bord : vous savez toujours où vous en êtes.",
        alt: "Liste des candidatures avec leurs statuts",
      },
    ],
  },
  spotlight: {
    eyebrow: "Offres du jour",
    title: "Au réveil, dix offres. Et la raison de chacune.",
    subtitle:
      "CVSpark lit les offres publiées chaque nuit, les compare à votre profil et ne garde que les meilleures. Avec le classement IA, chaque offre arrive avec une phrase qui vous dit pourquoi elle est pour vous.",
    points: [
      {
        title: "Des sources officielles",
        body: "France Travail, La bonne alternance et les sites carrière des entreprises, sans doublons.",
      },
      {
        title: "Un score qui s'explique",
        body: "Intitulé, compétences, lieu, expérience, salaire, fraîcheur : le détail de chaque note.",
      },
      {
        title: "Postuler en un clic",
        body: "L'offre devient une candidature, le CV adapté se lance aussitôt.",
      },
    ],
    cta: "Recevoir mes offres du jour",
    learnMore: "Tout sur les offres du jour",
    screenshotAlt:
      "Panneau d'une offre du jour avec son score, la phrase de l'IA et le bouton postuler",
    detailAlt:
      "Phrase de l'IA expliquant pourquoi l'offre correspond au profil, avec le détail du score",
  },
  features: {
    eyebrow: "Fonctionnalités",
    title: "Tout ce qu'il faut pour décrocher le poste",
    subtitle:
      "Chercher, postuler, se préparer, suivre : chaque étape a son outil, et ils se parlent.",
    learnMore: "En savoir plus",
    items: {
      offers: {
        title: "Offres du jour",
        body: "Une sélection chaque matin, classée par l'IA, et toutes les offres des trente derniers jours à portée de recherche.",
      },
      market: {
        title: "Radar du marché",
        body: "Tension, volume d'offres et salaires de votre métier, dans votre département.",
      },
      tailor: {
        title: "CV adapté à chaque offre",
        body: "Les expériences utiles remontent, formulées avec le vocabulaire de l'offre. Rien d'inventé.",
      },
      ats: {
        title: "Score ATS à chaque sauvegarde",
        body: "Votre CV noté sur ce que regardent les logiciels de tri, avec ce qu'il faut corriger.",
      },
      interview: {
        title: "Entretien vocal et progression",
        body: "Un recruteur IA à l'oral, un rapport noté, et vos scores qui montent d'une session à l'autre.",
      },
      letter: {
        title: "Lettre de motivation",
        body: "Une lettre qui cite l'entreprise et le poste, traduisible en anglais en un clic.",
      },
      companies: {
        title: "Entreprises qui recrutent",
        body: "Celles qui embauchent dans votre métier près de chez vous, même sans annonce, avec leurs engagements.",
      },
      tracking: {
        title: "Suivi des candidatures",
        body: "Brouillon, envoyée, entretien, offre reçue : chaque candidature a son statut et ses documents.",
      },
    },
  },
  interview: {
    eyebrow: "Entretien",
    title: "Le CV vous ouvre la porte. L'entretien, lui, se prépare.",
    subtitle:
      "Parlez à un recruteur qui connaît l'offre que vous visez. À la fin, un rapport noté vous dit ce qui a porté et ce qui a manqué.",
    profiles: [
      {
        title: "Standard",
        body: "Entretien RH classique, neutre et professionnel.",
      },
      {
        title: "Agressif",
        body: "Questions pièges, pression et relances incisives.",
      },
      {
        title: "Passif",
        body: "Ton sobre, silences implicites et relances vagues.",
      },
      {
        title: "Technique",
        body: "Hard skills, architecture et mises en situation.",
      },
      {
        title: "Comportemental",
        body: "Questions STAR sur des situations vécues.",
      },
    ],
    privacyNote:
      "Votre voix n'est jamais conservée : chaque passage est transcrit puis abandonné. Seul le texte reste, et il est supprimé au bout de trente jours.",
    cta: "Passer un entretien",
    learnMore: "Tout sur l'entretien",
    screenshotAlt:
      "Studio d'entretien CVSpark : sphère vocale animée, compte à rebours et transcription en cours",
  },
  trust: {
    eyebrow: "Confiance",
    title: "Votre recherche vous appartient",
    subtitle: "",
    items: [
      {
        title: "Données pseudonymisées",
        body: "Votre nom et vos coordonnées sont retirés avant tout appel au modèle, qui ne conserve rien.",
      },
      {
        title: "Sources officielles",
        body: "Offres, entreprises et chiffres du marché viennent de France Travail et des données publiques de l'État.",
      },
      {
        title: "Voix jamais enregistrée",
        body: "À l'entretien, chaque réponse est transcrite puis abandonnée.",
      },
      {
        title: "Sans abonnement",
        body: "Des crédits payés une fois, qui n'expirent jamais. Les offres du jour sont gratuites.",
      },
    ],
  },
  showcase: {
    eyebrow: "L'application",
    title: "Pensée pour aller vite, sans rien cacher",
    subtitle: "Chaque document reste modifiable. L'IA propose, vous décidez.",
    tabs: [
      {
        id: "daily-offers",
        label: "Offres du jour",
        caption: "Votre sélection du matin, chaque offre avec son score.",
        alt: "Offres du jour avec leur score de correspondance",
      },
      {
        id: "cv-editor",
        label: "Éditeur de CV",
        caption: "Modifiez chaque section et voyez l'aperçu A4 en direct.",
        alt: "Éditeur de CV avec aperçu en temps réel",
      },
      {
        id: "interview-studio",
        label: "Studio d'entretien",
        caption: "Vous parlez, le recruteur répond. Sans bouton à maintenir.",
        alt: "Studio d'entretien avec sphère vocale, compte à rebours et transcription",
      },
      {
        id: "company-page",
        label: "Fiche entreprise",
        caption: "Taille, finances, engagements : savoir chez qui vous postulez.",
        alt: "Fiche entreprise avec effectif, finances et badges d'engagement",
      },
      {
        id: "dashboard",
        label: "Tableau de bord",
        caption:
          "Vos candidatures, vos entretiens et votre activité en un coup d'œil.",
        alt: "Tableau de bord CVSpark avec indicateurs et graphique d'activité",
      },
      {
        id: "candidatures",
        label: "Candidatures",
        caption: "Toutes vos candidatures et leur statut, filtrables.",
        alt: "Liste des candidatures avec statuts brouillon, envoyée et entretien",
      },
    ],
  },
  pricing: {
    eyebrow: "Tarifs",
    title: "Payez les candidatures que vous envoyez.",
    subtitle:
      "Un pack, payé une seule fois, utilisé à votre rythme. Pas d'abonnement, pas de renouvellement automatique, et vos crédits n'expirent jamais.",
    popular: "Le plus choisi",
    welcome: `${WELCOME_APPLICATIONS} candidatures complètes offertes à l'inscription, entretien simulé compris, sans carte bancaire.`,
    applicationsLabel: "{count} candidatures",
    creditsDetail: "{credits} crédits · {unitPrice} la candidature",
    buy: "Choisir {pack}",
    unavailable:
      "Les offres ne peuvent pas être affichées pour le moment. Retrouvez-les dans l'application.",
    unavailableCta: "Voir les offres",
    costsTitle: "Ce que coûte chaque action",
    costsNote:
      "Une candidature complète — analyse de l'offre, CV, lettre, entretien simulé de 10 min et son rapport — consomme {credits} crédits.",
    creditUnit: "crédits",
    actions: {
      cv_import: "Import d'un CV existant",
      interview_session: "Entretien simulé et rapport (1 crédit la minute)",
      offer_enrichment: "Analyse de l'offre et de l'entreprise",
      cv_generation: "Génération d'un CV adapté",
      letter_generation: "Génération d'une lettre",
      job_digest_rerank: "Classement IA de vos offres du jour",
    },
  },
  testimonials: {
    eyebrow: "Ils postulent avec CVSpark",
    title: "Moins de réécriture, plus d'entretiens",
    subtitle: "",
    // TODO: remplacer par de vrais avis avant d'activer NEXT_PUBLIC_SHOW_TESTIMONIALS.
    items: [
      {
        quote:
          "J'ai envoyé douze candidatures en une soirée, chacune avec un CV vraiment ciblé.",
        name: "Camille R.",
        role: "Cheffe de projet digital",
      },
      {
        quote:
          "La lettre cite l'entreprise et le poste. Je n'ai eu qu'à ajuster deux phrases.",
        name: "Thomas L.",
        role: "Développeur full-stack",
      },
      {
        quote:
          "Le passage en anglais m'a permis de postuler à Berlin sans tout refaire.",
        name: "Inès B.",
        role: "Data analyst",
      },
      {
        quote: "Enfin un outil qui garde mon CV lisible par les ATS.",
        name: "Julien M.",
        role: "Responsable commercial",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions fréquentes",
    subtitle: "",
    items: [
      {
        question: "Qu'est-ce qu'un CV « prêt pour l'ATS » ?",
        answer:
          "Les ATS sont les logiciels de tri de candidatures utilisés par les recruteurs. CVSpark produit des documents à la structure simple et lisible, avec les mots-clés de l'offre, pour qu'ils soient correctement analysés.",
        atsCheckLink: "Tester gratuitement mon CV actuel",
      },
      {
        question: "L'IA écrit-elle à ma place ?",
        answer:
          "Non. Elle rationalise le travail mécanique : repérer ce qui compte dans l'offre et reformuler votre parcours. Tout reste modifiable, et c'est vous qui validez avant d'envoyer.",
      },
      {
        question: "Comment CVSpark trouve-t-il les offres du jour ?",
        answer:
          "Chaque nuit, CVSpark lit les offres publiées sur France Travail, La bonne alternance et les sites carrière des entreprises, les compare à votre recherche et à votre CV, et garde les meilleures. La sélection est gratuite ; le classement IA, qui explique chaque offre en une phrase, coûte un crédit par matin.",
      },
      {
        question: "Puis-je postuler dans une entreprise qui n'a pas publié d'offre ?",
        answer:
          "Oui. CVSpark liste les entreprises qui recrutent dans votre métier près de chez vous, d'après le potentiel d'embauche calculé par France Travail, et prépare une candidature spontanée avec un CV adapté.",
      },
      {
        question: "Que deviennent mes données ?",
        answer:
          "À l'import d'un CV, votre nom est pseudonymisé avant d'être transmis à l'IA. Vous pouvez exporter ou supprimer vos données à tout moment.",
      },
      {
        question: "Puis-je essayer gratuitement ?",
        answer: `Oui. Votre compte est crédité de ${WELCOME_APPLICATIONS} candidatures complètes à l'inscription — import de votre CV, analyse de l'offre, CV, lettre et entretien simulé — sans carte bancaire.`,
      },
      {
        question: "Comment fonctionne l'entretien simulé ?",
        answer:
          "Vous parlez à un recruteur qui connaît l'offre visée et répartit ses questions sur la durée choisie : 10, 20 ou 30 minutes. À la fin, vous recevez un rapport noté — clarté, mots-clés, rythme, hésitations, pertinence — avec ce qu'il faut travailler. L'entretien coûte 1 crédit par minute, rapport compris.",
      },
      {
        question: "Faut-il un abonnement ?",
        answer:
          "Non. Vous achetez un pack de crédits une seule fois, et les crédits n'expirent jamais.",
      },
      {
        question: "Dans quelles langues puis-je générer mes documents ?",
        answer:
          "En français et en anglais. Un CV ou une lettre peut être traduit dans l'autre langue en un clic.",
      },
    ],
  },
  cta: {
    title: "Arrêtez de réécrire. Laissez jaillir.",
    body: "Votre prochaine candidature peut être prête avant la fin de votre café.",
    button: "Créer mon CV",
    atsPrompt: "Envie de voir d'abord où en est votre CV ?",
    atsLink: "Testez-le gratuitement",
  },
  footer: {
    tagline: "L'étincelle entre votre profil et l'offre.",
    features: "Fonctionnalités",
    product: "Produit",
    legal: "Légal",
    company: "CVSpark",
    rights: "Tous droits réservés.",
  },
  legal: {
    updated: "Dernière mise à jour le",
    metaDescription:
      "{title} de CVSpark, le service qui adapte votre CV et votre lettre de motivation à chaque offre d'emploi.",
    links: {
      terms: "Conditions d'utilisation",
      "sales-terms": "Conditions de vente",
      "legal-notice": "Mentions légales",
      privacy: "Confidentialité",
    },
  },
  ats: {
    metaTitle: "Test ATS gratuit : votre CV passe-t-il les filtres ?",
    metaDescription:
      "Déposez votre CV et obtenez en quelques secondes un score de compatibilité ATS, sans inscription. Votre CV n'est jamais conservé.",
    eyebrow: "Analyse gratuite",
    title: "Votre CV passe-t-il les filtres automatiques ?",
    subtitle:
      "75 % des CV sont écartés par un logiciel avant d'être lus par un humain. Déposez le vôtre : vous avez votre score en quelques secondes, sans créer de compte.",
    privacyNote:
      "Votre CV n'est jamais enregistré. Il est analysé en mémoire puis détruit : nous ne conservons que le score et les points détectés.",
    trust: {
      private: "CV jamais conservé",
      fast: "Score en quelques secondes",
      noSignup: "Sans inscription",
    },
    upload: {
      label: "Déposez votre CV",
      hint: "PDF ou DOCX, 5 Mo maximum",
      dropTitle: "Glissez votre CV ici",
      browse: "ou parcourez vos fichiers",
      dropActive: "Relâchez pour déposer votre CV",
      ready: "Prêt à être analysé",
      remove: "Retirer le fichier",
      analyse: "Analyser mon CV",
      analysing: "Analyse en cours…",
      tooLarge:
        "Ce fichier dépasse 5 Mo. Essayez un PDF exporté plutôt que scanné.",
      wrongType: "Format non reconnu. Déposez un PDF ou un DOCX.",
    },
    offer: {
      label: "Coller une offre d'emploi (facultatif)",
      hint: "Avec une offre, nous mesurons aussi l'adéquation de votre CV au poste visé.",
      placeholder: "Collez ici le texte de l'offre qui vous intéresse…",
      toggle: "Cibler une offre précise",
    },
    progress: {
      title: "Analyse de votre CV",
      steps: [
        "Lecture du fichier",
        "Extraction du texte",
        "Évaluation des critères ATS",
        "Calcul du score",
      ],
    },
    result: {
      scoreLabel: "Score ATS",
      outOf: "sur 100",
      bands: {
        weak: "Fragile",
        fair: "Perfectible",
        good: "Solide",
        excellent: "Excellent",
      },
      dimensionsScored: "{count} critères évalués",
      partialTitle: "Votre PDF est une image",
      partialBody:
        "Aucun texte n'a pu être extrait de ce fichier : il a probablement été scanné ou exporté en image. Un logiciel de recrutement n'en lira pas une seule ligne. Réexportez votre CV en PDF depuis votre traitement de texte.",
      lockedTitle: "{count} autres points détectés",
      lockedTitleNone: "Voir le détail critère par critère",
      lockedBody:
        "Le détail critère par critère, avec ce qu'il faut corriger en priorité, vous attend.",
      again: "Analyser un autre CV",
    },
    unlock: {
      title: "Recevoir le rapport complet",
      body: "Indiquez votre adresse : le rapport détaillé s'affiche immédiatement, et vous recevez un lien pour le retrouver dans CVSpark.",
      emailLabel: "Votre adresse email",
      emailPlaceholder: "vous@exemple.com",
      consent:
        "J'accepte que CVSpark crée mon compte et m'envoie un lien de connexion.",
      submit: "Afficher le rapport complet",
      submitting: "Envoi…",
      success: "Rapport débloqué",
      successBody:
        "Un lien de connexion vient de partir vers votre boîte mail : il vous ramènera directement à ce rapport.",
    },
    findings: {
      NO_TEXT_LAYER:
        "Le fichier ne contient aucun texte lisible par une machine",
      MULTI_COLUMN_LAYOUT:
        "La mise en page sur plusieurs colonnes brouille l'ordre de lecture",
      TOO_MANY_PAGES: "Le CV dépasse deux pages",
      GARBLED_CHARACTERS: "Des caractères ressortent illisibles à l'extraction",
      MISSING_EXPERIENCE_SECTION: "Aucune section « Expérience » identifiée",
      MISSING_EDUCATION_SECTION: "Aucune section « Formation » identifiée",
      MISSING_SKILLS_SECTION: "Aucune section « Compétences » identifiée",
      MISSING_SUMMARY_SECTION: "Aucun résumé en tête de CV",
      MISSING_EMAIL: "Aucune adresse email détectée",
      MISSING_PHONE: "Aucun numéro de téléphone détecté",
      MISSING_LINKEDIN: "Aucun profil LinkedIn détecté",
      MISSING_CITY: "Aucune ville détectée",
      UNPARSABLE_DATES: "Les dates ne sont pas dans un format exploitable",
      INCONSISTENT_DATE_FORMATS:
        "Les formats de date varient d'une expérience à l'autre",
      FEW_BULLETS: "Les expériences ne sont pas détaillées en puces",
      TOO_SHORT: "Le CV manque de matière : peu de contenu à indexer",
      TOO_LONG: "Le CV est trop long",
      TABLE_MARKERS: "Des tableaux perturbent l'extraction du texte",
      LOW_KEYWORD_COVERAGE: "Le vocabulaire de l'offre est peu repris",
      KEYWORD_STUFFING: "Un même mot-clé est répété à l'excès",
      MISSING_ACTION_VERBS: "Les puces ne commencent pas par un verbe d'action",
      MISSING_QUANTIFICATION: "Les résultats ne sont pas chiffrés",
      UNSUPPORTED_SKILLS:
        "Des compétences annoncées ne sont étayées par aucune expérience",
    },
    dimensions: {
      machineReadability: "Lisibilité machine",
      structure: "Structure et sections",
      keywords: "Adéquation à l'offre",
      impact: "Contenu et impact",
      contactability: "Coordonnées",
      formatHygiene: "Dates, puces et longueur",
    },
    errors: {
      generic: "L'analyse n'a pas abouti. Réessayez dans un instant.",
      tooManyRequests:
        "Vous avez lancé plusieurs analyses coup sur coup. Patientez quelques minutes.",
      unavailable:
        "L'analyse gratuite est momentanément indisponible. Revenez demain, ou créez un compte pour analyser vos CV sans attendre.",
      expired:
        "Cette analyse a expiré. Relancez-en une pour obtenir un rapport à jour.",
      network: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      fileRequired: "Choisissez un fichier PDF ou DOCX à analyser.",
      notEnoughText:
        "Ce CV ne contient pas assez de texte pour être analysé. Exportez-le en PDF depuis votre traitement de texte.",
      invalidEmail: "Cette adresse email n'est pas valide.",
      consentRequired:
        "Cochez la case pour recevoir votre rapport et votre lien de connexion.",
      notFound:
        "Cette analyse est introuvable. Relancez-en une pour obtenir votre rapport.",
      offerRequired:
        "Collez le texte complet de l'offre : 200 caractères au minimum.",
      appellationUnknown: "Choisissez un métier dans la liste proposée.",
      departmentUnknown: "Choisissez un département dans la liste.",
      companyQueryInvalid:
        "Saisissez au moins 3 caractères du nom de l'entreprise, ou son SIREN.",
      companySourceUnavailable:
        "L'Annuaire des entreprises ne répond pas pour le moment. Réessayez dans un instant.",
      questionsUnavailable:
        "Le générateur de questions ne répond pas pour le moment. Réessayez dans un instant.",
      offerNotUsable:
        "Cette offre ne contient pas assez de termes précis pour être comparée. Collez l'annonce complète.",
    },
    cta: "Créer mon CV optimisé",
  },
  tools: {
    metaTitle: "Outils gratuits pour votre recherche d'emploi",
    metaDescription:
      "Des outils gratuits et sans inscription pour préparer vos candidatures : testez votre CV face aux logiciels de recrutement en quelques secondes.",
    eyebrow: "Gratuit, sans compte",
    title: "Des outils gratuits pour avancer dès maintenant",
    subtitle:
      "Un résultat immédiat, sans inscription. Votre CV est analysé puis oublié : rien n'est conservé.",
    home: {
      eyebrow: "Gratuit, sans compte",
      title: "Essayez avant de vous inscrire",
      subtitle:
        "Des outils qui donnent un résultat utile en quelques secondes, sans créer de compte.",
      seeAll: "Voir tous les outils gratuits",
    },
    open: "Essayer",
    more: {
      body: "Pour adapter votre CV à chaque offre, écrire vos lettres et suivre vos candidatures, il vous faut un compte.",
      link: "Créer mon compte gratuitement",
    },
    items: {
      ats: {
        name: "Test ATS de votre CV",
        description:
          "Votre CV passe-t-il les logiciels de tri des recruteurs ? Un score et les points à corriger.",
        tags: ["Sans compte", "Quelques secondes"],
      },
      keyword_match: {
        name: "Comparateur CV / offre",
        description:
          "Les mots-clés de l'offre déjà dans votre CV, et ceux qui manquent. Sans IA, rien n'est conservé.",
        tags: ["Sans compte", "Sans IA"],
      },
      job_market: {
        name: "Ce métier recrute-t-il ?",
        description:
          "Pour un métier et un département : difficulté de recruter, offres, demandeurs d'emploi et salaire médian.",
        tags: ["Sans compte", "Données France Travail"],
      },
      company_check: {
        name: "Vérifier un employeur",
        description:
          "Effectif, activité, égalité femmes-hommes, ESS, société à mission et bilan carbone d'une entreprise.",
        tags: ["Sans compte", "Données publiques"],
      },
      interview_questions: {
        name: "Questions d'entretien probables",
        description:
          "Les 5 questions qu'un recruteur vous posera sur une offre, et ce qu'il cherche à savoir avec chacune.",
        tags: ["Sans compte", "IA"],
      },
    },
  },
  featurePages: featurePagesFr,
  companyCheck: companyCheckFr,
  interviewQuestions: interviewQuestionsFr,
  jobMarket: {
    metaTitle: "Ce métier recrute-t-il près de chez moi ? Tension, offres, salaire",
    metaDescription:
      "Pour un métier et un département : la difficulté de recruter, le nombre d'offres, les demandeurs d'emploi et le salaire médian. Gratuit, sans inscription, d'après France Travail.",
    eyebrow: "Outil gratuit",
    title: "Ce métier recrute-t-il près de chez vous ?",
    subtitle:
      "Choisissez un métier et un département : voyez si les employeurs peinent à recruter, combien d'offres paraissent et ce qu'elles paient.",
    form: {
      jobLabel: "Métier",
      jobHint: "Tapez au moins 2 lettres, puis choisissez dans la liste.",
      jobPlaceholder: "Ex. : comptable, développeur web…",
      searching: "Recherche des métiers…",
      noMatch: "Aucun métier ne correspond. Essayez un autre mot.",
      suggestions: "{count} métiers proposés",
      departmentLabel: "Département",
      departmentPlaceholder: "Choisissez un département",
      submit: "Voir le marché",
      submitting: "Lecture…",
      privacyNote:
        "Aucun compte, aucune donnée personnelle : seuls le métier et le département sont envoyés.",
    },
    result: {
      title: "{job}, {department}",
      romeNote: "Chiffres du métier ROME {code} : {label}",
      tension: {
        title: "Difficulté de recruter",
        levels: {
          "1": "Recrutement très facile : beaucoup de candidats",
          "2": "Recrutement plutôt facile",
          "3": "Recrutement moyennement difficile",
          "4": "Recrutement difficile : les employeurs cherchent",
          "5": "Recrutement très difficile : les employeurs peinent à trouver",
        },
        scale: "Niveau {value} sur 5",
      },
      offers: {
        title: "Offres publiées sur le trimestre",
        yearly: "{count} sur douze mois",
      },
      jobseekers: {
        title: "Demandeurs d'emploi",
        note: "Inscrits en catégorie A et cherchant ce métier",
      },
      salary: {
        title: "Salaire médian proposé",
        sample: "Brut annuel, d'après {count} offres",
        masked:
          "Moins de {min} offres affichent un salaire ici : pas assez pour une médiane fiable.",
      },
      missing: "Non publié",
      period: "Période : {period}",
      collecting: {
        title: "Chiffres en cours de collecte",
        body: "Nous n'avions pas encore lu ce métier dans ce département. Les chiffres arrivent sous 24 h : revenez demain, ou recevez directement les offres par email.",
      },
      refreshed: "Chiffres lus le {date}",
      sources: {
        market: "Source : Marché du travail, France Travail",
        salary: "Salaires : offres collectées par CVSpark",
      },
      again: "Chercher un autre métier",
    },
    cta: {
      title: "Recevoir chaque matin les offres de ce métier",
      body: "Créez votre compte : votre recherche est prête avec ce métier et ce département, et les nouvelles offres arrivent chaque matin dans votre boîte mail.",
      button: "Recevoir chaque matin les offres de ce métier",
    },
    lead: {
      body: "Nous vous envoyons un lien de connexion. En cliquant dessus, votre recherche est créée et les offres arrivent dès le lendemain matin.",
      emailLabel: "Votre email",
      emailPlaceholder: "vous@exemple.fr",
      consent:
        "J'accepte que CVSpark crée mon compte et m'envoie un lien de connexion, puis les offres chaque matin.",
      submit: "Recevoir mon lien",
      submitting: "Envoi…",
      success: "Vérifiez votre boîte mail",
      successBody:
        "Le lien de connexion ouvre votre compte, avec votre recherche déjà prête.",
    },
    page: {
      metaTitle: "{job}, {department} : le métier recrute-t-il ?",
      metaDescription:
        "{job} ({department}) : difficulté de recrutement, offres publiées sur douze mois, demandeurs d'emploi et salaire médian. Chiffres France Travail, mis à jour chaque mois.",
      title: "{job}, {department} : le métier recrute-t-il ?",
      breadcrumbLabel: "Fil d'Ariane",
      summary:
        "Difficulté de recrutement de niveau {level} sur 5 selon France Travail ({period}), et {offers} offres publiées sur les douze derniers mois.",
      summaryJobseekers:
        "{count} demandeurs d'emploi de catégorie A recherchent ce métier ({period}).",
      figuresTitle: "Les chiffres du marché",
      appellationsTitle: "Appellations couvertes par ce métier",
      neighboursTitle: "Le même métier ailleurs dans la région",
      otherJobsTitle: "D'autres métiers dans ce département",
      toolLink: "Chercher un autre métier ou un autre département",
    },
  },
  keywordMatch: {
    metaTitle: "Comparateur CV / offre gratuit : les mots-clés qui manquent",
    metaDescription:
      "Comparez votre CV à une offre d'emploi : les mots-clés déjà présents, ceux qui manquent et votre taux de couverture, gratuitement et sans inscription.",
    eyebrow: "Comparateur gratuit",
    title: "Votre CV parle-t-il le langage de l'offre ?",
    subtitle:
      "Déposez votre CV, collez l'offre : voyez les mots-clés que le recruteur cherche et qui manquent à votre CV.",
    privacyNote:
      "Votre CV est lu le temps de la comparaison, puis oublié : rien n'est conservé. Aucune IA n'est utilisée.",
    cvLabel: "Votre CV",
    offer: {
      label: "L'offre d'emploi",
      hint: "Collez le texte complet de l'annonce : missions, profil recherché, compétences.",
      placeholder: "Collez ici le texte de l'offre…",
      counter: "{count} / {min} caractères minimum",
      counterReady: "{count} caractères",
    },
    compare: "Comparer",
    comparing: "Comparaison…",
    result: {
      title: "Votre CV face à cette offre",
      gauge: {
        scoreLabel: "Couverture",
        outOf: "en %",
        bands: {
          low: "Faible",
          fair: "Correcte",
          good: "Bonne",
        },
      },
      verdicts: {
        low: "Votre CV reprend peu de termes de l'offre : un logiciel de tri risque de le classer loin.",
        fair: "Votre CV reprend une partie des termes de l'offre. Ajoutez ceux qui vous correspondent vraiment.",
        good: "Votre CV parle déjà le langage de l'offre. Vérifiez les derniers termes manquants.",
      },
      summary: "{count} termes de l'offre sur {total} se retrouvent dans votre CV.",
      matchedTitle: "Déjà dans votre CV",
      missingTitle: "Absents de votre CV",
      more: "et {count} autres",
      matchedEmpty: "Aucun terme de l'offre dans votre CV pour l'instant.",
      missingEmpty: "Tous les termes de l'offre sont dans votre CV.",
      method:
        "Mots de 4 lettres et plus, comparés sans accents ni majuscules. Les plus fréquents dans l'offre d'abord. N'ajoutez que ce qui est vrai pour vous.",
      again: "Comparer un autre CV ou une autre offre",
    },
    cta: {
      title: "Générer un CV adapté à cette offre",
      body: "Créez votre compte : la candidature pour cette offre vous attend, prête à générer votre CV et votre lettre.",
      button: "Générer un CV adapté à cette offre",
    },
    lead: {
      body: "Nous vous envoyons un lien de connexion. En cliquant dessus, vous retrouvez cette offre dans vos candidatures.",
      emailLabel: "Votre email",
      emailPlaceholder: "vous@exemple.fr",
      consent:
        "J'accepte que CVSpark crée mon compte et m'envoie un lien de connexion.",
      submit: "Recevoir mon lien",
      submitting: "Envoi…",
      success: "Vérifiez votre boîte mail",
      successBody:
        "Le lien de connexion ouvre votre compte, avec la candidature pour cette offre déjà créée.",
    },
  },
  story: {
    metaTitle: "Notre histoire",
    metaDescription:
      "CVSpark est né d'une frustration simple : passer des heures à réadapter son CV à chaque offre.",
    eyebrow: "Notre histoire",
    title: "Né d'une frustration simple",
    manifesto:
      "On a tous un ami qui cherche du travail et qui refait, chaque soir, le même CV différemment — pas parce qu'il manque de compétences, mais parce qu'il manque de temps pour les reformuler à chaque offre. CVSpark est né de cette frustration-là. L'IA sait aujourd'hui absorber ce travail répétitif d'adaptation ; il ne restait qu'à construire l'outil qui allume cette étincelle entre un profil et une offre — et en sort un CV prêt pour l'ATS, en quelques secondes.",
    originTitle: "D'où vient l'idée",
    origin: [
      "Le point de départ n'est pas la technologie, c'est un constat vécu autour de nous : des amis en recherche d'emploi qui perdent des heures à refaire, à la main, le même travail à chaque candidature. Relire une offre, repérer ce qui compte, reformuler son profil en conséquence.",
      "Un travail répétitif, pas un travail de réflexion. Exactement le type de tâche que l'IA sait aujourd'hui absorber, sans remplacer le jugement du candidat.",
      "Et si le passage de « mon profil » + « une offre » à « un CV prêt pour l'ATS » pouvait se faire en un instant, comme une étincelle, plutôt qu'en une soirée de copier-coller ?",
    ],
    principlesTitle: "Ce en quoi nous croyons",
    principles: [
      {
        title: "Le temps, pas le talent",
        body: "Les candidats ne manquent pas de compétences, ils manquent de temps pour les reformuler.",
      },
      {
        title: "L'IA comme outil",
        body: "Elle rationalise la partie mécanique. Le jugement reste celui du candidat.",
      },
      {
        title: "Le déclic instantané",
        body: "Une étincelle entre un profil et une offre, pas un long processus.",
      },
      {
        title: "Une promesse concrète",
        body: "Un profil + une offre → un CV prêt pour l'ATS.",
      },
    ],
    cta: "Essayer CVSpark",
  },
}
