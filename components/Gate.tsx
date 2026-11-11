"use client";

import { motion } from "motion/react";
import { COPY } from "@/lib/config";
import { Lockup } from "./Lockup";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 1, delay, ease: [0.2, 0.7, 0.2, 1] as const },
});

export function Gate({ name, busy, onBegin }: { name: string; busy: boolean; onBegin: () => void }) {
  return (
    <motion.section
      className="gate"
      exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)", transition: { duration: 0.7 } }}
    >
      <div className="beam beam-a" />
      <div className="beam beam-b" />
      <svg className="swoosh" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
        <path d="M-10 190 C 80 120, 120 40, 220 30 L 420 30" />
      </svg>

      <motion.div {...rise(0.1)}>
        <Lockup size={74} />
      </motion.div>
      <motion.p className="eyebrow" {...rise(0.35)}>
        {COPY.gateEyebrow}
      </motion.p>
      <motion.h1 {...rise(0.55)}>
        {COPY.gateTitleTop}
        <br />
        <em className="gold-text">{COPY.gateTitleBottom}</em>
      </motion.h1>
      {name && (
        <motion.p className="gate-for" {...rise(0.8)}>
          for <span>{name}</span>
        </motion.p>
      )}
      <motion.button className="cta" onClick={onBegin} disabled={busy} {...rise(1.1)}>
        {busy ? "One moment…" : COPY.gateCta}
      </motion.button>
      <motion.p className="fineprint" {...rise(1.3)}>
        <span aria-hidden>🔊 </span>
        {COPY.gateFineprint}
      </motion.p>
    </motion.section>
  );
}
