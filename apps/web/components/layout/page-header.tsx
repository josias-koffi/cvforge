export function PageHeader({
  actions,
  description,
  title,
}: {
  actions?: React.ReactNode
  description?: React.ReactNode
  title: React.ReactNode
}) {
  return (
    <div className="flex rise-in flex-col gap-3 px-4 md:flex-row md:items-end md:justify-between lg:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
