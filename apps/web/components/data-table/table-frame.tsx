import { Table } from "@/components/ui/table"

/** Elevated card frame shared by every data table in the app. */
export function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-surface [&_thead]:bg-muted/60 [&_th]:text-muted-foreground">
      <Table>{children}</Table>
    </div>
  )
}
