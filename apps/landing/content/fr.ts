import { WELCOME_APPLICATIONS } from "@cvforge/types"

import type { LandingDictionary } from "./types"

/** Copy source: .project/marketing/cvspark-storytelling.md */
export const fr: LandingDictionary = {
  meta: {
    title: "CVSpark — Un profil. Une offre. Une étincelle.",
    description:
      "CVSpark adapte votre CV et votre lettre de motivation à chaque offre, prêts pour l'ATS en quelques secondes. Sans abonnement.",
    ogAlt: "CVSpark, l'étincelle entre votre profil et l'offre",
  },
  nav: {
    product: "Produit",
    features: "Fonctionnalités",
    howItWorks: "Comment ça marche",
    pricing: "Tarifs",
    faq: "FAQ",
    interview: "Entretien",
    ats: "Test ATS gratuit",
    story: "Notre histoire",
    login: "Connexion",
    start: "Commencer",
    openMenu: "Ouvrir le menu",
    toggleTheme: "Changer de thème",
    switchLanguage: "Switch to English",
    home: "Accueil CVSpark",
  },
  hero: {
    badge: "Nouveau · Entraînez-vous à l'entretien, à l'oral",
    title: "Un profil. Une offre.",
    titleAccent: "Une étincelle.",
    subtitle:
      "Arrêtez de passer vos soirées à réécrire le même CV. CVSpark lit l'offre, reprend votre profil et génère un CV et une lettre prêts pour l'ATS, en quelques secondes.",
    primaryCta: "Créer mon CV",
    secondaryCta: "Voir comment ça marche",
    highlights: [
      `${WELCOME_APPLICATIONS} candidatures offertes`,
      "Sans abonnement",
      "Prêt pour l'ATS",
    ],
    screenshotAlt:
      "Éditeur de CV CVSpark : formulaire à gauche, aperçu A4 du CV adapté à droite",
  },
  problem: {
    eyebrow: "Le constat",
    title: "Le problème n'est pas votre profil. C'est le temps.",
    body: "Relire l'offre, repérer ce qui compte, reformuler chaque expérience, refaire la lettre… À chaque candidature, le même travail mécanique. CVSpark s'en charge, vous gardez le jugement.",
    before: {
      label: "Sans CVSpark",
      items: [
        "Une soirée par candidature",
        "Copier-coller entre dix versions du CV",
        "Des mots-clés de l'offre oubliés",
        "Une lettre générique, faute de temps",
      ],
    },
    after: {
      label: "Avec CVSpark",
      items: [
        "Quelques secondes par candidature",
        "Un profil de base, décliné à l'infini",
        "Un CV aligné sur les attentes de l'offre",
        "Une lettre personnalisée, à relire et ajuster",
      ],
    },
  },
  howItWorks: {
    eyebrow: "Comment ça marche",
    title: "De l'offre au CV prêt, en trois étapes",
    subtitle:
      "L'IA rationalise la partie répétitive. Vous relisez, ajustez, envoyez.",
    steps: [
      {
        title: "Importez votre profil",
        body: "Déposez votre CV actuel en PDF ou Word, même scanné. CVSpark en extrait expériences, formations et compétences.",
      },
      {
        title: "Ajoutez une offre",
        body: "Collez le lien de l'annonce ou son PDF. L'offre et le contexte de l'entreprise sont analysés automatiquement.",
      },
      {
        title: "Récupérez CV et lettre",
        body: "Un CV et une lettre adaptés à l'offre, modifiables en direct, exportables en PDF ou Word.",
      },
    ],
    diagram: {
      profile: "Votre profil",
      offer: "L'offre",
      ai: "CVSpark",
      cv: "CV adapté",
      letter: "Lettre",
    },
  },
  features: {
    eyebrow: "Fonctionnalités",
    title: "Tout le parcours de candidature, au même endroit",
    subtitle:
      "De l'import de votre CV au suivi des réponses, sans jongler entre dix outils.",
    items: {
      import: {
        title: "Import intelligent",
        body: "PDF, Word ou scan : votre CV devient un profil structuré, réutilisable pour toutes vos candidatures.",
      },
      tailor: {
        title: "CV adapté à chaque offre",
        body: "Les expériences et compétences pertinentes remontent, formulées avec le vocabulaire de l'offre.",
      },
      letter: {
        title: "Lettre de motivation",
        body: "Une lettre qui cite l'entreprise et le poste, pas un modèle recyclé.",
      },
      translate: {
        title: "Français ⇄ anglais",
        body: "Traduisez un CV ou une lettre en un clic pour postuler à l'international.",
      },
      tracking: {
        title: "Suivi des candidatures",
        body: "Brouillon, envoyée, entretien, offre reçue : chaque candidature a son statut et ses documents.",
      },
      export: {
        title: "Export PDF et Word",
        body: "Des documents propres et lisibles par les ATS, prêts à être envoyés.",
      },
      interview: {
        title: "Entretien simulé",
        body: "Un recruteur qui vous répond à l'oral, et un rapport noté à la fin.",
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
    durationsTitle: "Le temps que vous avez",
    durations: [
      "10 minutes — entretien de filtrage",
      "20 minutes — entretien RH complet",
      "30 minutes — entretien approfondi",
    ],
    report: {
      title: "Un rapport, pas une impression",
      body: "Une note sur dix, cinq dimensions évaluées, les points à travailler en priorité, et la transcription complète de l'échange. Session après session, votre progression se lit sur une courbe.",
      metrics: ["Clarté", "Mots-clés", "Rythme", "Hésitations", "Pertinence"],
    },
    privacyNote:
      "Votre voix n'est jamais conservée : chaque passage est transcrit puis abandonné. Seul le texte reste, et il est supprimé au bout de trente jours.",
    cta: "Passer un entretien",
    screenshotAlt:
      "Studio d'entretien CVSpark : sphère vocale animée, compte à rebours et transcription en cours",
    reportScreenshotAlt:
      "Rapport d'entretien CVSpark : note globale et radar des cinq dimensions évaluées",
  },
  showcase: {
    eyebrow: "L'application",
    title: "Pensée pour aller vite, sans rien cacher",
    subtitle: "Chaque document reste modifiable. L'IA propose, vous décidez.",
    tabs: [
      {
        id: "dashboard",
        label: "Tableau de bord",
        caption:
          "Vos candidatures, vos crédits et votre activité en un coup d'œil.",
        alt: "Tableau de bord CVSpark avec indicateurs et graphique d'activité",
      },
      {
        id: "candidatures",
        label: "Candidatures",
        caption: "Toutes vos candidatures et leur statut, filtrables.",
        alt: "Liste des candidatures avec statuts brouillon, envoyée et entretien",
      },
      {
        id: "cv-editor",
        label: "Éditeur de CV",
        caption: "Modifiez chaque section et voyez l'aperçu A4 en direct.",
        alt: "Éditeur de CV avec aperçu en temps réel",
      },
      {
        id: "letter-editor",
        label: "Lettre",
        caption: "Une lettre adaptée à l'offre, à relire et personnaliser.",
        alt: "Éditeur de lettre de motivation avec aperçu",
      },
      {
        id: "interview-studio",
        label: "Studio d'entretien",
        caption: "Vous parlez, le recruteur répond. Sans bouton à maintenir.",
        alt: "Studio d'entretien avec sphère vocale, compte à rebours et transcription",
      },
      {
        id: "interview-report",
        label: "Rapport d'entretien",
        caption:
          "Une note sur dix, cinq dimensions, et ce qu'il faut travailler.",
        alt: "Rapport d'entretien avec note globale, radar des dimensions et conseils",
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
      {
        question: "Quels formats d'export sont disponibles ?",
        answer:
          "PDF et Word (DOCX), pour envoyer directement ou retoucher dans votre traitement de texte.",
      },
    ],
  },
  cta: {
    title: "Arrêtez de réécrire. Laissez jaillir.",
    body: "Votre prochaine candidature peut être prête avant la fin de votre café.",
    button: "Créer mon CV",
  },
  footer: {
    tagline: "L'étincelle entre votre profil et l'offre.",
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
    },
    cta: "Créer mon CV optimisé",
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
