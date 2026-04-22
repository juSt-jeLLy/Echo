import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";

const historianAgentId = import.meta.env.VITE_HISTORIAN_AGENT_ID?.trim();

export type ConversationStatus = "idle" | "connecting" | "connected" | "disconnected";
export type ConversationMode = "listening" | "speaking";

export interface HistorianConversationState {
  status: ConversationStatus;
  mode: ConversationMode;
  error: string | null;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
}

export function useHistorianConversation(
  city: City | null,
  era: Era | null,
  eventName: string
): HistorianConversationState {
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const startAttemptRef = useRef(0);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);

  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [mode, setMode] = useState<ConversationMode>("listening");
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount — always end the session if one is active
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      startAttemptRef.current += 1;
      isStartingRef.current = false;
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
        conversationRef.current = null;
      }
    };
  }, []);

  const startConversation = useCallback(async () => {
    if (!city || !era) return;
    if (conversationRef.current || isStartingRef.current) return;
    if (!historianAgentId) {
      setError(
        "Configuration error: VITE_HISTORIAN_AGENT_ID is not set. Please add it to your .env file."
      );
      setStatus("idle");
      return;
    }

    const attemptId = startAttemptRef.current + 1;
    startAttemptRef.current = attemptId;
    isStartingRef.current = true;

    setError(null);
    setStatus("connecting");

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!isMountedRef.current || attemptId !== startAttemptRef.current) {
        return;
      }

      const conversation = await Conversation.startSession({
        agentId: historianAgentId,
        dynamicVariables: {
          city: city.name,
          country: city.country,
          year: String(era.year),
          event: eventName || `${era.label} era`,
        },
        onConnect: () => {
          if (!isMountedRef.current || attemptId !== startAttemptRef.current) return;
          setStatus("connected");
          setMode("listening");
        },
        onDisconnect: () => {
          if (attemptId !== startAttemptRef.current) return;
          conversationRef.current = null;
          if (!isMountedRef.current) return;
          setStatus("disconnected");
        },
        onError: (err: string) => {
          if (!isMountedRef.current || attemptId !== startAttemptRef.current) return;
          setError(err);
          setStatus("disconnected");
        },
        onModeChange: ({ mode: newMode }: { mode: "listening" | "speaking" }) => {
          if (!isMountedRef.current || attemptId !== startAttemptRef.current) return;
          setMode(newMode);
        },
      });

      if (!isMountedRef.current || attemptId !== startAttemptRef.current) {
        await conversation.endSession().catch(() => {});
        return;
      }

      conversationRef.current = conversation;
    } catch (err) {
      if (!isMountedRef.current || attemptId !== startAttemptRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to start conversation";
      setError(message);
      setStatus("idle");
    } finally {
      if (attemptId === startAttemptRef.current) {
        isStartingRef.current = false;
      }
    }
  }, [city, era, eventName]);

  const endConversation = useCallback(async () => {
    startAttemptRef.current += 1;
    isStartingRef.current = false;

    const activeConversation = conversationRef.current;
    conversationRef.current = null;

    if (activeConversation) {
      await activeConversation.endSession().catch(() => {});
    }

    if (!isMountedRef.current) return;
    setStatus("idle");
    setMode("listening");
    setError(null);
  }, []);

  return { status, mode, error, startConversation, endConversation };
}
