import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDocumentary } from "./useDocumentary";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { NarratorVoice } from "@/data/voices";
import * as documentaryService from "@/services/documentaryService";

// Mock the service
vi.mock("@/services/documentaryService");

describe("useDocumentary - Bug Condition Exploration", () => {
  let mockCity: City;
  let mockEra: Era;
  let mockVoice: NarratorVoice;
  let mockAudio: HTMLAudioElement;

  beforeEach(() => {
    mockCity = {
      id: "test-city",
      name: "Test City",
      country: "Test Country",
      lat: 0,
      lng: 0,
    };

    mockEra = {
      id: "test-era",
      label: "Test Era",
      year: "2000",
      tagline: "Test tagline",
    };

    mockVoice = {
      id: "test-voice",
      name: "Test Voice",
      description: "Test voice description",
    };

    // Create mock audio element
    mockAudio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      src: "",
      currentTime: 0,
      ended: false,
      onended: null,
      volume: 1,
      loop: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    // Mock Audio constructor
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio;

    // Mock service responses
    vi.mocked(documentaryService.generateDocumentaryScript).mockResolvedValue([
      "Segment 1 text",
      "Segment 2 text",
      "Segment 3 text",
      "Segment 4 text",
    ]);

    vi.mocked(documentaryService.synthesiseSegment).mockResolvedValue(
      "segment-audio-url"
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.2, 1.4, 2.2, 2.4**
   * 
   * Property 1: Bug Condition - Mode Switch Audio Overlap
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * 
   * Test that when switching from "Documentary" to "Wander the City" mode,
   * the documentary audio (audioRef) stops immediately.
   * 
   * Expected behavior: When useDocumentary receives null inputs (simulating mode switch),
   * audioRef SHALL pause immediately.
   */
  it("should stop documentary audio when switching to wander mode (null inputs)", async () => {
    // Step 1: Start with valid inputs (documentary mode active)
    const { rerender } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    // Wait for audio to start playing
    await waitFor(
      () => {
        expect(mockAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Verify audio is playing
    expect(mockAudio.src).toBeTruthy();

    // Reset mock call counts to track new calls
    vi.mocked(mockAudio.pause).mockClear();

    // Step 2: Switch to wander mode (pass null inputs to simulate mode switch)
    rerender({ city: null, era: null, voice: null });

    // Step 3: Verify audio stops immediately
    // BUG CONDITION: On unfixed code, pause() is NOT called when inputs become null
    // This assertion will FAIL, confirming the bug exists
    await waitFor(
      () => {
        expect(mockAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    // Additional verification: audio should be stopped
    // Note: pause() may be called multiple times (cleanup + early-return), which is fine
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 1.4, 2.4**
   * 
   * Property 1: Bug Condition - Mode Switch Audio Overlap (Rapid Switching)
   * 
   * Test that rapid mode switching (Documentary → Wander → Documentary) stops all previous audio streams.
   */
  it("should stop audio on rapid mode switching", async () => {
    // Step 1: Start with documentary mode
    const { rerender } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    await waitFor(
      () => {
        expect(mockAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    vi.mocked(mockAudio.pause).mockClear();

    // Step 2: Switch to wander (null inputs)
    rerender({ city: null, era: null, voice: null });

    // Step 3: Verify pause was called
    await waitFor(
      () => {
        expect(mockAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    const pauseCallsAfterFirstSwitch = vi.mocked(mockAudio.pause).mock.calls
      .length;

    // Step 4: Switch back to documentary mode
    rerender({ city: mockCity, era: mockEra, voice: mockVoice });

    await waitFor(
      () => {
        expect(mockAudio.play).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 }
    );

    // Step 5: Switch to wander again
    rerender({ city: null, era: null, voice: null });

    // Verify pause was called again
    await waitFor(
      () => {
        expect(vi.mocked(mockAudio.pause).mock.calls.length).toBeGreaterThan(
          pauseCallsAfterFirstSwitch
        );
      },
      { timeout: 1000 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 2.4**
   * 
   * Property 1: Bug Condition - Mode Switch During Loading
   * 
   * Test that mode switching during loading aborts and prevents audio from starting.
   */
  it("should abort loading and prevent audio when switching modes during load", async () => {
    // Make the service call slow to simulate loading
    vi.mocked(documentaryService.generateDocumentaryScript).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                "Segment 1 text",
                "Segment 2 text",
                "Segment 3 text",
                "Segment 4 text",
              ]),
            500
          )
        )
    );

    // Step 1: Start loading documentary mode
    const { rerender, result } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    // Verify loading state
    expect(result.current.isLoading).toBe(true);

    // Step 2: Switch to wander mode while still loading
    rerender({ city: null, era: null, voice: null });

    // Step 3: Wait a bit and verify audio never started playing
    await new Promise((resolve) => setTimeout(resolve, 700));

    // BUG CONDITION: On unfixed code, audio might still start playing
    // even though we switched modes during loading
    expect(mockAudio.play).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 1.2, 2.2**
   * 
   * Property 1: Bug Condition - Partial Null Inputs
   * 
   * Test that documentary audio stops when ANY required input becomes null.
   */
  it("should stop audio when city becomes null", async () => {
    const { rerender } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    await waitFor(
      () => {
        expect(mockAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    vi.mocked(mockAudio.pause).mockClear();

    // Switch with only city null
    rerender({ city: null, era: mockEra, voice: mockVoice });

    await waitFor(
      () => {
        expect(mockAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it("should stop audio when era becomes null", async () => {
    const { rerender } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    await waitFor(
      () => {
        expect(mockAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    vi.mocked(mockAudio.pause).mockClear();

    // Switch with only era null
    rerender({ city: mockCity, era: null, voice: mockVoice });

    await waitFor(
      () => {
        expect(mockAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it("should stop audio when voice becomes null", async () => {
    const { rerender } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    await waitFor(
      () => {
        expect(mockAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    vi.mocked(mockAudio.pause).mockClear();

    // Switch with only voice null
    rerender({ city: mockCity, era: mockEra, voice: null });

    await waitFor(
      () => {
        expect(mockAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });
});

describe("useDocumentary - Preservation Properties", () => {
  let mockCity: City;
  let mockEra: Era;
  let mockVoice: NarratorVoice;
  let mockAudio: HTMLAudioElement;
  let timeUpdateCallback: ((this: HTMLAudioElement, ev: Event) => void) | null = null;

  beforeEach(() => {
    mockCity = {
      id: "test-city",
      name: "Test City",
      country: "Test Country",
      lat: 0,
      lng: 0,
    };

    mockEra = {
      id: "test-era",
      label: "Test Era",
      year: "2000",
      tagline: "Test tagline",
    };

    mockVoice = {
      id: "test-voice",
      name: "Test Voice",
      description: "Test voice description",
    };

    // Create mock audio element with addEventListener tracking
    mockAudio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      src: "",
      currentTime: 0,
      ended: false,
      onended: null,
      volume: 1,
      loop: false,
      addEventListener: vi.fn((event: string, callback: any) => {
        if (event === "timeupdate") {
          timeUpdateCallback = callback;
        }
      }),
      removeEventListener: vi.fn((event: string) => {
        if (event === "timeupdate") {
          timeUpdateCallback = null;
        }
      }),
    } as unknown as HTMLAudioElement;

    // Mock Audio constructor
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio;

    // Mock service responses
    vi.mocked(documentaryService.generateDocumentaryScript).mockResolvedValue([
      "Segment 1 text",
      "Segment 2 text",
      "Segment 3 text",
      "Segment 4 text",
    ]);

    // Mock different URLs for each segment
    let segmentCallCount = 0;
    vi.mocked(documentaryService.synthesiseSegment).mockImplementation(() => {
      segmentCallCount++;
      return Promise.resolve(`segment-${segmentCallCount}-url`);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    timeUpdateCallback = null;
  });

  /**
   * **Validates: Requirements 3.2**
   * 
   * Property 2: Preservation - Normal Documentary Playback
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all documentary playback without mode switch, segments play progressively
   * with prefetching.
   */
  it("should play documentary segments progressively with prefetching", async () => {
    const { result } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for loading to complete and playback to start
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify first segment is playing
    expect(mockAudio.play).toHaveBeenCalled();
    expect(mockAudio.src).toBe("segment-1-url");

    // Verify all 4 text segments are available
    expect(result.current.segments).toEqual([
      "Segment 1 text",
      "Segment 2 text",
      "Segment 3 text",
      "Segment 4 text",
    ]);

    // Verify no errors
    expect(result.current.error).toBeNull();

    // Verify timeupdate listener was attached for prefetching
    expect(mockAudio.addEventListener).toHaveBeenCalledWith(
      "timeupdate",
      expect.any(Function)
    );
  });

  /**
   * **Validates: Requirements 3.2**
   * 
   * Property 2: Preservation - Segment Prefetching at 30s Mark
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * Verify that next segment is prefetched when current segment reaches 30 seconds.
   */
  it("should prefetch next segment at 30-second mark", async () => {
    const { result } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for playback to start
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Clear synthesiseSegment mock to track prefetch call
    vi.mocked(documentaryService.synthesiseSegment).mockClear();

    // Simulate time update to 30 seconds
    mockAudio.currentTime = 30;
    if (timeUpdateCallback) {
      timeUpdateCallback.call(mockAudio, new Event("timeupdate"));
    }

    // Wait a bit for prefetch to trigger
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify segment 2 was prefetched (segment 1 is currently playing)
    expect(documentaryService.synthesiseSegment).toHaveBeenCalledWith(
      "Segment 2 text",
      mockVoice.id,
      expect.any(AbortSignal)
    );
  });

  /**
   * **Validates: Requirements 3.2**
   * 
   * Property 2: Preservation - Segment Progression
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * Verify that onended handler is set up correctly for segment progression.
   */
  it("should set up onended handler for segment progression", async () => {
    const { result } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for segment 1 to start playing
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify onended handler is set
    expect(mockAudio.onended).toBeTruthy();
    expect(typeof mockAudio.onended).toBe("function");
  });

  /**
   * **Validates: Requirements 3.3**
   * 
   * Property 2: Preservation - Pause/Resume Functionality
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all pause/resume actions within documentary mode, audio pauses and resumes
   * without stopping or resetting.
   */
  it("should pause and resume audio correctly via toggle button", async () => {
    const { result } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for playback to start
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Clear mock calls to track pause/resume
    vi.mocked(mockAudio.pause).mockClear();
    vi.mocked(mockAudio.play).mockClear();

    // Pause via toggle
    result.current.toggle();

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(false);
    });

    expect(mockAudio.pause).toHaveBeenCalled();

    // Resume via toggle
    result.current.toggle();

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
    });

    expect(mockAudio.play).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 3.6**
   * 
   * Property 2: Preservation - Documentary Completion
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all documentary completions (all 4 segments), verify onended handler
   * is set up to handle completion.
   */
  it("should have onended handler for documentary completion", async () => {
    const { result } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for segment 1 to start
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify onended handler is set up
    expect(mockAudio.onended).toBeTruthy();
    expect(typeof mockAudio.onended).toBe("function");

    // Verify all 4 segments are available
    expect(result.current.segments).toHaveLength(4);
  });

  /**
   * **Validates: Requirements 3.4**
   * 
   * Property 2: Preservation - Error Handling and Retry
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all error scenarios, retry regenerates and plays audio correctly.
   */
  it("should handle errors and retry correctly", async () => {
    // Mock an error on first call, success on second
    vi.mocked(documentaryService.generateDocumentaryScript)
      .mockRejectedValueOnce(new Error("Test error"))
      .mockResolvedValueOnce([
        "Segment 1 text",
        "Segment 2 text",
        "Segment 3 text",
        "Segment 4 text",
      ]);

    const { result } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for error state
    await waitFor(
      () => {
        expect(result.current.error).toBe("Test error");
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    // Verify audio didn't start playing
    expect(result.current.isPlaying).toBe(false);

    // Trigger retry
    result.current.retry();

    // Wait for successful playback
    await waitFor(
      () => {
        expect(result.current.error).toBeNull();
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify audio started playing after retry
    expect(mockAudio.play).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 3.7**
   * 
   * Property 2: Preservation - Cleanup on New Generation
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * When generating new audio (different city/era/voice), cleanup should occur correctly.
   */
  it("should cleanup and regenerate when city, era, or voice changes", async () => {
    const { result, rerender } = renderHook(
      ({ city, era, voice }) => useDocumentary(city, era, voice),
      {
        initialProps: { city: mockCity, era: mockEra, voice: mockVoice },
      }
    );

    // Wait for initial playback
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    const initialSegments = result.current.segments;

    // Clear mocks to track new calls
    vi.mocked(mockAudio.pause).mockClear();
    vi.mocked(documentaryService.generateDocumentaryScript).mockClear();

    // Change to a different city
    const newCity: City = {
      id: "new-city",
      name: "New City",
      country: "New Country",
      lat: 10,
      lng: 10,
    };

    rerender({ city: newCity, era: mockEra, voice: mockVoice });

    // Verify cleanup occurred
    await waitFor(() => {
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    // Verify new generation started
    expect(documentaryService.generateDocumentaryScript).toHaveBeenCalledWith(
      newCity,
      mockEra,
      expect.any(AbortSignal)
    );

    // Wait for new playback
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify segments were regenerated
    expect(result.current.segments).toBeTruthy();
  });

  /**
   * **Validates: Requirements 3.7**
   * 
   * Property 2: Preservation - Cleanup on Unmount
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * Verify that cleanup occurs correctly when component unmounts.
   */
  it("should cleanup resources on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useDocumentary(mockCity, mockEra, mockVoice)
    );

    // Wait for playback to start
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Clear mocks to track cleanup calls
    vi.mocked(mockAudio.pause).mockClear();
    vi.mocked(mockAudio.removeEventListener).mockClear();

    // Unmount the hook
    unmount();

    // Verify cleanup occurred
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
      "timeupdate",
      expect.any(Function)
    );
  });
});
