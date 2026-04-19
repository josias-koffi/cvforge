# ADR-001: Adopt shadcn/ui runtime helpers in the shared UI package
Date: 2026-04-19
Status: accepted

## Context
`US-007` requires the repository to install `shadcn/ui` foundations and expose reusable base components from `packages/ui`. The monorepo already has a centralized "Papier & Crayon" token layer, but it did not yet have the helper dependencies typically used by shadcn/ui primitives for slotting, variant composition, and class merging.

## Decision
Add `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, and `tailwind-merge` to `@cvforge/ui` and use them as the base runtime helpers for shared component primitives.

## Consequences
- The shared UI package can now expose shadcn-style primitives with consistent APIs (`variant`, `size`, `asChild`) while keeping the current tokenized visual language.
- Future stories can add more primitives without reintroducing local component conventions per app.
- The repository accepts a small runtime dependency increase in exchange for a more standard and maintainable component layer.

## Alternatives considered
- Keep custom one-off React components with no shared helper layer.
- Delay the component work until a full Tailwind/shadcn CLI setup exists in every app.
