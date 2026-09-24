import { cn } from "cn"

/**
 * What scrolls on a "Ma recherche" tab. On a large screen only the cards do,
 * under the page header and the tabs; on a small one the whole page scrolls,
 * a fixed header would leave too little room.
 */
export function SearchTabBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "px-4 *:shrink-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:pb-1",
        className
      )}
    >
      {children}
    </div>
  )
}
