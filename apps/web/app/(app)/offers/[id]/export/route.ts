import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

const documents = new Set(["cv", "letter"])
const formats = new Set(["pdf", "docx"])

/** Streams a PDF/DOCX export from the API with the user's session cookie. */
export async function GET(request: NextRequest, context: RouteContext<"/offers/[id]/export">) {
  const { id } = await context.params
  const documentKind = request.nextUrl.searchParams.get("document") ?? ""
  const format = request.nextUrl.searchParams.get("format") ?? ""

  if (!documents.has(documentKind) || !formats.has(format)) {
    return NextResponse.json({ message: "Export invalide." }, { status: 400 })
  }

  const response = await apiRequest(
    `/applications/${encodeURIComponent(id)}/${documentKind}/${format}`
  )

  if (!response.ok || !response.body) {
    return NextResponse.redirect(
      new URL(`/offers/${id}/${documentKind}?notice=export-failed`, request.url)
    )
  }

  return new NextResponse(response.body, {
    headers: {
      "content-disposition":
        response.headers.get("content-disposition") ??
        `attachment; filename="${documentKind}.${format}"`,
      "content-type":
        response.headers.get("content-type") ?? "application/octet-stream",
    },
  })
}
