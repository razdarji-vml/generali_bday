"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { COPY } from "@/lib/config";
import { sfx, vibrate } from "@/lib/audio";

const COLORS = [
  "#C21B17",
  "#E8D7B4",
  "#D4AF37",
  "#FFFFFF",
  "#F5DF9A",
  "#8E1310",
];
const PAIRS = [
  ["#D4AF37", "#F5DF9A"],
  ["#C21B17", "#FFFFFF"],
  ["#F5DF9A", "#FFFFFF"],
  ["#C21B17", "#D4AF37"],
];

function Word({
  text,
  delay,
  step,
}: {
  text: string;
  delay: number;
  step: number;
}) {
  return (
    <span className="hb-word">
      {text.split("").map((c, i) => (
        <motion.span
          key={i}
          className="hb-letter"
          initial={{
            opacity: 0,
            scale: 3.2,
            y: -60,
            rotate: ((i * 37) % 36) - 18,
            filter: "blur(12px)",
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: 0,
            filter: "blur(0px)",
          }}
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 15,
            delay: delay + i * step,
          }}
        >
          {c}
        </motion.span>
      ))}
    </span>
  );
}

export function Celebration({
  name,
  onEncore,
}: {
  name: string;
  onEncore: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fire = confetti.create(canvas, { resize: true, useWorker: false });
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, ms));
    const cannon = (x: number, angle: number, count = 150) =>
      fire({
        particleCount: count,
        angle,
        spread: 62,
        startVelocity: 78,
        origin: { x, y: 1.05 },
        colors: COLORS,
        scalar: 1.25,
        ticks: 340,
        gravity: 1.05,
        shapes: ["square", "circle"],
      });

    // Everything is scheduled (even t=0) so React StrictMode's double-mount cancels cleanly.
    at(0, () => {
      sfx.crash();
      sfx.fanfare();
      vibrate([90, 50, 180]);
      document
        .querySelector(".stage-root")
        ?.animate(
          [
            { transform: "translate(0,0)" },
            { transform: "translate(-7px, 5px)" },
            { transform: "translate(6px, -6px)" },
            { transform: "translate(-4px, 3px)" },
            { transform: "translate(2px, -1px)" },
            { transform: "translate(0,0)" },
          ],
          { duration: 520, easing: "ease-out" },
        );
      cannon(0, 62);
      cannon(1, 118);
    });
    at(140, () =>
      fire({
        particleCount: 220,
        spread: 360,
        startVelocity: 46,
        origin: { x: 0.5, y: 0.42 },
        colors: COLORS,
        scalar: 1.1,
        ticks: 260,
        shapes: ["star", "circle"],
      }),
    );
    at(1150, () => {
      cannon(0, 70, 110);
      cannon(1, 110, 110);
    });
    for (let i = 0; i < 10; i++) {
      at(700 + i * 430, () =>
        fire({
          particleCount: 80,
          spread: 360,
          startVelocity: 30,
          origin: {
            x: 0.12 + Math.random() * 0.76,
            y: 0.14 + Math.random() * 0.32,
          },
          colors: PAIRS[i % PAIRS.length],
          ticks: 170,
          gravity: 0.65,
          scalar: 0.9,
          shapes: ["circle"],
        }),
      );
    }
    at(2900, () => sfx.birthdaySong());

    // gentle confetti rain forever after
    let rain = 0;
    at(2200, () => {
      rain = window.setInterval(
        () =>
          fire({
            particleCount: 2,
            angle: 270,
            spread: 40,
            startVelocity: 6,
            origin: { x: Math.random(), y: -0.05 },
            colors: COLORS,
            gravity: 0.45,
            ticks: 520,
            drift: Math.random() - 0.5,
            scalar: 1.1,
          }),
        220,
      );
    });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(rain);
      fire.reset();
    };
  }, []);

  return (
    <>
      <div className="celebrate">
        <div className="sunburst" />

        <h1 className="hb" aria-label={`${COPY.happy} ${COPY.birthday}`}>
          <Word text={COPY.happy} delay={0.12} step={0.07} />
          <Word text={COPY.birthday} delay={0.5} step={0.055} />
        </h1>

        {name && (
          <motion.p
            className="hb-name gold-text"
            initial={{ opacity: 0, scale: 0.6, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 160,
              damping: 14,
              delay: 1.25,
            }}
          >
            {name}
          </motion.p>
        )}

        <motion.p
          className="hb-msg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.9 }}
        >
          {COPY.message}
        </motion.p>

        <motion.button
          className="encore"
          onClick={onEncore}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 3.2 }}
        >
          ↺ {COPY.encore}
        </motion.button>
      </div>
      <canvas ref={canvasRef} className="confetti-canvas" />
      <motion.div
        className="flash"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </>
  );
}
