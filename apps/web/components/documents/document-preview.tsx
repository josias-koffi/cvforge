export function DocumentPreview({ html, title }: { html: string; title: string }) {
  return (
    <iframe
      sandbox=""
      srcDoc={html}
      title={title}
      className="block aspect-[210/297] w-full rounded-md border bg-white shadow-sm"
    />
  )
}
