"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast group/toast shadow-overlay! border-l-4! data-[type=success]:border-l-success! data-[type=error]:border-l-destructive! data-[type=warning]:border-l-warning! data-[type=info]:border-l-info! motion-safe:data-[type=success]:[&.spark]:animate-spark-flash",
          icon: "group-data-[type=success]/toast:text-success group-data-[type=error]/toast:text-destructive group-data-[type=warning]/toast:text-warning group-data-[type=info]/toast:text-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
