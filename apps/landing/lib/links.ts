const DEFAULT_APP_URL = "http://localhost:3100"

/** Landing route that redirects to the product login, resolved at request time. */
export const LOGIN_PATH = "/login"

/**
 * Builds an absolute URL on the CVSpark app. The base comes from the runtime
 * environment so one landing image can target any deployment.
 */
export function appUrl(path: string, env: NodeJS.ProcessEnv = process.env) {
  const base =
    env.APP_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${base.replace(/\/+$/, "")}${normalizedPath}`
}

/** Testimonials stay hidden until real reviews replace the placeholders. */
export function showTestimonials(env: NodeJS.ProcessEnv = process.env) {
  return env.NEXT_PUBLIC_SHOW_TESTIMONIALS === "true"
}
