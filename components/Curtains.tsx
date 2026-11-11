"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type PanInfo,
} from "motion/react";
import { COPY } from "@/lib/config";
import { sfx, vibrate } from "@/lib/audio";
import { Lockup } from "./Lockup";

const OPEN_EASE = [0.65, 0, 0.25, 1] as const;

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

/** Velvet curtains tied shut with a gold ribbon. Pull the tassel down to open. */
export function Curtains({ name, opened, onOpen }: { name: string; opened: boolean; onOpen: () => void }) {
  const { w, h } = useViewport();
  const cy = Math.round(h * 0.42);
  const TAIL = Math.round(Math.min(150, h * 0.14));
  const MAX = Math.max(120, Math.min(230, h - (cy + TAIL + 130)));

  const y = useMotionValue(0);
  const bowY = useTransform(y, [0, MAX], [0, 54]);
  const leftD = useTransform(bowY, (b) => `M -20 ${cy} Q ${w * 0.3} ${cy + b * 0.25} ${w / 2} ${cy + b}`);
  const rightD = useTransform(bowY, (b) => `M ${w / 2} ${cy + b} Q ${w * 0.7} ${cy + b * 0.25} ${w + 20} ${cy}`);
  const tailH = useTransform([y, bowY], ([a, b]: number[]) => TAIL + a - b);
  const pinch = useTransform(y, [0, MAX], [1, 0.985]);

  // Tension feedback: a rising click + haptic every few px of pull.
  const lastStep = useRef(0);
  useMotionValueEvent(y, "change", (v) => {
    if (opened) return;
    const step = Math.floor(v / 28);
    if (step > lastStep.current) {
      sfx.tick(Math.min(1, v / MAX));
      vibrate(6);
    }
    lastStep.current = step;
  });

  const [dragging, setDragging] = useState(false);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    if (y.get() > MAX * 0.5 || info.velocity.y > 900) {
      onOpen();
    } else {
      animate(y, 0, { type: "spring", stiffness: 420, damping: 16 });
    }
  };

  const nudge = () => {
    if (!opened) animate(y, [y.get(), 34, 0], { duration: 0.55, ease: "easeInOut" });
  };

  const curtainTransition = { duration: 2, ease: OPEN_EASE, delay: 0.35 };

  return (
    <div className="curtains">
      <motion.div
        className="curtain left"
        style={{ originX: 0, scaleY: pinch }}
        animate={{ scaleX: opened ? 0.16 : 1 }}
        transition={curtainTransition}
      />
      <motion.div
        className="curtain right"
        style={{ originX: 1, scaleY: pinch }}
        animate={{ scaleX: opened ? 0.16 : 1 }}
        transition={curtainTransition}
      />
      <motion.div
        className="curtain-light"
        animate={{ opacity: opened ? 0 : 1 }}
        transition={{ duration: 0.6 }}
      />

      <motion.div
        className="billing"
        style={{ bottom: h - cy + 70 }}
        initial={{ opacity: 0, y: 16 }}
        animate={opened ? { opacity: 0, y: -24 } : { opacity: 1, y: 0 }}
        transition={{ duration: opened ? 0.5 : 1.2, delay: opened ? 0 : 1 }}
      >
        <p className="eyebrow">{COPY.billingEyebrow}</p>
        <p className="billing-starring">{COPY.billingStarring}</p>
        <h2 className="billing-name gold-text">{name || "You"}</h2>
      </motion.div>

      {/* Ribbon across the curtains, split at the bow so each half can fly away */}
      <svg className="ribbon-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <defs>
          <linearGradient id="ribbonGrad" gradientUnits="userSpaceOnUse" x1="0" y1={cy - 14} x2="0" y2={cy + 40}>
            <stop offset="0" stopColor="#8a6a1f" />
            <stop offset="0.2" stopColor="#f5df9a" />
            <stop offset="0.45" stopColor="#d4af37" />
            <stop offset="0.75" stopColor="#a8832a" />
            <stop offset="1" stopColor="#e9c75e" />
          </linearGradient>
        </defs>
        {[leftD, rightD].map((d, i) => (
          <motion.g
            key={i}
            animate={opened ? { x: (i === 0 ? -1 : 1) * w * 0.7, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.5, 0, 0.9, 0.6] }}
          >
            <motion.path d={d} stroke="#5c4510" strokeWidth={30} fill="none" />
            <motion.path d={d} stroke="url(#ribbonGrad)" strokeWidth={24} fill="none" />
            <motion.path d={d} stroke="rgba(255,248,215,0.6)" strokeWidth={2} fill="none" transform="translate(0 -7)" />
          </motion.g>
        ))}
      </svg>

      <div className="ribbon-anchor" style={{ left: w / 2, top: cy }}>
        {/* Tail + tassel fall away together when the knot gives */}
        <motion.div
          className="tail-group"
          animate={opened ? { y: h, rotate: 14, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.5, 0, 0.9, 0.5] }}
        >
          <motion.div className="tail" style={{ y: bowY, height: tailH }} />
          <motion.div
            className="tassel"
            style={{ y, top: TAIL }}
            drag={opened ? false : "y"}
            dragConstraints={{ top: 0, bottom: MAX }}
            dragElastic={0.08}
            dragMomentum={false}
            onDragStart={() => setDragging(true)}
            onDragEnd={onDragEnd}
            onTap={nudge}
            whileTap={{ scale: 1.08 }}
          >
            <div className={`tassel-art ${dragging ? "" : "idle"}`}>
              <Tassel />
            </div>
            <motion.div
              className="pull-hint"
              animate={{ opacity: dragging || opened ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="chev" />
              {COPY.pullHint}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div style={{ y: bowY }}>
          <motion.div
            className="bow"
            animate={
              opened
                ? { scale: [1, 1.35, 0.3], rotate: [0, -12, 200], y: [0, -24, -h * 0.55], opacity: [1, 1, 0] }
                : { scale: 1, rotate: 0, y: 0, opacity: 1 }
            }
            transition={{ duration: 1.1, times: [0, 0.22, 1], ease: "easeIn" }}
          >
            <Bow />
          </motion.div>
        </motion.div>
      </div>

      <Valance />
    </div>
  );
}

function Valance() {
  const swags = 5;
  const W = 500;
  const sw = W / swags;
  let edge = `M ${W} 58`;
  for (let i = swags; i > 0; i--) edge += ` Q ${(i - 0.5) * sw} 104 ${(i - 1) * sw} 58`;
  return (
    <div className="valance">
      <svg viewBox="0 0 500 112" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="valanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a0907" />
            <stop offset="0.5" stopColor="#b51c16" />
            <stop offset="1" stopColor="#7a0f0c" />
          </linearGradient>
          <pattern id="pleats" width="14" height="112" patternUnits="userSpaceOnUse">
            <rect width="14" height="112" fill="transparent" />
            <rect width="5" height="112" fill="rgba(0,0,0,0.18)" />
          </pattern>
        </defs>
        <path d={`M 0 0 H ${W} V 58 ${edge.slice(edge.indexOf("Q"))} Z`} fill="url(#valanceGrad)" />
        <path d={`M 0 0 H ${W} V 58 ${edge.slice(edge.indexOf("Q"))} Z`} fill="url(#pleats)" />
        <path d={edge} fill="none" stroke="#d4af37" strokeWidth="3" />
        <path d={edge} fill="none" stroke="#e9c75e" strokeWidth="9" strokeDasharray="1.2 3.2" transform="translate(0 6)" />
        <line x1="0" y1="20" x2={W} y2="20" stroke="#d4af37" strokeWidth="1.5" opacity="0.8" />
      </svg>
      <div className="valance-crest">
        <Lockup size={52} />
      </div>
    </div>
  );
}

function Bow() {
  return (
    <svg viewBox="-100 -60 200 150" width="200" height="150" aria-hidden>
      <defs>
        <linearGradient id="bowGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e6a6" />
          <stop offset="0.45" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6a1f" />
        </linearGradient>
        <linearGradient id="bowShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b5011" stopOpacity="0" />
          <stop offset="1" stopColor="#4a370b" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* streamers */}
      <path d="M -8 6 C -18 30, -30 52, -44 82 L -30 76 L -24 88 C -12 58, -4 32, 4 10 Z" fill="url(#bowGold)" />
      <path d="M 8 6 C 18 30, 30 52, 44 82 L 30 76 L 24 88 C 12 58, 4 32, -4 10 Z" fill="url(#bowGold)" />
      {/* loops */}
      <path d="M -6 0 C -30 -54, -96 -50, -88 -6 C -84 22, -36 22, -6 0 Z" fill="url(#bowGold)" />
      <path d="M 6 0 C 30 -54, 96 -50, 88 -6 C 84 22, 36 22, 6 0 Z" fill="url(#bowGold)" />
      <path d="M -6 0 C -34 -30, -70 -30, -78 -8 C -60 4, -30 8, -6 0 Z" fill="url(#bowShade)" />
      <path d="M 6 0 C 34 -30, 70 -30, 78 -8 C 60 4, 30 8, 6 0 Z" fill="url(#bowShade)" />
      <path d="M -70 -30 C -50 -42, -28 -34, -12 -10" stroke="#fff6d0" strokeOpacity="0.7" strokeWidth="2" fill="none" />
      <path d="M 70 -30 C 50 -42, 28 -34, 12 -10" stroke="#fff6d0" strokeOpacity="0.5" strokeWidth="2" fill="none" />
      {/* knot */}
      <rect x="-15" y="-16" width="30" height="32" rx="9" fill="url(#bowGold)" stroke="#6b5011" strokeWidth="1.5" />
      <path d="M -9 -10 Q 0 -14 9 -10" stroke="#fff6d0" strokeWidth="2" fill="none" opacity="0.8" />
    </svg>
  );
}

function Tassel() {
  const strands = Array.from({ length: 13 }, (_, i) => -18 + i * 3);
  return (
    <svg viewBox="-30 0 60 104" width="60" height="104" aria-hidden>
      <defs>
        <radialGradient id="knob" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff2bd" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7a5a14" />
        </radialGradient>
      </defs>
      <rect x="-2" y="0" width="4" height="10" fill="#b8902f" />
      <circle cx="0" cy="22" r="14" fill="url(#knob)" />
      <rect x="-15" y="34" width="30" height="7" rx="3" fill="#a8832a" />
      {strands.map((x, i) => (
        <path
          key={i}
          d={`M ${x * 0.7} 40 Q ${x} 70 ${x * 1.15} ${96 + (i % 3) * 3}`}
          stroke={i % 2 ? "#e9c75e" : "#b8902f"}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </svg>
  );
}
