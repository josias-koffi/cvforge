import { Section, SectionHeading } from "@/components/section"
import { Marquee } from "@/components/ui/marquee"
import type { LandingDictionary } from "@/content/types"

type Testimonial = LandingDictionary["testimonials"]["items"][number]

/** Rendered only when NEXT_PUBLIC_SHOW_TESTIMONIALS is enabled (see lib/links). */
export function Testimonials({
  testimonials,
}: {
  testimonials: LandingDictionary["testimonials"]
}) {
  return (
    <Section id="testimonials" className="overflow-hidden">
      <SectionHeading
        eyebrow={testimonials.eyebrow}
        title={testimonials.title}
      />
      <div className="relative">
        <Marquee pauseOnHover className="[--duration:45s]">
          {testimonials.items.map((item) => (
            <TestimonialCard key={item.name} item={item} />
          ))}
        </Marquee>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r from-background"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l from-background"
        />
      </div>
    </Section>
  )
}

function TestimonialCard({ item }: { item: Testimonial }) {
  const initials = item.name
    .split(" ")
    .map((part) => part[0])
    .join("")

  return (
    <figure className="flex w-80 flex-col gap-4 rounded-2xl border bg-card p-6 shadow-surface">
      <blockquote className="text-pretty">“{item.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-primary">
          {initials}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.role}</span>
        </span>
      </figcaption>
    </figure>
  )
}
