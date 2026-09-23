"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  };

  const links = [
    { href: "/", label: "Browse" },
    { href: "/search", label: "Search" },
    { href: "/sell", label: "Sell a vehicle" },
  ];

  return (
    <nav className="bg-white sticky top-0 z-30" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="mx-auto px-4 py-3 flex items-center justify-between" style={{ maxWidth: 1024 }}>
        <Link href="/" className="font-bold text-sm flex-shrink-0" style={{ fontFamily: "var(--display)", color: "var(--ink)" }}>
          AutoMarket
        </Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-5 text-sm font-medium">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:opacity-70" style={{ color: "var(--muted)" }}>{l.label}</Link>
          ))}
          {loaded && (user ? (
            <>
              <span className="text-xs hidden md:inline" style={{ color: "var(--muted)" }}>{user.email}</span>
              <button onClick={logout} className="text-sm font-medium hover:opacity-70" style={{ color: "var(--muted)" }}>Log out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:opacity-70" style={{ color: "var(--muted)" }}>Log in</Link>
              <Link href="/signup" className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: "var(--ink)" }}>Sign up</Link>
            </>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden p-2 rounded-lg" style={{ color: "var(--ink)" }} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {open && (
        <div className="sm:hidden px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)", background: "white" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium py-2" style={{ color: "var(--ink)" }}>{l.label}</Link>
          ))}
          {loaded && (user ? (
            <button onClick={logout} className="text-sm font-medium text-left py-2" style={{ color: "var(--danger)" }}>Log out</button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium py-2" style={{ color: "var(--ink)" }}>Log in</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="text-sm font-semibold py-2.5 rounded-lg text-center text-white" style={{ background: "var(--ink)" }}>Sign up</Link>
            </>
          ))}
        </div>
      )}
    </nav>
  );
}
