import { readFile } from "node:fs/promises"
import { join } from "node:path"

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
  frame: "#1F2937",
}

// The hero's CV editor capture, pre-resized to JPEG: ImageResponse cannot
// decode the WebP files under public/screenshots.
const heroShot = `data:image/jpeg;base64,${(
  await readFile(join(process.cwd(), "assets/og-hero.jpg"))
).toString("base64")}`
const SHOT = { width: 1000, height: 625 }

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { hero } = getDictionary(hasLocale(locale) ? locale : "fr")

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        paddingTop: 48,
        background: BRAND.background,
        color: BRAND.text,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 30,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: "#2D5FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          ⚡
        </div>
        <span>
          CV<span style={{ color: BRAND.primary }}>Spark</span>
        </span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 22,
          padding: "0 60px",
          fontSize: 52,
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        {hero.title}&nbsp;
        <span style={{ color: BRAND.spark }}>{hero.titleAccent}</span>
      </div>
      {/* Glow behind the capture, as on the hero. */}
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 250,
          width: 800,
          height: 300,
          borderRadius: 400,
          background: BRAND.primary,
          opacity: 0.25,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (size.width - SHOT.width) / 2,
          top: 250,
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${BRAND.frame}`,
          background: BRAND.frame,
        }}
      >
        <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
          {["#EF4444", "#F59E0B", "#22C55E"].map((color) => (
            <div
              key={color}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: color,
              }}
            />
          ))}
        </div>
        <img src={heroShot} width={SHOT.width} height={SHOT.height} alt="" />
      </div>
      {/* Fades the capture out at the bottom edge, as on the hero. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 140,
          background: `linear-gradient(to top, ${BRAND.background}, transparent)`,
        }}
      />
    </div>,
    size
  )
}
