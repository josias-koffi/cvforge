/**
 * The MCP endpoint as an agent reaches it from outside — never the internal
 * API address the server uses. Read at request time, like the other URLs.
 */
export function publicMcpUrl() {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
  ).replace(/\/$/, "")

  return `${base}/mcp`
}
