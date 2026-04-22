# Tasks

## Task List

- [x] 1. Create voice data file
  - [x] 1.1 Create `src/data/voices.ts` with NarratorVoice interface and NARRATOR_VOICES array (6 voices with id, name, description)
  - [x] 1.2 Export DEFAULT_NARRATOR_VOICE as the first voice (George)

- [x] 2. Create documentary service
  - [x] 2.1 Create `src/services/documentaryService.ts`
  - [x] 2.2 Implement `generateDocumentaryScript(city, era, signal?)` — Groq call returning string[4]
  - [x] 2.3 Implement `synthesiseDocumentaryAudio(segments, voiceId, signal?)` — parallel TTS calls returning object URL string[]

- [x] 3. Create useDocumentary hook
  - [x] 3.1 Create `src/hooks/useDocumentary.ts`
  - [x] 3.2 Implement pipeline: generateDocumentaryScript → synthesiseDocumentaryAudio → sequential playlist
  - [x] 3.3 Implement toggle (pause/resume) and retry logic
  - [x] 3.4 Implement AbortController cleanup on city/era/voice change and unmount

- [x] 4. Create ModeCard component
  - [x] 4.1 Create `src/components/ui-extras/ModeCard.tsx`
  - [x] 4.2 Render two large side-by-side mode cards (Wander + Documentary) with icons, titles, descriptions
  - [x] 4.3 Implement inline VoiceSelector that appears when Documentary card is clicked
  - [x] 4.4 Implement confirm button "Listen as [VoiceName] →" and back button

- [x] 5. Update Index.tsx
  - [x] 5.1 Add `"mode"` to Step type
  - [x] 5.2 Add selectedMode and selectedVoice state
  - [x] 5.3 Update handleSelectEra to go to "mode" step instead of "experience"
  - [x] 5.4 Add handleSelectWander, handleSelectDocumentary, handleBackToMode handlers
  - [x] 5.5 Render ModeCard at "mode" step; pass mode + voice props to CityPanel

- [x] 6. Update CityPanel.tsx
  - [x] 6.1 Add mode and voice props to CityPanel
  - [x] 6.2 Add local activeMode state initialised from props
  - [x] 6.3 Call useAudioPostcard and useDocumentary conditionally (null city/era for inactive mode)
  - [x] 6.4 Render ModeToggle tabs (Wander / Documentary)
  - [x] 6.5 Show documentary heading "What was happening in [city] in [era]" when in documentary mode
  - [x] 6.6 Wire playback controls to the active mode's state (isLoading, isPlaying, toggle, retry, error)

- [x] 7. Build verification
  - [x] 7.1 Run `npm run build` and fix any TypeScript or build errors
