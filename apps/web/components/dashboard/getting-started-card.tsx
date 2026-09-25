"use client"

import { useTransition } from "react"
import Link from "next/link"
import { ArrowRightIcon, CircleCheckIcon, CircleIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { dismissGettingStarted } from "@/app/bienvenue/actions"
import type { GettingStartedItem } from "@/components/dashboard/getting-started"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * "Bien démarrer" (US-152): what makes the dashboard useful, ticked from the
 * account's own data. It offers the onboarding back until it was finished,
 * and goes away for good once hidden — or once every item is done.
 */
export function GettingStartedCard({
  items,
  onboardingDone,
}: {
  items: GettingStartedItem[]
  onboardingDone: boolean
}) {
  const [pending, startTransition] = useTransition()
  const done = items.filter((item) => item.done).length
  const progress = Math.round((done / items.length) * 100)

  const hide = () =>
    startTransition(async () => {
      const result = await dismissGettingStarted()
      if (!result.ok) toast.error(result.message)
    })

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Bien démarrer</CardTitle>
        <CardDescription>
          {done} sur {items.length} étapes · chacune rend CVSpark plus utile
          pour votre recherche.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {onboardingDone ? null : (
            <Button asChild size="sm">
              <Link href="/bienvenue">
                Reprendre la prise en main
                <ArrowRightIcon />
              </Link>
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={pending}
            aria-label="Masquer « Bien démarrer »"
            onClick={hide}
          >
            <XIcon />
          </Button>
        </CardAction>
        <div
          role="progressbar"
          aria-label="Progression de la prise en main"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="col-span-full mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-spark"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "group flex h-full gap-3 rounded-lg border p-3 transition-colors hover:bg-muted",
                  item.done && "bg-muted/40"
                )}
              >
                {item.done ? (
                  <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      item.done && "text-muted-foreground line-through"
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
