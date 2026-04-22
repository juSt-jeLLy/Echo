import { useState } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { NarratorVoice, NARRATOR_VOICES, DEFAULT_NARRATOR_VOICE } from "@/data/voices";
import { ArrowLeft, ArrowRight, Footprints, Film, Check } from "lucide-react";

type Props = {
  city: City;
  era: Era;
  onSelectWander: () => void;
  onSelectDocumentary: (voice: NarratorVoice) => void;
  onBack: () => void;
};

export function ModeCard({ city, era, onSelectWander, onSelectDocumentary, onBack }: Props) {
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<NarratorVoice>(DEFAULT_NARRATOR_VOICE);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div
        key={city.id + "-mode"}
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
            <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-aurora truncate">
              {city.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              How would you like to experience this city?
            </p>
          </div>
          <button
            onClick={onBack}
            aria-label="Back to era selection"
            className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Mode cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Wander the City */}
          <button
            onClick={onSelectWander}
            className="group relative text-left rounded-2xl border border-border/60 bg-card/40 hover:bg-card/70 hover:border-primary/50 p-6 transition-all hover:-translate-y-1 overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "var(--gradient-aurora)", mixBlendMode: "overlay" }}
            />
            <div className="relative flex flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Footprints size={24} />
              </div>
              <div>
                <div className="font-display text-lg font-semibold">Wander the City</div>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  Step into the streets. Hear the city as it was.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary/70 font-medium mt-1">
                Multi-voice scene · Ambient SFX
              </div>
            </div>
            <ArrowRight
              size={16}
              className="relative mt-4 text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
            />
          </button>

          {/* Documentary */}
          <button
            onClick={() => setShowVoiceSelector(true)}
            className={`group relative text-left rounded-2xl border p-6 transition-all hover:-translate-y-1 overflow-hidden ${
              showVoiceSelector
                ? "border-primary/60 bg-card/70"
                : "border-border/60 bg-card/40 hover:bg-card/70 hover:border-primary/50"
            }`}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "var(--gradient-aurora)", mixBlendMode: "overlay" }}
            />
            <div className="relative flex flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Film size={24} />
              </div>
              <div>
                <div className="font-display text-lg font-semibold">Documentary</div>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  What was happening in {city.name} in {era.label}.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-secondary/70 font-medium mt-1">
                Narrated · 4 segments · Your chosen voice
              </div>
            </div>
            {!showVoiceSelector && (
              <ArrowRight
                size={16}
                className="relative mt-4 text-secondary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            )}
          </button>
        </div>

        {/* Voice Selector — shown after Documentary is clicked */}
        {showVoiceSelector && (
          <div className="mt-5 animate-fade-in">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Choose a narrator voice
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NARRATOR_VOICES.map((voice) => {
                const isSelected = selectedVoice.id === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={`relative text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-primary/70 bg-primary/10 text-foreground"
                        : "border-border/60 bg-card/40 hover:bg-card/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check size={10} />
                      </span>
                    )}
                    <div className="font-semibold text-sm pr-5">{voice.name}</div>
                    <div className="text-xs mt-0.5 opacity-70">{voice.description}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onSelectDocumentary(selectedVoice)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold px-6 py-3 hover:scale-[1.01] active:scale-95 transition-transform"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              Listen as {selectedVoice.name} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
