"use client";

import { useState, type FormEvent } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";

interface ProfileData {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function ProfileForm() {
  const { user } = useAuth();
  const { fetchApi, loading } = useApi<ProfileData>();

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !email) {
      setError("Username and email are required.");
      return;
    }

    const body: Record<string, string> = { username, email };
    if (newPassword) {
      if (!currentPassword) {
        setError("Current password is required to set a new password.");
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    const result = await fetchApi("/users/me", {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Profile updated.");
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: 420,
      }}
    >
      <Input
        label="Username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div
        style={{
          marginTop: 8,
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
          Change Password (optional)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Min 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", padding: "10px 14px", fontSize: 12, color: "#e74c3c", fontWeight: 600, letterSpacing: "0.03em" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)", padding: "10px 14px", fontSize: 12, color: "#27ae60", fontWeight: 600, letterSpacing: "0.03em" }}>
          {success}
        </div>
      )}

      <Button type="submit" loading={loading}>
        Save Changes
      </Button>
    </form>
  );
}
