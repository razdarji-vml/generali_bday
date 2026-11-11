"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CANDLES, COPY } from "@/lib/config";
import { sfx, vibrate } from "@/lib/audio";
import type { BlowDetector } from "@/lib/blow";
import { Curtains } from "./Curtains";
import { Cake, type CandleState } from "./Cake";

type Phase = "closed" | "opening" | "lighting" | "wish" | "blow" | "out";

type Props = {
  name: string;
  detector?: BlowDetector;
  celebrating: boolean;
  onBlownOut: () => void;
  debug: boolean;
};

// Deterministic "random" so renders stay pure.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const MOTES = Array.from({ length: 22 }, (_, i) => ({
  left: 25 + hash(i) * 50,
  top: 10 + hash(i + 40) * 70,
  size: 1.5 + hash(i + 80) * 2.5,
  dur: 7 + hash(i + 120) * 8,
  delay: -hash(i + 160) * 12,
}));

export function Theatre({ name, detector, celebrating, onBlownOut, debug }: Props) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [candles, setCandles] = useState<CandleState[]>(() => Array(CANDLES).fill("unlit"));
  const [hint, setHint] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLPreElement>(null);
  const holding = useRef(false);
  const micLive = !!detector?.active;

  const open = useCallback(() => {
    setPhase("opening");
    sfx.snap();
    vibrate([30, 30, 60]);
    window.setTimeout(() => sfx.whoosh(1.9), 180);
    window.setTimeout(() => sfx.drumroll(2.3), 1100);
  }, []);

  // opening → lighting (after curtains part and the cake has risen)
  useEffect(() => {
    if (phase !== "opening") return;
    const t = window.setTimeout(() => setPhase("lighting"), 3500);
    return () => window.clearTimeout(t);
  }, [phase]);

  // lighting: candles catch one by one
  useEffect(() => {
    if (phase !== "lighting") return;
    const order = [2, 1, 3, 0, 4].filter((i) => i < CANDLES).concat(
      Array.from({ length: Math.max(0, CANDLES - 5) }, (_, k) => k + 5),
    );
    const timers = order.map((idx, k) =>
      window.setTimeout(() => {
        setCandles((c) => c.map((s, i) => (i === idx ? "lit" : s)));
        sfx.light();
        vibrate(8);
      }, 200 + k * 300),
    );
    timers.push(window.setTimeout(() => setPhase("wish"), 200 + order.length * 300 + 500));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase]);

  // wish → blow
  useEffect(() => {
    if (phase !== "wish") return;
    const t = window.setTimeout(() => setPhase("blow"), 2600);
    return () => window.clearTimeout(t);
  }, [phase]);

  // blow: the mic loop. Writes CSS vars directly — no React renders per frame.
  useEffect(() => {
    if (phase !== "blow") return;
    const root = rootRef.current;
    const health = Array.from({ length: CANDLES }, (_, i) => 0.45 + hash(i + Date.now() % 997) * 0.75);
    const max = [...health];
    const gone = Array<boolean>(CANDLES).fill(false);
    let last = performance.now();
    let smooth = 0;
    let hold = 0;
    let raf = 0;
    let anyOut = false;
    const hintTimer = window.setTimeout(() => {
      if (!anyOut) setHint(true);
    }, 7000);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = detector?.sample() ?? { rms: 0, threshold: 0, level: 0, intensity: 0 };
      hold = holding.current ? Math.min(1, hold + dt * 2.5) : Math.max(0, hold - dt * 5);
      const level = Math.max(s.level, hold * 0.85);
      const intensity = Math.max(s.intensity, hold > 0.25 ? hold * 0.7 : 0);
      smooth += (level - smooth) * Math.min(1, dt * 16);

      root?.style.setProperty("--breath", smooth.toFixed(3));
      if (meterRef.current) meterRef.current.style.transform = `scaleX(${Math.min(1, smooth * 1.15).toFixed(3)})`;
      if (debugRef.current)
        debugRef.current.textContent = `rms ${s.rms.toFixed(3)}  thr ${s.threshold.toFixed(3)}  blow ${intensity.toFixed(2)}`;

      if (intensity > 0) {
        for (let i = 0; i < CANDLES; i++) {
          if (gone[i]) continue;
          health[i] -= dt * (0.6 + 2.4 * intensity);
          root?.style.setProperty(`--hp${i}`, Math.max(0, health[i] / max[i]).toFixed(3));
          if (health[i] <= 0) {
            gone[i] = true;
            anyOut = true;
            setCandles((c) => c.map((st, k) => (k === i ? "out" : st)));
            sfx.puff();
            vibrate(14);
          }
        }
      }

      if (gone.every(Boolean)) {
        setPhase("out");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hintTimer);
    };
  }, [phase, detector]);

  // all out → a beat of darkness → celebrate
  useEffect(() => {
    if (phase !== "out") return;
    detector?.stop();
    rootRef.current?.style.setProperty("--breath", "0");
    const t = window.setTimeout(onBlownOut, 1300);
    return () => window.clearTimeout(t);
  }, [phase, detector, onBlownOut]);

  // Space bar = blow (desktop testing / accessibility)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") holding.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") holding.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const stageLit = phase !== "closed";
  const litCount = candles.filter((c) => c === "lit").length;

  return (
    <div
      ref={rootRef}
      className="theatre"
      onPointerDown={() => (holding.current = phase === "blow")}
      onPointerUp={() => (holding.current = false)}
      onPointerCancel={() => (holding.current = false)}
      onPointerLeave={() => (holding.current = false)}
    >
      <div className="floor" />
      <motion.div
        className="spotlight"
        initial={{ opacity: 0 }}
        animate={{ opacity: stageLit ? [0, 0.7, 0.25, 1] : 0 }}
        transition={{ duration: 1.2, delay: 0.9, times: [0, 0.2, 0.35, 1] }}
      />
      <motion.div
        className="pool"
        initial={{ opacity: 0 }}
        animate={{ opacity: stageLit ? 1 : 0 }}
        transition={{ duration: 1.2, delay: 1.2 }}
      />
      {stageLit && (
        <div className="motes" aria-hidden>
          {MOTES.map((m, i) => (
            <span
              key={i}
              style={{
                left: `${m.left}%`,
                top: `${m.top}%`,
                width: m.size,
                height: m.size,
                animationDuration: `${m.dur}s`,
                animationDelay: `${m.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="cake-wrap"
        initial={{ y: "75vh" }}
        animate={
          celebrating
            ? { y: 0, scale: 0.6 }
            : stageLit
              ? { y: 0, scale: 1 }
              : { y: "75vh", scale: 1 }
        }
        transition={
          celebrating
            ? { duration: 1.2, ease: [0.3, 0.7, 0.2, 1] }
            : { type: "spring", stiffness: 55, damping: 13, delay: 1.3 }
        }
      >
        <div className="cake-glow" style={{ opacity: litCount / CANDLES }} />
        <Cake candles={candles} />
      </motion.div>

      <div className="prompt">
        <AnimatePresence mode="wait">
          {phase === "wish" && (
            <motion.h2
              key="wish"
              className="prompt-title gold-text"
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.8 }}
            >
              {COPY.wish}
            </motion.h2>
          )}
          {phase === "blow" && (
            <motion.div
              key="blow"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="prompt-title">{COPY.blow}</h2>
              <p className="prompt-sub">
                {!micLive ? COPY.blowSubHold : hint ? COPY.blowHint : COPY.blowSubMic}
              </p>
              <div className="meter">
                <div ref={meterRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Curtains name={name} opened={phase !== "closed"} onOpen={open} />

      <motion.div
        className="house-lights"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />
      <div className="vignette" />
      {debug && <pre ref={debugRef} className="debug" />}
    </div>
  );
}
