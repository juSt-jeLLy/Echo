import { useCallback, useRef, useState } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { NarratorVoice, DEFAULT_NARRATOR_VOICE } from "@/data/voices";
import { AudioWaveform } from "./AudioWaveform";
import { HistorianWidget } from "./HistorianWidget";
import { ArrowLeft, Loader2, Pause, Play, X, Radio, Footprints, Film, Mic } from "lucide-react";
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
  const [isConversing, setIsConversing] = useState(false);
  const wasPlayingBeforeConversationRef = useRef(false);

  // Reset historian conversation when mode changes
  const handleModeChange = useCallback((newMode: "wander" | "documentary") => {
    setIsConversing(false);
    wasPlayingBeforeConversationRef.current = false;
    setActiveMode(newMode);
  }, []);

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

  const handleStartConversation = useCallback(() => {
    wasPlayingBeforeConversationRef.current = active.isPlaying;
    // Pause scene audio via toggle if currently playing
    if (active.isPlaying) {
      active.toggle();
    }
    setIsConversing(true);
  }, [active]);

  const handleEndConversation = useCallback(() => {
    setIsConversing(false);
    // Resume only if audio was playing before conversation started.
    if (wasPlayingBeforeConversationRef.current && !active.isPlaying && !active.isLoading) {
      active.toggle();
    }
    wasPlayingBeforeConversationRef.current = false;
  }, [active]);

  const handleBack = useCallback(() => {
    setIsConversing(false);
    wasPlayingBeforeConversationRef.current = false;
    onBack();
  }, [onBack]);

  const handleClosePanel = useCallback(() => {
    setIsConversing(false);
    wasPlayingBeforeConversationRef.current = false;
    onClose();
  }, [onClose]);

  if (!city || !era) return null;

  const tabClass = (isActive: boolean) =>
    `flex items-center gap-1.5 flex-1 justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
      isActive
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    }`;

  // Get event name for historian context
  const eventName = activeMode === "wander" && wanderState.scene
    ? wanderState.scene.eventName
    : `${era.label} era in ${city.name}`;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div
        key={city.id + "-" + era.id + "-" + activeMode}
        className="pointer-events-auto w-full max-w-4xl panel-glass rounded-3xl px-8 sm:px-10 py-8 animate-rise"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-primary/80 mb-2">
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
              onClick={handleBack}
              aria-label="Choose a different mode"
              className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Choose a different mode"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={handleClosePanel}
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
            onClick={() => handleModeChange("wander")}
            className={tabClass(activeMode === "wander")}
            aria-pressed={activeMode === "wander"}
          >
            <Footprints size={13} />
            Wander the City
          </button>
          <button
            onClick={() => handleModeChange("documentary")}
            className={tabClass(activeMode === "documentary")}
            aria-pressed={activeMode === "documentary"}
          >
            <Film size={13} />
            Documentary
          </button>
        </div>

        {/* Primary historian CTA */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={isConversing ? handleEndConversation : handleStartConversation}
            disabled={active.isLoading}
            className={`group relative overflow-hidden rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isConversing
                ? "border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/20"
                : "historian-cta-flicker border-primary/70 bg-gradient-to-r from-primary/30 via-secondary/25 to-primary/30 text-foreground shadow-[0_0_24px_hsl(var(--primary)/0.45)] hover:scale-[1.03]"
            }`}
            title={isConversing ? "End conversation with the historian" : "Start conversation with the historian"}
          >
            {!isConversing && (
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Mic size={12} />
              {isConversing ? "End chat" : "Talk to historian"}
            </span>
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
                <Radio size={14} className="text-primary/70 shrink-0" />
                <span className="text-xl font-bold uppercase tracking-[0.18em] text-primary/70">
                  {wanderState.scene.eventName}
                </span>
              </div>
              <p className="text-base text-muted-foreground font-display leading-snug">
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
            disabled={active.isLoading || isConversing}
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
            <AudioWaveform playing={active.isPlaying && !isConversing} />
          </div>
          <div className="hidden sm:block text-xs tabular-nums text-muted-foreground w-14 text-right">
            {isConversing ? "talking…" : active.isLoading ? "loading…" : active.isPlaying ? "live" : "paused"}
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

        {/* Historian Widget — full-screen overlay, rendered outside card flow */}
        <HistorianWidget
          city={city}
          era={era}
          eventName={eventName}
          isConversing={isConversing}
          onEnd={handleEndConversation}
        />

        {/* Footer */}
        <div className="mt-5 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p>
            {activeMode === "wander" ? "Audio postcard" : "Documentary"} · {city.name}, {era.label}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/75">
              Talk to a historian from {era.year}. They do not know events after {era.year}.
            </p>
          </div>
          <button onClick={handleClosePanel} className="story-link text-foreground/80 hover:text-foreground self-start sm:self-auto">
            Explore another city →
          </button>
        </div>
      </div>
    </div>
  );
}
