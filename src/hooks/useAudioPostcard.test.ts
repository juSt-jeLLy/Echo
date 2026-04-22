import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAudioPostcard } from "./useAudioPostcard";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import * as groqService from "@/services/groqService";
import * as elevenLabsService from "@/services/elevenLabsService";

// Mock the services
vi.mock("@/services/groqService");
vi.mock("@/services/elevenLabsService");

describe("useAudioPostcard - Bug Condition Exploration", () => {
  let mockCity: City;
  let mockEra: Era;
  let mockSceneAudio: HTMLAudioElement;
  let mockAmbientAudio: HTMLAudioElement;

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

    // Create mock audio elements
    mockSceneAudio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      src: "",
      currentTime: 0,
      ended: false,
      onended: null,
      volume: 1,
      loop: false,
    } as unknown as HTMLAudioElement;

    mockAmbientAudio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      src: "",
      currentTime: 0,
      ended: false,
      onended: null,
      volume: 0.3,
      loop: false,
    } as unknown as HTMLAudioElement;

    // Mock Audio constructor to return our mock elements
    let audioCallCount = 0;
    global.Audio = vi.fn(() => {
      audioCallCount++;
      return audioCallCount === 1 ? mockSceneAudio : mockAmbientAudio;
    }) as unknown as typeof Audio;

    // Mock service responses
    vi.mocked(groqService.generateScene).mockResolvedValue({
      eventName: "Test Event",
      atmosphere: "Test atmosphere",
      sceneLines: [
        { speaker: "Narrator", line: "Test line 1" },
        { speaker: "Narrator", line: "Test line 2" },
      ],
      soundscapePrompt: "Test soundscape",
    });

    vi.mocked(elevenLabsService.synthesiseIntro).mockResolvedValue("intro-url");
    vi.mocked(elevenLabsService.synthesiseSceneLines).mockResolvedValue([
      "scene-url-1",
      "scene-url-2",
    ]);
    vi.mocked(elevenLabsService.generateAmbientSoundscape).mockResolvedValue(
      "ambient-url"
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.1, 1.3, 2.1, 2.3**
   * 
   * Property 1: Bug Condition - Mode Switch Audio Overlap
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * 
   * Test that when switching from "Wander the City" to "Documentary" mode,
   * the wander audio (sceneAudioRef and ambientRef) stops immediately.
   * 
   * Expected behavior: When useAudioPostcard receives null inputs (simulating mode switch),
   * both sceneAudioRef and ambientRef SHALL pause immediately.
   */
  it("should stop wander audio when switching to documentary mode (null inputs)", async () => {
    // Step 1: Start with valid inputs (wander mode active)
    const { rerender } = renderHook(
      ({ city, era }) => useAudioPostcard(city, era),
      {
        initialProps: { city: mockCity, era: mockEra },
      }
    );

    // Wait for audio to start playing
    await waitFor(
      () => {
        expect(mockSceneAudio.play).toHaveBeenCalled();
        expect(mockAmbientAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Verify audio is playing
    expect(mockSceneAudio.src).toBeTruthy();
    expect(mockAmbientAudio.src).toBeTruthy();

    // Reset mock call counts to track new calls
    vi.mocked(mockSceneAudio.pause).mockClear();
    vi.mocked(mockAmbientAudio.pause).mockClear();

    // Step 2: Switch to documentary mode (pass null inputs to simulate mode switch)
    rerender({ city: null, era: null });

    // Step 3: Verify audio stops immediately
    // BUG CONDITION: On unfixed code, pause() is NOT called when inputs become null
    // This assertion will FAIL, confirming the bug exists
    await waitFor(
      () => {
        expect(mockSceneAudio.pause).toHaveBeenCalled();
        expect(mockAmbientAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    // Additional verification: audio should be stopped
    expect(mockSceneAudio.pause).toHaveBeenCalledTimes(1);
    expect(mockAmbientAudio.pause).toHaveBeenCalledTimes(1);
  });

  /**
   * **Validates: Requirements 1.3, 2.3**
   * 
   * Property 1: Bug Condition - Mode Switch Audio Overlap (Rapid Switching)
   * 
   * Test that rapid mode switching (Wander → Documentary → Wander) stops all previous audio streams.
   */
  it("should stop audio on rapid mode switching", async () => {
    // Step 1: Start with wander mode
    const { rerender } = renderHook(
      ({ city, era }) => useAudioPostcard(city, era),
      {
        initialProps: { city: mockCity, era: mockEra },
      }
    );

    await waitFor(
      () => {
        expect(mockSceneAudio.play).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    vi.mocked(mockSceneAudio.pause).mockClear();
    vi.mocked(mockAmbientAudio.pause).mockClear();

    // Step 2: Switch to documentary (null inputs)
    rerender({ city: null, era: null });

    // Step 3: Verify pause was called
    await waitFor(
      () => {
        expect(mockSceneAudio.pause).toHaveBeenCalled();
        expect(mockAmbientAudio.pause).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    const pauseCallsAfterFirstSwitch = vi.mocked(mockSceneAudio.pause).mock
      .calls.length;

    // Step 4: Switch back to wander mode
    rerender({ city: mockCity, era: mockEra });

    await waitFor(
      () => {
        expect(mockSceneAudio.play).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 }
    );

    // Step 5: Switch to documentary again
    rerender({ city: null, era: null });

    // Verify pause was called again
    await waitFor(
      () => {
        expect(vi.mocked(mockSceneAudio.pause).mock.calls.length).toBeGreaterThan(
          pauseCallsAfterFirstSwitch
        );
      },
      { timeout: 1000 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 2.3**
   * 
   * Property 1: Bug Condition - Mode Switch During Loading
   * 
   * Test that mode switching during loading aborts and prevents audio from starting.
   */
  it("should abort loading and prevent audio when switching modes during load", async () => {
    // Make the service call slow to simulate loading
    vi.mocked(groqService.generateScene).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                eventName: "Test Event",
                atmosphere: "Test atmosphere",
                sceneLines: [{ speaker: "Narrator", line: "Test line" }],
                soundscapePrompt: "Test soundscape",
              }),
            500
          )
        )
    );

    // Step 1: Start loading wander mode
    const { rerender, result } = renderHook(
      ({ city, era }) => useAudioPostcard(city, era),
      {
        initialProps: { city: mockCity, era: mockEra },
      }
    );

    // Verify loading state
    expect(result.current.isLoading).toBe(true);

    // Step 2: Switch to documentary mode while still loading
    rerender({ city: null, era: null });

    // Step 3: Wait a bit and verify audio never started playing
    await new Promise((resolve) => setTimeout(resolve, 700));

    // BUG CONDITION: On unfixed code, audio might still start playing
    // even though we switched modes during loading
    expect(mockSceneAudio.play).not.toHaveBeenCalled();
    expect(mockAmbientAudio.play).not.toHaveBeenCalled();
  });
});

describe("useAudioPostcard - Preservation Properties", () => {
  let mockCity: City;
  let mockEra: Era;
  let mockSceneAudio: HTMLAudioElement;
  let mockAmbientAudio: HTMLAudioElement;

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

    // Create mock audio elements
    mockSceneAudio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      src: "",
      currentTime: 0,
      ended: false,
      onended: null,
      volume: 1,
      loop: false,
    } as unknown as HTMLAudioElement;

    mockAmbientAudio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      src: "",
      currentTime: 0,
      ended: false,
      onended: null,
      volume: 0.3,
      loop: false,
    } as unknown as HTMLAudioElement;

    // Mock Audio constructor to return our mock elements
    let audioCallCount = 0;
    global.Audio = vi.fn(() => {
      audioCallCount++;
      return audioCallCount === 1 ? mockSceneAudio : mockAmbientAudio;
    }) as unknown as typeof Audio;

    // Mock service responses
    vi.mocked(groqService.generateScene).mockResolvedValue({
      eventName: "Test Event",
      atmosphere: "Test atmosphere",
      sceneLines: [
        { speaker: "Narrator", line: "Test line 1" },
        { speaker: "Narrator", line: "Test line 2" },
      ],
      soundscapePrompt: "Test soundscape",
    });

    vi.mocked(elevenLabsService.synthesiseIntro).mockResolvedValue("intro-url");
    vi.mocked(elevenLabsService.synthesiseSceneLines).mockResolvedValue([
      "scene-url-1",
      "scene-url-2",
    ]);
    vi.mocked(elevenLabsService.generateAmbientSoundscape).mockResolvedValue(
      "ambient-url"
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * Property 2: Preservation - Normal Wander Playback
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all wander playback without mode switch, scene audio and ambient play correctly
   * with proper sequencing (intro + scene lines with 400ms gaps).
   */
  it("should play scene audio and ambient soundscape correctly in wander mode", async () => {
    const { result } = renderHook(() => useAudioPostcard(mockCity, mockEra));

    // Wait for loading to complete and playback to start
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify both audio elements started playing
    expect(mockSceneAudio.play).toHaveBeenCalled();
    expect(mockAmbientAudio.play).toHaveBeenCalled();

    // Verify scene audio has the intro URL
    expect(mockSceneAudio.src).toBe("intro-url");

    // Verify ambient audio is configured correctly
    expect(mockAmbientAudio.src).toBe("ambient-url");
    expect(mockAmbientAudio.volume).toBe(0.3);
    expect(mockAmbientAudio.loop).toBe(true);

    // Verify scene data is available
    expect(result.current.scene).toEqual({
      eventName: "Test Event",
      atmosphere: "Test atmosphere",
      sceneLines: [
        { speaker: "Narrator", line: "Test line 1" },
        { speaker: "Narrator", line: "Test line 2" },
      ],
      soundscapePrompt: "Test soundscape",
    });

    // Verify no errors
    expect(result.current.error).toBeNull();
  });

  /**
   * **Validates: Requirements 3.3**
   * 
   * Property 2: Preservation - Pause/Resume Functionality
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all pause/resume actions within wander mode, audio pauses and resumes
   * without stopping or resetting.
   */
  it("should pause and resume audio correctly via toggle button", async () => {
    const { result } = renderHook(() => useAudioPostcard(mockCity, mockEra));

    // Wait for playback to start
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Clear mock calls to track pause/resume
    vi.mocked(mockSceneAudio.pause).mockClear();
    vi.mocked(mockSceneAudio.play).mockClear();
    vi.mocked(mockAmbientAudio.pause).mockClear();
    vi.mocked(mockAmbientAudio.play).mockClear();

    // Pause via toggle
    result.current.toggle();

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(false);
    });

    expect(mockSceneAudio.pause).toHaveBeenCalled();
    expect(mockAmbientAudio.pause).toHaveBeenCalled();

    // Resume via toggle
    result.current.toggle();

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
    });

    expect(mockAmbientAudio.play).toHaveBeenCalled();
    // Scene audio should resume if it has a src and isn't ended
    expect(mockSceneAudio.play).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 3.5**
   * 
   * Property 2: Preservation - Playlist Completion
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * For all playlist completions, playback stops and state resets correctly.
   */
  it("should stop playback and reset state when playlist completes", async () => {
    const { result } = renderHook(() => useAudioPostcard(mockCity, mockEra));

    // Wait for playback to start
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Simulate playlist completion by triggering onended multiple times
    // First, trigger intro completion
    if (mockSceneAudio.onended) {
      mockSceneAudio.onended(new Event("ended"));
    }

    // Wait for next segment to start (400ms gap)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Trigger scene line 1 completion
    if (mockSceneAudio.onended) {
      mockSceneAudio.onended(new Event("ended"));
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Trigger scene line 2 completion (last segment)
    if (mockSceneAudio.onended) {
      mockSceneAudio.onended(new Event("ended"));
    }

    // Wait for completion logic to run
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(false);
      },
      { timeout: 1000 }
    );

    // Verify ambient audio was paused
    expect(mockAmbientAudio.pause).toHaveBeenCalled();
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
    vi.mocked(groqService.generateScene)
      .mockRejectedValueOnce(new Error("Test error"))
      .mockResolvedValueOnce({
        eventName: "Test Event",
        atmosphere: "Test atmosphere",
        sceneLines: [{ speaker: "Narrator", line: "Test line" }],
        soundscapePrompt: "Test soundscape",
      });

    const { result } = renderHook(() => useAudioPostcard(mockCity, mockEra));

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
    expect(mockSceneAudio.play).toHaveBeenCalled();
    expect(mockAmbientAudio.play).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirements 3.7**
   * 
   * Property 2: Preservation - Cleanup on New Generation
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * When generating new audio (different city/era), cleanup should occur correctly.
   */
  it("should cleanup and regenerate when city or era changes", async () => {
    const { result, rerender } = renderHook(
      ({ city, era }) => useAudioPostcard(city, era),
      {
        initialProps: { city: mockCity, era: mockEra },
      }
    );

    // Wait for initial playback
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    const initialScene = result.current.scene;

    // Clear mocks to track new calls
    vi.mocked(mockSceneAudio.pause).mockClear();
    vi.mocked(mockAmbientAudio.pause).mockClear();
    vi.mocked(groqService.generateScene).mockClear();

    // Change to a different city
    const newCity: City = {
      id: "new-city",
      name: "New City",
      country: "New Country",
      lat: 10,
      lng: 10,
    };

    rerender({ city: newCity, era: mockEra });

    // Verify cleanup occurred
    await waitFor(() => {
      expect(mockSceneAudio.pause).toHaveBeenCalled();
      expect(mockAmbientAudio.pause).toHaveBeenCalled();
    });

    // Verify new generation started
    expect(groqService.generateScene).toHaveBeenCalledWith(
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

    // Verify scene was regenerated (same mock data, but the flow ran)
    expect(result.current.scene).toBeTruthy();
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * Property 2: Preservation - Playlist Sequencing with 400ms Gaps
   * 
   * IMPORTANT: This test should PASS on unfixed code
   * 
   * Verify that playlist advances with proper 400ms gaps between segments.
   */
  it("should sequence playlist with 400ms gaps between segments", async () => {
    const { result } = renderHook(() => useAudioPostcard(mockCity, mockEra));

    // Wait for initial playback
    await waitFor(
      () => {
        expect(result.current.isPlaying).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify intro is playing
    expect(mockSceneAudio.src).toBe("intro-url");

    // Clear play mock to track next call
    vi.mocked(mockSceneAudio.play).mockClear();

    // Trigger intro completion
    if (mockSceneAudio.onended) {
      mockSceneAudio.onended(new Event("ended"));
    }

    // Wait for the 400ms gap + a bit more
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify next segment started playing
    expect(mockSceneAudio.play).toHaveBeenCalled();
    expect(mockSceneAudio.src).toBe("scene-url-1");
  });
});
