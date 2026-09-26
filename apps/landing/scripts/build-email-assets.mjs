/**
 * The CVSpark logo in the forms e-mail needs, generated from the SVG sources:
 *
 * - `public/email/cvspark-mark.png`: the favicon mark (`app/icon.svg`) at 3x,
 *   shown at 32 px in every e-mail header. Gmail shows no SVG.
 * - `public/email/cvspark-avatar.png`: the sender avatar (Gravatar, Google
 *   account) from `public/bimi/cvspark.svg`, the full-bleed variant whose bolt
 *   and spark survive a round crop. That SVG is also the BIMI logo, in the
 *   SVG Tiny-PS profile BIMI requires: edit it by hand, keep it tiny-ps.
 *
 *   pnpm --filter @cvforge/landing email-assets
 *
 * The PNGs are committed; run this again only when a source SVG changes.
 */
import { mkdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const outputs = [
  { source: "app/icon.svg", target: "public/email/cvspark-mark.png", size: 96 },
  { source: "public/bimi/cvspark.svg", target: "public/email/cvspark-avatar.png", size: 512 },
]

await mkdir(resolve(root, "public/email"), { recursive: true })

for (const { source, target, size } of outputs) {
  const svg = await readFile(resolve(root, source))
  // Rasterised at the target size, not scaled up from 32 px.
  await sharp(svg, { density: (72 * size) / 32 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(resolve(root, target))
  console.log(`${target} (${size}×${size})`)
}
