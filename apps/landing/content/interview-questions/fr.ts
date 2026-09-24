import type { InterviewQuestionsDictionary } from "./types"

export const interviewQuestionsFr: InterviewQuestionsDictionary = {
  metaTitle: "Questions d'entretien probables pour une offre d'emploi",
  metaDescription:
    "Collez une offre d'emploi : voici les 5 questions que le recruteur vous posera probablement, et ce qu'il cherche à savoir avec chacune. Gratuit, sans compte.",
  eyebrow: "Outil gratuit",
  title: "Quelles questions vous posera le recruteur ?",
  subtitle:
    "Collez l'offre : voici les 5 questions les plus probables, et ce que le recruteur cherche à savoir avec chacune. Des pistes pour vous préparer, pas une liste certaine.",
  offer: {
    label: "Texte de l'offre",
    hint: "Collez l'annonce entière : missions, profil recherché, outils.",
    placeholder: "Collez ici le texte de l'offre d'emploi…",
    counter: "{count} / {min} caractères minimum",
    counterReady: "{count} caractères",
  },
  submit: "Voir les questions",
  submitting: "Le recruteur lit l'offre…",
  privacyNote:
    "Aucun compte. L'offre est envoyée à un modèle d'IA le temps de préparer les questions ; rien n'est conservé.",
  result: {
    title: "Les 5 questions probables",
    intro:
      "Préparées par une IA à partir de l'offre : entraînez-vous à y répondre, sans les apprendre par cœur.",
    kinds: {
      motivation: "Motivation",
      experience: "Expérience",
      technical: "Technique",
      behavioral: "Comportementale",
      situational: "Mise en situation",
    },
    intentLabel: "Ce que le recruteur cherche :",
    again: "Essayer une autre offre",
  },
  cta: {
    title: "Répondez à voix haute avant le jour J",
    body: "Un recruteur IA vous pose ces questions à l'oral, sur cette offre, relance comme en vrai et vous remet un rapport à la fin.",
    button: "S'entraîner à l'oral avec un recruteur IA",
  },
  lead: {
    body: "Nous vous envoyons un lien de connexion : il ouvre l'entretien sur cette offre.",
    emailLabel: "Votre email",
    emailPlaceholder: "vous@exemple.fr",
    consent:
      "J'accepte de créer un compte CVSpark et de recevoir ce lien de connexion.",
    submit: "Recevoir mon lien",
    submitting: "Envoi…",
    success: "Vérifiez votre boîte mail",
    successBody: "Le lien ouvre l'entretien sur cette offre.",
  },
}
