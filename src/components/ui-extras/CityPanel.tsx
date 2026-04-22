import { useState } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { NarratorVoice, DEFAULT_NARRATOR_VOICE } from "@/data/voices";
import { AudioWaveform } from "./AudioWaveform";
import { ArrowLeft, Loader2, Pause, Play, X, Radio, Footprints, Film } from "lucide-react";
import { useAudioPostcard } from "@/hooks/useAudioPostcard";
import { useDocumentary } from "@/hooks/useDocumentary";

type Props = {
  city: City | null;
  era: Era | null;
  mode: "wander" | "documentary";
  voice: NarratorVoice | null;
  onBack: () => void;
  onClose: () => void;
};

function formatCoord(value: number, posLabel: string, negLabel: string) {
  const abs = Math.abs(value).toFixed(4);
  return `${abs}° ${value >= 0 ? posLabel : negLabel}`;
}

export function CityPanel({ city, era, mode, voice, onBack, onClose }: Props) {
  const [activeMode, setActiveMode] = useState<"wander" | "documentary">(mode);

  // Resolve the voice to use — fall back to default if none provided
  const activeVoice = voice ?? DEFAULT_NARRATOR_VOICE;

  // Always call both hooks; pass null city/era to the inactive one to prevent API calls
  const wanderState = useAudioPostcard(
    activeMode === "wander" ? city : null,
    activeMode === "wander" ? era : null
  );
  const documentaryState = useDocumentary(
    activeMode === "documentary" ? city : null,
    activeMode === "documentary" ? era : null,
    activeMode === "documentary" ? activeVoice : null
  );

  const active = activeMode === "wander" ? wanderState : documentaryState;

  if (!city || !era) return null;

  const tabClass = (isActive: boolean) =>
    `flex items-center gap-1.5 flex-1 justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
      isActive
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    }`;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div
        key={city.id + "-" + era.id + "-" + activeMode}
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
              aria-label="Choose a different mode"
              className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Choose a different mode"
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

        {/* Mode toggle */}
        <div className="mt-4 flex rounded-xl border border-border/60 bg-card/30 p-1 gap-1">
          <button
            onClick={() => setActiveMode("wander")}
            className={tabClass(activeMode === "wander")}
            aria-pressed={activeMode === "wander"}
          >
            <Footprints size={13} />
            Wander the City
          </button>
          <button
            onClick={() => setActiveMode("documentary")}
            className={tabClass(activeMode === "documentary")}
            aria-pressed={activeMode === "documentary"}
          >
            <Film size={13} />
            Documentary
          </button>
        </div>

        {/* Scene / documentary info */}
        <div className="mt-5 min-h-[4.5rem]">
          {active.isLoading && (
            <p className="text-sm text-muted-foreground italic animate-pulse">
              {activeMode === "wander"
                ? `Tuning into ${city.name}, ${era.year}…`
                : `Researching ${city.name} in ${era.year}…`}
            </p>
          )}

          {!active.isLoading && activeMode === "wander" && wanderState.scene && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-1.5 mb-2">
                <Radio size={11} className="text-primary/70 shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">
                  {wanderState.scene.eventName}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-display leading-snug">
                {wanderState.scene.atmosphere}
              </p>
            </div>
          )}

          {!active.isLoading && activeMode === "documentary" && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-1.5 mb-2">
                <Film size={11} className="text-secondary/70 shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary/70">
                  Documentary
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-display leading-snug">
                What was happening in {city.name} in {era.label}
              </p>
              {documentaryState.segments && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Narrated by {activeVoice.name} · {documentaryState.segments.length} segments
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-1 text-xs text-muted-foreground tracking-wide">
          {era.tagline}
        </p>

        {/* Playback controls */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={active.toggle}
            disabled={active.isLoading}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ boxShadow: "var(--shadow-glow)" }}
            aria-label={active.isLoading ? "Loading" : active.isPlaying ? "Pause" : "Play"}
          >
            {active.isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : active.isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>
          <div className="flex-1">
            <AudioWaveform playing={active.isPlaying} />
          </div>
          <div className="hidden sm:block text-xs tabular-nums text-muted-foreground w-14 text-right">
            {active.isLoading ? "loading…" : active.isPlaying ? "live" : "paused"}
          </div>
        </div>

        {/* Error */}
        {active.error && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5">
            <p className="text-xs text-destructive/90">{active.error}</p>
            <button
              onClick={active.retry}
              className="text-xs text-primary hover:underline ml-3 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {activeMode === "wander" ? "Audio postcard" : "Documentary"} · {city.name}, {era.label}
          </span>
          <button onClick={onClose} className="story-link text-foreground/80 hover:text-foreground">
            Explore another city →
          </button>
        </div>
      </div>
    </div>
  );
}
