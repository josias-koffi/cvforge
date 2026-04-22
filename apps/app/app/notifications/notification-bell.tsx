"use client";

import React from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

type NotificationSummaryPayload = {
  summary: {
    unreadCount: number;
  };
};

const bellButtonStyle: CSSProperties = {
  alignItems: "center",
  backgroundColor: "#F2F0EB",
  border: "1px solid #D9D3C7",
  borderRadius: "999px",
  color: "#1A1A18",
  display: "inline-flex",
  gap: "0.65rem",
  minHeight: "2.75rem",
  padding: "0.5rem 0.9rem",
  textDecoration: "none",
};

const badgeStyle: CSSProperties = {
  alignItems: "center",
  backgroundColor: "#2C2C2A",
  borderRadius: "999px",
  color: "#FAFAF7",
  display: "inline-flex",
  fontFamily: "var(--paper-font-mono)",
  fontSize: "0.75rem",
  justifyContent: "center",
  lineHeight: 1,
  minHeight: "1.45rem",
  minWidth: "1.45rem",
  padding: "0 0.35rem",
};

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    fetch("/notifications/summary", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as NotificationSummaryPayload;
      })
      .then((payload) => {
        if (!isActive || !payload) {
          return;
        }

        setUnreadCount(payload.summary.unreadCount);
      })
      .catch(() => {
        if (isActive) {
          setUnreadCount(0);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <a
      aria-label={`Ouvrir le centre de notifications (${unreadCount} non lues)`}
      href="/notifications"
      style={bellButtonStyle}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
        width="18"
      >
        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.42V11a6 6 0 1 0-12 0v3.18c0 .53-.21 1.04-.59 1.42L4 17h5" />
        <path d="M10 17a2 2 0 0 0 4 0" />
      </svg>
      <span style={{ fontWeight: 600 }}>Notifications</span>
      <span aria-label={`${unreadCount} non lues`} style={badgeStyle}>
        {unreadCount}
      </span>
    </a>
  );
}
