import Link from "next/link"
import { LightbulbIcon, ShieldCheckIcon } from "lucide-react"

import { Brand } from "@/components/brand"
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding-steps"

/**
 * The full-screen frame of the onboarding: the steps on top, the step's
 * title and form in the middle, why it is asked beside it, and the buttons
 * pinned at the bottom so "Continuer" is never a scroll away.
 */
export function OnboardingShell({
  children,
  exitHref,
  footer,
  index,
  step,
}: {
  children: React.ReactNode
  exitHref: string
  footer: React.ReactNode
  index: number
  step: OnboardingStep
}) {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_20%_20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%),radial-gradient(ellipse_at_80%_10%,color-mix(in_oklch,var(--spark)_12%,transparent),transparent_55%)]"
      />
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <Brand href="/dashboard" />
            <Link
              href={exitHref}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Terminer plus tard
            </Link>
          </div>
          <OnboardingStepper current={index} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-6 lg:py-10">
        <div key={step.id} className="flex min-w-0 flex-col gap-6">
          <div className="flex rise-in flex-col gap-2">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              Étape {index + 1} sur {ONBOARDING_STEPS.length}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
              {step.title}
            </h1>
            <p className="max-w-2xl text-muted-foreground text-pretty">
              {step.lede}
            </p>
          </div>
          <div className="@container/editor flex rise-in flex-col gap-4 [--stagger:1]">
            {children}
          </div>
        </div>

        <aside
          key={`aside-${step.id}`}
          className="flex rise-in flex-col gap-3 [--stagger:2] lg:sticky lg:top-36 lg:self-start"
        >
          <HelpNote icon={ShieldCheckIcon} title="Pourquoi on vous le demande">
            {step.why}
          </HelpNote>
          <HelpNote icon={LightbulbIcon} title="Astuce">
            {step.tip}
          </HelpNote>
        </aside>
      </main>

      <footer className="sticky bottom-0 z-20 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          {footer}
        </div>
      </footer>
    </div>
  )
}

function HelpNote({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  icon: typeof LightbulbIcon
  title: string
}) {
  return (
    <div className="rounded-xl border bg-card/70 p-4 shadow-surface">
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" />
        {title}
      </p>
      <p className="text-sm text-muted-foreground text-pretty">{children}</p>
    </div>
  )
}
