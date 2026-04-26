# Stage 2 — Design

**Agent**: designer  
**Task**: US-060 — Navigation shell desktop-first

## Layout specification

### Desktop (≥1024px)
```
┌──────────────────────────────────────────────┐
│ TopBar: [Logo/eyebrow] [Breadcrumb] [Bell][Avatar] │
├────────────┬─────────────────────────────────┤
│ Sidebar    │  Main content                   │
│ 240px fixed│  (flex-grow)                   │
│ sticky top │                                 │
│            │                                 │
│ Nav items  │                                 │
│ (vertical) │                                 │
└────────────┴─────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────────────────────────────┐
│ TopBar: [☰ Hamburger] [Breadcrumb] [Bell][Avatar] │
├──────────────────────────────────────────────┤
│  Main content (full width)                   │
└──────────────────────────────────────────────┘
Drawer: slides in from left on hamburger click
  - Overlay with backdrop
  - Nav items vertical list
  - Close button (×)
  - aria-modal="true", focus trap
```

## Component architecture

### `ShellTopBar` (server, in shell.tsx)
Props: `eyebrow`, `breadcrumb?`, `userEmail?`, `headerAccessory?`
- Left: eyebrow badge (brand)
- Center: breadcrumb `<nav aria-label="Breadcrumb">` with current page name
- Right: headerAccessory (NotificationBell) + avatar circle with email initial

### `MobileDrawerNav` (client, new file shell-mobile-nav.tsx)
Props: `items: ShellNavItem[]`
State: `open: boolean`
- Hamburger `<button aria-expanded={open} aria-label="Menu">` 
- When open: overlay `<div>` + drawer `<nav aria-modal aria-label="Menu principal">`
- Drawer has `close` button, nav links
- `useEffect` to add `Escape` keydown listener

### `AppShell` (server, updated)
New props: `userEmail?`, `userRole?`, `breadcrumb?`
- Renders `ShellTopBar` + `MobileDrawerNav` (mobile) + desktop sidebar + main content
- Passes filtered `navigation` (Admin hidden for non-admin roles)

## CSS changes
- `.cvforge-shell` → add `padding-top: 0` (TopBar owns top space)
- `.cvforge-shell__topbar` → new, `height: 56px`, sticky, backdrop-blur
- `.cvforge-shell__sidebar` → `width: 240px` at `≥1024px`
- `.cvforge-shell__drawer-*` → overlay + slide-in drawer CSS
- `.cvforge-shell__avatar` → circle 36px, accent bg, white initial text
- Mobile nav bottom bar → removed (replaced by drawer)

## Updated navigation items
Dashboard, Candidatures, Interview, Documents, Crédits, Profil, Notifications, Admin (role-gated)

## WCAG 2.1 AA compliance
- Focus ring already present (`focus-visible` 3px outline on `.cvforge-button`, adding same to nav links)
- Hamburger button has `aria-label` and `aria-expanded`
- Drawer has `aria-modal="true"` and `role="dialog"`
- Avatar has `aria-label={email}` 
- Breadcrumb uses `<nav aria-label="Breadcrumb">`
- Colour contrast: existing tokens already ≥4.5:1

## Pass
- Design fits analyzed scope
- No UX risks introduced
- All WCAG 2.1 AA requirements addressed
