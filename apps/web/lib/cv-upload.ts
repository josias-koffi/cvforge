import { formatFileSize } from "@/lib/format"

export const CV_MAX_BYTES = 5 * 1024 * 1024

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"]

/** `accept` for the file input: extensions first, so Finder/Explorer filter properly. */
export const CV_ACCEPT = [
  ...ACCEPTED_EXTENSIONS,
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",")

/**
 * Why a file cannot be analysed, or null when it can. Checked in the browser so a
 * doomed import never reaches the API and never debits credits.
 */
export function cvRejectionReason(file: File) {
  const name = file.name.toLowerCase()

  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return `${file.name} n'est ni un PDF ni un DOCX.`
  }

  if (file.size > CV_MAX_BYTES) {
    return `${file.name} pèse ${formatFileSize(file.size)} : la limite est de 5 Mo.`
  }

  return null
}
