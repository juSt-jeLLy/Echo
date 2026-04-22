# Bugfix Requirements Document

## Introduction

When users switch between "Wander the City" and "Documentary" modes in the CityPanel component, the previous mode's audio continues playing while the new mode's audio also starts. This results in both audio streams playing simultaneously, creating a confusing and unpleasant user experience. The root cause is that the `useAudioPostcard` and `useDocumentary` hooks do not stop their audio playback when they receive null inputs (which happens when the mode switches and the inactive hook is passed null to prevent API calls).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user switches from "Wander the City" mode to "Documentary" mode THEN the system continues playing the wander mode's audio (scene audio and ambient soundscape) while simultaneously starting the documentary audio

1.2 WHEN the user switches from "Documentary" mode to "Wander the City" mode THEN the system continues playing the documentary audio while simultaneously starting the wander mode's audio (scene audio and ambient soundscape)

1.3 WHEN the `useAudioPostcard` hook receives null inputs (city or era) due to mode switch THEN the system does not stop or cleanup the currently playing audio from `sceneAudioRef` and `ambientRef`

1.4 WHEN the `useDocumentary` hook receives null inputs (city, era, or voice) due to mode switch THEN the system does not stop or cleanup the currently playing audio from `audioRef`

### Expected Behavior (Correct)

2.1 WHEN the user switches from "Wander the City" mode to "Documentary" mode THEN the system SHALL stop all wander mode audio (scene audio and ambient soundscape) before starting the documentary audio

2.2 WHEN the user switches from "Documentary" mode to "Wander the City" mode THEN the system SHALL stop the documentary audio before starting the wander mode audio

2.3 WHEN the `useAudioPostcard` hook receives null inputs (city or era) due to mode switch THEN the system SHALL immediately pause and reset both `sceneAudioRef` and `ambientRef` audio elements

2.4 WHEN the `useDocumentary` hook receives null inputs (city, era, or voice) due to mode switch THEN the system SHALL immediately pause and reset the `audioRef` audio element

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user plays audio in "Wander the City" mode without switching modes THEN the system SHALL CONTINUE TO play the scene audio and ambient soundscape correctly with proper sequencing and 400ms gaps

3.2 WHEN the user plays audio in "Documentary" mode without switching modes THEN the system SHALL CONTINUE TO play the documentary segments progressively with proper prefetching and transitions

3.3 WHEN the user uses the play/pause toggle button within a single mode THEN the system SHALL CONTINUE TO pause and resume audio correctly without stopping or resetting playback

3.4 WHEN the user clicks retry after an error in either mode THEN the system SHALL CONTINUE TO regenerate and play the audio correctly

3.5 WHEN the `useAudioPostcard` hook completes its playlist THEN the system SHALL CONTINUE TO stop playback and reset state correctly

3.6 WHEN the `useDocumentary` hook completes all 4 segments THEN the system SHALL CONTINUE TO stop playback and reset state correctly

3.7 WHEN either hook aborts due to component unmount or new generation THEN the system SHALL CONTINUE TO cleanup resources (abort controllers, URL revocation, timers) correctly
