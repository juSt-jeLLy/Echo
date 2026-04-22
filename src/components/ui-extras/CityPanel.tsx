import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { AudioWaveform } from "./AudioWaveform";
import { ArrowLeft, Loader2, Pause, Play, X, Radio } from "lucide-react";
import { useAudioPostcard } from "@/hooks/useAudioPostcard";

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
  const { isLoading, isPlaying, error, scene, toggle, retry } = useAudioPostcard(city, era);

  if (!city || !era) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div
        key={city.id + "-" + era.id}
        className="pointer-events-auto w-full max-w-3xl panel-glass rounded-3xl px-8 sm:px-10 py-8 animate-rise"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary/80 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {era.label} · {city.country}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight text-aurora truncate">
              {city.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCoord(city.lat, "N", "S")}, {formatCoord(city.lng, "E", "W")}
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

        {/* Scene info — event name + atmosphere */}
        <div className="mt-5 min-h-[4.5rem]">
          {isLoading && !scene && (
            <p className="text-sm text-muted-foreground italic animate-pulse">
              Tuning into {city.name}, {era.year}…
            </p>
          )}

          {scene && (
            <div className="animate-fade-in">
              {/* Event badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <Radio size={11} className="text-primary/70 shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">
                  {scene.eventName}
                </span>
              </div>
              {/* Atmosphere */}
              <p className="text-sm text-muted-foreground font-display leading-snug">
                {scene.atmosphere}
              </p>
            </div>
          )}
        </div>

        <p className="mt-1 text-xs text-muted-foreground tracking-wide">
          {era.tagline}
        </p>

        {/* Playback controls */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={toggle}
            disabled={isLoading}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ boxShadow: "var(--shadow-glow)" }}
            aria-label={isLoading ? "Loading" : isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>
          <div className="flex-1">
            <AudioWaveform playing={isPlaying} />
          </div>
          <div className="hidden sm:block text-xs tabular-nums text-muted-foreground w-14 text-right">
            {isLoading ? "loading…" : isPlaying ? "live" : "paused"}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5">
            <p className="text-xs text-destructive/90">{error}</p>
            <button
              onClick={retry}
              className="text-xs text-primary hover:underline ml-3 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Footer */}
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
