import { Reveal } from "@/components/reveal"
import { Section, SectionHeading } from "@/components/section"
import { SparkFlow } from "@/components/spark-flow"
import type { LandingDictionary } from "@/content/types"

export function HowItWorks({
  howItWorks,
}: {
  howItWorks: LandingDictionary["howItWorks"]
}) {
  return (
    <Section id="how-it-works" className="border-y bg-card">
      <SectionHeading
        eyebrow={howItWorks.eyebrow}
        title={howItWorks.title}
        subtitle={howItWorks.subtitle}
      />
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <ol className="flex flex-col gap-4">
          {howItWorks.steps.map((step, index) => (
            <li key={step.title}>
              <Reveal
                delay={index * 0.08}
                className="flex gap-4 rounded-xl border bg-background p-5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-medium">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal delay={0.15}>
          <SparkFlow labels={howItWorks.diagram} />
        </Reveal>
      </div>
    </Section>
  )
}
