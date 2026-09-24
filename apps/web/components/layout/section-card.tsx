import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * A card an outline can scroll to: one section of a long form, laid out the
 * same way on every page that has one ("Ma recherche", "Mes profils").
 */
export function SectionCard({
  action,
  children,
  description,
  id,
  title,
}: {
  action?: React.ReactNode
  children: React.ReactNode
  description: string
  id: string
  title: string
}) {
  return (
    <Card id={id} className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">{children}</CardContent>
    </Card>
  )
}

/** A field's explanation, under it. */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
