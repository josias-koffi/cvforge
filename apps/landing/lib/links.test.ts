import { describe, expect, it } from "vitest"

import { appUrl, showTestimonials } from "@/lib/links"
import { CREDITS_PER_APPLICATION, getPackSummaries } from "@/lib/pricing"
import { siteUrl } from "@/lib/site"

const env = (values: Record<string, string>) =>
  values as unknown as NodeJS.ProcessEnv

describe("appUrl", () => {
  it("prefers the runtime APP_URL and normalises slashes", () => {
    expect(
      appUrl(
        "login",
        env({
          APP_URL: "https://web.example.com/",
          NEXT_PUBLIC_APP_URL: "https://old.example.com",
        })
      )
    ).toBe("https://web.example.com/login")
  })

  it("falls back to NEXT_PUBLIC_APP_URL, then to the local web app", () => {
    expect(
      appUrl(
        "/login",
        env({
          NEXT_PUBLIC_APP_URL: "https://app.example.com",
        })
      )
    ).toBe("https://app.example.com/login")
    expect(appUrl("/login", env({}))).toBe("http://localhost:3100/login")
  })
})

describe("showTestimonials", () => {
  it("is off unless explicitly enabled", () => {
    expect(showTestimonials(env({}))).toBe(false)
    expect(
      showTestimonials(
        env({
          NEXT_PUBLIC_SHOW_TESTIMONIALS: "true",
        })
      )
    ).toBe(true)
  })
})

describe("siteUrl", () => {
  it("strips the trailing slash", () => {
    expect(
      siteUrl(
        env({
          NEXT_PUBLIC_SITE_URL: "https://cvspark.example/",
        })
      )
    ).toBe("https://cvspark.example")
  })
})

describe("getPackSummaries", () => {
  it("derives prices and application counts from the shared credit packs", () => {
    const [starter, pro] = getPackSummaries("fr")

    expect(starter.label).toBe("Starter")
    expect(starter.price).toMatch(/9,99\s€/)
    expect(starter.applications).toBe(Math.floor(550 / CREDITS_PER_APPLICATION))
    expect(pro.credits).toBe(1400)
    expect(getPackSummaries("en")[1].price).toBe("€19.99")
  })
})
