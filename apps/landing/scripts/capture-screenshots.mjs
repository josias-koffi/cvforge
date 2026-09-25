/**
 * Re-shoots every apps/web screenshot used by the landing page.
 *
 * The captures are taken at `deviceScaleFactor: 2` so a 1152 CSS px slot on a
 * retina screen still gets a 1:1 pixel source — the 1x captures this replaced
 * were upscaled by the browser and looked soft.
 *
 * Auth is a forged session cookie: apps/api signs a stateless payload with
 * AUTH_SESSION_SECRET (see apps/api/src/auth/session-cookie.ts), so a local
 * script can mint one instead of round-tripping a magic link through email.
 * That only works against a local stack with a development secret.
 *
 * Usage (stack up, demo account seeded):
 *   node apps/landing/scripts/capture-screenshots.mjs
 *   node apps/landing/scripts/capture-screenshots.mjs dashboard cv-editor
 */
import { createHmac } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import pg from "pg"
import { chromium } from "playwright"
import sharp from "sharp"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(HERE, "..", "public", "screenshots")

const APP_URL = process.env.CAPTURE_APP_URL ?? "http://localhost:3100"
const API_URL = process.env.CAPTURE_API_URL ?? "http://localhost:3333"
const DEMO_EMAIL = process.env.CAPTURE_EMAIL ?? "cvspark-demo@yopmail.com"
/** The sidebar footer would otherwise publish the demo mailbox on the landing page. */
const DISPLAY_EMAIL = "lea.moreau@example.com"
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET ?? "change-me-for-production"
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "cvforge_session"
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://cvforge:secret@localhost:5432/cvforge"

/** Matches `SCREENSHOT_WIDTH`/`SCREENSHOT_HEIGHT` in components/screenshot.tsx. */
const VIEWPORT = { width: 1440, height: 900 }
const SCALE = 2
/**
 * Close-ups crop one component out of the page, so they are shot at 3x: once
 * enlarged on the landing page they still have a pixel per device pixel.
 */
const DETAIL_SCALE = 3
/** Room left around a close-up, so the component does not touch the crop. */
const DETAIL_PADDING = 24
/** WebP stays visually lossless on flat UI at this quality. */
const WEBP = { quality: 95, effort: 6, smartSubsample: true }
/**
 * Intrinsic size of every capture, read by components/screenshot.tsx: a
 * close-up is as big as the component it shows, so no single constant fits.
 */
const SIZES_FILE = path.join(HERE, "..", "lib", "screenshot-sizes.json")
/**
 * The captures the share cards show (lib/og-image.tsx): the home page's and
 * each feature page's hero. ImageResponse cannot decode WebP, so they are
 * also written as JPEG, on the dark theme the card is drawn on.
 */
const OG_SHOTS = ["daily-offers", "cv-editor", "interview-studio", "companies"]
const OG_DIR = path.join(HERE, "..", "assets", "og")
const OG_SHOT_SIZE = { width: 1000, height: 625 }

const THEMES = ["light", "dark"]

/** Signs the stateless session cookie the API would have minted. */
function sessionCookie() {
  const now = Date.now()
  const payload = Buffer.from(
    JSON.stringify({
      email: DEMO_EMAIL,
      role: "user",
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 6 * 86_400_000).toISOString(),
    })
  ).toString("base64url")

  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url")

  return `${payload}.${signature}`
}

async function api(cookie, route) {
  const response = await fetch(`${API_URL}${route}`, {
    headers: { cookie: `${COOKIE_NAME}=${cookie}` },
  })

  if (!response.ok) {
    throw new Error(`GET ${route} answered ${response.status}`)
  }

  return response.json()
}

/**
 * Resolves the demo records to shoot, so the script survives a re-seed instead
 * of carrying hard-coded ids.
 */
async function resolveTargets(cookie) {
  const { applications } = await api(cookie, "/applications")
  const { sessions } = await api(cookie, "/interviews/sessions")
  const { registry } = await api(cookie, "/profiles")
  const profileId = registry.activeProfileId
  const { companies } = await api(
    cookie,
    `/profiles/${encodeURIComponent(profileId)}/hiring-companies`
  )
  // The company page is shot for its commitments: the one showing most.
  const company = [...companies].sort(
    (a, b) => b.badges.length - a.badges.length || b.hiringPotential - a.hiringPotential
  )[0]

  const withCv = applications.find((item) => item.cvVersions?.length || item.cvGeneratedAt)
  const withLetter = applications.find(
    (item) => item.letterVersions?.length || item.letterGeneratedAt
  )
  // The report is a showcase: take the best-scoring finished interview.
  const report = sessions
    .filter((item) => item.status === "completed")
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))[0]

  if (!withCv || !withLetter || !report) {
    throw new Error(
      "The demo account is missing a CV, a letter or a completed interview — re-seed it first."
    )
  }

  if (!company) {
    throw new Error(
      "The demo account has no hiring companies — see the Screenshots section of AGENTS.md."
    )
  }

  return {
    cvId: withCv.id,
    letterId: withLetter.id,
    reportId: report.id,
    siret: company.siret,
    profileId,
  }
}

/**
 * Runs `shoot` with the session put back "in progress" in the database.
 *
 * The studio is the one screen that cannot be replayed: it only renders while a
 * session is unfinished, and the seeded interviews are all completed. So the row
 * is rewound — status, and a `startedAt` recent enough that the countdown has
 * not run out, or the studio would auto-finish and navigate away — for the
 * length of one shot, then restored. Nothing else reads that window.
 */
async function withLiveSession(sessionId, shoot) {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  const { rows } = await client.query(
    "select status, started_at, completed_at from interview_sessions where id = $1",
    [sessionId]
  )

  if (rows.length === 0) {
    throw new Error(`Interview session ${sessionId} is gone from the database`)
  }

  const [before] = rows

  await client.query(
    `update interview_sessions
        set status = 'ready',
            started_at = now() - interval '7 minutes',
            completed_at = null
      where id = $1`,
    [sessionId]
  )

  try {
    return await shoot()
  } finally {
    await client.query(
      "update interview_sessions set status = $2, started_at = $3, completed_at = $4 where id = $1",
      [sessionId, before.status, before.started_at, before.completed_at]
    )
    await client.end()
  }
}

/** Swaps the demo mailbox for the fictional one the persona already uses. */
async function anonymise(page, from, to) {
  await page.evaluate(
    ([demo, display]) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)

      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeValue?.includes(demo)) {
          node.nodeValue = node.nodeValue.replaceAll(demo, display)
        }
      }

      for (const element of document.querySelectorAll("[title]")) {
        const title = element.getAttribute("title")

        if (title?.includes(demo)) {
          element.setAttribute("title", title.replaceAll(demo, display))
        }
      }
    },
    [from, to]
  )
}

/** Waits for layout, fonts and lazy images to settle before the shutter. */
async function settle(page) {
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
}

/** Opens the first offer of the morning selection in its side panel. */
async function openFirstOffer(page) {
  // The card's title sits under a full-size button that takes the click.
  await page.locator("main button.absolute.inset-0").first().click()
  await page.waitForSelector('[role="dialog"]')
  await page.waitForTimeout(700)
}

/** The closest rounded box around a piece of text: a card, in apps/web. */
function cardAround(page, text) {
  return page
    .getByText(text)
    .first()
    .locator("xpath=ancestor::*[contains(concat(' ', @class, ' '), ' rounded-xl ')][1]")
}

function screens({ cvId, letterId, reportId, siret, profileId }) {
  return [
    { name: "dashboard", url: "/dashboard", wait: "main" },
    { name: "candidatures", url: "/candidatures", wait: "main" },
    { name: "cv-editor", url: `/candidatures/${cvId}/cv`, wait: "main" },
    { name: "letter-editor", url: `/candidatures/${letterId}/letter`, wait: "main" },
    {
      name: "translate",
      url: `/candidatures/${cvId}/cv`,
      wait: "main",
      async act(page) {
        // Radix triggers ignore a raw DOM click, so this has to be a real one.
        await page.getByRole("button", { name: /traduire/i }).click()
        await page.waitForSelector('[role="dialog"]')
        await page.waitForTimeout(500)
      },
    },
    { name: "interview-studio", url: `/entretiens/${reportId}`, wait: "main", live: reportId },
    { name: "interview-report", url: `/entretiens/${reportId}/rapport`, wait: "main" },
    { name: "interview-progress", url: "/entretiens/progression", wait: "main" },
    { name: "daily-offers", url: "/offres-du-jour", wait: "main" },
    {
      name: "offer-panel",
      url: "/offres-du-jour",
      wait: "main",
      act: openFirstOffer,
    },
    {
      // Close-up of the AI's line on the first offer (E19).
      name: "offer-ai",
      url: "/offres-du-jour",
      wait: "main",
      act: openFirstOffer,
      detail: (page) => [cardAround(page, /^Pourquoi cette offre/)],
    },
    {
      // Searched as the persona would, rather than the whole base unsorted.
      name: "job-search",
      url: "/offres?q=d%C3%A9veloppeur&departement=75",
      wait: "main",
    },
    {
      name: "search-alerts",
      url: "/ma-recherche/alertes",
      wait: "main",
      // The switches alone: the summary beside them is too wide to read once shrunk.
      detail: (page) => [cardAround(page, /^Vos offres du jour$/)],
    },
    { name: "companies", url: "/entreprises", wait: "main" },
    {
      name: "company-page",
      url: `/entreprises/${siret}?profileId=${encodeURIComponent(profileId)}`,
      wait: "main",
    },
    {
      name: "market-radar",
      url: "/ma-recherche/marche",
      wait: "main",
      detail: (page) => [
        cardAround(page, /^Repères publics/),
        cardAround(page, /^Salaire médian observé/),
        page.getByText(/^Salaires : offres collectées/),
      ],
    },
    {
      // The analysis a generated CV opens from its badge (US-153).
      name: "cv-ats",
      url: `/candidatures/${cvId}/cv?analyse=ats`,
      wait: '[role="dialog"]',
      // The panel is the crop: no margin, or the page behind shows at its edge.
      padding: 0,
      async act(page) {
        // The sheet focuses its close button on opening; the ring is noise.
        await page.evaluate(() => document.activeElement?.blur())
        await page.waitForTimeout(300)
      },
      detail: (page) => [page.getByRole("dialog")],
    },
  ]
}

/**
 * Hides what must never reach the landing page: the dev overlay, the scrollbars
 * the shutter would freeze mid-page, and the demo address in the sidebar footer.
 */
const CHROME_CLEANUP = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher, [data-sonner-toaster] { display: none !important; }
  *::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
  * { scrollbar-width: none !important; }
`

async function capture(browser, theme, screen) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: screen.detail ? DETAIL_SCALE : SCALE,
    colorScheme: theme,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    reducedMotion: "reduce",
    // The studio boots its microphone before it renders anything.
    permissions: screen.live ? ["microphone"] : [],
  })

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: sessionCookie(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])

  await context.addInitScript((value) => {
    localStorage.setItem("theme", value)
  }, theme)

  const page = await context.newPage()
  await page.goto(`${APP_URL}${screen.url}`, { waitUntil: "domcontentloaded" })
  await page.waitForSelector(screen.wait)
  await page.addStyleTag({ content: CHROME_CLEANUP })
  await settle(page)
  await screen.act?.(page)
  await anonymise(page, DEMO_EMAIL, DISPLAY_EMAIL)

  const clip = screen.detail
    ? await detailClip(screen.detail(page), screen.padding ?? DETAIL_PADDING)
    : undefined
  const png = await page.screenshot({ type: "png", clip })
  await context.close()

  const target = path.join(OUT_DIR, theme, `${screen.name}.webp`)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, await sharp(png).webp(WEBP).toBuffer())

  const { width, height } = await sharp(target).metadata()
  console.log(`  ${theme}/${screen.name}.webp — ${width}×${height}`)

  return { width, height }
}

/** The box around every target of a close-up, padded and kept on screen. */
async function detailClip(targets, padding) {
  const boxes = await Promise.all(
    targets.map(async (target) => {
      const box = await target.boundingBox()

      if (!box) {
        throw new Error(`Close-up target not found: ${target}`)
      }

      return box
    })
  )
  const left = Math.max(0, Math.min(...boxes.map((box) => box.x)) - padding)
  const top = Math.max(0, Math.min(...boxes.map((box) => box.y)) - padding)
  const right = Math.min(
    VIEWPORT.width,
    Math.max(...boxes.map((box) => box.x + box.width)) + padding
  )
  const bottom = Math.min(
    VIEWPORT.height,
    Math.max(...boxes.map((box) => box.y + box.height)) + padding
  )

  return { x: left, y: top, width: right - left, height: bottom - top }
}

async function writeOgShot(name) {
  const target = path.join(OG_DIR, `${name}.jpg`)

  await mkdir(OG_DIR, { recursive: true })
  await sharp(path.join(OUT_DIR, "dark", `${name}.webp`))
    .resize(OG_SHOT_SIZE)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(target)
  console.log(`  og/${name}.jpg`)
}

/** Both themes share a size; a close-up whose themes differ would crop badly. */
async function writeSizes(shot) {
  const sizes = JSON.parse(await readFile(SIZES_FILE, "utf8").catch(() => "{}"))
  const next = { ...sizes, ...shot }
  const sorted = Object.fromEntries(Object.keys(next).sort().map((key) => [key, next[key]]))

  await writeFile(SIZES_FILE, `${JSON.stringify(sorted, null, 2)}\n`)
}

async function main() {
  const only = process.argv.slice(2)
  const cookie = sessionCookie()
  const targets = await resolveTargets(cookie)
  const wanted = screens(targets).filter(
    (screen) => only.length === 0 || only.includes(screen.name)
  )

  if (wanted.length === 0) {
    throw new Error(`No screen matches ${only.join(", ")}`)
  }

  const browser = await chromium.launch({
    channel: "chrome",
    // A silent fake microphone: enough for the studio to reach "à vous, parlez"
    // without a device, and it keeps the voice detector quiet during the shot.
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  })

  const sizes = {}

  try {
    for (const theme of THEMES) {
      console.log(theme)
      for (const screen of wanted) {
        const size = screen.live
          ? await withLiveSession(screen.live, () => capture(browser, theme, screen))
          : await capture(browser, theme, screen)

        // Light is the reference; dark is the same layout in other colours.
        sizes[screen.name] ??= [size.width, size.height]
      }
    }
  } finally {
    await browser.close()
  }

  await writeSizes(sizes)

  for (const name of wanted.map((screen) => screen.name)) {
    if (OG_SHOTS.includes(name)) {
      await writeOgShot(name)
    }
  }
}

await main()
