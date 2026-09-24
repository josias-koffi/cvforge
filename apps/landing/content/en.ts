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
    product: "Product",
    features: "Features",
    howItWorks: "How it works",
    pricing: "Pricing",
    faq: "FAQ",
    interview: "Interview",
    ats: "Free ATS test",
    tools: "Free tools",
    story: "Our story",
    login: "Log in",
    start: "Get started",
    openMenu: "Open menu",
    toggleTheme: "Toggle theme",
    switchLanguage: "Passer en français",
    home: "CVSpark home",
  },
  hero: {
    badge: "New · Practise the interview out loud",
    title: "Where your profile meets the job,",
    titleAccent: "instantly.",
    subtitle:
      "Stop spending your evenings rewriting the same resume. CVSpark reads the offer, takes your profile and generates an ATS-ready resume and cover letter in seconds.",
    primaryCta: "Create my resume",
    secondaryCta: "See how it works",
    atsPrompt: "Not ready yet?",
    atsLink: "Check your CV for free",
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
      interview: {
        title: "Mock interview",
        body: "A recruiter that answers out loud, and a scored report at the end.",
      },
    },
  },
  interview: {
    eyebrow: "Interview",
    title: "The resume opens the door. The interview is what you prepare.",
    subtitle:
      "Speak with a recruiter that knows the job you are after. At the end, a scored report tells you what landed and what was missing.",
    profiles: [
      {
        title: "Standard",
        body: "A classic HR interview, neutral and professional.",
      },
      {
        title: "Aggressive",
        body: "Trick questions, pressure and sharp follow-ups.",
      },
      {
        title: "Passive",
        body: "A flat tone, unspoken silences and vague prompts.",
      },
      {
        title: "Technical",
        body: "Hard skills, architecture and practical scenarios.",
      },
      {
        title: "Behavioural",
        body: "STAR questions on situations you have lived.",
      },
    ],
    durationsTitle: "The time you have",
    durations: [
      "10 minutes — screening interview",
      "20 minutes — full HR interview",
      "30 minutes — in-depth interview",
    ],
    report: {
      title: "A report, not an impression",
      body: "A score out of ten, five scored dimensions, what to work on first, and the full transcript of the conversation. Session after session, your progress reads as a curve.",
      metrics: ["Clarity", "Keywords", "Pacing", "Hesitations", "Relevance"],
    },
    privacyNote:
      "Your voice is never kept: every passage is transcribed, then dropped. Only the text remains, and it is deleted after thirty days.",
    cta: "Take an interview",
    screenshotAlt:
      "CVSpark interview studio: animated voice orb, countdown and live transcript",
    reportScreenshotAlt:
      "CVSpark interview report: overall score and radar of the five scored dimensions",
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
      {
        id: "interview-studio",
        label: "Interview studio",
        caption: "You speak, the recruiter answers. No button to hold down.",
        alt: "Interview studio with voice orb, countdown and live transcript",
      },
      {
        id: "interview-report",
        label: "Interview report",
        caption: "A score out of ten, five dimensions, and what to work on.",
        alt: "Interview report with overall score, dimension radar and advice",
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Pay for the applications you send.",
    subtitle:
      "One pack, paid once, used at your own pace. No subscription, no automatic renewal, and your credits never expire.",
    popular: "Most popular",
    welcome: `${WELCOME_APPLICATIONS} complete applications free when you sign up, mock interview included, no card required.`,
    applicationsLabel: "{count} applications",
    creditsDetail: "{credits} credits · {unitPrice} per application",
    buy: "Choose {pack}",
    unavailable:
      "Our packs cannot be displayed right now. You can find them in the app.",
    unavailableCta: "See the packs",
    costsTitle: "What each action costs",
    costsNote:
      "A complete application — offer analysis, resume, letter, a 10-minute mock interview and its report — uses {credits} credits.",
    creditUnit: "credits",
    actions: {
      cv_import: "Importing an existing resume",
      interview_session: "Mock interview and report (1 credit a minute)",
      offer_enrichment: "Offer and company analysis",
      cv_generation: "Tailored resume generation",
      letter_generation: "Cover letter generation",
      job_digest_rerank: "AI ranking of your daily job matches",
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
        atsCheckLink: "Test my current CV for free",
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
        answer: `Yes. Your account gets ${WELCOME_APPLICATIONS} complete applications when you sign up — resume import, offer analysis, resume, letter and a mock interview — no card required.`,
      },
      {
        question: "How does the mock interview work?",
        answer:
          "You speak with a recruiter that knows the offer you are targeting and spreads its questions over the length you pick: 10, 20 or 30 minutes. At the end you get a scored report — clarity, keywords, pacing, hesitations, relevance — and what to work on. An interview costs 1 credit a minute, report included.",
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
    atsPrompt: "Want to see where your CV stands first?",
    atsLink: "Check it for free",
  },
  footer: {
    tagline: "The spark between your profile and the job.",
    product: "Product",
    legal: "Legal",
    company: "CVSpark",
    rights: "All rights reserved.",
  },
  legal: {
    updated: "Last updated on",
    metaDescription:
      "{title} of CVSpark, the service that tailors your resume and cover letter to every job offer.",
    links: {
      terms: "Terms of use",
      "sales-terms": "Terms of sale",
      "legal-notice": "Legal notice",
      privacy: "Privacy",
    },
  },
  ats: {
    metaTitle: "Free ATS test: will your CV get past the filters?",
    metaDescription:
      "Drop your CV and get an ATS compatibility score in seconds, no sign-up. Your CV is never stored.",
    eyebrow: "Free check",
    title: "Will your CV get past the automated filters?",
    subtitle:
      "75% of CVs are discarded by software before a human reads them. Drop yours: you get your score in seconds, without creating an account.",
    privacyNote:
      "Your CV is never stored. It is analysed in memory and discarded: we keep only the score and the points we found.",
    trust: {
      private: "CV never stored",
      fast: "Score in seconds",
      noSignup: "No sign-up",
    },
    upload: {
      label: "Drop your CV",
      hint: "PDF or DOCX, 5 MB maximum",
      dropTitle: "Drag your CV here",
      browse: "or browse your files",
      dropActive: "Release to drop your CV",
      ready: "Ready to be analysed",
      remove: "Remove the file",
      analyse: "Analyse my CV",
      analysing: "Analysing…",
      tooLarge:
        "This file is over 5 MB. Try a PDF exported from your editor rather than a scan.",
      wrongType: "Unrecognised format. Please drop a PDF or a DOCX.",
    },
    offer: {
      label: "Paste a job ad (optional)",
      hint: "With an ad, we also measure how well your CV matches the role.",
      placeholder: "Paste the text of the job ad here…",
      toggle: "Target a specific role",
    },
    progress: {
      title: "Analysing your CV",
      steps: [
        "Reading the file",
        "Extracting the text",
        "Checking the ATS criteria",
        "Computing the score",
      ],
    },
    result: {
      scoreLabel: "ATS score",
      outOf: "out of 100",
      bands: {
        weak: "Fragile",
        fair: "Needs work",
        good: "Solid",
        excellent: "Excellent",
      },
      dimensionsScored: "{count} criteria assessed",
      partialTitle: "Your PDF is an image",
      partialBody:
        "No text could be read from this file: it was most likely scanned or exported as an image. Recruiting software will not read a single line of it. Re-export your CV as a PDF from your word processor.",
      lockedTitle: "{count} further points found",
      lockedTitleNone: "See the breakdown, criterion by criterion",
      lockedBody:
        "The full breakdown, criterion by criterion, with what to fix first.",
      again: "Analyse another CV",
    },
    unlock: {
      title: "Get the full report",
      body: "Enter your address: the detailed report appears straight away, and you get a link to find it again in CVSpark.",
      emailLabel: "Your email address",
      emailPlaceholder: "you@example.com",
      consent:
        "I agree that CVSpark creates my account and sends me a sign-in link.",
      submit: "Show the full report",
      submitting: "Sending…",
      success: "Report unlocked",
      successBody:
        "A sign-in link is on its way to your inbox: it will bring you straight back to this report.",
    },
    findings: {
      NO_TEXT_LAYER: "The file contains no machine-readable text",
      MULTI_COLUMN_LAYOUT: "A multi-column layout scrambles the reading order",
      TOO_MANY_PAGES: "The CV runs past two pages",
      GARBLED_CHARACTERS: "Some characters come out garbled when extracted",
      MISSING_EXPERIENCE_SECTION: "No \u201cExperience\u201d section found",
      MISSING_EDUCATION_SECTION: "No \u201cEducation\u201d section found",
      MISSING_SKILLS_SECTION: "No \u201cSkills\u201d section found",
      MISSING_SUMMARY_SECTION: "No summary at the top of the CV",
      MISSING_EMAIL: "No email address found",
      MISSING_PHONE: "No phone number found",
      MISSING_LINKEDIN: "No LinkedIn profile found",
      MISSING_CITY: "No city found",
      UNPARSABLE_DATES: "The dates are not in a readable format",
      INCONSISTENT_DATE_FORMATS: "Date formats vary between roles",
      FEW_BULLETS: "Roles are not broken down into bullet points",
      TOO_SHORT: "The CV is thin: little content to index",
      TOO_LONG: "The CV is too long",
      TABLE_MARKERS: "Tables interfere with text extraction",
      LOW_KEYWORD_COVERAGE: "Little of the ad's vocabulary appears in the CV",
      KEYWORD_STUFFING: "The same keyword is repeated excessively",
      MISSING_ACTION_VERBS: "Bullets do not open on an action verb",
      MISSING_QUANTIFICATION: "Results are not quantified",
      UNSUPPORTED_SKILLS: "Some claimed skills are backed by no experience",
    },
    dimensions: {
      machineReadability: "Machine readability",
      structure: "Structure and sections",
      keywords: "Match to the ad",
      impact: "Content and impact",
      contactability: "Contact details",
      formatHygiene: "Dates, bullets and length",
    },
    errors: {
      generic: "The analysis did not complete. Try again in a moment.",
      tooManyRequests:
        "You have run several analyses in a row. Give it a few minutes.",
      unavailable:
        "The free check is temporarily unavailable. Come back tomorrow, or create an account to analyse your CVs right away.",
      expired:
        "This analysis has expired. Run a new one for an up-to-date report.",
      network: "Could not connect. Check your network and try again.",
      fileRequired: "Choose a PDF or DOCX file to analyse.",
      notEnoughText:
        "This CV does not hold enough text to analyse. Export it to PDF from your word processor.",
      invalidEmail: "This email address is not valid.",
      consentRequired:
        "Tick the box to receive your report and your sign-in link.",
      notFound:
        "This analysis cannot be found. Run a new one to get your report.",
      offerRequired: "Paste the full text of the offer: 200 characters at least.",
      offerNotUsable:
        "This offer does not have enough specific terms to compare. Paste the full ad.",
    },
    cta: "Build my optimised CV",
  },
  tools: {
    metaTitle: "Free tools for your job search",
    metaDescription:
      "Free tools, no signup, to get your applications ready: check your CV against recruiting software in seconds.",
    eyebrow: "Free, no account",
    title: "Free tools to move forward right now",
    subtitle:
      "An instant result, no signup. Your CV is analysed then forgotten: nothing is kept.",
    home: {
      eyebrow: "Free, no account",
      title: "Try before you sign up",
      subtitle:
        "Tools that give you something useful in seconds, without creating an account.",
      seeAll: "See all free tools",
    },
    open: "Try it",
    more: {
      body: "To tailor your CV to each job, write your cover letters and track your applications, you need an account.",
      link: "Create my free account",
    },
    items: {
      ats: {
        name: "ATS check for your CV",
        description:
          "Does your CV get through the software recruiters use to sort applications? A score and what to fix.",
        tags: ["No account", "Seconds"],
      },
      keyword_match: {
        name: "CV vs job offer checker",
        description:
          "The offer's keywords already in your CV, and the ones missing. No AI, nothing kept.",
        tags: ["No account", "No AI"],
      },
    },
  },
  keywordMatch: {
    metaTitle: "Free CV vs job offer checker: the missing keywords",
    metaDescription:
      "Compare your CV with a job offer: the keywords you already have, the ones you are missing and your coverage rate, free and with no signup.",
    eyebrow: "Free checker",
    title: "Does your CV speak the job offer's language?",
    subtitle:
      "Drop your CV, paste the offer: see the keywords the recruiter is looking for that your CV is missing.",
    privacyNote:
      "Your CV is read for the comparison, then forgotten: nothing is kept. No AI is used.",
    cvLabel: "Your CV",
    offer: {
      label: "The job offer",
      hint: "Paste the full text of the ad: duties, profile, skills.",
      placeholder: "Paste the job offer here…",
      counter: "{count} / {min} characters minimum",
      counterReady: "{count} characters",
    },
    compare: "Compare",
    comparing: "Comparing…",
    result: {
      title: "Your CV against this offer",
      gauge: {
        scoreLabel: "Coverage",
        outOf: "in %",
        bands: {
          low: "Low",
          fair: "Fair",
          good: "Good",
        },
      },
      verdicts: {
        low: "Your CV uses few of the offer's terms: screening software may rank it low.",
        fair: "Your CV uses some of the offer's terms. Add the ones that genuinely apply to you.",
        good: "Your CV already speaks the offer's language. Check the last missing terms.",
      },
      summary: "{count} of the offer's {total} terms appear in your CV.",
      matchedTitle: "Already in your CV",
      missingTitle: "Missing from your CV",
      more: "and {count} more",
      matchedEmpty: "None of the offer's terms are in your CV yet.",
      missingEmpty: "Every term of the offer is in your CV.",
      method:
        "Words of 4 letters or more, compared regardless of accents and case. Most frequent in the offer first. Only add what is true for you.",
      again: "Compare another CV or offer",
    },
    cta: {
      title: "Generate a CV tailored to this offer",
      body: "Create your account: the application for this offer will be waiting, ready to generate your CV and cover letter.",
      button: "Generate a CV tailored to this offer",
    },
    lead: {
      body: "We send you a sign-in link. Clicking it opens this offer in your applications.",
      emailLabel: "Your email",
      emailPlaceholder: "you@example.com",
      consent:
        "I agree that CVSpark creates my account and sends me a sign-in link.",
      submit: "Get my link",
      submitting: "Sending…",
      success: "Check your inbox",
      successBody:
        "The sign-in link opens your account, with the application for this offer already created.",
    },
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
