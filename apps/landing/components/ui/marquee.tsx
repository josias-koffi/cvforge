import { type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /** Reverses the scrolling direction. */
  reverse?: boolean
  /** Pauses the animation while hovered. */
  pauseOnHover?: boolean
  /** Number of times the content is repeated to fill the track. */
  repeat?: number
}

/** Horizontal infinite scroller (Magic UI marquee, vertical mode removed). */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex flex-row gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        className
      )}
    >
      {Array.from({ length: repeat }, (_, index) => (
        <div
          key={index}
          aria-hidden={index > 0 || undefined}
          className={cn(
            "flex shrink-0 animate-marquee flex-row justify-around gap-(--gap)",
            {
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            }
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
