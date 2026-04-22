# Requirements Document

## Introduction

Two improvements to the City Whispers app: (1) repositioning the `CityPanel` and `EraCard` overlay cards from a bottom-anchored layout to a true viewport-centered modal layout so the globe remains visible behind them, and (2) increasing the number of AI-generated voice lines from 5–6 to 15–18 so each audio scene runs approximately one minute instead of 15–20 seconds.

## Glossary

- **CityPanel**: The React component that displays city/era metadata and audio playback controls.
- **EraCard**: The React component that lets the user choose a historical era for a selected city.
- **GlobeScene**: The 3-D globe rendered behind all overlay cards.
- **SceneLine**: A single character voice line produced by the Groq API and later synthesised by ElevenLabs.
- **Groq_Service**: The `groqService.ts` module that calls the Groq LLM API to generate scene data.
- **Audio_Scene**: The complete set of `SceneLine` objects that are sequentially synthesised and played back.

## Requirements

### Requirement 1: Center CityPanel on the viewport

**User Story:** As a user, I want the city audio panel to appear in the centre of the screen so that I can see the globe behind it while listening.

#### Acceptance Criteria

1. THE `CityPanel` SHALL use `fixed inset-0` positioning so that it covers the full viewport area.
2. THE `CityPanel` SHALL use `flex items-center justify-center` so that the inner card is centred both vertically and horizontally.
3. THE `CityPanel` inner card SHALL have a maximum width of `max-w-3xl`.
4. THE `CityPanel` inner card SHALL use `px-8 sm:px-10 py-8` padding.
5. WHEN `CityPanel` is visible, THE `GlobeScene` SHALL remain visible behind the card through the existing glassmorphism backdrop.

### Requirement 2: Center EraCard on the viewport

**User Story:** As a user, I want the era selection card to appear in the centre of the screen so that the globe context is preserved while I choose an era.

#### Acceptance Criteria

1. THE `EraCard` SHALL use `fixed inset-0` positioning so that it covers the full viewport area.
2. THE `EraCard` SHALL use `flex items-center justify-center` so that the inner card is centred both vertically and horizontally.
3. THE `EraCard` inner card SHALL retain its existing `max-w-3xl` maximum width.
4. THE `EraCard` inner card SHALL use `px-8 sm:px-10 py-8` padding.
5. WHEN `EraCard` is visible, THE `GlobeScene` SHALL remain visible behind the card through the existing glassmorphism backdrop.

### Requirement 3: Generate longer audio scenes

**User Story:** As a user, I want each audio scene to last approximately one minute so that I feel more immersed in the historical moment.

#### Acceptance Criteria

1. WHEN `Groq_Service` generates an `Audio_Scene`, THE `Groq_Service` SHALL request 15–18 `SceneLine` objects from the LLM.
2. THE `Groq_Service` SHALL allow each `SceneLine` to contain 5–20 words to accommodate the wider range of line types.
3. THE `Groq_Service` SHALL set `max_tokens` to 800 for the voice-line generation call to accommodate the increased line count.
4. WHEN the LLM returns fewer than 15 lines due to truncation, THE `Groq_Service` SHALL still parse and return whatever valid `SceneLine` objects are present.
