import type { AiCreditAction } from "@cvforge/types"

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
    features: string
    howItWorks: string
    pricing: string
    faq: string
    interview: string
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
  faq: SectionHeading & { items: { question: string; answer: string }[] }
  cta: { title: string; body: string; button: string }
  footer: {
    tagline: string
    product: string
    company: string
    rights: string
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
