"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import TurnstileWidget, { TURNSTILE_ENABLED, type TurnstileHandle } from "./TurnstileWidget";

export default function LoginForm() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    const result = await login(email, password, turnstileToken);
    turnstileRef.current?.reset();
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/dashboard");
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
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
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
      <TurnstileWidget ref={turnstileRef} action="login" onToken={setTurnstileToken} />
      <Button
        type="submit"
        loading={loading}
        disabled={TURNSTILE_ENABLED && !turnstileToken}
        style={{ width: "100%", marginTop: 4 }}
      >
        Sign In
      </Button>
    </form>
  );
}
