"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          AutoMarket
        </Link>
        <div className="flex items-center gap-5 text-sm font-medium">
          <Link href="/" className="text-gray-600 hover:text-black">Browse</Link>
          <Link href="/sell" className="text-gray-600 hover:text-black">Sell a vehicle</Link>
          {!loaded ? null : user ? (
            <>
              <span className="text-gray-400 text-xs hidden sm:inline">{user.email}</span>
              <button onClick={logout} className="text-gray-600 hover:text-black">Log out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-black">Log in</Link>
              <Link href="/signup" className="bg-[var(--ink)] text-white px-3 py-1.5 rounded-lg">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
