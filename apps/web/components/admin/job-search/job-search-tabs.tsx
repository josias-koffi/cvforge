"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * The offers administration, in tabs.
 *
 * Client-side because Radix tabs are, but the tables themselves are rendered
 * by the server page and handed over as children: the data is fetched once,
 * on the server, whichever tab is open.
 */
export function JobSearchTabs({
  boards,
  merges,
  runs,
  sources,
}: {
  boards: React.ReactNode
  merges: React.ReactNode
  runs: React.ReactNode
  sources: React.ReactNode
}) {
  return (
    <Tabs defaultValue="runs" className="gap-4">
      <TabsList>
        <TabsTrigger value="runs">Collectes</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
        <TabsTrigger value="boards">Entreprises</TabsTrigger>
        <TabsTrigger value="merges">Doublons</TabsTrigger>
      </TabsList>
      <TabsContent value="runs">{runs}</TabsContent>
      <TabsContent value="sources">{sources}</TabsContent>
      <TabsContent value="boards">{boards}</TabsContent>
      <TabsContent value="merges">{merges}</TabsContent>
    </Tabs>
  )
}
