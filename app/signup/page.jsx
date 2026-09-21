"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create the matching profile row (name, role) alongside the auth account
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        role,
      });
    }

    setLoading(false);
    router.push("/");
  };

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-display text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Create your account
      </h1>
      <p className="text-sm text-[var(--muted)] mt-1">Buy, bid, or list a vehicle</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="buyer">Buyer</option>
          <option value="dealer">Dealer / Seller</option>
        </select>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--ink)] text-white rounded-lg py-2.5 text-sm font-semibold mt-2 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-[var(--muted)] mt-5 text-center">
        Already have an account? <Link href="/login" className="text-[var(--accent)] font-semibold">Log in</Link>
      </p>
    </main>
  );
}
