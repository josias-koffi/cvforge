import type { PublicCreditOffer } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import { getDictionary } from "@/lib/dictionaries"
import {
  homeStructuredData,
  jsonLd,
  toolsStructuredData,
} from "@/lib/structured-data"
import { freeTools } from "@/lib/tools"

const base = "https://cvspark.example"
const offer = (priceCents: number) => ({ priceCents }) as PublicCreditOffer

function graphNode(data: ReturnType<typeof homeStructuredData>, type: string) {
  return data["@graph"].find((node) => node["@type"] === type)
}

describe("homeStructuredData", () => {
  it("prices the application from the live catalogue", () => {
    const data = homeStructuredData({
      base,
      locale: "fr",
      dict: getDictionary("fr"),
      offers: [offer(590), offer(2900), offer(1490)],
    })

    expect(graphNode(data, "SoftwareApplication")).toMatchObject({
      url: `${base}/fr`,
      offers: {
        priceCurrency: "EUR",
        lowPrice: 5.9,
        highPrice: 29,
        offerCount: 3,
      },
    })
  })

  it("announces no price when the catalogue is unreachable", () => {
    const data = homeStructuredData({
      base,
      locale: "en",
      dict: getDictionary("en"),
      offers: null,
    })

    expect(graphNode(data, "SoftwareApplication")).not.toHaveProperty("offers")
  })

  it("lists every FAQ entry of the page's language", () => {
    const dict = getDictionary("en")
    const data = homeStructuredData({ base, locale: "en", dict, offers: [] })

    expect(graphNode(data, "FAQPage")).toMatchObject({
      mainEntity: dict.faq.items.map(({ question }) => ({ name: question })),
    })
  })
})

describe("jsonLd", () => {
  it("cannot close the surrounding script tag", () => {
    expect(jsonLd({ text: "</script><script>" })).not.toContain("</script>")
  })
})

describe("toolsStructuredData", () => {
  it("lists every live tool as a free web application", () => {
    const { tools } = getDictionary("en")
    const data = toolsStructuredData({ base, locale: "en", tools })

    expect(data).toMatchObject({ "@type": "ItemList", url: `${base}/en/tools` })
    expect(data.itemListElement).toHaveLength(freeTools.length)
    expect(data.itemListElement[0]).toMatchObject({
      position: 1,
      item: {
        "@type": "WebApplication",
        name: tools.items.ats.name,
        url: `${base}/en/ats-check`,
        isAccessibleForFree: true,
        offers: { price: 0 },
      },
    })
  })
})
