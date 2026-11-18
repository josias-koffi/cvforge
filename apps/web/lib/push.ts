/**
 * Browser side of the push notifications (E27): the job alerts reach the
 * candidate's devices through the service worker `public/sw.js`.
 */

export type PushPermission = "unsupported" | NotificationPermission

const SW_PATH = "/sw.js"

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function readPushPermission(): PushPermission {
  return pushSupported() ? Notification.permission : "unsupported"
}

/** iOS only offers push to an app added to the home screen. */
export function needsHomeScreenInstall() {
  if (typeof window === "undefined") return false
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia("(display-mode: standalone)").matches

  return ios && !standalone && !pushSupported()
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration(SW_PATH)) ??
    navigator.serviceWorker.register(SW_PATH)
  )
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null

  return (await registration()).pushManager.getSubscription()
}

/** Asks the permission when needed; null when the candidate refused it. */
export async function subscribeToPush(publicKey: string) {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const current = await registration()
  await navigator.serviceWorker.ready

  return (
    (await current.pushManager.getSubscription()) ??
    current.pushManager.subscribe({
      applicationServerKey: base64UrlToBytes(publicKey),
      userVisibleOnly: true,
    })
  )
}

function base64UrlToBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))

  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}
