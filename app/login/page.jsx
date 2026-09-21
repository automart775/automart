"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-display text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Welcome back
      </h1>
      <p className="text-sm text-[var(--muted)] mt-1">Log in to continue</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--ink)] text-white rounded-lg py-2.5 text-sm font-semibold mt-2 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-sm text-[var(--muted)] mt-5 text-center">
        New here? <Link href="/signup" className="text-[var(--accent)] font-semibold">Create an account</Link>
      </p>
    </main>
  );
}
