import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden rounded-md bg-muted after:absolute after:inset-0 after:spark-shimmer motion-reduce:animate-pulse", className)}
      {...props}
    />
  )
}

export { Skeleton }
