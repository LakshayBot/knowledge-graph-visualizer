"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

function LoginContent() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";
  const isRegistered = searchParams.get("registered") === "1";

  return (
    <div
      style={{
        minHeight: "calc(100svh - 90px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "40px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: 456,
        }}
      >
        {isExpired && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: 24,
              background: "rgba(243, 156, 18, 0.08)",
              border: "1px solid rgba(243, 156, 18, 0.25)",
              fontSize: 12,
              fontWeight: 600,
              color: "#b8860b",
              textAlign: "center",
              width: "100%",
              letterSpacing: "0.02em",
            }}
          >
            Session expired. Please sign in again.
          </div>
        )}
        {isRegistered && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: 24,
              background: "rgba(46, 204, 113, 0.08)",
              border: "1px solid rgba(46, 204, 113, 0.25)",
              fontSize: 12,
              fontWeight: 600,
              color: "#27ae60",
              textAlign: "center",
              width: "100%",
              letterSpacing: "0.02em",
            }}
          >
            Account created. Sign in to continue.
          </div>
        )}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-1)",
            marginBottom: 6,
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-3)",
            marginBottom: 32,
            letterSpacing: "-0.01em",
          }}
        >
          Sign in to your CausalExplorer account
        </p>

        <LoginForm />

        <p
          style={{
            fontSize: 13,
            color: "var(--text-4)",
            marginTop: 24,
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "var(--text-1)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
