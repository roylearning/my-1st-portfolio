/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetTimeRef = useRef<number>(0);
  const smoothTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  // Direct DOM refs instead of React state — eliminates re-render lag entirely
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);

  const targetMouseRef = useRef({ x: 0, y: 0 });
  const smoothMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !Number.isNaN(video.duration)) {
        const initial = video.currentTime || 0;
        targetTimeRef.current = initial;
        smoothTimeRef.current = initial;
      }
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);

    // Single RAF loop — all DOM writes batched, zero React state updates
    const renderLoop = () => {
      // 1. Smooth video scrubbing with faster damping (0.12 vs old 0.075)
      if (video && video.duration && !Number.isNaN(video.duration)) {
        const timeDiff = targetTimeRef.current - smoothTimeRef.current;
        smoothTimeRef.current += timeDiff * 0.12;

        if (!isSeekingRef.current && Math.abs(video.currentTime - smoothTimeRef.current) > 0.01) {
          isSeekingRef.current = true;
          try {
            if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
              (video as any).fastSeek(smoothTimeRef.current);
            } else {
              video.currentTime = smoothTimeRef.current;
            }
          } catch {
            isSeekingRef.current = false;
          }
        }
      }

      // 2. Smooth parallax lerp — write directly to DOM, skip React entirely
      const mx = targetMouseRef.current.x - smoothMouseRef.current.x;
      const my = targetMouseRef.current.y - smoothMouseRef.current.y;
      smoothMouseRef.current.x += mx * 0.08;
      smoothMouseRef.current.y += my * 0.08;

      const sx = smoothMouseRef.current.x;
      const sy = smoothMouseRef.current.y;

      if (backdropRef.current) {
        backdropRef.current.style.transform = `translate3d(${sx * 12}px,${sy * 12}px,0)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${sx * -20}px,${sy * -20}px,0)`;
      }
      if (textRef.current) {
        textRef.current.style.transform = `translate3d(${sx * -6}px,${sy * -6}px,0)`;
      }

      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    rafIdRef.current = requestAnimationFrame(renderLoop);

    // Input handlers
    const updateTargetPosition = (clientX: number, clientY: number) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;

      const normalizedX = Math.max(0, Math.min(1, clientX / window.innerWidth));
      targetTimeRef.current = normalizedX * v.duration;

      targetMouseRef.current = {
        x: (clientX / window.innerWidth - 0.5) * 2,
        y: (clientY / window.innerHeight - 0.5) * 2,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateTargetPosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateTargetPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-[#00141d] text-white">
      {/* Dynamic ambient radial backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-0 pointer-events-none will-change-transform"
        style={{
          background: 'radial-gradient(ellipse at 70% 50%, #003747 0%, #00222e 45%, #00121a 100%)',
        }}
      />

      {/* Ambient background glow orb */}
      <div
        ref={glowRef}
        className="fixed top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none ambient-glow will-change-transform"
      />

      {/* CHARACTER VIDEO — full character, no cropping, shifted right */}
      <video
        ref={videoRef}
        src="/assets/character.mp4"
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 z-0 w-full h-full object-contain pointer-events-none"
        style={{
          objectPosition: 'calc(100% + 120px) center',
          background: 'transparent',
        }}
      />

      {/* Seamless background blend — no hard edges or visible lines */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 0% 50%, #00141d 0%, rgba(0,20,29,0.6) 40%, transparent 80%)',
        }}
      />

      {/* MAIN LEFT-SIDE CONTENT */}
      <main className="relative z-10 w-full h-full flex items-center px-6 sm:px-12 md:px-16 lg:px-24">
        <div
          ref={textRef}
          className="max-w-3xl flex flex-col items-start text-left pointer-events-auto will-change-transform"
        >
          {/* Greeting */}
          <span
            className="animate-reveal-greeting text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-wide text-white/80 mb-2 sm:mb-4 select-text"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Hi, i am
          </span>

          {/* Name */}
          <h1
            className="animate-reveal-name text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tight text-white uppercase leading-none select-text drop-shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.03em',
            }}
          >
            ATANU ROY
          </h1>
        </div>
      </main>
    </div>
  );
}
