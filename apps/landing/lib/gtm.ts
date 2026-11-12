/**
 * Google Tag Manager, loaded only once the visitor has accepted the cookies.
 *
 * The landing is statically generated, so the container id cannot be baked
 * into the HTML of one image for every deployment: it is read at request time
 * from GTM_CONTAINER_ID (set by the infra add-on `analytics`) through
 * ANALYTICS_CONFIG_PATH. Without it the banner never shows: there is nothing
 * to consent to.
 */

export const ANALYTICS_CONFIG_PATH = "/api/analytics-config"
const GTM_SCRIPT_ID = "gtm-script"

export function isGtmId(value: unknown): value is string {
  return typeof value === "string" && /^GTM-[A-Z0-9]+$/.test(value)
}

let gtmIdRequest: Promise<string | null> | null = null

/** The container id of this deployment, fetched once per page load. */
export function fetchGtmId(): Promise<string | null> {
  gtmIdRequest ??= fetch(ANALYTICS_CONFIG_PATH)
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { gtmId?: unknown } | null) =>
      isGtmId(body?.gtmId) ? body.gtmId : null
    )
    .catch(() => null)
  return gtmIdRequest
}

type DataLayerWindow = Window & { dataLayer?: unknown[] }

/**
 * The `gtag()` of Google's snippet. It must push its `arguments` object: GTM
 * ignores a consent command pushed as a plain array.
 */
function gtag(...args: unknown[]): void
function gtag() {
  const w = window as DataLayerWindow
  w.dataLayer = w.dataLayer ?? []
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments)
}

/**
 * Consent Mode: denied by default, then granted for measurement only — no
 * advertising purpose is ever asked for, so none is ever granted.
 */
export function loadGtm(gtmId: string) {
  if (document.getElementById(GTM_SCRIPT_ID)) {
    gtag("consent", "update", { analytics_storage: "granted" })
    return
  }
  gtag("consent", "default", {
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "denied",
  })
  gtag("consent", "update", { analytics_storage: "granted" })
  const w = window as DataLayerWindow
  w.dataLayer?.push({ event: "gtm.js", "gtm.start": Date.now() })

  const script = document.createElement("script")
  script.id = GTM_SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
  document.head.appendChild(script)
}

/** A refusal after an acceptance: GA stops writing for the rest of the visit. */
export function revokeGtm() {
  if (document.getElementById(GTM_SCRIPT_ID)) {
    gtag("consent", "update", { analytics_storage: "denied" })
  }
}
