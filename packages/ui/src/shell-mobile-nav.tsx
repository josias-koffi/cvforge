"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ShellNavItem } from "./shell";

type MobileDrawerNavProps = {
  items: ShellNavItem[];
};

export function MobileDrawerNav({ items }: MobileDrawerNavProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) return;
    // Return focus to hamburger on close
    hamburgerRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Ouvrir le menu"
        className="cvforge-shell__hamburger"
        onClick={() => setOpen(true)}
        ref={hamburgerRef}
        type="button"
      >
        <span aria-hidden="true" className="cvforge-shell__hamburger-bar" />
        <span aria-hidden="true" className="cvforge-shell__hamburger-bar" />
        <span aria-hidden="true" className="cvforge-shell__hamburger-bar" />
      </button>

      {open ? (
        <>
          <div
            aria-hidden="true"
            className="cvforge-shell__drawer-overlay"
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label="Menu principal"
            aria-modal="true"
            className="cvforge-shell__drawer"
            role="dialog"
          >
            <div className="cvforge-shell__drawer-header">
              <span className="cvforge-shell__drawer-title">Menu</span>
              <button
                aria-label="Fermer le menu"
                className="cvforge-shell__drawer-close"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                ✕
              </button>
            </div>
            <ul className="cvforge-shell__drawer-nav-list">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    aria-current={item.isActive ? "page" : undefined}
                    className="cvforge-shell__drawer-nav-link"
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <span className="cvforge-shell__nav-label">{item.label}</span>
                    <span className="cvforge-shell__nav-description">
                      {item.description}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </>
  );
}
