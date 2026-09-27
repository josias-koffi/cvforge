import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CvDropZone, formatSize } from "@/components/ats/cv-drop-zone"
import { ScanProgress } from "@/components/ats/scan-progress"
import { bandFor, ScoreGauge } from "@/components/ats/score-gauge"
import { UnlockedReport } from "@/components/ats/unlocked-report"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import type { LandingDictionary } from "@/content/types"

const dictionaries: [name: string, dictionary: LandingDictionary][] = [
  ["fr", fr],
  ["en", en],
]

describe("the ATS dictionaries", () => {
  it.each(dictionaries)(
    "%s names every finding the engine can emit",
    (_name, dictionary) => {
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
    }
  )

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
  it.each(dictionaries)(
    "%s keeps the {count} placeholders",
    (_name, dictionary) => {
      expect(dictionary.ats.result.dimensionsScored).toContain("{count}")
      expect(dictionary.ats.result.lockedTitle).toContain("{count}")
    }
  )
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

describe("the ATS copy added for the drop zone and the wait", () => {
  it("keeps as many progress steps in both languages", () => {
    expect(fr.ats.progress.steps).toHaveLength(en.ats.progress.steps.length)
    expect(fr.ats.progress.steps.length).toBeGreaterThan(1)
  })

  it.each(dictionaries)(
    "%s fills every drop zone and trust label",
    (_name, dictionary) => {
      const { upload, trust } = dictionary.ats

      for (const text of [
        upload.dropTitle,
        upload.browse,
        upload.dropActive,
        upload.ready,
        upload.remove,
        trust.private,
        trust.fast,
        trust.noSignup,
      ]) {
        expect(text).toBeTruthy()
      }
    }
  )
})

describe("CvDropZone", () => {
  const noop = () => {}

  it("invites a drop, offers to browse and states the limits", () => {
    const markup = renderToStaticMarkup(
      <CvDropZone
        dictionary={fr.ats.upload}
        disabled={false}
        file={null}
        locale="fr"
        onFile={noop}
        onReject={noop}
      />
    )

    expect(markup).toContain(fr.ats.upload.dropTitle)
    expect(markup).toContain(fr.ats.upload.browse)
    expect(markup).toContain(fr.ats.upload.hint)
    // The zone is the input's label: clicking anywhere opens the picker.
    expect(markup).toMatch(/<label[^>]+for="/)
    expect(markup).toContain('type="file"')
  })

  it("shows the picked file with its size and a way to remove it", () => {
    const file = new File([new Uint8Array(250 * 1024)], "cv-lea.pdf", {
      type: "application/pdf",
    })
    const markup = renderToStaticMarkup(
      <CvDropZone
        dictionary={fr.ats.upload}
        disabled={false}
        file={file}
        locale="fr"
        onFile={noop}
        onReject={noop}
      />
    )

    expect(markup).toContain("cv-lea.pdf")
    expect(markup).toContain(fr.ats.upload.ready)
    expect(markup).toContain(`aria-label="${fr.ats.upload.remove}"`)
    expect(markup).not.toContain(fr.ats.upload.dropTitle)
  })
})

describe("formatSize", () => {
  it("speaks kilobytes under a megabyte and megabytes above", () => {
    expect(formatSize(250 * 1024, "en")).toBe("250 kB")
    expect(formatSize(1.5 * 1024 * 1024, "en")).toBe("1.5 MB")
    expect(formatSize(1.5 * 1024 * 1024, "fr")).toMatch(/^1,5\sMo$/)
  })

  it("never shows an empty file as 0", () => {
    expect(formatSize(10, "en")).toBe("1 kB")
  })
})

describe("ScanProgress", () => {
  /** Nothing has happened yet when it appears: only the first step is under way. */
  it("starts on the first step alone", () => {
    const markup = renderToStaticMarkup(
      <ScanProgress dictionary={fr.ats.progress} />
    )

    expect(markup).toContain(fr.ats.progress.steps[0])
    expect(markup).not.toContain(fr.ats.progress.steps[1])
    expect(markup).toContain('aria-current="step"')
  })
})

describe("the unlocked report", () => {
  it("uses the engine's band floors for each dimension", () => {
    expect(bandFor(84)).toBe("good")
    expect(bandFor(85)).toBe("excellent")
    expect(bandFor(50)).toBe("fair")
    expect(bandFor(49)).toBe("weak")
  })

  it("draws a bar per scored dimension, sized by its score", () => {
    const markup = renderToStaticMarkup(
      <UnlockedReport
        dictionary={fr.ats}
        report={{
          scanId: "scan",
          magicLinkSent: true,
          result: {
            overallScore: 64,
            band: "fair",
            llmApplied: false,
            engineVersion: "1",
            dimensions: [
              { key: "structure", status: "scored", score: 72 },
              { key: "keywords", status: "unavailable", score: null },
            ],
            findings: [
              {
                code: "MISSING_PHONE",
                severity: "warning",
                dimension: "contactability",
              },
            ],
          },
        }}
      />
    )

    expect(markup).toContain(fr.ats.dimensions.structure)
    expect(markup).toContain("width:72%")
    expect(markup).not.toContain(fr.ats.dimensions.keywords)
    expect(markup).toContain(fr.ats.findings.MISSING_PHONE)
  })
})
