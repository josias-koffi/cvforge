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
    features: "Fonctionnalités",
    howItWorks: "Comment ça marche",
    pricing: "Tarifs",
    faq: "FAQ",
    story: "Notre histoire",
    login: "Connexion",
    start: "Commencer",
    openMenu: "Ouvrir le menu",
    toggleTheme: "Changer de thème",
    switchLanguage: "Switch to English",
    home: "Accueil CVSpark",
  },
  hero: {
    badge: "Nouveau · Traduction FR ⇄ EN de vos documents",
    title: "Un profil. Une offre.",
    titleAccent: "Une étincelle.",
    subtitle:
      "Arrêtez de passer vos soirées à réécrire le même CV. CVSpark lit l'offre, reprend votre profil et génère un CV et une lettre prêts pour l'ATS, en quelques secondes.",
    primaryCta: "Créer mon CV",
    secondaryCta: "Voir comment ça marche",
    highlights: ["Sans abonnement", "Prêt pour l'ATS", "Export PDF et Word"],
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
    },
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
    ],
  },
  pricing: {
    eyebrow: "Tarifs",
    title: "Payez à l'usage. Sans abonnement.",
    subtitle:
      "Achetez un pack de crédits une fois, utilisez-le à votre rythme. Les crédits n'expirent jamais.",
    popular: "Le plus choisi",
    creditsLabel: "{credits} crédits",
    applicationsLabel: "≈ {count} candidatures complètes",
    buy: "Choisir {pack}",
    perks: [
      "Crédits sans date d'expiration",
      "Paiement unique et sécurisé via Stripe",
      "Toutes les fonctionnalités incluses",
      "TVA incluse",
    ],
    costsTitle: "Ce que coûte chaque action",
    costsNote:
      "Une candidature complète (analyse de l'offre, CV et lettre) consomme {credits} crédits.",
    creditUnit: "crédits",
    actions: {
      cv_import: "Import d'un CV existant",
      offer_enrichment: "Analyse de l'offre et de l'entreprise",
      cv_generation: "Génération d'un CV adapté",
      letter_generation: "Génération d'une lettre",
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
    company: "CVSpark",
    rights: "Tous droits réservés.",
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
