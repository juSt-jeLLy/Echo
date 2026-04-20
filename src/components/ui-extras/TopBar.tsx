import { Volume2, VolumeX, Search } from "lucide-react";
import { useState } from "react";
import { cities, City } from "@/data/cities";

type Props = {
  ambient: boolean;
  onToggleAmbient: () => void;
  onSearchSelect: (city: City) => void;
};

export function TopBar({ ambient, onToggleAmbient, onSearchSelect }: Props) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const matches =
    q.trim().length > 0
      ? cities
          .filter((c) =>
            (c.name + " " + c.country).toLowerCase().includes(q.trim().toLowerCase())
          )
          .slice(0, 6)
      : [];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-5 sm:px-8 pt-5 sm:pt-7">
      {/* Brand */}
      <div className="pointer-events-auto animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary glow-primary" />
          <div className="leading-tight">
            <h1 className="font-display text-lg sm:text-xl font-semibold tracking-tight">
              City <span className="text-aurora">Whispers</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground -mt-0.5">
              Close your eyes. You're somewhere else.
            </p>
          </div>
        </div>
      </div>

      {/* Search + ambient */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 animate-fade-in">
        <div className="relative">
          <div className="flex items-center panel-glass rounded-full pl-3 pr-2 h-10 w-44 sm:w-64 transition-all focus-within:w-56 sm:focus-within:w-80">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search a city…"
              className="bg-transparent outline-none text-sm px-2 flex-1 placeholder:text-muted-foreground/70"
            />
          </div>

          {focused && matches.length > 0 && (
            <ul className="absolute right-0 mt-2 w-64 sm:w-80 panel-glass rounded-2xl overflow-hidden animate-fade-in">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    onMouseDown={() => {
                      onSearchSelect(c);
                      setQ("");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={onToggleAmbient}
          aria-label={ambient ? "Mute ambient" : "Enable ambient"}
          className="panel-glass rounded-full h-10 w-10 flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
        >
          {ambient ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
    </header>
  );
}
