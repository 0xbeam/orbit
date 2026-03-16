'use client';

import { useState, useEffect } from 'react';

const WORD = 'andromeda';
const LETTER_DELAY = 60; // ms per letter
const HOLD_DURATION = 1200; // ms to hold before fade out
const FADE_OUT_DURATION = 600; // ms for fade out

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [unmount, setUnmount] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem('andromeda-splash-seen')) {
      setUnmount(true);
      return;
    }

    setVisible(true);

    const totalLetterTime = WORD.length * LETTER_DELAY + 400; // letters + line expand
    const holdTimer = setTimeout(() => {
      setFadeOut(true);
      sessionStorage.setItem('andromeda-splash-seen', '1');
    }, totalLetterTime + HOLD_DURATION);

    const unmountTimer = setTimeout(() => {
      setUnmount(true);
    }, totalLetterTime + HOLD_DURATION + FADE_OUT_DURATION);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (unmount) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-primary transition-opacity ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_OUT_DURATION}ms` }}
    >
      {/* Letters */}
      <div className="flex items-center gap-[2px]" aria-hidden="true">
        {visible &&
          WORD.split('').map((letter, i) => (
            <span
              key={i}
              className="text-5xl font-light text-txt-primary"
              style={{
                opacity: 0,
                animation: `splashFadeIn 300ms ease-out ${i * LETTER_DELAY}ms forwards`,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
              }}
            >
              {letter}
            </span>
          ))}
      </div>

      {/* Accent line */}
      {visible && (
        <div
          className="h-[2px] bg-accent mt-4 rounded-full"
          style={{
            width: 0,
            animation: `splashExpandLine 500ms ease-out ${WORD.length * LETTER_DELAY + 100}ms forwards`,
          }}
        />
      )}
    </div>
  );
}
