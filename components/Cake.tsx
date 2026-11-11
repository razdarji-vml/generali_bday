"use client";

import type { CSSProperties } from "react";

/**
 * Three-tier Generali cake drawn in SVG (viewBox 400 x 450).
 * Flames read `--breath` (0..1) and `--hpN` (candle health) CSS variables
 * that the Theatre writes every frame, so blowing never causes React renders.
 */

type Tier = { cy: number; bottom: number; rx: number; ry: number };
const BOTTOM: Tier = { cy: 270, bottom: 402, rx: 156, ry: 24 };
const MIDDLE: Tier = { cy: 178, bottom: 270, rx: 116, ry: 18 };
const TOP: Tier = { cy: 110, bottom: 178, rx: 80, ry: 14 };

const DRIP_LENS = [10, 24, 14, 32, 12, 26, 18, 36, 12, 22, 30, 14, 26, 18, 28, 12];

function body({ cy, bottom, rx, ry }: Tier) {
  return `M ${200 - rx} ${cy} V ${bottom} A ${rx} ${ry} 0 0 0 ${200 + rx} ${bottom} V ${cy} Z`;
}

function drips({ cy, rx, ry }: Tier, n: number, scale: number, offset = 0) {
  const pt = (k: number) => {
    const th = (k / n) * Math.PI;
    return [200 + rx * Math.cos(th), cy + ry * Math.sin(th)] as const;
  };
  let d = `M ${200 - rx} ${cy} A ${rx} ${ry} 0 0 1 ${200 + rx} ${cy} L ${200 + rx} ${cy + 4}`;
  for (let j = 1; j <= n; j++) {
    const [x, y] = pt(j);
    const [mx, my] = pt(j - 0.5);
    const [px] = pt(j - 1);
    const w = Math.abs(x - px) * 0.3;
    const L = DRIP_LENS[(j + offset) % DRIP_LENS.length] * scale;
    d += ` L ${mx + w} ${my + 4} L ${mx + w} ${my + L} Q ${mx} ${my + L + w * 1.6} ${mx - w} ${my + L} L ${mx - w} ${my + 4} L ${x} ${y + 4}`;
  }
  return d + " Z";
}

function frontArc({ rx, ry }: Tier, y: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const th = ((i + 0.5) / n) * Math.PI;
    return [200 + rx * Math.cos(th), y + ry * Math.sin(th)] as const;
  });
}

function band({ rx, ry }: Tier, y1: number, y2: number) {
  return `M ${200 - rx} ${y1} A ${rx} ${ry} 0 0 0 ${200 + rx} ${y1} L ${200 + rx} ${y2} A ${rx} ${ry} 0 0 1 ${200 - rx} ${y2} Z`;
}

export function candleLayout(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    return { i, x: 200 + t * 58, base: TOP.cy - 6 + t * t * 12, dir: t === 0 ? 0.35 : t };
  }).sort((a, b) => a.base - b.base); // back row first
}

export type CandleState = "unlit" | "lit" | "out";

export function Cake({ candles }: { candles: CandleState[] }) {
  const layout = candleLayout(candles.length);
  const pearls = (t: Tier, y: number, n: number, r: number) =>
    frontArc(t, y, n).map(([x, py], k) => <circle key={k} cx={x} cy={py} r={r} fill="url(#pearl)" />);

  return (
    <svg viewBox="0 0 400 450" className="cake-svg" role="img" aria-label="Birthday cake">
      <defs>
        <linearGradient id="red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e0b09" />
          <stop offset="0.28" stopColor="#c21b17" />
          <stop offset="0.45" stopColor="#e5463d" />
          <stop offset="0.62" stopColor="#c21b17" />
          <stop offset="1" stopColor="#4e0907" />
        </linearGradient>
        <linearGradient id="ivory" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#bfa985" />
          <stop offset="0.3" stopColor="#f3e8d4" />
          <stop offset="0.45" stopColor="#fffaf0" />
          <stop offset="0.65" stopColor="#efe2c8" />
          <stop offset="1" stopColor="#a8916b" />
        </linearGradient>
        <linearGradient id="cream" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9c7a6" />
          <stop offset="0.4" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#cbb690" />
        </linearGradient>
        <linearGradient id="redDrip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a0f0c" />
          <stop offset="0.4" stopColor="#d42a22" />
          <stop offset="1" stopColor="#6a0c0a" />
        </linearGradient>
        <linearGradient id="plate" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b5011" />
          <stop offset="0.35" stopColor="#f5df9a" />
          <stop offset="0.55" stopColor="#d4af37" />
          <stop offset="1" stopColor="#5c4510" />
        </linearGradient>
        <radialGradient id="pearl" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.55" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7a5a14" />
        </radialGradient>
        <pattern id="stripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <rect width="7" height="7" fill="#fbf6ee" />
          <rect width="3" height="7" fill="#c21b17" />
        </pattern>
        <linearGradient id="candleShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="flameOuter" cx="0.5" cy="0.75" r="0.6">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#ffb52e" />
          <stop offset="0.85" stopColor="#ff6a00" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff4500" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flameCore" cx="0.5" cy="0.8" r="0.6">
          <stop offset="0" stopColor="#fffef5" />
          <stop offset="0.7" stopColor="#fff2b8" />
          <stop offset="1" stopColor="#ffd36b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#ffcf70" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9a2e" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* plate */}
      <ellipse cx="200" cy="432" rx="186" ry="14" fill="#000" opacity="0.5" filter="url(#soft)" />
      <ellipse cx="200" cy="414" rx="184" ry="26" fill="#5c4510" />
      <ellipse cx="200" cy="408" rx="184" ry="26" fill="url(#plate)" />

      {/* bottom tier — Generali red */}
      <path d={body(BOTTOM)} fill="url(#red)" />
      <path d={drips(BOTTOM, 15, 1)} fill="url(#cream)" />
      <image href="/generali-mark-white.png" x="158" y="342" width="84" height="67.5" opacity="0.95" />
      {pearls(BOTTOM, BOTTOM.bottom, 26, 4.6)}

      {/* middle tier — ivory with red band */}
      <path d={body(MIDDLE)} fill="url(#ivory)" />
      <path d={band(MIDDLE, 236, 252)} fill="url(#red)" />
      <path d={band(MIDDLE, 236, 237.6)} fill="#d4af37" />
      <path d={band(MIDDLE, 250.4, 252)} fill="#d4af37" />
      <path d={drips(MIDDLE, 12, 0.8, 5)} fill="url(#redDrip)" />
      {pearls(MIDDLE, MIDDLE.bottom, 20, 3.8)}

      {/* top tier — red */}
      <path d={body(TOP)} fill="url(#red)" />
      <path d={drips(TOP, 9, 0.65, 3)} fill="url(#cream)" />
      {pearls(TOP, TOP.bottom, 14, 3.2)}

      {/* candles */}
      {layout.map(({ i, x, base, dir }) => {
        const state = candles[i];
        const top = base - 50;
        const style = { "--dir": dir, "--hp": `var(--hp${i}, 1)` } as CSSProperties;
        return (
          <g key={i} style={style}>
            <ellipse cx={x} cy={base} rx="7" ry="2.6" fill="#e9dcc6" />
            <rect x={x - 5} y={top} width="10" height="50" rx="2" fill="url(#stripes)" />
            <rect x={x - 5} y={top} width="10" height="50" rx="2" fill="url(#candleShade)" />
            <ellipse cx={x} cy={top} rx="5" ry="1.6" fill="#fffaf0" />
            <path d={`M ${x} ${top} q 1.5 -3 0 -7`} stroke="#2a1a10" strokeWidth="1.6" fill="none" />
            <circle
              cx={x}
              cy={top - 22}
              r="34"
              fill="url(#glow)"
              className={`glow ${state}`}
            />
            <g transform={`translate(${x} ${top - 4})`}>
              <g className={`flame-wrap ${state}`}>
                <g className="flame-lean">
                  <g className="flame-flicker" style={{ animationDelay: `${-i * 0.37}s` }}>
                    <path d="M0 0 C -9 -5 -9 -18 0 -36 C 9 -18 9 -5 0 0 Z" fill="url(#flameOuter)" />
                    <path d="M0 -1 C -4.5 -3 -4.5 -10 0 -19 C 4.5 -10 4.5 -3 0 -1 Z" fill="url(#flameCore)" />
                    <ellipse cx="0" cy="-2" rx="2.2" ry="3" fill="#6fa8ff" opacity="0.55" />
                  </g>
                </g>
              </g>
            </g>
            {state === "out" && (
              <g className="smoke">
                <path d={`M ${x} ${top - 6} c -7 -10 7 -18 0 -28 c -7 -10 7 -18 0 -28`} />
                <path d={`M ${x} ${top - 6} c 6 -9 -6 -17 0 -26 c 6 -9 -6 -17 0 -26`} style={{ animationDelay: "0.25s" }} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
