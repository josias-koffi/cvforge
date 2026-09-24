import type { InterviewQuestionsDictionary } from "./types"

export const interviewQuestionsEn: InterviewQuestionsDictionary = {
  metaTitle: "Likely interview questions for a job offer",
  metaDescription:
    "Paste a job offer: here are the 5 questions the recruiter will most likely ask you, and what they want to find out with each. Free, no signup.",
  eyebrow: "Free tool",
  title: "What will the recruiter ask you?",
  subtitle:
    "Paste the offer: here are the 5 most likely questions, and what the recruiter wants to find out with each. Leads to prepare, not a certain list.",
  offer: {
    label: "Job offer text",
    hint: "Paste the whole ad: duties, profile wanted, tools.",
    placeholder: "Paste the job offer text here…",
    counter: "{count} / {min} characters minimum",
    counterReady: "{count} characters",
  },
  submit: "See the questions",
  submitting: "The recruiter is reading the offer…",
  privacyNote:
    "No account. The offer is sent to an AI model while it prepares the questions; nothing is kept.",
  result: {
    title: "The 5 likely questions",
    intro:
      "Prepared by an AI from the offer: practise answering them, without learning them by heart.",
    kinds: {
      motivation: "Motivation",
      experience: "Experience",
      technical: "Technical",
      behavioral: "Behavioural",
      situational: "Situational",
    },
    intentLabel: "What the recruiter wants to know:",
    again: "Try another offer",
  },
  cta: {
    title: "Answer out loud before the big day",
    body: "An AI recruiter asks you these questions out loud, on this offer, follows up like a real one and hands you a report at the end.",
    button: "Practise out loud with an AI recruiter",
  },
  lead: {
    body: "We'll send you a sign-in link: it opens the interview on this offer.",
    emailLabel: "Your email",
    emailPlaceholder: "you@example.com",
    consent:
      "I agree to create a CVSpark account and receive this sign-in link.",
    submit: "Get my link",
    submitting: "Sending…",
    success: "Check your inbox",
    successBody: "The link opens the interview on this offer.",
  },
}
