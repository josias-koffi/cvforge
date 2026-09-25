import { welcomeApplications } from "../welcome"

import type { FeaturePagesDictionary } from "./types"

export const featurePagesFr: FeaturePagesDictionary = {
  breadcrumbLabel: "Fil d'Ariane",
  learnMore: "En savoir plus",
  pricingFree: "Gratuit, sans crédit",
  pricingCreditUnit: { one: "crédit", other: "crédits" },
  related: {
    title: "Le reste de votre recherche",
    tools: "Essayez sans compte",
  },
  cta: {
    title: "Votre prochaine candidature commence ici.",
    body: `${welcomeApplications("candidature complète offerte", "candidatures complètes offertes")} à l'inscription, sans carte bancaire et sans abonnement.`,
    button: "Commencer gratuitement",
  },
  pages: {
    daily_offers: {
      metaTitle: "Offres d'emploi personnalisées chaque matin",
      metaDescription:
        "Chaque matin, CVSpark sélectionne les offres d'emploi qui correspondent à votre profil, explique chaque score et, avec le classement IA, vous dit en une phrase pourquoi l'offre est pour vous.",
      card: {
        name: "Offres du jour",
        description:
          "Dix offres choisies pour vous chaque matin, classées par l'IA.",
      },
      eyebrow: "Offres du jour",
      title: "Chaque matin, les offres",
      titleAccent: "qui vous correspondent vraiment.",
      subtitle:
        "Fini les alertes qui déversent cent annonces. CVSpark lit les offres publiées, les compare à votre profil et ne garde que les meilleures, avec la raison de chaque choix.",
      primaryCta: "Recevoir mes offres du jour",
      heroAlt:
        "Offres du jour dans CVSpark : liste d'offres classées avec score de correspondance et phrase d'explication de l'IA",
      stats: [
        { value: "6 h", label: "votre sélection est prête" },
        { value: "10", label: "offres choisies, pas cent" },
        { value: "1 phrase", label: "de l'IA pour chaque offre" },
      ],
      blocks: [
        {
          eyebrow: "Le classement IA",
          title: "Une phrase qui vous dit pourquoi cette offre est pour vous",
          body: "Activez le classement IA : il relit la sélection du matin avec votre profil, remet les offres dans le bon ordre et écrit pour chacune la raison qui compte. Vous savez en trois secondes laquelle ouvrir.",
          points: [
            "Les offres reclassées selon votre parcours, pas seulement des mots-clés",
            "Une phrase courte et concrète par offre, sans superlatif creux",
            "Débité seulement si le classement réussit",
          ],
          alt: "Carte d'offre CVSpark avec la phrase de l'IA expliquant pourquoi l'offre correspond au profil",
        },
        {
          eyebrow: "Un score qui s'explique",
          title: "Vous voyez ce que vous avez déjà, et ce qu'il faut mettre en avant",
          body: "Chaque offre porte un score de correspondance calculé sur l'intitulé, les compétences, le lieu, l'expérience, le salaire et la fraîcheur de l'annonce. Le panneau détaille les compétences que vous avez déjà et celles à faire ressortir.",
          points: [
            "Compétences acquises et compétences à valoriser, offre par offre",
            "Exigences, contrat, salaire et lien de candidature au même endroit",
            "« Postuler avec CVSpark » crée la candidature et lance le CV adapté",
          ],
          alt: "Panneau d'une offre avec le détail du score, les compétences correspondantes et le bouton postuler",
        },
        {
          eyebrow: "Réglé une fois",
          title: "Vous décrivez votre recherche, CVSpark cherche tous les matins",
          body: "Métiers visés, lieux, contrat, télétravail, entreprises à éviter : vous réglez votre recherche une fois. La sélection arrive dans l'application et, si vous le souhaitez, par e-mail.",
          points: [
            "Métiers rattachés au référentiel ROME de France Travail",
            "Plusieurs profils, une recherche par profil",
            "E-mail du matin et classement IA activables en un clic",
          ],
          alt: "Réglages des alertes de recherche avec l'e-mail du matin et l'interrupteur du classement IA",
        },
        {
          eyebrow: "Toutes les offres",
          title: "Et quand vous voulez chercher vous-même",
          body: "Toutes les offres collectées ces trente derniers jours sont consultables en texte libre, dédoublonnées entre les sources, avec le même panneau détaillé.",
          points: [
            "France Travail, La bonne alternance et les sites carrière des entreprises",
            "Une même offre publiée à plusieurs endroits n'apparaît qu'une fois",
          ],
          alt: "Recherche d'offres CVSpark avec la liste des résultats et le panneau de détail",
        },
      ],
      difference: {
        eyebrow: "Pourquoi c'est différent",
        title: "Une sélection, pas un fil d'annonces",
        items: [
          {
            title: "Des sources officielles",
            body: "France Travail, La bonne alternance et les pages carrière des entreprises (Greenhouse, Lever, Ashby, SmartRecruiters…). Pas de scraping de sites qui l'interdisent.",
          },
          {
            title: "De l'offre au CV en un clic",
            body: "L'offre choisie devient une candidature, avec un CV et une lettre adaptés. Aucun copier-coller entre deux onglets.",
          },
          {
            title: "Gratuit sans l'IA",
            body: "La sélection du matin et son score sont gratuits. Seul le classement IA consomme un crédit, une fois par jour.",
          },
        ],
      },
      pricing: {
        title: "Ce que ça coûte",
        body: "La sélection, le score et la recherche d'offres sont gratuits. Le classement IA est débité une fois par matin, uniquement s'il réussit.",
      },
      faq: {
        title: "Questions sur les offres du jour",
        items: [
          {
            question: "D'où viennent les offres ?",
            answer:
              "De France Travail, de La bonne alternance pour l'alternance, et des pages carrière publiques des entreprises (Greenhouse, Lever, Ashby, SmartRecruiters…). Les doublons entre sources sont fusionnés.",
          },
          {
            question: "Comment le score de correspondance est-il calculé ?",
            answer:
              "Il pèse l'intitulé du poste, vos compétences, le lieu, le niveau d'expérience, le salaire et la fraîcheur de l'annonce. Le détail est visible sur chaque offre.",
          },
          {
            question: "Que change le classement IA ?",
            answer:
              "L'IA relit la sélection avec votre profil, la remet dans l'ordre le plus pertinent et écrit une phrase par offre pour expliquer pourquoi elle vous correspond. Vos données sont pseudonymisées avant l'appel.",
          },
          {
            question: "Est-ce que je reçois un e-mail tous les jours ?",
            answer:
              "Seulement si vous l'activez. La sélection est toujours disponible dans l'application, et l'e-mail se coupe en un clic.",
          },
        ],
      },
    },
    tailored_documents: {
      metaTitle: "CV adapté à chaque offre et lettre de motivation",
      metaDescription:
        "CVSpark génère un CV adapté à l'offre et une lettre de motivation personnalisée en quelques secondes, avec un score ATS à chaque sauvegarde, une traduction français-anglais et l'export PDF ou Word.",
      card: {
        name: "CV et lettre sur mesure",
        description: "Un CV et une lettre adaptés à l'offre, score ATS compris.",
      },
      eyebrow: "CV et lettre sur mesure",
      title: "Un CV adapté à chaque offre,",
      titleAccent: "la lettre avec.",
      subtitle:
        "Collez une offre : CVSpark reprend votre profil, fait remonter ce qui compte pour ce poste et rédige le CV et la lettre. Vous relisez, ajustez, envoyez.",
      primaryCta: "Créer mon CV adapté",
      heroAlt:
        "Éditeur de CV CVSpark : formulaire à gauche, aperçu A4 du CV adapté à l'offre à droite",
      stats: [
        { value: "Secondes", label: "au lieu d'une soirée" },
        { value: "Score ATS", label: "à chaque sauvegarde" },
        { value: "FR ⇄ EN", label: "traduction en un clic" },
      ],
      blocks: [
        {
          eyebrow: "Adapté, pas recyclé",
          title: "Le vocabulaire de l'offre, votre parcours",
          body: "Les expériences et compétences utiles au poste remontent, reformulées avec les mots de l'offre. CVSpark montre sur quoi il s'est appuyé, et rien n'est inventé : tout vient de votre profil.",
          points: [
            "Import de votre CV actuel en PDF ou Word, même scanné",
            "Plusieurs profils de base, un par type de poste visé",
            "Éditeur avec aperçu A4 en direct et historique des versions",
          ],
          alt: "Éditeur de CV avec l'aperçu A4 du document adapté à l'offre",
        },
        {
          eyebrow: "La lettre",
          title: "Une lettre qui cite le poste et l'entreprise",
          body: "La lettre part de la même analyse de l'offre : elle parle de l'entreprise et du poste, pas d'un modèle générique. Elle reste entièrement modifiable.",
          points: [
            "Rédigée à partir de l'offre et de votre profil",
            "Même éditeur, même export que le CV",
          ],
          alt: "Éditeur de lettre de motivation avec aperçu",
        },
        {
          eyebrow: "Prêt pour l'ATS",
          title: "Un score ATS recalculé à chaque sauvegarde",
          body: "Les logiciels de tri des recruteurs lisent votre CV avant un humain. CVSpark note le vôtre sur les critères qu'ils regardent et vous dit quoi corriger, gratuitement.",
          points: [
            "Chaque point relevé, avec ce qu'il faut changer",
            "Note par critère : adéquation à l'offre, contenu, structure, coordonnées",
            "Export PDF sans métadonnées personnelles, et Word",
          ],
          alt: "Analyse ATS d'un CV adapté : score, points à corriger avec leur conseil, puis détail par critère",
        },
        {
          eyebrow: "International",
          title: "En anglais en un clic",
          body: "Un CV ou une lettre se traduit dans l'autre langue sans repartir de zéro, pour postuler à l'étranger ou dans une équipe internationale.",
          points: ["Français et anglais", "Pour le CV comme pour la lettre"],
          alt: "Fenêtre de traduction d'un CV du français vers l'anglais",
        },
      ],
      difference: {
        eyebrow: "Pourquoi c'est différent",
        title: "L'IA fait le travail mécanique, vous gardez le jugement",
        items: [
          {
            title: "Rien d'inventé",
            body: "Le CV se construit à partir de votre profil. CVSpark vous montre sur quoi il s'appuie.",
          },
          {
            title: "Vos données protégées",
            body: "Votre nom et vos coordonnées sont pseudonymisés avant l'appel au modèle, qui ne conserve rien.",
          },
          {
            title: "Tout reste modifiable",
            body: "Chaque section se modifie à la main, avec l'aperçu en direct. Vous validez avant d'envoyer.",
          },
        ],
      },
      pricing: {
        title: "Ce que ça coûte",
        body: "Payé à l'action, sans abonnement. Le score ATS, l'éditeur, la traduction et l'export sont gratuits.",
      },
      faq: {
        title: "Questions sur le CV et la lettre",
        items: [
          {
            question: "L'IA peut-elle inventer des expériences ?",
            answer:
              "Non. Elle reformule et réordonne ce qui est dans votre profil, et vous montre sur quoi elle s'est appuyée. Tout reste modifiable avant l'envoi.",
          },
          {
            question: "Comment ajouter une offre ?",
            answer:
              "Collez le lien de l'annonce, son texte ou son PDF. Depuis les offres du jour, un clic sur « Postuler avec CVSpark » suffit.",
          },
          {
            question: "Mon CV sera-t-il lisible par les ATS ?",
            answer:
              "Oui : la mise en page est simple et structurée, et le score ATS est recalculé à chaque sauvegarde pour vous dire ce qui manque.",
          },
          {
            question: "Quels formats d'export ?",
            answer:
              "PDF, débarrassé des métadonnées qui vous identifient, et Word (DOCX) pour retoucher dans votre traitement de texte.",
          },
        ],
      },
    },
    interview: {
      metaTitle: "Simulation d'entretien d'embauche avec un recruteur IA",
      metaDescription:
        "Entraînez-vous à l'oral avec un recruteur IA qui connaît l'offre : cinq styles de recruteur, 10 à 30 minutes, puis un rapport noté et une courbe de progression. Votre voix n'est jamais conservée.",
      card: {
        name: "Simulation d'entretien",
        description: "Un recruteur IA à l'oral, un rapport noté à la fin.",
      },
      eyebrow: "Simulation d'entretien",
      title: "Répétez l'entretien",
      titleAccent: "à voix haute.",
      subtitle:
        "Parlez à un recruteur qui a lu l'offre que vous visez. Il vous écoute, relance, vous laisse l'interrompre. À la fin, un rapport noté vous dit ce qui a porté et ce qui a manqué.",
      primaryCta: "Passer un entretien",
      heroAlt:
        "Studio d'entretien CVSpark : sphère vocale animée, compte à rebours et transcription en cours",
      stats: [
        { value: "5", label: "styles de recruteur" },
        { value: "10 à 30 min", label: "selon le temps que vous avez" },
        { value: "0", label: "enregistrement de votre voix" },
      ],
      blocks: [
        {
          eyebrow: "En temps réel",
          title: "Une vraie conversation, pas un questionnaire",
          body: "Vous parlez, le recruteur répond à voix haute. Pas de bouton à maintenir : il détecte quand vous avez fini, et vous pouvez le couper comme dans un vrai échange. Il suit un déroulé construit à partir de l'offre.",
          points: [
            "Standard, agressif, passif, technique ou comportemental",
            "Entretien de filtrage, RH complet ou approfondi",
            "Questions tirées de l'offre et de votre CV",
          ],
          alt: "Studio d'entretien avec sphère vocale, compte à rebours et transcription",
        },
        {
          eyebrow: "Le rapport",
          title: "Un rapport, pas une impression",
          body: "Une note sur dix, cinq dimensions évaluées, les points à travailler en priorité et la transcription complète, pour relire vos réponses à froid.",
          points: [
            "Clarté, mots-clés, rythme, hésitations, pertinence",
            "Les points à travailler en priorité",
          ],
          alt: "Rapport d'entretien avec note globale et radar des cinq dimensions",
        },
        {
          eyebrow: "La progression",
          title: "Session après session, vous voyez le chemin parcouru",
          body: "Vos scores s'alignent sur une courbe. Les forces et les faiblesses qui reviennent d'un entretien à l'autre sont repérées pour vous.",
          points: [
            "Évolution de la note et de chaque dimension",
            "Forces et points faibles récurrents",
          ],
          alt: "Courbe de progression des scores d'entretien avec forces et faiblesses",
        },
      ],
      difference: {
        eyebrow: "Pourquoi c'est différent",
        title: "Préparé pour ce poste-là, pas pour un entretien type",
        items: [
          {
            title: "Il connaît l'offre",
            body: "Le recruteur a lu l'annonce et votre CV. Ses questions visent le poste que vous voulez.",
          },
          {
            title: "Votre voix n'est pas gardée",
            body: "Chaque réponse est transcrite puis abandonnée. Seul le texte reste, supprimé au bout de trente jours.",
          },
          {
            title: "Payé à la minute",
            body: "Dix minutes pour un filtrage, trente pour un entretien approfondi : vous payez le temps passé, rapport compris.",
          },
        ],
      },
      pricing: {
        title: "Ce que ça coûte",
        body: "L'entretien est débité à la minute, rapport compris. Le chiffre ci-dessous correspond à un entretien de 10 minutes.",
      },
      faq: {
        title: "Questions sur l'entretien",
        items: [
          {
            question: "Faut-il un matériel particulier ?",
            answer:
              "Un navigateur récent et un micro suffisent, celui d'un ordinateur portable ou d'un casque.",
          },
          {
            question: "Mon enregistrement est-il conservé ?",
            answer:
              "Non. Votre voix est transcrite au fil de l'eau puis abandonnée. La transcription texte est supprimée au bout de trente jours.",
          },
          {
            question: "Puis-je m'entraîner sans offre précise ?",
            answer:
              "L'entretien est le plus utile rattaché à une candidature, parce que le recruteur s'appuie sur l'offre. Pour une première idée des questions, l'outil gratuit « Questions d'entretien probables » ne demande pas de compte.",
          },
          {
            question: "Que contient le rapport ?",
            answer:
              "Une note sur dix, cinq dimensions évaluées, les points à travailler en priorité et la transcription complète de l'échange.",
          },
        ],
      },
    },
    companies_market: {
      metaTitle: "Entreprises qui recrutent près de chez vous, même sans offre",
      metaDescription:
        "CVSpark repère les entreprises qui recrutent dans votre métier près de chez vous, même sans annonce publiée, avec leur fiche (effectif, engagements, égalité femmes-hommes) et l'état du marché : tension et salaires.",
      card: {
        name: "Entreprises et marché",
        description:
          "Qui recrute près de chez vous, et ce que vaut votre métier.",
      },
      eyebrow: "Entreprises et marché",
      title: "Les entreprises qui recrutent,",
      titleAccent: "même sans annonce.",
      subtitle:
        "La plupart des embauches ne passent pas par une annonce. CVSpark vous montre les entreprises qui recrutent dans votre métier autour de vous, ce qu'elles sont, et si le marché joue pour vous.",
      primaryCta: "Voir qui recrute",
      heroAlt:
        "Liste des entreprises qui recrutent dans CVSpark avec potentiel d'embauche, taille et distance",
      stats: [
        { value: "Sans annonce", label: "les recruteurs du marché caché" },
        { value: "5 badges", label: "d'engagement vérifiés" },
        { value: "Gratuit", label: "données publiques officielles" },
      ],
      blocks: [
        {
          eyebrow: "La fiche entreprise",
          title: "Savoir chez qui vous postulez",
          body: "Taille, effectif, finances, ancienneté, établissements ouverts, page employeur France Travail : tout ce qui est public, rassemblé sur une fiche. Et les engagements qui comptent pour vous.",
          points: [
            "Société à mission, économie sociale et solidaire, employeur inclusif",
            "Index de l'égalité femmes-hommes, bilan des émissions de gaz à effet de serre",
            "Candidature spontanée en un clic, CV et lettre compris",
          ],
          alt: "Fiche entreprise avec effectif, finances et badges d'engagement",
        },
        {
          eyebrow: "Le radar marché",
          title: "Votre recherche est-elle réaliste ?",
          body: "Pour votre métier et votre département : la tension du marché, le volume d'offres, le nombre de candidats et les salaires proposés. De quoi ajuster la zone ou la cible avant d'envoyer cinquante candidatures.",
          points: [
            "Tension de 1 à 5, lue dans les données de France Travail",
            "Salaire médian proposé, affiché seulement quand l'échantillon suffit",
          ],
          alt: "Radar du marché avec tension, volume d'offres et salaires pour le métier visé",
        },
      ],
      difference: {
        eyebrow: "Pourquoi c'est différent",
        title: "Le marché caché, rendu visible",
        items: [
          {
            title: "Un potentiel d'embauche",
            body: "Les entreprises sont repérées par leur probabilité de recruter dans votre métier, pas par les annonces qu'elles ont publiées.",
          },
          {
            title: "Des sources publiques",
            body: "France Travail, l'annuaire des entreprises et les index publics. Chaque chiffre est sourcé.",
          },
          {
            title: "Relié à la candidature",
            body: "Une entreprise vous plaît ? La candidature spontanée se prépare avec le même CV adapté.",
          },
        ],
      },
      pricing: {
        title: "Ce que ça coûte",
        body: "La liste des entreprises, les fiches et le radar marché sont gratuits. Seuls le CV et la lettre d'une candidature spontanée consomment des crédits.",
      },
      faq: {
        title: "Questions sur les entreprises et le marché",
        items: [
          {
            question: "Comment savoir qu'une entreprise recrute sans annonce ?",
            answer:
              "CVSpark s'appuie sur le potentiel d'embauche calculé par France Travail (La Bonne Boîte) à partir des recrutements passés dans votre métier et votre zone.",
          },
          {
            question: "D'où viennent les informations des fiches ?",
            answer:
              "De l'annuaire des entreprises de l'État, de France Travail et des index publics comme l'égalité femmes-hommes. Les sources sont citées sur chaque fiche.",
          },
          {
            question: "Que signifie la tension du marché ?",
            answer:
              "C'est un indicateur de France Travail, de 1 à 5 : plus il est haut, plus les employeurs peinent à recruter dans ce métier et ce département, et plus vos chances sont bonnes.",
          },
          {
            question: "Puis-je vérifier une entreprise sans compte ?",
            answer:
              "Oui, avec l'outil gratuit « Vérifier un employeur » : cherchez par nom ou numéro SIREN.",
          },
        ],
      },
    },
  },
}
