'use client';

/**
 * The hero vehicle. Two paths:
 *
 *  1. If public/models/car.glb exists, load + render it via useGLTF (Suspense
 *     boundary in HeroScene catches the load). The GLB is OPTIONAL — see
 *     ASSET GAP in the overhaul notes. drei's useGLTF throws (suspends) while
 *     loading and throws hard if the file 404s; the GLBErrorBoundary in
 *     HeroScene swaps to the procedural car on any failure so a missing asset
 *     NEVER blocks the hero.
 *
 *  2. Procedural fallback: a sleek low-poly sports car built from primitives —
 *     body + cabin + 4 wheels, dark paint + gold trim, PBR metalness/roughness.
 *
 * This module deliberately keeps both in one file so the boundary swap is local.
 */
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import type { Group } from 'three';

/** Set to a real path once an asset is shipped. Empty string = always procedural. */
export const CAR_GLB_PATH = '/models/car.glb';

const PAINT = '#15161a';
const GOLD = '#c8a253';
const GLASS = '#0c0e12';
const TIRE = '#0a0a0a';

export function GltfCar({ path = CAR_GLB_PATH }: { path?: string }) {
  // useGLTF suspends; a 404 rejects the loader promise and the parent error
  // boundary renders the procedural car instead.
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} scale={1.2} />;
}

export function ProceduralCar({ groupRef }: { groupRef?: React.Ref<Group> }) {
  return (
    <group ref={groupRef} position={[0, -0.35, 0]} rotation={[0, -0.5, 0]}>
      {/* Lower body */}
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[3.4, 0.55, 1.5]} />
        <meshStandardMaterial color={PAINT} metalness={0.85} roughness={0.28} />
      </mesh>
      {/* Mid body — tapered hood/trunk via a slightly wider, flatter box */}
      <mesh castShadow receiveShadow position={[0, 0.62, 0]}>
        <boxGeometry args={[3.0, 0.4, 1.42]} />
        <meshStandardMaterial color={PAINT} metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Cabin / greenhouse */}
      <mesh castShadow position={[-0.1, 0.98, 0]}>
        <boxGeometry args={[1.7, 0.5, 1.28]} />
        <meshStandardMaterial color={GLASS} metalness={0.6} roughness={0.1} />
      </mesh>
      {/* Roof slab */}
      <mesh castShadow position={[-0.1, 1.24, 0]}>
        <boxGeometry args={[1.5, 0.12, 1.22]} />
        <meshStandardMaterial color={PAINT} metalness={0.9} roughness={0.25} />
      </mesh>
      {/* Gold side accent strips */}
      {[0.76, -0.76].map((z) => (
        <mesh key={z} position={[0, 0.5, z]}>
          <boxGeometry args={[3.42, 0.06, 0.02]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.18} emissive="#3a2c10" />
        </mesh>
      ))}
      {/* Front gold splitter */}
      <mesh position={[1.72, 0.18, 0]}>
        <boxGeometry args={[0.08, 0.12, 1.46]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} emissive="#3a2c10" />
      </mesh>
      {/* Wheels */}
      {[
        [1.15, 0, 0.78],
        [1.15, 0, -0.78],
        [-1.15, 0, 0.78],
        [-1.15, 0, -0.78],
      ].map(([x, , z], i) => (
        <group key={i} position={[x, 0.05, z]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.3, 28]} />
            <meshStandardMaterial color={TIRE} metalness={0.2} roughness={0.85} />
          </mesh>
          {/* Gold rim */}
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.04, 24]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Headlight glow bars */}
      {[0.45, -0.45].map((z) => (
        <mesh key={z} position={[1.74, 0.45, z]}>
          <boxGeometry args={[0.04, 0.1, 0.3]} />
          <meshStandardMaterial color="#fff6df" emissive="#ffd98a" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}
