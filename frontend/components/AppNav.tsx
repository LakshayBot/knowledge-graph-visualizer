"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Inline SVG icons ──────────────────────────────── */
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Explore",   href: "/explore" },
  { label: "History",   href: "/history" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
    }
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?";

  const navLinkStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    padding: "8px 16px",
    borderRadius: 6,
    transition: "background 0.15s, color 0.15s",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    fontFamily: "inherit",
    lineHeight: 1,
  };

  // ── SSR placeholder ──
  if (!mounted) {
    return (
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
            padding: "0 24px",
          }}
        >
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                background: "var(--text-1)",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-1)" }}>
              CasualExplorer
            </span>
          </div>
          <nav style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
            {NAV_ITEMS.map((item) => (
              <span key={item.href} style={{ ...navLinkStyle, color: "var(--text-3)" }}>
                {item.label}
              </span>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
        </div>
      </header>
    );
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          padding: "0 24px",
        }}
      >
        {/* ── Left: Logo ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "var(--text-1)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                background: "var(--text-1)",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="hidden sm:inline">CasualExplorer</span>
          </Link>
        </div>

        {/* ── Center: Desktop nav links ── */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...navLinkStyle,
                  color: active ? "var(--text-1)" : "var(--text-3)",
                  background: active ? "var(--bg-subtle)" : "transparent",
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-subtle)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Theme toggle + Avatar + Mobile menu ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "var(--text-3)",
              cursor: "pointer",
              borderRadius: 6,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-subtle)";
              e.currentTarget.style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-3)";
            }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: "var(--text-1)",
                    color: "var(--bg)",
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 8,
                minWidth: 240,
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.05), 0 16px 32px rgba(0,0,0,0.04)",
              }}
            >
              {isAuthenticated ? (
                <>
                  {/* User info header */}
                  <div style={{ padding: "10px 10px 6px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-1)",
                        lineHeight: 1.4,
                      }}
                    >
                      {user?.username}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        marginTop: 2,
                        fontSize: 12,
                        color: "var(--text-3)",
                        lineHeight: 1.4,
                      }}
                    >
                      {user?.email}
                    </p>
                  </div>

                  <DropdownMenuSeparator style={{ margin: "6px 0" }} />

                  {/* Navigation items */}
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 2,
                      transition: "background 0.12s ease",
                    }}
                  >
                    <span style={{ display: "inline-flex", color: "var(--text-2)", flexShrink: 0 }}>
                      <UserIcon />
                    </span>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 2,
                      transition: "background 0.12s ease",
                    }}
                  >
                    <span style={{ display: "inline-flex", color: "var(--text-2)", flexShrink: 0 }}>
                      <SettingsIcon />
                    </span>
                    Settings
                  </DropdownMenuItem>

                  <DropdownMenuSeparator style={{ margin: "6px 0" }} />

                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "background 0.12s ease",
                    }}
                  >
                    <span style={{ display: "inline-flex", color: "var(--text-3)", flexShrink: 0 }}>
                      <LogOutIcon />
                    </span>
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => router.push("/login")}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 2,
                      transition: "background 0.12s ease",
                    }}
                  >
                    <span style={{ display: "inline-flex", color: "var(--text-2)", flexShrink: 0 }}>
                      <LogOutIcon />
                    </span>
                    Sign in
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/register")}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "background 0.12s ease",
                    }}
                  >
                    <span style={{ display: "inline-flex", color: "var(--text-2)", flexShrink: 0 }}>
                      <UserIcon />
                    </span>
                    Create account
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
