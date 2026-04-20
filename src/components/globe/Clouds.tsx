import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import earthClouds from "@/assets/earth-clouds.jpg";

type Props = {
  radius: number;
  speed?: number;
};

export function Clouds({ radius, speed = 0.012 }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const cloudMap = useLoader(THREE.TextureLoader, earthClouds);

  useMemo(() => {
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.anisotropy = 8;
  }, [cloudMap]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius * 1.012, 96, 96]} />
      <meshPhongMaterial
        map={cloudMap}
        alphaMap={cloudMap}
        transparent
        opacity={0.4}
        depthWrite={false}
        color={new THREE.Color("#e8f1ff")}
      />
    </mesh>
  );
}
