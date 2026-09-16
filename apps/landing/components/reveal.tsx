"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

const EASE_SPARK = [0.2, 0.8, 0.2, 1] as const

/** Fades content up once it scrolls into view; static when motion is reduced. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: EASE_SPARK, delay }}
    >
      {children}
    </motion.div>
  )
}
