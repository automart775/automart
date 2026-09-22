"use client";
import { useEffect, useState } from "react";

function useClock() {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function splitRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
}

function OdometerBlock({ value, label }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="flex rounded-md overflow-hidden" style={{ background: "var(--ink-dark)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)" }}>
        {str.split("").map((d, i) => (
          <span key={i} className="w-5 text-center text-sm py-1 font-mono" style={{ color: "var(--accent)", letterSpacing: "0.02em" }}>
            {d}
          </span>
        ))}
      </div>
      <span className="text-[9px] mt-1 tracking-wide uppercase" style={{ color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

export default function Countdown({ end }) {
  const t = useClock();
  const [h, m, s] = splitRemaining(new Date(end).getTime() - t);
  return (
    <div className="flex items-center gap-1.5">
      <OdometerBlock value={h} label="hrs" />
      <span className="pb-3 font-mono" style={{ color: "var(--accent)" }}>:</span>
      <OdometerBlock value={m} label="min" />
      <span className="pb-3 font-mono" style={{ color: "var(--accent)" }}>:</span>
      <OdometerBlock value={s} label="sec" />
    </div>
  );
}
