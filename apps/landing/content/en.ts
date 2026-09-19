import { WELCOME_APPLICATIONS } from "@cvforge/types"

import type { LandingDictionary } from "./types"

/** Copy source: .project/marketing/cvspark-storytelling.md (English adaptation) */
export const en: LandingDictionary = {
  meta: {
    title: "CVSpark — Where your profile meets the job, instantly",
    description:
      "CVSpark tailors your resume and cover letter to every job offer, ATS-ready in seconds. No subscription.",
    ogAlt: "CVSpark, the spark between your profile and the job",
  },
  nav: {
    features: "Features",
    howItWorks: "How it works",
    pricing: "Pricing",
    faq: "FAQ",
    story: "Our story",
    login: "Log in",
    start: "Get started",
    openMenu: "Open menu",
    toggleTheme: "Toggle theme",
    switchLanguage: "Passer en français",
    home: "CVSpark home",
  },
  hero: {
    badge: "New · Translate your documents FR ⇄ EN",
    title: "Where your profile meets the job,",
    titleAccent: "instantly.",
    subtitle:
      "Stop spending your evenings rewriting the same resume. CVSpark reads the offer, takes your profile and generates an ATS-ready resume and cover letter in seconds.",
    primaryCta: "Create my resume",
    secondaryCta: "See how it works",
    highlights: [
      `${WELCOME_APPLICATIONS} free applications`,
      "No subscription",
      "ATS-ready",
    ],
    screenshotAlt:
      "CVSpark resume editor: form on the left, A4 preview of the tailored resume on the right",
  },
  problem: {
    eyebrow: "The problem",
    title: "It's not your profile. It's the time.",
    body: "Read the offer, spot what matters, rephrase every experience, redo the letter… Every application, the same mechanical work. CVSpark handles it, you keep the judgment.",
    before: {
      label: "Without CVSpark",
      items: [
        "An evening per application",
        "Copy-pasting between ten resume versions",
        "Missed keywords from the offer",
        "A generic letter, for lack of time",
      ],
    },
    after: {
      label: "With CVSpark",
      items: [
        "A few seconds per application",
        "One base profile, endlessly tailored",
        "A resume aligned with what the offer asks",
        "A personal letter, ready to review",
      ],
    },
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "From job offer to ready resume, in three steps",
    subtitle: "AI streamlines the repetitive part. You review, adjust, send.",
    steps: [
      {
        title: "Import your profile",
        body: "Drop your current resume as PDF or Word, even scanned. CVSpark extracts experience, education and skills.",
      },
      {
        title: "Add a job offer",
        body: "Paste the job link or its PDF. The offer and company context are analysed automatically.",
      },
      {
        title: "Get resume and letter",
        body: "A resume and cover letter tailored to the offer, editable live, exportable as PDF or Word.",
      },
    ],
    diagram: {
      profile: "Your profile",
      offer: "The offer",
      ai: "CVSpark",
      cv: "Tailored resume",
      letter: "Letter",
    },
  },
  features: {
    eyebrow: "Features",
    title: "Your whole application flow, in one place",
    subtitle:
      "From importing your resume to tracking replies, without juggling ten tools.",
    items: {
      import: {
        title: "Smart import",
        body: "PDF, Word or scan: your resume becomes a structured profile you reuse for every application.",
      },
      tailor: {
        title: "A resume for every offer",
        body: "Relevant experience and skills rise to the top, phrased with the offer's own vocabulary.",
      },
      letter: {
        title: "Cover letter",
        body: "A letter that names the company and the role, not a recycled template.",
      },
      translate: {
        title: "French ⇄ English",
        body: "Translate a resume or letter in one click to apply abroad.",
      },
      tracking: {
        title: "Application tracking",
        body: "Draft, sent, interview, offer received: each application keeps its status and documents.",
      },
      export: {
        title: "PDF and Word export",
        body: "Clean, ATS-readable documents, ready to send.",
      },
    },
  },
  showcase: {
    eyebrow: "The app",
    title: "Built for speed, with nothing hidden",
    subtitle: "Every document stays editable. AI suggests, you decide.",
    tabs: [
      {
        id: "dashboard",
        label: "Dashboard",
        caption: "Your applications, credits and activity at a glance.",
        alt: "CVSpark dashboard with key figures and activity chart",
      },
      {
        id: "candidatures",
        label: "Applications",
        caption: "Every application and its status, filterable.",
        alt: "Application list with draft, sent and interview statuses",
      },
      {
        id: "cv-editor",
        label: "Resume editor",
        caption: "Edit every section and see the A4 preview live.",
        alt: "Resume editor with live preview",
      },
      {
        id: "letter-editor",
        label: "Letter",
        caption:
          "A letter tailored to the offer, ready to review and personalise.",
        alt: "Cover letter editor with preview",
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Pay for the applications you send.",
    subtitle:
      "One pack, paid once, used at your own pace. No subscription, no automatic renewal, and your credits never expire.",
    popular: "Most popular",
    welcome: `${WELCOME_APPLICATIONS} complete applications free when you sign up, no card required.`,
    applicationsLabel: "{count} applications",
    creditsDetail: "{credits} credits · {unitPrice} per application",
    buy: "Choose {pack}",
    unavailable:
      "Our packs cannot be displayed right now. You can find them in the app.",
    unavailableCta: "See the packs",
    costsTitle: "What each action costs",
    costsNote:
      "A complete application (offer analysis, resume and letter) uses {credits} credits.",
    creditUnit: "credits",
    actions: {
      cv_import: "Importing an existing resume",
      offer_enrichment: "Offer and company analysis",
      cv_generation: "Tailored resume generation",
      letter_generation: "Cover letter generation",
    },
  },
  testimonials: {
    eyebrow: "They apply with CVSpark",
    title: "Less rewriting, more interviews",
    subtitle: "",
    // TODO: replace with real reviews before enabling NEXT_PUBLIC_SHOW_TESTIMONIALS.
    items: [
      {
        quote:
          "I sent twelve applications in one evening, each with a truly targeted resume.",
        name: "Camille R.",
        role: "Digital project manager",
      },
      {
        quote:
          "The letter names the company and the role. I only tweaked two sentences.",
        name: "Thomas L.",
        role: "Full-stack developer",
      },
      {
        quote:
          "Switching to English let me apply in Berlin without starting over.",
        name: "Inès B.",
        role: "Data analyst",
      },
      {
        quote: "Finally a tool that keeps my resume readable by ATS.",
        name: "Julien M.",
        role: "Sales manager",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    subtitle: "",
    items: [
      {
        question: 'What is an "ATS-ready" resume?',
        answer:
          "An ATS is the screening software recruiters use to sort applications. CVSpark produces documents with a simple, readable structure and the offer's keywords, so they are parsed correctly.",
      },
      {
        question: "Does the AI write for me?",
        answer:
          "No. It streamlines the mechanical work: spotting what matters in the offer and rephrasing your background. Everything stays editable, and you approve before sending.",
      },
      {
        question: "What happens to my data?",
        answer:
          "When you import a resume, your name is pseudonymised before it is sent to the AI. You can export or delete your data at any time.",
      },
      {
        question: "Can I try it for free?",
        answer: `Yes. Your account gets ${WELCOME_APPLICATIONS} complete applications when you sign up (resume import, offer analysis, resume and letter), no card required.`,
      },
      {
        question: "Do I need a subscription?",
        answer: "No. You buy a credit pack once, and credits never expire.",
      },
      {
        question: "Which languages are supported?",
        answer:
          "French and English. Any resume or letter can be translated into the other language in one click.",
      },
      {
        question: "Which export formats are available?",
        answer:
          "PDF and Word (DOCX), to send directly or fine-tune in your word processor.",
      },
    ],
  },
  cta: {
    title: "Stop rewriting. Let it spark.",
    body: "Your next application can be ready before your coffee gets cold.",
    button: "Create my resume",
  },
  footer: {
    tagline: "The spark between your profile and the job.",
    product: "Product",
    company: "CVSpark",
    rights: "All rights reserved.",
  },
  story: {
    metaTitle: "Our story",
    metaDescription:
      "CVSpark was born from a simple frustration: spending hours re-tailoring a resume for every job offer.",
    eyebrow: "Our story",
    title: "Born from a simple frustration",
    manifesto:
      "We all have a friend looking for work who rewrites the same resume differently every evening — not because they lack skills, but because they lack the time to rephrase them for every offer. CVSpark was born from that frustration. AI can now absorb this repetitive tailoring work; all that was left was to build the tool that lights the spark between a profile and a job offer — and turns out an ATS-ready resume in seconds.",
    originTitle: "Where the idea came from",
    origin: [
      "The starting point wasn't technology, it was something we saw around us: friends looking for work, losing hours redoing the same work by hand for every application. Reading an offer, spotting what matters, rephrasing their profile accordingly.",
      "Repetitive work, not thinking work. Exactly the kind of task AI can now absorb, without replacing the candidate's judgment.",
      'What if going from "my profile" + "a job offer" to "an ATS-ready resume" could happen in an instant, like a spark, instead of an evening of copy-pasting?',
    ],
    principlesTitle: "What we believe",
    principles: [
      {
        title: "Time, not talent",
        body: "Candidates don't lack skills, they lack the time to rephrase them.",
      },
      {
        title: "AI as a tool",
        body: "It streamlines the mechanical part. The judgment stays with the candidate.",
      },
      {
        title: "The instant click",
        body: "A spark between a profile and an offer, not a long process.",
      },
      {
        title: "A concrete promise",
        body: "One profile + one offer → an ATS-ready resume.",
      },
    ],
    cta: "Try CVSpark",
  },
}
