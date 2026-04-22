---
inclusion: auto
---

# City Whispers — Project Standards

## Tech Stack
- React 18 + TypeScript (strict mode)
- Vite for bundling
- TailwindCSS + shadcn/ui + Radix UI for styling
- Three.js + React Three Fiber for 3D globe
- Vitest + fast-check for property-based testing

## Code Style
- Prefer functional components with hooks — no class components
- Co-locate types with the component or hook that owns them
- Use `useCallback` and `useRef` for stable references in audio hooks
- Prefer `const` over `let`; avoid `var`
- Use named exports for components and hooks; default export only for pages

## File Organization
- Components in `src/components/` (globe/ and ui-extras/ subdirectories)
- Pages in `src/pages/`
- Custom hooks in `src/hooks/`
- API service functions in `src/services/`
- Static data in `src/data/`
- Shared utilities in `src/lib/`

## Naming Conventions
- Components: PascalCase (`CityPanel.tsx`)
- Hooks: camelCase with `use` prefix (`useAudioPostcard.ts`)
- Services: camelCase with `Service` suffix (`elevenLabsService.ts`)
- Types/interfaces: PascalCase (`SceneResult`, `AudioPostcardState`)
- Constants: SCREAMING_SNAKE_CASE (`NARRATOR_VOICES`, `VOICE_ID_MAP`)

## Error Handling
- All async functions must handle AbortError separately (never surface to user)
- API errors should log with `[serviceName]` prefix: `console.warn("[elevenLabsService] ...")`
- User-facing errors go into state (`setError(message)`) — never `throw` to the UI
- Always provide a `retry` callback alongside error state

## Testing
- Use Vitest for unit tests
- Use fast-check for property-based tests on pure functions
- Test files co-located with source: `useAudioPostcard.test.ts` next to `useAudioPostcard.ts`
- Run tests with `npm test` (single run) or `npm run test:watch` (watch mode)

## Environment Variables
- All client-side env vars must be prefixed with `VITE_`
- Required vars: `VITE_ELEVENLABS_API_KEY`, `VITE_GROQ_API_KEY`, `VITE_HISTORIAN_AGENT_ID`
- Never commit `.env` — it is in `.gitignore`
- Validate env vars at module load time and throw descriptive errors if missing
