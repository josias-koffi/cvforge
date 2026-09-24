import { describe, expect, it } from "vitest"

import { guardedHref } from "@/components/layout/unsaved-changes-guard"

const HERE = new URL("http://localhost:3100/profile/p1") as unknown as Location
const CLICK = {
  altKey: false,
  button: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
}

function link(href: string, attributes: Record<string, string> = {}) {
  return {
    hasAttribute: (name: string) => name in attributes,
    href: new URL(href, HERE.href).href,
    target: attributes.target ?? "",
  } as unknown as HTMLAnchorElement
}

describe("guardedHref", () => {
  it("catches a link to another page of the app", () => {
    expect(guardedHref(link("/profile"), CLICK, HERE)).toBe("/profile")
    expect(guardedHref(link("/ma-recherche?profileId=p1"), CLICK, HERE)).toBe(
      "/ma-recherche?profileId=p1"
    )
  })

  it("lets the outline's anchors on the same page through", () => {
    expect(guardedHref(link("#disponibilite"), CLICK, HERE)).toBeNull()
  })

  it("lets through what does not leave the page", () => {
    expect(
      guardedHref(link("/profile", { target: "_blank" }), CLICK, HERE)
    ).toBeNull()
    expect(
      guardedHref(link("/export.pdf", { download: "" }), CLICK, HERE)
    ).toBeNull()
    expect(
      guardedHref(link("/profile"), { ...CLICK, metaKey: true }, HERE)
    ).toBeNull()
    expect(
      guardedHref(link("/profile"), { ...CLICK, button: 1 }, HERE)
    ).toBeNull()
    expect(guardedHref(link("https://example.com/"), CLICK, HERE)).toBeNull()
  })
})
