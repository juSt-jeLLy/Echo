import { useEffect, useRef, useState, useCallback } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { generateScene, SceneResult } from "@/services/groqService";
import {
  generateAmbientSoundscape,
  synthesiseSceneLines,
} from "@/services/elevenLabsService";

export interface AudioPostcardState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  scene: SceneResult | null;
  toggle: () => void;
  retry: () => void;
}

export function useAudioPostcard(
  city: City | null,
  era: Era | null
): AudioPostcardState {
  // Two audio layers: TTS scene audio (voices) + SFX ambient (environment)
  const sceneAudioRef = useRef<HTMLAudioElement>(new Audio());
  const ambientRef = useRef<HTMLAudioElement>(new Audio());
  const abortRef = useRef<AbortController | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    const sceneAudio = sceneAudioRef.current;
    const ambient = ambientRef.current;
    return () => {
      sceneAudio.pause();
      ambient.pause();
      abortRef.current?.abort();
    };
  }, []);

  // Main generation pipeline
  useEffect(() => {
    if (!city || !era) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setScene(null);
    sceneAudioRef.current.pause();
    ambientRef.current.pause();

    const run = async () => {
      try {
        // Step 1: Ask Groq for the historical event, soundscape prompt, and scene audio script
        const sceneResult = await generateScene(city, era, signal);

        if (signal.aborted) return;

        // Show the scene info immediately while audio loads
        setScene(sceneResult);

        // Step 2: Generate both audio layers in parallel
        const [sceneAudioUrl, ambientUrl] = await Promise.all([
          synthesiseSceneLines(sceneResult.sceneLines, signal),
          generateAmbientSoundscape(sceneResult.soundscapePrompt, signal),
        ]);

        if (signal.aborted) return;

        if (!ambientUrl) {
          throw new Error(
            "Could not generate the soundscape for this scene. Please retry."
          );
        }

        // Step 3: Wire up ambient — looped at low volume underneath scene audio,
        // or played once (no loop) when there is no scene audio.
        ambientRef.current.src = ambientUrl;
        ambientRef.current.volume = 0.3;

        if (sceneAudioUrl) {
          // Scene audio exists: ambient loops for the duration of TTS playback.
          ambientRef.current.loop = true;
          ambientRef.current.onended = null;
        } else {
          // No scene audio: ambient plays once then stops.
          ambientRef.current.loop = false;
          ambientRef.current.onended = () => {
            ambientRef.current.currentTime = 0;
            setIsPlaying(false);
          };
        }

        // Step 4: Wire up scene audio (TTS) — plays once at full volume
        if (sceneAudioUrl) {
          sceneAudioRef.current.src = sceneAudioUrl;
          sceneAudioRef.current.volume = 1.0;
          sceneAudioRef.current.loop = false;

          // When scene audio ends, pause ambient and reset playback state
          sceneAudioRef.current.onended = () => {
            ambientRef.current.pause();
            ambientRef.current.currentTime = 0;
            sceneAudioRef.current.currentTime = 0;
            setIsPlaying(false);
          };
        }

        setIsLoading(false);

        // Step 5: Autoplay both layers simultaneously
        const playPromises: Promise<void>[] = [ambientRef.current.play()];
        if (sceneAudioUrl) {
          playPromises.push(sceneAudioRef.current.play());
        }
        await Promise.all(playPromises);
        setIsPlaying(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // silently ignore — new pipeline starting
        }
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setIsLoading(false);
      }
    };

    run();
  }, [city, era, retryCount]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      sceneAudioRef.current.pause();
      ambientRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromises: Promise<void>[] = [];
      // Only resume scene audio if it hasn't finished yet
      if (
        sceneAudioRef.current.src &&
        !sceneAudioRef.current.ended &&
        sceneAudioRef.current.currentTime > 0
      ) {
        playPromises.push(
          sceneAudioRef.current.play().catch((err) => {
            console.warn("[useAudioPostcard] Scene audio play failed:", err);
          })
        );
      }
      playPromises.push(
        ambientRef.current.play().catch((err) => {
          console.warn("[useAudioPostcard] Ambient play failed:", err);
        })
      );
      Promise.all(playPromises);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { isLoading, isPlaying, error, scene, toggle, retry };
}
