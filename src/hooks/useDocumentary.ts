import { useEffect, useRef, useState, useCallback } from "react";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { NarratorVoice } from "@/data/voices";
import {
  generateDocumentaryScript,
  synthesiseSegment,
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
  // ── Persistent refs ──────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const abortRef = useRef<AbortController | null>(null);

  // Progressive loading refs
  const segmentCacheRef = useRef<Map<number, string>>(new Map());
  const prefetchedRef = useRef<Set<number>>(new Set());
  const currentSegmentIndexRef = useRef<number>(0);
  const textSegmentsRef = useRef<string[] | null>(null);
  const waitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── State ────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[] | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ── Main generation pipeline ─────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    // If any required input is missing, stop and reset
    if (!city || !era || !voice) {
      audio.pause();
      abortRef.current?.abort();
      setIsLoading(false);
      setIsPlaying(false);
      setError(null);
      setSegments(null);
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
    audio.pause();

    // ── onTimeUpdate: prefetch next segment at 30-second mark ──
    const onTimeUpdate = () => {
      const idx = currentSegmentIndexRef.current;
      const nextIdx = idx + 1;

      // Guards
      if (nextIdx > 3) return;
      if (prefetchedRef.current.has(nextIdx)) return;
      if (audio.currentTime < 30) return;

      // Mark immediately for idempotence
      prefetchedRef.current.add(nextIdx);

      const textSegments = textSegmentsRef.current;
      if (!textSegments) return;

      synthesiseSegment(textSegments[nextIdx], voice.id, signal)
        .then((url) => {
          segmentCacheRef.current.set(nextIdx, url);
        })
        .catch(() => {
          // Errors handled in onended / waitForSegment
        });
    };

    // ── waitForSegment: poll cache until URL is available ──────
    const waitForSegment = (idx: number) => {
      if (waitIntervalRef.current !== null) {
        clearInterval(waitIntervalRef.current);
      }

      const intervalId = setInterval(() => {
        if (signal.aborted) {
          clearInterval(intervalId);
          waitIntervalRef.current = null;
          return;
        }

        const url = segmentCacheRef.current.get(idx);
        if (url) {
          clearInterval(intervalId);
          waitIntervalRef.current = null;
          currentSegmentIndexRef.current = idx;
          audio.src = url;
          audio.play().catch(() => {});
          setIsLoading(false);
          setIsPlaying(true);
        }
      }, 100);

      waitIntervalRef.current = intervalId;
    };

    // ── onended: advance to next segment ──────────────────────
    const onEnded = () => {
      const nextIdx = currentSegmentIndexRef.current + 1;

      if (nextIdx > 3) {
        setIsPlaying(false);
        setIsLoading(false);
        return;
      }

      const url = segmentCacheRef.current.get(nextIdx);
      if (url) {
        currentSegmentIndexRef.current = nextIdx;
        audio.src = url;
        audio.play().catch(() => {});
      } else {
        // Cache miss — wait for prefetch to complete
        setIsLoading(true);
        waitForSegment(nextIdx);
      }
    };

    audio.onended = onEnded;

    // ── cleanup: abort, revoke URLs, reset all refs ────────────
    const cleanup = () => {
      abortRef.current?.abort();
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.onended = null;

      if (waitIntervalRef.current !== null) {
        clearInterval(waitIntervalRef.current);
        waitIntervalRef.current = null;
      }

      segmentCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      segmentCacheRef.current.clear();
      prefetchedRef.current.clear();
      currentSegmentIndexRef.current = 0;
      textSegmentsRef.current = null;
    };

    // ── run: generate script + synthesise segment 0 ───────────
    const run = async () => {
      try {
        // Step 1: Generate all 4 text segments upfront (cheap Groq call)
        const textSegments = await generateDocumentaryScript(city, era, signal);
        if (signal.aborted) return;

        textSegmentsRef.current = textSegments;
        setSegments(textSegments);

        // Step 2: Synthesise only segment 0 before playback
        const url0 = await synthesiseSegment(textSegments[0], voice.id, signal);
        if (signal.aborted) return;

        segmentCacheRef.current.set(0, url0);

        // Step 3: Start playback
        audio.src = url0;
        await audio.play();
        if (signal.aborted) return;

        setIsLoading(false);
        setIsPlaying(true);

        // Step 4: Attach timeupdate listener for background prefetch
        audio.addEventListener("timeupdate", onTimeUpdate);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setIsLoading(false);
      }
    };

    run();

    return cleanup;
  }, [city, era, voice, retryCount]);

  // ── toggle ───────────────────────────────────────────────────
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // ── retry ────────────────────────────────────────────────────
  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { isLoading, isPlaying, error, segments, toggle, retry };
}
