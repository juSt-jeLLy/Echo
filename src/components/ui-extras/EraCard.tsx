import { City } from "@/data/cities";
import { Era, ERAS } from "@/data/eras";
import { Clock, X, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  city: City | null;
  onSelectEra: (era: Era) => void;
  onClose: () => void;
};

export function EraCard({ city, onSelectEra, onClose }: Props) {
  const [customYear, setCustomYear] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!city) setCustomYear("");
  }, [city]);

  if (!city) return null;

  const tryCustom = () => {
    const y = parseInt(customYear, 10);
    if (Number.isFinite(y) && y >= 1 && y <= new Date().getFullYear() + 100) {
      onSelectEra({
        id: `custom-${y}`,
        year: y,
        label: String(y),
        tagline: "A whisper from a year of your choosing",
        custom: true,
      });
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div
        key={city.id + "-era"}
        className="pointer-events-auto w-full max-w-3xl panel-glass rounded-3xl px-8 sm:px-10 py-8 animate-rise"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary/80 mb-2">
              <Clock size={12} />
              Choose an era
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-aurora truncate">
              {city.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              When would you like to listen to {city.name}?
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Back to globe"
            className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Era grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {ERAS.map((era, i) => (
            <button
              key={era.id}
              onClick={() => onSelectEra(era)}
              style={{ animationDelay: `${i * 40}ms` }}
              className="group relative text-left rounded-2xl border border-border/60 bg-card/40 hover:bg-card/70 hover:border-primary/50 p-3.5 transition-all hover:-translate-y-0.5 animate-fade-in overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "var(--gradient-aurora)", mixBlendMode: "overlay" }}
              />
              <div className="relative">
                <div className="font-display text-xl font-semibold tracking-tight">
                  {era.label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {era.tagline}
                </div>
              </div>
              <ArrowRight
                size={14}
                className="relative mt-2 text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            </button>
          ))}
        </div>

        {/* Custom year */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-2 pl-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground shrink-0">
            Custom year
          </span>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={1}
            max={new Date().getFullYear() + 100}
            value={customYear}
            onChange={(e) => setCustomYear(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryCustom()}
            placeholder="e.g. 1789"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm tabular-nums px-2 placeholder:text-muted-foreground/60"
          />
          <button
            onClick={tryCustom}
            disabled={!customYear}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-semibold px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-transform"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            Listen <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
