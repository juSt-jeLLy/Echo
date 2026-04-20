import { useRef, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { City, latLngToVector3 } from "@/data/cities";

type Props = {
  city: City;
  radius: number;
  isSelected: boolean;
  showLabel: boolean;
  onSelect: (city: City) => void;
};

const _worldPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();

export function CityMarker({ city, radius, isSelected, showLabel, onSelect }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Position marker on the surface, oriented so its local +Z points outward.
  const position = latLngToVector3(city.lat, city.lng, radius * 1.005);
  const normal = new THREE.Vector3(...position).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = (Math.sin(t * 2 + city.lat) + 1) / 2; // 0..1
    if (ringRef.current) {
      const scale = 1 + pulse * 0.9 + (hovered ? 0.4 : 0);
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - pulse) * (hovered ? 0.85 : 0.55);
    }
    if (dotRef.current) {
      const mat = dotRef.current.material as THREE.MeshBasicMaterial;
      const target = hovered || isSelected ? 1 : 0.85;
      mat.opacity += (target - mat.opacity) * 0.12;
      const targetScale = hovered || isSelected ? 1.6 : 1;
      const cur = dotRef.current.scale.x;
      dotRef.current.scale.setScalar(cur + (targetScale - cur) * 0.15);
    }

    // Hide marker + label when it's on the far side of the globe.
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_worldPos);
      _camDir.copy(state.camera.position).sub(_worldPos).normalize();
      const worldNormal = _worldPos.clone().normalize();
      const facing = worldNormal.dot(_camDir); // > 0 means front
      const visible = facing > 0.05;
      if (groupRef.current.visible !== visible) groupRef.current.visible = visible;
      if (labelRef.current) {
        // Fade label as it nears the limb.
        const op = Math.max(0, Math.min(1, (facing - 0.05) * 4));
        labelRef.current.style.opacity = String(op);
      }
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(city);
  };

  const accent = isSelected ? "#c084fc" : hovered ? "#a78bfa" : "#5ec8ff";

  return (
    <group ref={groupRef} position={position} quaternion={quat}>
      {/* Pulsing ring (in tangent plane: XY) */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.012, 0.022, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Glow halo */}
      <mesh>
        <circleGeometry args={[0.014, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Core dot (clickable) */}
      <mesh
        ref={dotRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} />
      </mesh>

      {/* Label — major cities always; others on hover/selected. */}
      {(showLabel || hovered || isSelected) && (
        <Html
          position={[0, 0, 0.035]}
          center
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            ref={labelRef}
            className="flex flex-col items-center -translate-y-3 transition-[opacity] duration-150"
          >
            <div
              className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-display font-medium whitespace-nowrap leading-tight tracking-wide ${
                hovered || isSelected ? "panel-glass text-aurora" : "text-foreground/95"
              }`}
              style={
                hovered || isSelected
                  ? undefined
                  : { textShadow: "0 1px 2px hsl(230 80% 2% / 0.95), 0 0 8px hsl(230 80% 2% / 0.9)" }
              }
            >
              {city.name}
            </div>
            {(hovered || isSelected) && (
              <div className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground tracking-wider uppercase">
                {city.country}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
