import { useEffect, useState } from "react";

export function AudioWaveform({ playing = true, bars = 28 }: { playing?: boolean; bars?: number }) {
  const [seed, setSeed] = useState(() => Math.random());
  useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => setSeed(Math.random()), 220);
    return () => clearInterval(i);
  }, [playing]);

  return (
    <div className="flex items-end gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.25 + ((Math.sin((i + seed * 10) * 0.7) + 1) / 2) * 0.75;
        const h = playing ? base * 100 : 18;
        return (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${h}%`,
              background: `linear-gradient(180deg, hsl(var(--primary-glow)), hsl(var(--secondary)))`,
              opacity: playing ? 0.85 : 0.35,
              transition: "height 220ms cubic-bezier(0.16,1,0.3,1)",
              boxShadow: playing ? "0 0 8px hsl(var(--primary) / 0.5)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}
