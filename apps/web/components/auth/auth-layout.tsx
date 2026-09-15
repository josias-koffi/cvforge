import { Brand } from "@/components/brand"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6 md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_30%_40%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%),radial-gradient(ellipse_at_75%_30%,color-mix(in_oklch,var(--spark)_16%,transparent),transparent_55%)]"
      />
      <div className="flex w-full max-w-sm rise-in flex-col gap-6 [&_[data-slot=card]]:shadow-raised">
        <div className="self-center">
          <Brand href="/login" />
        </div>
        {children}
        <p className="text-center text-sm text-muted-foreground">
          Un profil. Une offre. Une étincelle.
        </p>
      </div>
    </div>
  )
}
