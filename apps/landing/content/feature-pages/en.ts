import { welcomeApplications } from "../welcome"

import type { FeaturePagesDictionary } from "./types"

export const featurePagesEn: FeaturePagesDictionary = {
  breadcrumbLabel: "Breadcrumb",
  learnMore: "Learn more",
  pricingFree: "Free, no credits",
  pricingCreditUnit: { one: "credit", other: "credits" },
  related: {
    title: "The rest of your job search",
    tools: "Try without an account",
  },
  cta: {
    title: "Your next application starts here.",
    body: `${welcomeApplications("complete application", "complete applications")} free on sign-up, no card and no subscription.`,
    button: "Start for free",
  },
  pages: {
    daily_offers: {
      metaTitle: "Personalized job offers every morning",
      metaDescription:
        "Every morning, CVSpark picks the job offers that match your profile, explains each score and, with AI ranking, tells you in one sentence why the offer fits you.",
      card: {
        name: "Daily job offers",
        description: "Ten offers picked for you every morning, ranked by AI.",
      },
      eyebrow: "Daily job offers",
      title: "Every morning, the offers",
      titleAccent: "that truly fit you.",
      subtitle:
        "No more alerts dumping a hundred ads on you. CVSpark reads the offers published, compares them with your profile and keeps only the best, with the reason for each pick.",
      primaryCta: "Get my daily offers",
      heroAlt:
        "Daily offers in CVSpark: ranked job offers with a match score and the AI's one-line explanation",
      stats: [
        { value: "6 am", label: "your selection is ready" },
        { value: "10", label: "offers picked, not a hundred" },
        { value: "1 line", label: "from the AI for each offer" },
      ],
      blocks: [
        {
          eyebrow: "AI ranking",
          title: "One sentence telling you why this offer is for you",
          body: "Turn on AI ranking: it rereads the morning selection with your profile, puts the offers in the right order and writes, for each one, the reason that matters. You know in three seconds which one to open.",
          points: [
            "Offers re-ranked on your background, not just keywords",
            "One short, concrete sentence per offer, no empty superlatives",
            "Charged only when the ranking succeeds",
          ],
          alt: "CVSpark offer card with the AI's sentence explaining why the offer fits the profile",
        },
        {
          eyebrow: "A score that explains itself",
          title: "See what you already have, and what to bring forward",
          body: "Each offer carries a match score built on the job title, skills, location, experience, salary and how fresh the ad is. The panel shows the skills you already have and the ones to highlight.",
          points: [
            "Skills you have and skills to highlight, offer by offer",
            "Requirements, contract, salary and apply link in one place",
            "“Apply with CVSpark” creates the application and starts the tailored resume",
          ],
          alt: "Offer panel with the score breakdown, the matching skills and the apply button",
        },
        {
          eyebrow: "Set once",
          title: "Describe your search, CVSpark searches every morning",
          body: "Target jobs, locations, contract, remote work, companies to avoid: you set your search once. The selection lands in the app and, if you like, in your inbox.",
          points: [
            "Jobs mapped to France Travail's ROME job directory",
            "Several profiles, one search per profile",
            "Morning email and AI ranking, each one click away",
          ],
          alt: "Search alert settings with the morning email and the AI ranking switch",
        },
        {
          eyebrow: "Every offer",
          title: "And when you want to search yourself",
          body: "Every offer collected over the last thirty days is searchable in free text, de-duplicated across sources, with the same detailed panel.",
          points: [
            "France Travail, La bonne alternance and company career sites",
            "An offer posted in several places shows up once",
          ],
          alt: "CVSpark job search with the results list and the detail panel",
        },
      ],
      difference: {
        eyebrow: "Why it's different",
        title: "A selection, not a feed of ads",
        items: [
          {
            title: "Official sources",
            body: "France Travail, La bonne alternance and company career pages (Greenhouse, Lever, Ashby, SmartRecruiters…). No scraping of sites that forbid it.",
          },
          {
            title: "From offer to resume in one click",
            body: "The offer you pick becomes an application, with a tailored resume and letter. No copy-paste between two tabs.",
          },
          {
            title: "Free without AI",
            body: "The morning selection and its score are free. Only AI ranking uses a credit, once a day.",
          },
        ],
      },
      pricing: {
        title: "What it costs",
        body: "The selection, the score and the job search are free. AI ranking is charged once a morning, only when it succeeds.",
      },
      faq: {
        title: "Questions about daily offers",
        items: [
          {
            question: "Where do the offers come from?",
            answer:
              "From France Travail, La bonne alternance for apprenticeships, and companies' public career pages (Greenhouse, Lever, Ashby, SmartRecruiters…). Duplicates across sources are merged.",
          },
          {
            question: "How is the match score calculated?",
            answer:
              "It weighs the job title, your skills, the location, the experience level, the salary and how fresh the ad is. The breakdown is shown on every offer.",
          },
          {
            question: "What does AI ranking change?",
            answer:
              "The AI rereads the selection with your profile, puts it in the most relevant order and writes one sentence per offer explaining why it fits you. Your data is pseudonymised before the call.",
          },
          {
            question: "Do I get an email every day?",
            answer:
              "Only if you turn it on. The selection is always in the app, and the email switches off in one click.",
          },
        ],
      },
    },
    tailored_documents: {
      metaTitle: "Tailored resume for every job offer, cover letter included",
      metaDescription:
        "CVSpark writes a resume tailored to the job offer and a personalised cover letter in seconds, with an ATS score on every save, French-English translation and PDF or Word export.",
      card: {
        name: "Tailored resume and letter",
        description: "A resume and a letter tailored to the offer, ATS score included.",
      },
      eyebrow: "Tailored resume and letter",
      title: "A resume tailored to every offer,",
      titleAccent: "the letter too.",
      subtitle:
        "Paste an offer: CVSpark takes your profile, brings forward what matters for this job and writes the resume and the letter. You review, adjust, send.",
      primaryCta: "Create my tailored resume",
      heroAlt:
        "CVSpark resume editor: form on the left, A4 preview of the resume tailored to the offer on the right",
      stats: [
        { value: "Seconds", label: "instead of an evening" },
        { value: "ATS score", label: "on every save" },
        { value: "FR ⇄ EN", label: "one-click translation" },
      ],
      blocks: [
        {
          eyebrow: "Tailored, not recycled",
          title: "The offer's vocabulary, your background",
          body: "The experience and skills that matter for the job come first, reworded with the offer's words. CVSpark shows what it relied on, and nothing is made up: it all comes from your profile.",
          points: [
            "Import your current resume as PDF or Word, even scanned",
            "Several base profiles, one per kind of job",
            "Editor with a live A4 preview and version history",
          ],
          alt: "Resume editor with the A4 preview of the document tailored to the offer",
        },
        {
          eyebrow: "The letter",
          title: "A letter that names the job and the company",
          body: "The letter starts from the same reading of the offer: it talks about the company and the job, not a generic template. It stays fully editable.",
          points: [
            "Written from the offer and your profile",
            "Same editor, same export as the resume",
          ],
          alt: "Cover letter editor with preview",
        },
        {
          eyebrow: "ATS-ready",
          title: "An ATS score recalculated on every save",
          body: "Recruiters' screening software reads your resume before a human does. CVSpark scores yours on what they look at and tells you what to fix, for free.",
          points: [
            "Every point raised, with what to change",
            "A score per criterion: fit with the offer, content, structure, contact details",
            "PDF export stripped of personal metadata, and Word",
          ],
          alt: "ATS analysis of a tailored resume: score, points to fix with their advice, then the breakdown by criterion",
        },
        {
          eyebrow: "International",
          title: "In English in one click",
          body: "A resume or a letter translates into the other language without starting over, to apply abroad or to an international team.",
          points: ["French and English", "For the resume as for the letter"],
          alt: "Translation dialog for a resume from French to English",
        },
      ],
      difference: {
        eyebrow: "Why it's different",
        title: "AI does the mechanical work, you keep the judgement",
        items: [
          {
            title: "Nothing made up",
            body: "The resume is built from your profile. CVSpark shows you what it relies on.",
          },
          {
            title: "Your data protected",
            body: "Your name and contact details are pseudonymised before the model is called, and the model keeps nothing.",
          },
          {
            title: "Everything stays editable",
            body: "Every section can be edited by hand, with a live preview. You approve before you send.",
          },
        ],
      },
      pricing: {
        title: "What it costs",
        body: "Pay per action, no subscription. The ATS score, the editor, translation and export are free.",
      },
      faq: {
        title: "Questions about the resume and letter",
        items: [
          {
            question: "Can the AI make up experience?",
            answer:
              "No. It rewords and reorders what is in your profile, and shows you what it relied on. Everything stays editable before you send.",
          },
          {
            question: "How do I add an offer?",
            answer:
              "Paste the ad's link, its text or its PDF. From the daily offers, one click on “Apply with CVSpark” is enough.",
          },
          {
            question: "Will my resume be readable by ATS software?",
            answer:
              "Yes: the layout is simple and structured, and the ATS score is recalculated on every save to tell you what is missing.",
          },
          {
            question: "Which export formats?",
            answer:
              "PDF, stripped of the metadata that identifies you, and Word (DOCX) to edit in your word processor.",
          },
        ],
      },
    },
    interview: {
      metaTitle: "Mock job interview with an AI recruiter",
      metaDescription:
        "Practise out loud with an AI recruiter who knows the offer: five recruiter styles, 10 to 30 minutes, then a scored report and a progress curve. Your voice is never stored.",
      card: {
        name: "Mock interview",
        description: "An AI recruiter, out loud, and a scored report at the end.",
      },
      eyebrow: "Mock interview",
      title: "Rehearse the interview",
      titleAccent: "out loud.",
      subtitle:
        "Talk to a recruiter who has read the offer you are after. They listen, follow up, and let you cut in. At the end, a scored report tells you what landed and what was missing.",
      primaryCta: "Take an interview",
      heroAlt:
        "CVSpark interview studio: animated voice orb, countdown and live transcript",
      stats: [
        { value: "5", label: "recruiter styles" },
        { value: "10 to 30 min", label: "depending on your time" },
        { value: "0", label: "recordings of your voice" },
      ],
      blocks: [
        {
          eyebrow: "In real time",
          title: "A real conversation, not a questionnaire",
          body: "You speak, the recruiter answers out loud. No button to hold: they notice when you have finished, and you can cut in as in a real exchange. They follow an agenda built from the offer.",
          points: [
            "Standard, aggressive, passive, technical or behavioural",
            "Screening, full HR or in-depth interview",
            "Questions drawn from the offer and your resume",
          ],
          alt: "Interview studio with voice orb, countdown and transcript",
        },
        {
          eyebrow: "The report",
          title: "A report, not an impression",
          body: "A score out of ten, five dimensions assessed, what to work on first and the full transcript, to reread your answers with a cool head.",
          points: [
            "Clarity, keywords, pace, hesitations, relevance",
            "What to work on first",
          ],
          alt: "Interview report with overall score and a radar of the five dimensions",
        },
        {
          eyebrow: "Progress",
          title: "Session after session, see how far you have come",
          body: "Your scores line up on a curve. The strengths and weaknesses that come back from one interview to the next are spotted for you.",
          points: [
            "Trend of the overall score and of each dimension",
            "Recurring strengths and weak spots",
          ],
          alt: "Progress curve of interview scores with strengths and weaknesses",
        },
      ],
      difference: {
        eyebrow: "Why it's different",
        title: "Prepared for this job, not a generic interview",
        items: [
          {
            title: "They know the offer",
            body: "The recruiter has read the ad and your resume. Their questions target the job you want.",
          },
          {
            title: "Your voice is not kept",
            body: "Each answer is transcribed then discarded. Only the text remains, deleted after thirty days.",
          },
          {
            title: "Paid by the minute",
            body: "Ten minutes for a screening, thirty for an in-depth interview: you pay for the time spent, report included.",
          },
        ],
      },
      pricing: {
        title: "What it costs",
        body: "The interview is charged by the minute, report included. The figure below is for a 10-minute interview.",
      },
      faq: {
        title: "Questions about the interview",
        items: [
          {
            question: "Do I need special equipment?",
            answer:
              "A recent browser and a microphone are enough, a laptop's or a headset's.",
          },
          {
            question: "Is my recording kept?",
            answer:
              "No. Your voice is transcribed as you go, then discarded. The text transcript is deleted after thirty days.",
          },
          {
            question: "Can I practise without a specific offer?",
            answer:
              "The interview is most useful tied to an application, because the recruiter relies on the offer. For a first look at the questions, the free “Likely interview questions” tool needs no account.",
          },
          {
            question: "What is in the report?",
            answer:
              "A score out of ten, five dimensions assessed, what to work on first and the full transcript of the exchange.",
          },
        ],
      },
    },
    companies_market: {
      metaTitle: "Companies hiring near you, even without a job ad",
      metaDescription:
        "CVSpark finds the companies hiring in your line of work near you, even with no job ad published, with their profile (headcount, commitments, gender equality) and the state of the market: demand and salaries.",
      card: {
        name: "Companies and market",
        description: "Who is hiring near you, and what your job is worth.",
      },
      eyebrow: "Companies and market",
      title: "The companies that are hiring,",
      titleAccent: "even without an ad.",
      subtitle:
        "Most hires never go through a job ad. CVSpark shows you the companies hiring in your line of work around you, what they are, and whether the market works in your favour.",
      primaryCta: "See who is hiring",
      heroAlt:
        "List of hiring companies in CVSpark with hiring potential, size and distance",
      stats: [
        { value: "No ad needed", label: "the hidden job market" },
        { value: "5 badges", label: "of verified commitments" },
        { value: "Free", label: "official public data" },
      ],
      blocks: [
        {
          eyebrow: "The company profile",
          title: "Know who you are applying to",
          body: "Size, headcount, finances, age, open sites, France Travail employer page: everything public, gathered on one page. And the commitments that matter to you.",
          points: [
            "Mission-driven company, social economy, inclusive employer",
            "Gender equality index, greenhouse gas emissions report",
            "Unsolicited application in one click, resume and letter included",
          ],
          alt: "Company profile with headcount, finances and commitment badges",
        },
        {
          eyebrow: "Market radar",
          title: "Is your search realistic?",
          body: "For your job and your area: how tight the market is, the number of offers, the number of candidates and the salaries offered. Enough to adjust your area or your target before sending fifty applications.",
          points: [
            "Demand from 1 to 5, read in France Travail's data",
            "Median salary offered, shown only when the sample is large enough",
          ],
          alt: "Market radar with demand, number of offers and salaries for the target job",
        },
      ],
      difference: {
        eyebrow: "Why it's different",
        title: "The hidden job market, made visible",
        items: [
          {
            title: "A hiring potential",
            body: "Companies are found by how likely they are to hire in your line of work, not by the ads they have posted.",
          },
          {
            title: "Public sources",
            body: "France Travail, the French company directory and public indexes. Every figure is sourced.",
          },
          {
            title: "Tied to the application",
            body: "Like a company? The unsolicited application is prepared with the same tailored resume.",
          },
        ],
      },
      pricing: {
        title: "What it costs",
        body: "The company list, the profiles and the market radar are free. Only the resume and letter of an unsolicited application use credits.",
      },
      faq: {
        title: "Questions about companies and the market",
        items: [
          {
            question: "How do you know a company is hiring without an ad?",
            answer:
              "CVSpark relies on the hiring potential France Travail computes (La Bonne Boîte) from past hires in your line of work and your area.",
          },
          {
            question: "Where does the company information come from?",
            answer:
              "From the French government's company directory, France Travail and public indexes such as gender equality. Sources are cited on every profile.",
          },
          {
            question: "What does market demand mean?",
            answer:
              "It is a France Travail indicator from 1 to 5: the higher it is, the harder employers find it to hire in that job and area, and the better your chances.",
          },
          {
            question: "Can I check a company without an account?",
            answer:
              "Yes, with the free “Check an employer” tool: search by name or SIREN number.",
          },
        ],
      },
    },
  },
}
