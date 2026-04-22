import { useEffect, useRef, useState, useCallback } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { NarratorVoice } from "@/data/voices";
import {
  generateDocumentaryScript,
  synthesiseDocumentaryAudio,
} from "@/services/documentaryService";

export interface DocumentaryState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  /** The 4 text segments (for display purposes) */
  segments: string[] | null;
  toggle: () => void;
  retry: () => void;
}

export function useDocumentary(
  city: City | null,
  era: Era | null,
  voice: NarratorVoice | null
): DocumentaryState {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const abortRef = useRef<AbortController | null>(null);
  const playlistRef = useRef<string[]>([]);
  const playlistIndexRef = useRef(0);
  const playlistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[] | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Advance to the next segment in the playlist
  const playNext = useCallback(() => {
    const idx = playlistIndexRef.current;
    const playlist = playlistRef.current;

    if (idx >= playlist.length) {
      audioRef.current.currentTime = 0;
      playlistIndexRef.current = 0;
      setIsPlaying(false);
      return;
    }

    audioRef.current.src = playlist[idx];
    playlistIndexRef.current = idx + 1;

    playlistTimerRef.current = setTimeout(() => {
      audioRef.current.play().catch(() => {});
    }, 300);
  }, []);

  // Wire up onended once
  useEffect(() => {
    audioRef.current.onended = playNext;
  }, [playNext]);

  // Cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Main generation pipeline
  useEffect(() => {
    // If any required input is missing, do nothing (allows conditional disabling)
    if (!city || !era || !voice) {
      // Stop any in-progress audio when disabled
      audioRef.current.pause();
      abortRef.current?.abort();
      setIsLoading(false);
      setIsPlaying(false);
      setError(null);
      setSegments(null);
      playlistRef.current = [];
      playlistIndexRef.current = 0;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setSegments(null);
    audioRef.current.pause();
    if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);

    const run = async () => {
      try {
        // Step 1: Generate documentary script
        const scriptSegments = await generateDocumentaryScript(city, era, signal);
        if (signal.aborted) return;

        setSegments(scriptSegments);

        // Step 2: Synthesise all segments in parallel
        const audioUrls = await synthesiseDocumentaryAudio(
          scriptSegments,
          voice.id,
          signal
        );
        if (signal.aborted) return;

        // Build playlist
        playlistRef.current = audioUrls;
        playlistIndexRef.current = 0;

        setIsLoading(false);

        // Start playback
        if (audioUrls.length > 0) {
          audioRef.current.src = audioUrls[0];
          playlistIndexRef.current = 1;
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setIsLoading(false);
      }
    };

    run();
  }, [city, era, voice, retryCount]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.src && !audioRef.current.ended) {
        audioRef.current.play().catch(() => {});
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

  return { isLoading, isPlaying, error, segments, toggle, retry };
}
