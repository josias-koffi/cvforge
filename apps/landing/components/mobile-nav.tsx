"use client"

import { useState } from "react"
import Link from "next/link"
import { MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LOGIN_PATH } from "@/lib/links"

export interface NavLink {
  href: string
  label: string
}

export function MobileNav({
  links,
  menuLabel,
  loginLabel,
  startLabel,
}: {
  links: NavLink[]
  menuLabel: string
  loginLabel: string
  startLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={menuLabel}
        >
          <MenuIcon strokeWidth={1.75} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-6 p-6">
        <SheetTitle className="text-base">CVSpark</SheetTitle>
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-base text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <Button variant="outline" size="lg" asChild>
            <a href={LOGIN_PATH}>{loginLabel}</a>
          </Button>
          <Button size="lg" asChild>
            <a href={LOGIN_PATH}>{startLabel}</a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
