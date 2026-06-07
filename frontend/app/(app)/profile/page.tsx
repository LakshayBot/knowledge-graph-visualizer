"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import ProfileForm from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user } = useAuth();

  return (
    <div
      style={{
        padding: "48px 24px 80px",
        background: "var(--bg)",
        minHeight: "calc(100svh - 90px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-1)",
            marginBottom: 6,
          }}
        >
          Profile
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-3)",
            marginBottom: 36,
          }}
        >
          Manage your account details
        </p>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "32px 28px",
            marginBottom: 28,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <span className="eyebrow" style={{ marginBottom: 10 }}>Account Info</span>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 4 }}>
            Role: <strong style={{ color: "var(--text-1)", fontWeight: 800 }}>{user?.role ?? "User"}</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-4)" }}>
            User ID: {user?.userId ?? "—"}
          </div>
        </div>

        <ProfileForm />
      </div>
    </div>
  );
}
