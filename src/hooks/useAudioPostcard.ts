import { useEffect, useRef, useState, useCallback } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { generateScene, SceneResult } from "@/services/groqService";
import {
  generateAmbientSoundscape,
  synthesiseSceneLines,
  synthesiseIntro,
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
  const sceneAudioRef = useRef<HTMLAudioElement>(new Audio());
  const ambientRef = useRef<HTMLAudioElement>(new Audio());
  const abortRef = useRef<AbortController | null>(null);
  const playlistRef = useRef<string[]>([]);
  const playlistIndexRef = useRef(0);
  const playlistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Advance to the next segment in the playlist with a 400ms gap
  const playNext = useCallback(() => {
    const idx = playlistIndexRef.current;
    const playlist = playlistRef.current;

    if (idx >= playlist.length) {
      ambientRef.current.pause();
      ambientRef.current.currentTime = 0;
      sceneAudioRef.current.currentTime = 0;
      playlistIndexRef.current = 0;
      setIsPlaying(false);
      return;
    }

    sceneAudioRef.current.src = playlist[idx];
    playlistIndexRef.current = idx + 1;

    playlistTimerRef.current = setTimeout(() => {
      sceneAudioRef.current.play().catch(() => {});
    }, 400);
  }, []);

  // Wire up onended once
  useEffect(() => {
    sceneAudioRef.current.onended = playNext;
  }, [playNext]);

  // Cleanup on unmount
  useEffect(() => {
    const sceneAudio = sceneAudioRef.current;
    const ambient = ambientRef.current;
    return () => {
      sceneAudio.pause();
      ambient.pause();
      if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Main generation pipeline
  useEffect(() => {
    if (!city || !era) return;

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
    if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);

    const run = async () => {
      try {
        const sceneResult = await generateScene(city, era, signal);
        if (signal.aborted) return;

        setScene(sceneResult);

        const [introUrl, sceneUrls, ambientUrl] = await Promise.all([
          synthesiseIntro(city, sceneResult.eventName, sceneResult.atmosphere, signal),
          synthesiseSceneLines(sceneResult.sceneLines, signal),
          generateAmbientSoundscape(sceneResult.soundscapePrompt, signal),
        ]);

        if (signal.aborted) return;

        if (!ambientUrl) {
          throw new Error("Could not generate the soundscape for this scene. Please retry.");
        }

        // Store playlist with intro prepended
        playlistRef.current = [introUrl, ...sceneUrls].filter((u): u is string => u !== null);
        playlistIndexRef.current = 0;

        // Wire up ambient
        ambientRef.current.src = ambientUrl;
        ambientRef.current.volume = 0.3;

        const playlist = playlistRef.current;
        if (playlist.length > 0) {
          ambientRef.current.loop = true;
          ambientRef.current.onended = null;
        } else {
          ambientRef.current.loop = false;
          ambientRef.current.onended = () => {
            ambientRef.current.currentTime = 0;
            setIsPlaying(false);
          };
        }

        setIsLoading(false);

        // Start playback
        const playPromises: Promise<void>[] = [ambientRef.current.play()];
        if (playlist.length > 0) {
          sceneAudioRef.current.src = playlist[0];
          playlistIndexRef.current = 1;
          playPromises.push(sceneAudioRef.current.play());
        }
        await Promise.all(playPromises);
        setIsPlaying(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setIsLoading(false);
      }
    };

    run();
  }, [city, era, retryCount]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
      sceneAudioRef.current.pause();
      ambientRef.current.pause();
      setIsPlaying(false);
    } else {
      ambientRef.current.play().catch(() => {});
      if (sceneAudioRef.current.src && !sceneAudioRef.current.ended) {
        sceneAudioRef.current.play().catch(() => {});
      } else if (
        playlistRef.current.length > 0 &&
        playlistIndexRef.current < playlistRef.current.length
      ) {
        playNext();
      }
      setIsPlaying(true);
    }
  }, [isPlaying, playNext]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { isLoading, isPlaying, error, scene, toggle, retry };
}
