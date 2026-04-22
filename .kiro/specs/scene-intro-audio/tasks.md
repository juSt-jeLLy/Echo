# Tasks

## Task List

- [x] 1. Add `synthesiseIntro` to `elevenLabsService.ts`
  - [x] 1.1 Import `City` type from `@/data/cities`
  - [x] 1.2 Implement `synthesiseIntro(city, eventName, atmosphere, signal?)` function
  - [x] 1.3 Build intro text string from parameters
  - [x] 1.4 Call TTS API with George voice and specified voice settings
  - [x] 1.5 Stream response chunks and create object URL
  - [x] 1.6 Return null on any error (non-fatal)

- [x] 2. Update `useAudioPostcard.ts` to generate intro in parallel and prepend to playlist
  - [x] 2.1 Import `synthesiseIntro` from `elevenLabsService`
  - [x] 2.2 Replace two-way `Promise.all` with three-way including `synthesiseIntro`
  - [x] 2.3 Prepend `introUrl` to playlist with `.filter(Boolean)`

- [x] 3. Build verification
  - [x] 3.1 Run `npm run build` and confirm zero errors
