import { useEffect } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { useHistorianConversation } from "@/hooks/useHistorianConversation";
import { X, BookOpen, Mic, MicOff } from "lucide-react";

interface Props {
  city: City;
  era: Era;
  eventName: string;
  isConversing: boolean;
  onEnd: () => void;
}

/**
 * Fully custom historian conversation UI using @elevenlabs/client directly.
 * No widget embed — complete control over the UI.
 */
export function HistorianWidget({ city, era, eventName, isConversing, onEnd }: Props) {
  const { status, mode, error, startConversation, endConversation } =
    useHistorianConversation(city, era, eventName);

  // Start only when explicitly toggled on, and always stop when toggled off.
  useEffect(() => {
    if (isConversing) {
      void startConversation();
      return;
    }
    void endConversation();
  }, [isConversing, startConversation, endConversation]);

  const handleEnd = () => {
    void endConversation();
    onEnd();
  };

  if (!isConversing) return null;

  const isConnecting = status === "connecting";
  const isConnected = status === "connected";
  const isSpeaking = mode === "speaking" && isConnected;
  const isListening = mode === "listening" && isConnected;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl animate-fade-in">

      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-1/3 left-1/3 h-[50vh] w-[50vh] rounded-full blur-3xl opacity-15 transition-all duration-1000"
          style={{
            background: isSpeaking
              ? "radial-gradient(circle, hsl(265 85% 50% / 0.9), transparent 70%)"
              : "radial-gradient(circle, hsl(200 95% 40% / 0.8), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/3 h-[40vh] w-[40vh] rounded-full blur-3xl opacity-15 transition-all duration-1000"
          style={{
            background: isSpeaking
              ? "radial-gradient(circle, hsl(200 95% 40% / 0.8), transparent 70%)"
              : "radial-gradient(circle, hsl(265 85% 50% / 0.7), transparent 70%)",
          }}
        />
      </div>

      {/* Close button */}
      <button
        onClick={handleEnd}
        className="absolute top-6 right-6 flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-card/70 transition-all backdrop-blur-sm"
      >
        <X size={14} />
        End Conversation
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8">

        {/* Animated orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse rings */}
          {isConnected && (
            <>
              <div
                className="absolute rounded-full opacity-20"
                style={{
                  width: "220px",
                  height: "220px",
                  background: isSpeaking
                    ? "radial-gradient(circle, hsl(265 85% 65%), transparent)"
                    : "radial-gradient(circle, hsl(200 95% 60%), transparent)",
                  animation: isSpeaking
                    ? "ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite"
                    : "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <div
                className="absolute rounded-full opacity-15"
                style={{
                  width: "180px",
                  height: "180px",
                  background: isSpeaking
                    ? "radial-gradient(circle, hsl(265 85% 65%), transparent)"
                    : "radial-gradient(circle, hsl(200 95% 60%), transparent)",
                  animation: isSpeaking
                    ? "ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite 0.2s"
                    : "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s",
                }}
              />
            </>
          )}

          {/* Core orb */}
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-500"
            style={{
              background: isConnecting
                ? "conic-gradient(from 0deg, hsl(200 95% 60%), hsl(265 85% 65%), hsl(200 95% 60%))"
                : isSpeaking
                ? "radial-gradient(circle at 40% 40%, hsl(265 85% 75%), hsl(200 95% 50%))"
                : "radial-gradient(circle at 40% 40%, hsl(200 95% 70%), hsl(265 85% 55%))",
              boxShadow: isConnected
                ? isSpeaking
                  ? "0 0 60px hsl(265 85% 65% / 0.6), 0 0 120px hsl(265 85% 65% / 0.3)"
                  : "0 0 60px hsl(200 95% 60% / 0.6), 0 0 120px hsl(200 95% 60% / 0.3)"
                : "0 0 30px hsl(200 95% 60% / 0.3)",
              animation: isConnecting ? "spin 1.5s linear infinite" : undefined,
            }}
          >
            <BookOpen
              size={40}
              className="text-white/90"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
            />
          </div>
        </div>

        {/* Identity */}
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-aurora">
            The Historian
          </h2>
          <p className="text-base text-muted-foreground mt-1">
            {city.name}, {city.country} · {era.year}
          </p>
          {eventName && (
            <p className="text-xs text-primary/60 mt-1.5 uppercase tracking-widest">
              {eventName}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center gap-2.5 rounded-full border px-5 py-2.5 transition-all duration-500"
            style={{
              borderColor: isConnecting
                ? "hsl(200 95% 60% / 0.4)"
                : isSpeaking
                ? "hsl(265 85% 65% / 0.5)"
                : "hsl(200 95% 60% / 0.4)",
              background: isConnecting
                ? "hsl(200 95% 60% / 0.08)"
                : isSpeaking
                ? "hsl(265 85% 65% / 0.1)"
                : "hsl(200 95% 60% / 0.08)",
            }}
          >
            {/* Status dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{
                  backgroundColor: isSpeaking
                    ? "hsl(265 85% 65%)"
                    : "hsl(200 95% 60%)",
                }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: isSpeaking
                    ? "hsl(265 85% 65%)"
                    : "hsl(200 95% 60%)",
                }}
              />
            </span>

            {/* Status icon + text */}
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
              {isConnecting && "Connecting to historian…"}
              {isListening && (
                <>
                  <Mic size={14} className="text-primary" />
                  Listening · Speak now
                </>
              )}
              {isSpeaking && (
                <>
                  <MicOff size={14} className="text-secondary" />
                  Historian is speaking…
                </>
              )}
              {status === "disconnected" && "Disconnected"}
            </span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive/80 text-center max-w-xs">
              {error}
            </p>
          )}

          {/* Hint */}
          <p className="text-xs text-muted-foreground/50 text-center max-w-sm">
            {isListening
              ? "Ask anything · Silence ends your turn"
              : isSpeaking
              ? "The historian is responding…"
              : "Connecting to the historian…"}
          </p>
        </div>
      </div>
    </div>
  );
}
