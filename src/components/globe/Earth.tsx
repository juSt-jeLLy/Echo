import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import earthDay from "@/assets/earth-day.jpg";

type Props = {
  radius?: number;
};

/**
 * The solid Earth sphere (no rotation logic — the parent group handles that
 * so markers stay anchored to the surface).
 */
export function Earth({ radius = 1 }: Props) {
  const dayMap = useLoader(THREE.TextureLoader, earthDay);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;
  }, [dayMap]);

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 96, 96]} />
      <meshPhongMaterial
        map={dayMap}
        shininess={8}
        specular={new THREE.Color("#1a3a5c")}
        emissive={new THREE.Color("#0a1a2a")}
        emissiveIntensity={0.18}
      />
    </mesh>
  );
}
