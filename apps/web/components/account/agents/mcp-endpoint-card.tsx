import { CopyButton } from "@/components/account/agents/copy-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * The server address, for agents set up by hand (Claude Desktop, Cursor…):
 * the URL plus an `Authorization: Bearer` header carrying a token.
 */
export function McpEndpointCard({ mcpUrl }: { mcpUrl: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adresse du serveur MCP</CardTitle>
        <CardDescription>
          Pour un agent configuré à la main : indiquez cette adresse (transport
          HTTP) et ajoutez l&apos;en-tête{" "}
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
