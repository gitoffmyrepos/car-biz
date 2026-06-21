'use client';

/**
 * Cinematic WebGL hero scene.
 *
 * Composition: stylized sports car (GLB if present, else procedural low-poly)
 * on a reflective stage with drei <Environment preset="night"/> for PBR
 * reflections, red key + rim lights, <ContactShadows> grounding, a subtle
 * <Float> bob, slow auto-rotate, mouse-parallax camera, and a clamped Bloom +
 * Vignette pass for a tasteful red glow (kept low so overlaid text stays
 * readable). A `scroll` prop (0..1, fed by the hero's scroll progress in
 * Hero3D) dollies the camera in and adds extra car yaw.
 *
 * Engineering guardrails:
 *  - dpr clamped to [1, 2]; no powerPreference surprises.
 *  - GLB load is OPTIONAL: GLBErrorBoundary falls back to the procedural car so
 *    a missing /models/car.glb never blanks the canvas.
 *  - Pinned three 0.169 + @react-three/fiber 8.x + @react-three/postprocessing
 *    2.16 avoids the three 0.184 context-loss / invisible-mesh class of bugs
 *    seen on the FX frontend.
 *  - This whole module is dynamically imported (ssr:false) by Hero3D, so three
 *    + postprocessing stay code-split out of the first-load bundle.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Float,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Component, Suspense, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { GltfCar, ProceduralCar, CAR_GLB_PATH } from './HeroCar';

/** Swaps to the procedural car if the GLB fails to load (404 / parse error). */
class GLBErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <ProceduralCar />;
    return this.props.children;
  }
}

/** A car that prefers the GLB but always renders SOMETHING. */
function HeroVehicle() {
  // CAR_GLB_PATH may point to a file that does not exist yet; the boundary +
  // Suspense handle both the loading and the missing-asset cases.
  if (!CAR_GLB_PATH) return <ProceduralCar />;
  return (
    <GLBErrorBoundary>
      <Suspense fallback={<ProceduralCar />}>
        <GltfCar />
      </Suspense>
    </GLBErrorBoundary>
  );
}

/** Auto-rotate + scroll-driven yaw applied to the car group. */
function SpinningStage({ scroll }: { scroll: React.MutableRefObject<number> }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      // slow continuous spin + extra yaw from scroll progress
      ref.current.rotation.y += delta * 0.22;
      ref.current.rotation.y += scroll.current * delta * 0.6;
    }
  });
  return (
    <group ref={ref}>
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.35} floatingRange={[-0.05, 0.08]}>
        <HeroVehicle />
      </Float>
    </group>
  );
}

/** Mouse-parallax + scroll-dolly camera rig. */
function CameraRig({ scroll }: { scroll: React.MutableRefObject<number> }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    // base distance pulls in slightly as the user scrolls the hero
    const baseZ = 6.2 - scroll.current * 1.1;
    const targetX = pointer.x * 0.8;
    const targetY = 0.6 + pointer.y * 0.4 - scroll.current * 0.3;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (baseZ - camera.position.z) * 0.05;
    camera.lookAt(0, 0.4, 0);
  });
  return null;
}

export default function HeroScene({ scroll }: { scroll?: React.MutableRefObject<number> }) {
  // Local fallback ref so the scene works even when used without a scroll source.
  const localScroll = useRef(0);
  const scrollRef = scroll ?? localScroll;

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.6, 6.2], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0d0d0d']} />
      <fog attach="fog" args={['#0d0d0d', 8, 18]} />

      {/* Lighting: red key + cool rim on near-black */}
      <ambientLight intensity={0.25} />
      <spotLight
        position={[5, 6, 4]}
        angle={0.5}
        penumbra={0.8}
        intensity={2.4}
        color="#FF3B40"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-6, 2, -4]} intensity={1.1} color="#E11D2A" />
      <pointLight position={[0, 1, 6]} intensity={0.5} color="#ffffff" />

      <Suspense fallback={null}>
        <SpinningStage scroll={scrollRef} />
        <ContactShadows
          position={[0, -0.55, 0]}
          opacity={0.55}
          scale={12}
          blur={2.6}
          far={4}
          color="#000000"
        />
        {/* Reflections without shipping an HDR file (drei bundles presets). */}
        <Environment preset="night" />
      </Suspense>

      <CameraRig scroll={scrollRef} />

      {/* Clamped bloom: low intensity + high luminance threshold so only the
          red trim / headlights glow and overlaid copy stays readable. */}
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={0.55}
          luminanceThreshold={0.65}
          luminanceSmoothing={0.25}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
