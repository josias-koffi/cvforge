import { ImageResponse } from "next/og"

import { getDictionary } from "@/lib/dictionaries"
import { hasLocale, locales } from "@/lib/i18n"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "CVSpark"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// Brand hex values from .project/marketing/cvspark-design-system.md (ImageResponse has no CSS variables).
const BRAND = {
  background: "#0B1220",
  primary: "#5B82FF",
  spark: "#FFB020",
  text: "#F3F4F6",
  muted: "#9CA3AF",
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { hero, footer } = getDictionary(hasLocale(locale) ? locale : "fr")

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: BRAND.background,
        color: BRAND.text,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 40,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#2D5FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
          }}
        >
          ⚡
        </div>
        <span>
          CV<span style={{ color: BRAND.primary }}>Spark</span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 72,
            fontWeight: 600,
            lineHeight: 1.1,
          }}
        >
          {hero.title}&nbsp;
          <span style={{ color: BRAND.spark }}>{hero.titleAccent}</span>
        </div>
        <div style={{ fontSize: 30, color: BRAND.muted }}>{footer.tagline}</div>
      </div>
    </div>,
    size
  )
}
