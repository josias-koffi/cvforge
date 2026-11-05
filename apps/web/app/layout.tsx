import type { Metadata } from "next"
import { headers } from "next/headers"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Jobspark",
    template: "%s · Jobspark",
  },
  description:
    "Un profil. Une offre. Une étincelle. Jobspark adapte votre CV et votre lettre à chaque offre, prêts pour l'ATS en quelques secondes.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // next-themes writes an inline script to avoid a flash of the wrong theme;
  // the CSP only lets it run with the request's nonce (set by proxy.ts).
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider nonce={nonce}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
