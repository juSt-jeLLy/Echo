export interface NarratorVoice {
  id: string;
  name: string;
  description: string;
}

export const NARRATOR_VOICES: NarratorVoice[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George",  description: "Warm storyteller" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  description: "Formal broadcaster" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian",   description: "Resonant narrator" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Professional" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",   description: "Clear educator" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River",   description: "Calm, neutral" },
];

export const DEFAULT_NARRATOR_VOICE: NarratorVoice = NARRATOR_VOICES[0];
