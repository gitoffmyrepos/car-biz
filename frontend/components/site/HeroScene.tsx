'use client';

/**
 * The actual WebGL scene for the hero. Abstract gold wireframe — restraint, not
 * a playground. No glTF asset is shipped in public/, so we render a single
 * slowly auto-rotating torus-knot with a gold rim light on near-black. If/when
 * a car model is added (public/models/car.glb), swap the <mesh> for <useGLTF>.
 *
 * Pinned three 0.169 + @react-three/fiber 8.x avoids the 0.184 context-loss /
 * invisible-mesh class of bugs seen on the FX frontend.
 */
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

function GoldKnot() {
  const ref = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.18;
      ref.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <mesh ref={ref} scale={1.35}>
      <torusKnotGeometry args={[1, 0.28, 220, 32]} />
      <meshStandardMaterial
        color="#B8963E"
        emissive="#3a2c10"
        metalness={0.9}
        roughness={0.25}
        wireframe
      />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} color="#D4AF6A" />
      <pointLight position={[-6, -3, -4]} intensity={0.6} color="#B8963E" />
      <GoldKnot />
    </Canvas>
  );
}
