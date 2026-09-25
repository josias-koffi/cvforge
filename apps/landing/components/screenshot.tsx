import Image from "next/image"
import { LockIcon } from "lucide-react"
import type { ReactNode } from "react"

import type { ScreenshotName } from "@/content/types"
import screenshotSizes from "@/lib/screenshot-sizes.json"
import { cn } from "@/lib/utils"

/**
 * Intrinsic size of a full-screen apps/web capture: a 1440×900 viewport shot
 * at `deviceScaleFactor: 2`, so the widest slot on the page (1152 CSS px)
 * still has a 1:1 source on a retina screen.
 */
export const SCREENSHOT_WIDTH = 2880
export const SCREENSHOT_HEIGHT = 1800

/**
 * The size the capture script recorded: close-ups are as big as the
 * component they show, so only full screens share the constant above.
 */
export function screenshotSize(name: ScreenshotName) {
  const size = (screenshotSizes as Partial<Record<string, number[]>>)[name]

  return size
    ? { width: size[0]!, height: size[1]! }
    : { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT }
}

/** A close-up crops one component: it is framed as a card, not as a browser. */
export function isCloseUp(name: ScreenshotName) {
  return screenshotSize(name).width !== SCREENSHOT_WIDTH
}

/** Renders the light and dark captures; CSS shows the one matching the theme. */
export function Screenshot({
  name,
  alt,
  priority = false,
  sizes = "(min-width: 1152px) 1152px, 100vw",
  className,
}: {
  name: ScreenshotName
  alt: string
  priority?: boolean
  sizes?: string
  className?: string
}) {
  const shared = {
    ...screenshotSize(name),
    sizes,
    priority,
  }

  return (
    <>
      <Image
        {...shared}
        src={`/screenshots/light/${name}.webp`}
        alt={alt}
        className={cn("block dark:hidden", className)}
      />
      <Image
        {...shared}
        src={`/screenshots/dark/${name}.webp`}
        alt={alt}
        className={cn("hidden dark:block", className)}
      />
    </>
  )
}

/** Minimal browser chrome drawn with theme tokens around a screenshot. */
export function BrowserFrame({
  path,
  className,
  children,
}: {
  path: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-overlay",
        className
      )}
    >
      <div className="flex h-9 items-center gap-3 border-b bg-muted/60 px-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto flex h-6 w-full max-w-xs items-center justify-center gap-1.5 rounded-md bg-background px-3 font-mono text-[11px] text-muted-foreground">
          <LockIcon className="size-3" strokeWidth={1.75} aria-hidden />
          <span className="truncate">cvspark{path}</span>
        </div>
        <div className="w-10" aria-hidden />
      </div>
      {children}
    </div>
  )
}
