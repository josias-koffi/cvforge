import type { CVDocumentContent, LetterDocumentContent } from "../../types/src";

export const CV_PREVIEW_FIXTURE: CVDocumentContent = {
  candidate: {
    city: "Lyon",
    email: "jean.dupont@example.com",
    firstName: "Jean",
    github: "github.com/jeandupont",
    lastName: "Dupont",
    linkedin: "linkedin.com/in/jeandupont",
    phone: "+33 6 12 34 56 78",
    summary:
      "Chef de projet passionné avec 8 ans d'expérience en transformation digitale et pilotage de programmes SI complexes. Expert en méthodes agiles et gestion d'équipes pluridisciplinaires.",
    title: "Chef de projet IT",
  },
  certifications: [
    {
      issuer: "Project Management Institute",
      title: "PMP — Project Management Professional",
      year: "2022",
    },
    {
      issuer: "Scrum.org",
      title: "PSM I — Professional Scrum Master",
      year: "2020",
    },
  ],
  education: [
    {
      degree: "Master Management de Projets Digitaux",
      institution: "Université Paris-Dauphine",
      mention: "Très Bien",
      year: "2018",
    },
    {
      degree: "Licence Informatique de Gestion",
      institution: "Université Lyon 3",
      mention: "",
      year: "2016",
    },
  ],
  experiences: [
    {
      achievements: [
        "Déploiement d'une plateforme bancaire mobile — +40 000 utilisateurs en 6 mois",
        "Réduction des délais de livraison de 35 % via adoption agile à l'échelle",
      ],
      company: "Banque Crédit Sud",
      description:
        "Pilotage de la transformation digitale du parcours client retail. Management d'une équipe de 12 personnes (dev, UX, data).",
      endDate: "Présent",
      position: "Responsable Digital & Projets",
      startDate: "2021",
    },
    {
      achievements: [
        "Migration ERP SAP S/4HANA sur 6 sites européens — budget 2,8 M€ tenu à 100 %",
        "Certification ISO 9001 obtenue dans les délais sur le périmètre SI logistique",
      ],
      company: "Logistique Express",
      description:
        "Chef de projet SI en charge de la modernisation du système d'information logistique groupe.",
      endDate: "2021",
      position: "Chef de projet SI",
      startDate: "2018",
    },
  ],
  languages: [
    { language: "Français", level: "Langue maternelle" },
    { language: "Anglais", level: "C1 — Courant" },
  ],
  projects: [
    {
      description:
        "Contribution open source à un outil de génération de CV optimisé ATS en React/NestJS.",
      title: "CVForge",
      url: "https://github.com/jeandupont/cvforge-demo",
    },
    {
      description:
        "Tableau de bord analytique pour PME — intégration Power BI + API REST.",
      title: "Dashboard BI PME",
      url: "https://example.com/bi",
    },
  ],
  skills: {
    hard: ["Gestion de projet", "Agile / Scrum", "SAP S/4HANA", "JIRA", "Power BI", "SQL"],
    soft: ["Leadership", "Communication", "Résolution de problèmes", "Gestion du stress"],
  },
};

export const LETTER_PREVIEW_FIXTURE: LetterDocumentContent = {
  body: {
    paragraph1:
      "Votre annonce pour le poste de Directeur de Projet Senior a immédiatement retenu mon attention. La mission décrite correspond précisément à l'expertise que j'ai développée au fil de huit années de pilotage de projets complexes dans les secteurs bancaire et logistique.",
    paragraph2:
      "Au sein de la Banque Crédit Sud, j'ai piloté la transformation digitale du parcours client retail, en coordonnant des équipes pluridisciplinaires de douze personnes. Cette expérience m'a permis de déployer des plateformes à fort impact tout en maintenant rigueur budgétaire et qualité de livraison.",
    paragraph3:
      "Je serais ravi d'échanger lors d'un entretien pour vous présenter plus en détail la façon dont mon parcours s'inscrit dans vos ambitions de développement. Je reste disponible à votre convenance.",
  },
  candidate: {
    city: "Lyon",
    email: "jean.dupont@example.com",
    firstName: "Jean",
    github: "github.com/jeandupont",
    lastName: "Dupont",
    linkedin: "linkedin.com/in/jeandupont",
    phone: "+33 6 12 34 56 78",
    title: "Chef de projet IT",
  },
  company: {
    city: "Paris",
    name: "InnoTech Solutions",
  },
  date: "20 avril 2026",
  object: "Candidature au poste de Directeur de Projet Senior",
  signature: {
    firstName: "Jean",
    lastName: "Dupont",
  },
};
