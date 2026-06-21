'use client';

/**
 * Lazy, fault-tolerant 3D hero.
 *
 * Renders a static poster fallback until the WebGL scene loads, AND permanently
 * for: prefers-reduced-motion, no-WebGL environments, and any canvas/runtime
 * failure (caught by the error boundary). Canvas failure must never produce a
 * blank/white screen — the poster stays.
 *
 * Scroll-driven motion: when a `scrollTargetRef` (the hero section) is provided,
 * Framer's useScroll tracks its progress through the viewport and feeds a 0..1
 * value into the R3F scene's camera dolly + car yaw via a mutable ref (so the
 * render loop reads it without React re-renders). Disabled under reduced motion.
 *
 * The heavy three/postprocessing scene is dynamically imported (ssr:false) so it
 * stays code-split out of the first-load JS bundle.
 */
import dynamic from 'next/dynamic';
import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';

const HeroScene = dynamic(() => import('./HeroScene'), {
  ssr: false,
  loading: () => <HeroPoster />,
});

/** Static poster — pure CSS, no image asset required. */
function HeroPoster() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(60% 60% at 70% 40%, rgba(255,59,64,0.22) 0%, rgba(225,29,42,0.06) 40%, rgba(13,13,13,0) 70%), #0d0d0d',
      }}
    >
      <div
        className="absolute right-[8%] top-1/2 -translate-y-1/2 h-56 w-56 md:h-80 md:w-80 rounded-full opacity-70"
        style={{
          background:
            'conic-gradient(from 140deg, rgba(255,59,64,0.0), rgba(255,59,64,0.55), rgba(225,29,42,0.1), rgba(255,59,64,0.0))',
          filter: 'blur(2px)',
        }}
      />
    </div>
  );
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <HeroPoster />;
    return this.props.children;
  }
}

function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function Hero3D({ scrollTargetRef }: { scrollTargetRef?: RefObject<HTMLElement> }) {
  const [enable3D, setEnable3D] = useState(false);
  const reduce = useReducedMotion();
  const scrollProgress = useRef(0);

  // Track scroll progress of the hero section into a plain ref (no re-render).
  const { scrollYProgress } = useScroll({
    target: scrollTargetRef,
    offset: ['start start', 'end start'],
  });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    scrollProgress.current = reduce ? 0 : v;
  });

  useEffect(() => {
    if (!reduce && webglSupported()) setEnable3D(true);
  }, [reduce]);

  return (
    <div className="absolute inset-0 z-0">
      {enable3D ? (
        <CanvasErrorBoundary>
          <Suspense fallback={<HeroPoster />}>
            <HeroScene scroll={scrollProgress} />
          </Suspense>
        </CanvasErrorBoundary>
      ) : (
        <HeroPoster />
      )}
    </div>
  );
}
