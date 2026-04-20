export type Era = {
  id: string;
  year: number;
  label: string;
  tagline: string;
  custom?: boolean;
};

export const ERAS: Era[] = [
  { id: "1800", year: 1800, label: "1800", tagline: "Lantern light · horse and carriage" },
  { id: "1850", year: 1850, label: "1850", tagline: "Steam · gaslight · ink and paper" },
  { id: "1900", year: 1900, label: "1900", tagline: "Trams · brass bands · early cinema" },
  { id: "1920", year: 1920, label: "1920", tagline: "Jazz age · radio dawn · electric hum" },
  { id: "1950", year: 1950, label: "1950", tagline: "Neon diners · rock 'n' roll · chrome" },
  { id: "1980", year: 1980, label: "1980", tagline: "Cassette streets · synth glow" },
  { id: "now", year: new Date().getFullYear(), label: "Present", tagline: "The city as it whispers today" },
];
