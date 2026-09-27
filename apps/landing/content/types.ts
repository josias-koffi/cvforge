import type { AiCreditAction, LegalDocumentSlug } from "@cvforge/types"

import type { CompanyCheckDictionary } from "./company-check/types"
import type { FeaturePagesDictionary } from "./feature-pages/types"
import type { InterviewQuestionsDictionary } from "./interview-questions/types"

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
  | "daily-offers"
  | "offer-panel"
  | "offer-ai"
  | "job-search"
  | "search-alerts"
  | "companies"
  | "company-page"
  | "market-radar"
  | "cv-ats"

/** The free tools that are live on the landing (US-135). */
export type FreeToolKey =
  | "ats"
  | "keyword_match"
  | "job_market"
  | "company_check"
  | "interview_questions"

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
    /** Label of the header menu listing the feature pages (US-147). */
    product: string
    /** The whole features overview on the home page. */
    features: string
    howItWorks: string
    pricing: string
    faq: string
    /** The free ATS check: the top of the acquisition funnel. */
    ats: string
    /** The hub listing every free tool (US-135). */
    tools: string
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
    /** A line under the buttons pointing to the free ATS check (US-134). */
    atsPrompt: string
    atsLink: string
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
  /**
   * The search told in four steps — find, apply, rehearse, follow up. Each
   * step but the last leads to its feature page.
   */
  journey: SectionHeading & {
    steps: (TitledText & { label: string; alt: string })[]
    learnMore: string
  }
  /** The daily offers and their AI ranking, the home page's feature in focus. */
  spotlight: SectionHeading & {
    points: TitledText[]
    cta: string
    learnMore: string
    screenshotAlt: string
    detailAlt: string
  }
  features: SectionHeading & {
    items: Record<
      | "offers"
      | "market"
      | "tailor"
      | "ats"
      | "interview"
      | "letter"
      | "companies"
      | "tracking",
      TitledText
    >
    learnMore: string
  }
  interview: SectionHeading & {
    /** The five recruiter styles, named as the product names them. */
    profiles: TitledText[]
    /** Audio is never stored: worth saying where people decide to speak. */
    privacyNote: string
    cta: string
    learnMore: string
    screenshotAlt: string
  }
  /** Why the product can be trusted with a CV and a job search. */
  trust: SectionHeading & { items: TitledText[] }
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
  cta: {
    title: string
    body: string
    button: string
    /** For the visitor not ready to sign up: the free ATS check (US-134). */
    atsPrompt: string
    atsLink: string
  }
  footer: {
    tagline: string
    features: string
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
      /** The refusals the API names by code (US-134). */
      fileRequired: string
      notEnoughText: string
      invalidEmail: string
      consentRequired: string
      notFound: string
      /** The comparator's own refusals (US-136), worded with the others. */
      offerRequired: string
      offerNotUsable: string
      /** The job market tool's own refusals (US-137). */
      appellationUnknown: string
      departmentUnknown: string
      /** The employer check's own refusals (US-139). */
      companyQueryInvalid: string
      companySourceUnavailable: string
      questionsUnavailable: string
    }
    cta: string
  }
  /** The free tools hub and its section on the home page (US-135). */
  tools: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    subtitle: string
    /** The section on the home page, shorter than the hub's own heading. */
    home: SectionHeading & { seeAll: string }
    /** Call to action on each card. */
    open: string
    /** Closing line of the hub, towards the signup. */
    more: { body: string; link: string }
    /** One entry per tool that is live. A tool is added the day its page ships. */
    items: Record<FreeToolKey, { name: string; description: string; tags: string[] }>
  }
  /** The product feature pages (US-142 to US-146). */
  featurePages: FeaturePagesDictionary
  /** The free "check an employer" tool (US-139). */
  companyCheck: CompanyCheckDictionary
  /** The free "likely interview questions" tool (US-141). */
  interviewQuestions: InterviewQuestionsDictionary
  /**
   * The free "does this job hire near me?" tool (US-137). Its refusals are
   * worded in `ats.errors`, with every other tool's.
   */
  jobMarket: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    subtitle: string
    form: {
      jobLabel: string
      jobHint: string
      jobPlaceholder: string
      /** Read out while suggestions load. */
      searching: string
      noMatch: string
      /** "{count} métiers proposés" for screen readers. */
      suggestions: string
      departmentLabel: string
      departmentPlaceholder: string
      submit: string
      submitting: string
      privacyNote: string
    }
    result: {
      /** "{job} en {department}" */
      title: string
      /** "Chiffres du métier ROME {code} : {label}" */
      romeNote: string
      tension: {
        title: string
        /** One phrase per France Travail level, 1 to 5. */
        levels: Record<"1" | "2" | "3" | "4" | "5", string>
        /** "Niveau {value} sur 5" */
        scale: string
      }
      offers: {
        title: string
        /** "{count} sur douze mois" */
        yearly: string
      }
      jobseekers: {
        title: string
        note: string
      }
      salary: {
        title: string
        /** "Brut annuel, d'après {count} offres" */
        sample: string
        /** Below the minimum sample: "{min}" is that minimum. */
        masked: string
      }
      /** A figure France Travail did not publish for this pair. */
      missing: string
      /** "Période : {period}" */
      period: string
      collecting: { title: string; body: string }
      /** "Chiffres lus le {date}" */
      refreshed: string
      sources: { market: string; salary: string }
      again: string
    }
    cta: {
      title: string
      body: string
      button: string
    }
    lead: {
      body: string
      emailLabel: string
      emailPlaceholder: string
      consent: string
      submit: string
      submitting: string
      success: string
      successBody: string
    }
    /** The job × department pages (US-138). `{job}`, `{department}` everywhere. */
    page: {
      metaTitle: string
      metaDescription: string
      title: string
      breadcrumbLabel: string
      /** "{level}", "{period}", "{offers}" */
      summary: string
      /** "{count}", "{period}" */
      summaryJobseekers: string
      figuresTitle: string
      appellationsTitle: string
      neighboursTitle: string
      otherJobsTitle: string
      toolLink: string
    }
  }
  /**
   * The free CV ↔ offer comparator (US-136). The drop zone reuses the ATS
   * check's wording, and its refusals are worded in `ats.errors`.
   */
  keywordMatch: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    subtitle: string
    privacyNote: string
    cvLabel: string
    offer: {
      label: string
      hint: string
      placeholder: string
      /** "{count} / {min} caractères minimum" until the floor is reached. */
      counter: string
      /** Once the floor is reached: "{count} caractères". */
      counterReady: string
    }
    compare: string
    comparing: string
    result: {
      title: string
      gauge: {
        scoreLabel: string
        outOf: string
        bands: Record<"low" | "fair" | "good", string>
      }
      /** One sentence per band, saying what to do next. */
      verdicts: Record<"low" | "fair" | "good", string>
      /** "{count} termes de l'offre sur {total}" */
      summary: string
      matchedTitle: string
      missingTitle: string
      /** When a list was cut: "et {count} autres". */
      more: string
      matchedEmpty: string
      missingEmpty: string
      method: string
      again: string
    }
    cta: {
      title: string
      body: string
      button: string
    }
    lead: {
      body: string
      emailLabel: string
      emailPlaceholder: string
      consent: string
      submit: string
      submitting: string
      success: string
      successBody: string
    }
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
