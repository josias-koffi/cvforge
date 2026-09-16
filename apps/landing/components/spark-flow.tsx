"use client"

import { useRef, type ReactNode, type RefObject } from "react"
import {
  BriefcaseIcon,
  FileTextIcon,
  MailIcon,
  UserRoundIcon,
  ZapIcon,
} from "lucide-react"

import { AnimatedBeam } from "@/components/ui/animated-beam"
import type { LandingDictionary } from "@/content/types"
import { cn } from "@/lib/utils"

const BEAM_DURATION = 3.5

/** Profile + offer flow into CVSpark, which emits a resume and a letter. */
export function SparkFlow({
  labels,
}: {
  labels: LandingDictionary["howItWorks"]["diagram"]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const offerRef = useRef<HTMLDivElement>(null)
  const sparkRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLDivElement>(null)
  const letterRef = useRef<HTMLDivElement>(null)

  const beams: {
    from: RefObject<HTMLDivElement | null>
    to: RefObject<HTMLDivElement | null>
    delay: number
  }[] = [
    { from: profileRef, to: sparkRef, delay: 0 },
    { from: offerRef, to: sparkRef, delay: 0.4 },
    { from: sparkRef, to: cvRef, delay: 1.2 },
    { from: sparkRef, to: letterRef, delay: 1.6 },
  ]

  return (
    <div
      ref={containerRef}
      className="relative flex h-80 items-center justify-between rounded-2xl border bg-background px-4 sm:px-10"
    >
      <div className="flex flex-col gap-16">
        <FlowNode
          nodeRef={profileRef}
          label={labels.profile}
          icon={<UserRoundIcon />}
        />
        <FlowNode
          nodeRef={offerRef}
          label={labels.offer}
          icon={<BriefcaseIcon />}
        />
      </div>

      <FlowNode
        nodeRef={sparkRef}
        label={labels.ai}
        icon={<ZapIcon />}
        className="size-16 bg-primary text-primary-foreground shadow-spark [&_svg]:size-7"
      />

      <div className="flex flex-col gap-16">
        <FlowNode nodeRef={cvRef} label={labels.cv} icon={<FileTextIcon />} />
        <FlowNode
          nodeRef={letterRef}
          label={labels.letter}
          icon={<MailIcon />}
        />
      </div>

      {beams.map((beam, index) => (
        <AnimatedBeam
          key={index}
          containerRef={containerRef}
          fromRef={beam.from}
          toRef={beam.to}
          delay={beam.delay}
          duration={BEAM_DURATION}
          curvature={index % 2 === 0 ? 40 : -40}
          pathColor="var(--border)"
          pathOpacity={1}
          gradientStartColor="var(--primary)"
          gradientStopColor="var(--spark)"
        />
      ))}
    </div>
  )
}

function FlowNode({
  nodeRef,
  label,
  icon,
  className,
}: {
  nodeRef: RefObject<HTMLDivElement | null>
  label: string
  icon: ReactNode
  className?: string
}) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        ref={nodeRef}
        className={cn(
          "flex size-12 items-center justify-center rounded-xl border bg-card text-foreground shadow-raised [&_svg]:size-5 [&_svg]:stroke-[1.75]",
          className
        )}
      >
        {icon}
      </div>
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
