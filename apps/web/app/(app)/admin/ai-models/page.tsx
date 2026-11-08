import type { AiFeatureModelsOverview } from "@cvforge/types"
import type { Metadata } from "next"

import { AiModelsEditor } from "@/components/admin/ai-models-editor"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Modèles IA" }

export default async function AdminAiModelsPage() {
  await requireAdminSession()
  const overview = await api<AiFeatureModelsOverview>("/admin/ai-models")

  return (
    <>
      <PageHeader
        title="Modèles IA"
        description="Le modèle qui répond pour chaque fonctionnalité. En cas d'échec ou de crédit épuisé, l'appel repasse sur la chaîne OpenRouter par défaut."
      />
      <div className="px-4 lg:px-6">
        <AiModelsEditor overview={overview} />
      </div>
    </>
  )
}
