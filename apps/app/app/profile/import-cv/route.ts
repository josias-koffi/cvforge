import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../auth-config";

function mapError(status: number) {
  switch (status) {
    case 400:
      return "Fichier invalide. Importez un PDF ou DOCX de moins de 5 Mo.";
    case 402:
      return "Credits insuffisants pour importer ce CV.";
    case 422:
      return "Le CV ne contient pas assez de texte exploitable.";
    default:
      return "L'import du CV a echoue. Reessayez dans un instant.";
  }
}

export async function POST(request: Request) {
  const incoming = await request.formData();
  const file = incoming.get("cvFile");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Un fichier CV est requis." },
      { status: 400 },
    );
  }

  const body = new FormData();
  body.set("cvFile", file, file.name);

  const response = await fetch(`${getServerApiUrl()}/applications/cv-import/extract`, {
    body,
    headers: request.headers.get("cookie")
      ? { cookie: request.headers.get("cookie") ?? "" }
      : undefined,
    method: "POST",
  });

  if (!response.ok) {
    return NextResponse.json({ message: mapError(response.status) }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
