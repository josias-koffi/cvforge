import { CopyButton } from "@/components/account/agents/copy-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * The server address. Pasted in claude.ai, ChatGPT or any MCP client, it
 * starts the OAuth sign-in (ADR-033); set up by hand, it goes with an
 * `Authorization: Bearer` header carrying a token.
 */
export function McpEndpointCard({ mcpUrl }: { mcpUrl: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adresse du serveur MCP</CardTitle>
        <CardDescription>
          Dans Claude (claude.ai, l&apos;app ou mobile : Connecteurs › Ajouter
          un connecteur personnalisé), ChatGPT ou tout agent compatible MCP,
          collez cette adresse : l&apos;agent vous enverra sur JobSpark pour
          autoriser l&apos;accès. Pour un agent configuré à la main, ajoutez
          plutôt l&apos;en-tête{" "}
          <code className="text-xs">Authorization: Bearer &lt;jeton&gt;</code>{" "}
          avec un jeton créé via « Connecter un agent ».
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all">
          {mcpUrl}
        </code>
        <CopyButton value={mcpUrl}>Copier l&apos;adresse</CopyButton>
      </CardContent>
    </Card>
  )
}
