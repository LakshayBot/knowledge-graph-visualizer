"use client";

import Link from "next/link";
import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";

function RegisterContent() {
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
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-1)",
            marginBottom: 6,
          }}
        >
          Create account
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-3)",
            marginBottom: 32,
            letterSpacing: "-0.01em",
          }}
        >
          Join CasualExplorer to explore casual graphs
        </p>

        <RegisterForm />

        <p
          style={{
            fontSize: 13,
            color: "var(--text-4)",
            marginTop: 24,
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--text-1)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
