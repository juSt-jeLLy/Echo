import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { Earth } from "./Earth";
import { Clouds } from "./Clouds";
import { Atmosphere } from "./Atmosphere";
import { CityMarker } from "./CityMarker";
import { Starfield } from "./Starfield";
import { City, cities, latLngToVector3 } from "@/data/cities";

const GLOBE_RADIUS = 1;

type SceneProps = {
  selectedCity: City | null;
  onSelect: (city: City) => void;
  setReady: (b: boolean) => void;
};

/**
 * The Earth + city markers share this rotating group, so cities stay anchored
 * to their geographic position as the planet spins.
 */
function RotatingGlobe({
  selectedCity,
  onSelect,
  autoRotate,
  targetRotationY,
}: {
  selectedCity: City | null;
  onSelect: (city: City) => void;
  autoRotate: boolean;
  targetRotationY: number | null;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (targetRotationY !== null) {
      // Smoothly interpolate toward the target rotation when a city is focused.
      const cur = groupRef.current.rotation.y;
      groupRef.current.rotation.y += (targetRotationY - cur) * Math.min(1, delta * 4);
    } else if (autoRotate) {
      groupRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <Earth radius={GLOBE_RADIUS} />
      {cities.map((c) => (
        <CityMarker
          key={c.id}
          city={c}
          radius={GLOBE_RADIUS}
          isSelected={selectedCity?.id === c.id}
          showLabel={!!c.major}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function CameraRig({
  selectedCity,
  controlsRef,
}: {
  selectedCity: City | null;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (selectedCity) {
      // Bring the camera in front of the globe, looking at center.
      // The globe will rotate the city to face the camera (handled in Scene).
      controls.enabled = false;
      gsap.to(camera.position, {
        x: 0, y: 0.25, z: 2.05,
        duration: 1.8,
        ease: "power3.inOut",
        onUpdate: () => camera.lookAt(0, 0, 0),
        onComplete: () => {
          controls.enabled = true;
          controls.update();
        },
      });
      gsap.to(controls.target, {
        x: 0, y: 0, z: 0, duration: 1.8, ease: "power3.inOut",
        onUpdate: () => controls.update(),
      });
    } else {
      controls.enabled = false;
      gsap.to(camera.position, {
        x: 0, y: 0.4, z: 3.6,
        duration: 1.6,
        ease: "power3.inOut",
        onUpdate: () => camera.lookAt(0, 0, 0),
        onComplete: () => {
          controls.enabled = true;
          controls.update();
        },
      });
      gsap.to(controls.target, {
        x: 0, y: 0, z: 0, duration: 1.6, ease: "power3.inOut",
        onUpdate: () => controls.update(),
      });
    }
  }, [selectedCity, camera, controlsRef]);

  return null;
}

function Scene({ selectedCity, onSelect, setReady }: SceneProps) {
  const controlsRef = useRef<any>(null);
  const [userInteracting, setUserInteracting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(t);
  }, [setReady]);

  // When a city is selected, compute the globe rotation that brings it to the
  // front (camera sits on +Z). The marker's local position has its X/Z swept
  // by the group's Y-rotation; we want the resulting (x, z) to satisfy
  // x = 0, z > 0. So target rotation = atan2(-x0, z0) where (x0, _, z0) is the
  // unrotated marker position.
  const targetRotationY = (() => {
    if (!selectedCity) return null;
    const [x0, , z0] = latLngToVector3(selectedCity.lat, selectedCity.lng, GLOBE_RADIUS);
    return Math.atan2(-x0, z0);
  })();

  const autoRotate = !selectedCity && !userInteracting;

  return (
    <>
      <ambientLight intensity={0.35} color="#9ec5ff" />
      <directionalLight position={[5, 3, 5]} intensity={1.4} color="#fff7e6" castShadow />
      <directionalLight position={[-6, -2, -4]} intensity={0.25} color="#5a78ff" />

      <Starfield />
      <Atmosphere radius={GLOBE_RADIUS} />

      <Suspense fallback={null}>
        <RotatingGlobe
          selectedCity={selectedCity}
          onSelect={onSelect}
          autoRotate={autoRotate}
          targetRotationY={targetRotationY}
        />
        <Clouds radius={GLOBE_RADIUS} speed={autoRotate ? 0.055 : 0.012} />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={1.6}
        maxDistance={6}
        onStart={() => setUserInteracting(true)}
        onEnd={() => setUserInteracting(false)}
      />

      <CameraRig selectedCity={selectedCity} controlsRef={controlsRef} />
    </>
  );
}

type Props = {
  selectedCity: City | null;
  onSelect: (city: City) => void;
  onReady: () => void;
};

export function GlobeScene({ selectedCity, onSelect, onReady }: Props) {
  const [, setReady] = useState(false);
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.4, 3.6], fov: 45, near: 0.1, far: 1000 }}
      onCreated={() => onReady()}
    >
      <Scene
        selectedCity={selectedCity}
        onSelect={onSelect}
        setReady={(b) => {
          setReady(b);
          if (b) onReady();
        }}
      />
    </Canvas>
  );
}
