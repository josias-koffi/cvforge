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
}: {
  boards: React.ReactNode
  merges: React.ReactNode
}) {
  return (
    <Tabs defaultValue="boards" className="gap-4">
      <TabsList>
        <TabsTrigger value="boards">Entreprises</TabsTrigger>
        <TabsTrigger value="merges">Doublons</TabsTrigger>
      </TabsList>
      <TabsContent value="boards">{boards}</TabsContent>
      <TabsContent value="merges">{merges}</TabsContent>
    </Tabs>
  )
}
