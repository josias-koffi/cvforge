import type { ApplicationStatus } from "@cvforge/types"

import { Badge } from "@/components/ui/badge"
import { statusLabels, statusVariants } from "@/lib/format"

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
}
