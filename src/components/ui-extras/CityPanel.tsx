import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { AudioWaveform } from "./AudioWaveform";
import { ArrowLeft, Pause, Play, X } from "lucide-react";
import { useState } from "react";

type Props = {
  city: City | null;
  era: Era | null;
  onBack: () => void;
  onClose: () => void;
};

function formatCoord(value: number, posLabel: string, negLabel: string) {
  const abs = Math.abs(value).toFixed(4);
  return `${abs}° ${value >= 0 ? posLabel : negLabel}`;
}

export function CityPanel({ city, era, onBack, onClose }: Props) {
  const [playing, setPlaying] = useState(true);

  if (!city || !era) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-6 sm:pb-10">
      <div
        key={city.id + "-" + era.id}
        className="pointer-events-auto w-full max-w-2xl panel-glass rounded-3xl px-6 sm:px-8 py-6 animate-rise"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary/80 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Listening to · {era.label}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight text-aurora truncate">
              {city.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {city.country} · {formatCoord(city.lat, "N", "S")}, {formatCoord(city.lng, "E", "W")}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onBack}
              aria-label="Choose a different era"
              className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Choose a different era"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={onClose}
              aria-label="Back to globe"
              className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <p className="mt-5 text-base sm:text-lg text-foreground/85 italic font-display">
          “{city.whisper}”
        </p>
        <p className="mt-1 text-xs text-muted-foreground tracking-wide">
          {era.tagline}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            style={{ boxShadow: "var(--shadow-glow)" }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <div className="flex-1">
            <AudioWaveform playing={playing} />
          </div>
          <div className="hidden sm:block text-xs tabular-nums text-muted-foreground w-12 text-right">
            {playing ? "live" : "paused"}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Audio postcard · {city.name}, {era.label}</span>
          <button onClick={onClose} className="story-link text-foreground/80 hover:text-foreground">
            Explore another city →
          </button>
        </div>
      </div>
    </div>
  );
}
