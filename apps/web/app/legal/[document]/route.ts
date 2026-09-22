import { NextResponse } from "next/server"

import { LEGAL_LINKS, landingUrl } from "@/lib/config"

/**
 * Sends the reader to the document on the public site. A redirect rather than
 * a `NEXT_PUBLIC_` link, so one image serves any deployment: the origin is
 * read per request, exactly like the landing's own `/login` handler.
 */
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ document: string }> }
) {
  const { document } = await params

  if (!(document in LEGAL_LINKS)) {
    return NextResponse.json({ message: "Document inconnu." }, { status: 404 })
  }

  return NextResponse.redirect(
    landingUrl(LEGAL_LINKS[document as keyof typeof LEGAL_LINKS]),
    307
  )
}
