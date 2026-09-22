import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ScoreGauge } from "@/components/ats/score-gauge"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import type { LandingDictionary } from "@/content/types"

const dictionaries: [name: string, dictionary: LandingDictionary][] = [
  ["fr", fr],
  ["en", en],
]

describe("the ATS dictionaries", () => {
  it.each(dictionaries)("%s names every finding the engine can emit", (_name, dictionary) => {
    // Mirrors ATS_FINDING_CODES in @cvforge/ats-score. A code with no wording
    // would surface to the visitor as a raw identifier.
    const codes = [
      "NO_TEXT_LAYER",
      "MULTI_COLUMN_LAYOUT",
      "TOO_MANY_PAGES",
      "GARBLED_CHARACTERS",
      "MISSING_EXPERIENCE_SECTION",
      "MISSING_EDUCATION_SECTION",
      "MISSING_SKILLS_SECTION",
      "MISSING_SUMMARY_SECTION",
      "MISSING_EMAIL",
      "MISSING_PHONE",
      "MISSING_LINKEDIN",
      "MISSING_CITY",
      "UNPARSABLE_DATES",
      "INCONSISTENT_DATE_FORMATS",
      "FEW_BULLETS",
      "TOO_SHORT",
      "TOO_LONG",
      "TABLE_MARKERS",
      "LOW_KEYWORD_COVERAGE",
      "KEYWORD_STUFFING",
      "MISSING_ACTION_VERBS",
      "MISSING_QUANTIFICATION",
      "UNSUPPORTED_SKILLS",
    ]

    for (const code of codes) {
      expect(dictionary.ats.findings[code], code).toBeTruthy()
    }
  })

  it.each(dictionaries)("%s names every dimension", (_name, dictionary) => {
    for (const key of [
      "machineReadability",
      "structure",
      "keywords",
      "impact",
      "contactability",
      "formatHygiene",
    ]) {
      expect(dictionary.ats.dimensions[key], key).toBeTruthy()
    }
  })

  it.each(dictionaries)("%s names every band", (_name, dictionary) => {
    for (const band of ["weak", "fair", "good", "excellent"] as const) {
      expect(dictionary.ats.result.bands[band]).toBeTruthy()
    }
  })

  it("keeps the same finding codes in both languages", () => {
    expect(Object.keys(fr.ats.findings).sort()).toEqual(
      Object.keys(en.ats.findings).sort()
    )
  })

  /** The count placeholder is what turns a number into a sentence. */
  it.each(dictionaries)("%s keeps the {count} placeholders", (_name, dictionary) => {
    expect(dictionary.ats.result.dimensionsScored).toContain("{count}")
    expect(dictionary.ats.result.lockedTitle).toContain("{count}")
  })
})

describe("ScoreGauge", () => {
  it("states the verdict in words, not only in colour", () => {
    const markup = renderToStaticMarkup(
      <ScoreGauge band="good" dictionary={fr.ats.result} score={72} />
    )

    expect(markup).toContain("72")
    expect(markup).toContain(fr.ats.result.bands.good)
  })

  /** A screen reader should get the whole verdict in one sentence. */
  it("carries an accessible summary of score and band", () => {
    const markup = renderToStaticMarkup(
      <ScoreGauge band="weak" dictionary={fr.ats.result} score={31} />
    )

    expect(markup).toContain("sr-only")
    expect(markup).toContain(`31 ${fr.ats.result.outOf}`)
  })

  it("hides the decorative ring from assistive technology", () => {
    const markup = renderToStaticMarkup(
      <ScoreGauge band="excellent" dictionary={en.ats.result} score={95} />
    )

    expect(markup).toContain('aria-hidden="true"')
  })

  it("does not overflow the ring for an out-of-range score", () => {
    const markup = renderToStaticMarkup(
      <ScoreGauge band="excellent" dictionary={en.ats.result} score={140} />
    )

    expect(markup).toContain('stroke-dashoffset="0"')
  })
})
