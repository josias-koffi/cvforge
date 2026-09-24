import type { AiCreditAction, LegalDocumentSlug } from "@cvforge/types"

/** Screens captured from apps/web and stored under public/screenshots/{light,dark}. */
export type ScreenshotName =
  | "dashboard"
  | "candidatures"
  | "cv-editor"
  | "letter-editor"
  | "translate"
  | "interview-studio"
  | "interview-report"
  | "interview-progress"

interface TitledText {
  title: string
  body: string
}

interface SectionHeading {
  eyebrow: string
  title: string
  subtitle: string
}

export interface LandingDictionary {
  meta: { title: string; description: string; ogAlt: string }
  nav: {
    /** Label of the header dropdown grouping everything one reads before deciding. */
    product: string
    features: string
    howItWorks: string
    pricing: string
    faq: string
    interview: string
    /** The free ATS check: the top of the acquisition funnel. */
    ats: string
    story: string
    login: string
    start: string
    openMenu: string
    toggleTheme: string
    switchLanguage: string
    home: string
  }
  hero: {
    badge: string
    title: string
    titleAccent: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
    highlights: string[]
    screenshotAlt: string
  }
  problem: {
    eyebrow: string
    title: string
    body: string
    before: { label: string; items: string[] }
    after: { label: string; items: string[] }
  }
  howItWorks: SectionHeading & {
    steps: TitledText[]
    diagram: {
      profile: string
      offer: string
      ai: string
      cv: string
      letter: string
    }
  }
  features: SectionHeading & {
    items: Record<
      | "import"
      | "tailor"
      | "letter"
      | "translate"
      | "tracking"
      | "export"
      | "interview",
      TitledText
    >
  }
  interview: SectionHeading & {
    /** The five recruiter styles, named as the product names them. */
    profiles: TitledText[]
    durationsTitle: string
    /** One line per available length; the product names them, not just times. */
    durations: string[]
    report: TitledText & {
      /** The five scored dimensions of the report. */
      metrics: string[]
    }
    /** Audio is never stored: worth saying where people decide to speak. */
    privacyNote: string
    cta: string
    screenshotAlt: string
    reportScreenshotAlt: string
  }
  showcase: SectionHeading & {
    tabs: { id: ScreenshotName; label: string; caption: string; alt: string }[]
  }
  pricing: SectionHeading & {
    popular: string
    /** Offered on sign-up; the count comes from `WELCOME_APPLICATIONS`. */
    welcome: string
    applicationsLabel: string
    creditsDetail: string
    buy: string
    /** Shown instead of the packs when the API cannot serve the offers. */
    unavailable: string
    unavailableCta: string
    costsTitle: string
    costsNote: string
    creditUnit: string
    actions: Record<AiCreditAction, string>
  }
  testimonials: SectionHeading & {
    items: { quote: string; name: string; role: string }[]
  }
  faq: SectionHeading & {
    items: {
      question: string
      answer: string
      /** Label of a link to the free ATS check, shown under the answer. */
      atsCheckLink?: string
    }[]
  }
  cta: { title: string; body: string; button: string }
  footer: {
    tagline: string
    product: string
    legal: string
    company: string
    rights: string
  }
  /** Chrome around the legal documents; their bodies come from the API. */
  legal: {
    /** Prefix of the publication date, e.g. "Dernière mise à jour le". */
    updated: string
    /** Search snippet of a legal page; `{title}` is the document title. */
    metaDescription: string
    links: Record<LegalDocumentSlug, string>
  }
  /**
   * The free ATS check. The engine returns codes, never sentences — every word
   * a visitor reads is written here, in both languages.
   */
  ats: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    subtitle: string
    /** Said before the upload, because it is the reason to trust the page. */
    privacyNote: string
    /** Three short reassurances under the title, each paired with an icon. */
    trust: {
      private: string
      fast: string
      noSignup: string
    }
    upload: {
      label: string
      hint: string
      /** Drop zone, empty: the invitation, then the link-styled alternative. */
      dropTitle: string
      browse: string
      /** Drop zone while a file hovers over it. */
      dropActive: string
      /** Under the file name once a file is picked. */
      ready: string
      remove: string
      analyse: string
      analysing: string
      /** Client-side refusals, before anything is sent. */
      tooLarge: string
      wrongType: string
    }
    offer: {
      label: string
      hint: string
      placeholder: string
      toggle: string
    }
    /**
     * Steps shown while the scan runs. They pace the wait, they do not report
     * the engine's progress: the last one holds until the answer arrives.
     */
    progress: {
      title: string
      steps: string[]
    }
    result: {
      scoreLabel: string
      outOf: string
      bands: Record<"weak" | "fair" | "good" | "excellent", string>
      dimensionsScored: string
      /** Shown when the file had no text layer: the headline finding. */
      partialTitle: string
      partialBody: string
      lockedTitle: string
      /** Used when nothing is left to reveal, so the hook is not "0 points". */
      lockedTitleNone: string
      lockedBody: string
      again: string
    }
    unlock: {
      title: string
      body: string
      emailLabel: string
      emailPlaceholder: string
      consent: string
      submit: string
      submitting: string
      success: string
      /** Named so the visitor knows the link is how they get back in. */
      successBody: string
    }
    /** Wording for every finding code the engine can emit. */
    findings: Record<string, string>
    /** Wording for every dimension key, used once the report is unlocked. */
    dimensions: Record<string, string>
    errors: {
      generic: string
      tooManyRequests: string
      unavailable: string
      expired: string
      network: string
    }
    cta: string
  }
  story: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    manifesto: string
    originTitle: string
    origin: string[]
    principlesTitle: string
    principles: TitledText[]
    cta: string
  }
}
