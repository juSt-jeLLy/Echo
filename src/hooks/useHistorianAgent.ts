import { useCallback, useRef, useState } from "react";

export interface HistorianAgentState {
  isConversing: boolean;
  startConversation: () => void;
  endConversation: () => void;
}

/**
 * Manages the historian agent conversation state.
 * Coordinates audio pause/resume with the ambient and scene audio refs.
 */
export function useHistorianAgent(
  ambientRef: React.RefObject<HTMLAudioElement>,
  sceneAudioRef: React.RefObject<HTMLAudioElement>,
  isPlaying: boolean,
  setIsPlaying: (v: boolean) => void
): HistorianAgentState {
  const [isConversing, setIsConversing] = useState(false);
  const wasPlayingRef = useRef(false);

  const startConversation = useCallback(() => {
    // Remember if scene audio was playing
    wasPlayingRef.current = isPlaying;

    // Pause scene audio (voices/narration)
    if (sceneAudioRef.current) {
      sceneAudioRef.current.pause();
    }
    setIsPlaying(false);

    // Reduce ambient volume for conversation
    if (ambientRef.current) {
      ambientRef.current.volume = 0.15;
    }

    setIsConversing(true);
  }, [isPlaying, ambientRef, sceneAudioRef, setIsPlaying]);

  const endConversation = useCallback(() => {
    // Restore ambient volume
    if (ambientRef.current) {
      ambientRef.current.volume = 0.3;
    }

    // Resume scene audio if it was playing before
    if (wasPlayingRef.current && sceneAudioRef.current?.src) {
      sceneAudioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    setIsConversing(false);
  }, [ambientRef, sceneAudioRef, setIsPlaying]);

  return { isConversing, startConversation, endConversation };
}
