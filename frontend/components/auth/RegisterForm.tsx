"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";

export default function RegisterForm() {
  const { register_, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !username || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const result = await register_(email, username, password, confirm);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Input
        label="Username"
        type="text"
        placeholder="Your display name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      <Input
        label="Password"
        type="password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <Input
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      {error && (
        <div
          style={{
            background: "rgba(231, 76, 60, 0.08)",
            border: "1px solid rgba(231, 76, 60, 0.2)",
            padding: "10px 14px",
            fontSize: 12,
            color: "#e74c3c",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}
        >
          {error}
        </div>
      )}
      <Button type="submit" loading={loading} style={{ width: "100%", marginTop: 4 }}>
        Create Account
      </Button>
    </form>
  );
}
