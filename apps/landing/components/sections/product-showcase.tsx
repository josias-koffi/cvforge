import { Reveal } from "@/components/reveal"
import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { LandingDictionary, ScreenshotName } from "@/content/types"

const SCREEN_PATHS: Record<ScreenshotName, string> = {
  dashboard: "/dashboard",
  candidatures: "/candidatures",
  "cv-editor": "/candidatures/cv",
  "letter-editor": "/candidatures/letter",
  translate: "/candidatures/cv",
}

export function ProductShowcase({
  showcase,
}: {
  showcase: LandingDictionary["showcase"]
}) {
  const [firstTab] = showcase.tabs

  return (
    <Section id="product">
      <SectionHeading
        eyebrow={showcase.eyebrow}
        title={showcase.title}
        subtitle={showcase.subtitle}
      />
      <Reveal>
        <Tabs defaultValue={firstTab.id} className="items-center gap-6">
          <TabsList className="h-auto max-w-full flex-wrap justify-center">
            {showcase.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-1.5">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {showcase.tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="w-full">
              <p className="mb-6 text-center text-muted-foreground">
                {tab.caption}
              </p>
              <BrowserFrame path={SCREEN_PATHS[tab.id]}>
                <Screenshot name={tab.id} alt={tab.alt} />
              </BrowserFrame>
            </TabsContent>
          ))}
        </Tabs>
      </Reveal>
    </Section>
  )
}
