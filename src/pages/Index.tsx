import { useEffect, useState } from "react";
import { GlobeScene } from "@/components/globe/GlobeScene";
import { TopBar } from "@/components/ui-extras/TopBar";
import { CityPanel } from "@/components/ui-extras/CityPanel";
import { EraCard } from "@/components/ui-extras/EraCard";
import { Hint } from "@/components/ui-extras/Hint";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";

type Step = "idle" | "era" | "experience";

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [ambient, setAmbient] = useState(true);
  const [ready, setReady] = useState(false);

  // SEO
  useEffect(() => {
    document.title = "City Whispers — Audio postcards from a 3D Earth";
    const desc =
      "Explore an interactive 3D Earth, choose a city and an era, and tune into immersive audio postcards from across history.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + "/";
  }, []);

  const handleSelectCity = (c: City) => {
    setSelectedCity(c);
    setSelectedEra(null);
    setStep("era");
  };

  const handleSelectEra = (era: Era) => {
    setSelectedEra(era);
    setStep("experience");
  };

  const handleBackToEra = () => setStep("era");

  const handleClose = () => {
    setStep("idle");
    setSelectedCity(null);
    setSelectedEra(null);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 -left-32 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, hsl(265 85% 35% / 0.55), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, hsl(200 95% 35% / 0.5), transparent 70%)" }}
        />
      </div>

      {/* Loading veil */}
      <div
        className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground tracking-widest uppercase">Tuning the Earth…</p>
        </div>
      </div>

      {/* 3D scene */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
        <GlobeScene
          selectedCity={selectedCity}
          onSelect={handleSelectCity}
          onReady={() => setReady(true)}
        />
      </div>

      <TopBar
        ambient={ambient}
        onToggleAmbient={() => setAmbient((a) => !a)}
        onSearchSelect={(c) => handleSelectCity(c)}
      />

      <Hint visible={ready && step === "idle"} />

      {step === "era" && (
        <EraCard city={selectedCity} onSelectEra={handleSelectEra} onClose={handleClose} />
      )}
      {step === "experience" && (
        <CityPanel
          city={selectedCity}
          era={selectedEra}
          onBack={handleBackToEra}
          onClose={handleClose}
        />
      )}
    </main>
  );
};

export default Index;
