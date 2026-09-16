import { Section, SectionHeading } from "@/components/section"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { LandingDictionary } from "@/content/types"

export function Faq({ faq }: { faq: LandingDictionary["faq"] }) {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <SectionHeading eyebrow={faq.eyebrow} title={faq.title} align="left" />
        <Accordion type="single" collapsible className="w-full">
          {faq.items.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`}>
              <AccordionTrigger className="text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  )
}
