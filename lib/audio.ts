/**
 * Tiny Web Audio sound engine. Every sound is synthesised, so there are no
 * audio files to load and nothing can fail to download mid-show.
 *
 * The AudioContext is created and unlocked from the very first tap (the gate
 * button). iOS only allows audio that started from a user gesture.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let noiseBuf: AudioBuffer | undefined;

export function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    ctx = new Ctor!();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  return { ctx, out: master! };
}

/** Call synchronously inside a tap handler. */
export function unlockAudio() {
  const { ctx } = audio();
  if (ctx.state !== "running") void ctx.resume();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

function ready() {
  const a = audio();
  if (a.ctx.state !== "running") void a.ctx.resume();
  return a;
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

/** After the mic is released, nudge iOS back to full-volume speaker playback. */
export function restorePlaybackSession() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {
    /* unsupported */
  }
  ready();
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

function envGain(c: AudioContext, t: number, attack: number, peak: number, decay: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function noiseHit(
  t: number,
  opts: { type: BiquadFilterType; freq: number; q?: number; attack: number; peak: number; decay: number },
) {
  const { ctx: c, out } = ready();
  const src = noise(c);
  const f = c.createBiquadFilter();
  f.type = opts.type;
  f.frequency.value = opts.freq;
  f.Q.value = opts.q ?? 0.8;
  const g = envGain(c, t, opts.attack, opts.peak, opts.decay);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random());
  src.stop(t + opts.attack + opts.decay + 0.05);
}

function tone(
  t: number,
  freq: number,
  opts: { type?: OscillatorType; attack: number; peak: number; decay: number; to?: number },
) {
  const { ctx: c, out } = ready();
  const o = c.createOscillator();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + opts.attack + opts.decay);
  const g = envGain(c, t, opts.attack, opts.peak, opts.decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + opts.attack + opts.decay + 0.05);
}

function brass(t: number, freq: number, dur: number, vol: number) {
  const { ctx: c, out } = ready();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 1.5;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(Math.min(9000, freq * 7), t + 0.07);
  f.frequency.exponentialRampToValueAtTime(Math.min(6000, freq * 3), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol * 0.85, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
  f.connect(g).connect(out);
  for (const detune of [-8, 0, 8]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.4);
  }
}

function bell(t: number, freq: number, dur: number, vol: number) {
  tone(t, freq, { attack: 0.006, peak: vol, decay: Math.min(1.8, dur * 2.2) });
  tone(t, freq * 2, { attack: 0.004, peak: vol * 0.35, decay: Math.min(0.9, dur) });
  tone(t, freq * 4.01, { attack: 0.002, peak: vol * 0.08, decay: 0.3 });
}

export const sfx = {
  /** Little rising click while the ribbon is under tension. */
  tick(tension: number) {
    const t = ready().ctx.currentTime;
    tone(t, 260 + tension * 700, { type: "triangle", attack: 0.004, peak: 0.07, decay: 0.05 });
  },

  /** The ribbon knot giving way. */
  snap() {
    const t = ready().ctx.currentTime;
    noiseHit(t, { type: "highpass", freq: 1400, attack: 0.002, peak: 0.9, decay: 0.09 });
    tone(t, 2200, { type: "triangle", attack: 0.002, peak: 0.25, decay: 0.07, to: 300 });
  },

  /** Curtains sweeping open. */
  whoosh(dur = 1.6) {
    const { ctx: c, out } = ready();
    const t = c.currentTime;
    const src = noise(c);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(220, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.45);
    f.frequency.exponentialRampToValueAtTime(380, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  /** Snare roll with a crescendo and a timpani hit at the end. */
  drumroll(dur = 2.2) {
    const t0 = ready().ctx.currentTime + 0.02;
    const step = 0.042;
    for (let x = 0; x < dur; x += step) {
      const p = x / dur;
      noiseHit(t0 + x, {
        type: "bandpass",
        freq: 1900,
        q: 0.7,
        attack: 0.003,
        peak: 0.05 + 0.4 * p * p,
        decay: 0.06,
      });
    }
    const end = t0 + dur;
    tone(end, 95, { attack: 0.005, peak: 0.9, decay: 1.1, to: 52 });
    noiseHit(end, { type: "highpass", freq: 5000, attack: 0.004, peak: 0.25, decay: 1.4 });
  },

  /** A candle catching. */
  light() {
    const t = ready().ctx.currentTime;
    noiseHit(t, { type: "bandpass", freq: 3200, q: 1.5, attack: 0.01, peak: 0.14, decay: 0.18 });
    tone(t, 700, { attack: 0.01, peak: 0.08, decay: 0.2, to: 1500 });
  },

  /** A candle going out. */
  puff() {
    const t = ready().ctx.currentTime;
    noiseHit(t, { type: "lowpass", freq: 900, attack: 0.02, peak: 0.35, decay: 0.32 });
  },

  /** Cymbal crash + boom for the finale. */
  crash() {
    const t = ready().ctx.currentTime;
    noiseHit(t, { type: "highpass", freq: 4200, attack: 0.004, peak: 0.55, decay: 2.8 });
    noiseHit(t, { type: "lowpass", freq: 180, attack: 0.004, peak: 0.9, decay: 0.5 });
    tone(t, 78, { attack: 0.005, peak: 1, decay: 1.4, to: 38 });
  },

  /** "Ta-da-da-DAAA" brass fanfare. */
  fanfare() {
    const t = ready().ctx.currentTime + 0.05;
    const G4 = midi(67);
    brass(t, G4, 0.11, 0.13);
    brass(t + 0.15, G4, 0.11, 0.13);
    brass(t + 0.3, G4, 0.11, 0.13);
    const big = t + 0.45;
    for (const n of [48, 60, 64, 67, 72]) brass(big, midi(n), 1.5, n === 48 ? 0.16 : 0.1);
    for (const [i, n] of [76, 79, 84].entries()) brass(big + 1.6 + i * 0.12, midi(n), i === 2 ? 1.2 : 0.1, 0.08);
    for (const n of [48, 60, 64, 67, 72, 76]) brass(big + 1.96, midi(n), 1.2, 0.08);
  },

  /** Music-box rendition of Happy Birthday (public domain). */
  birthdaySong() {
    const t0 = ready().ctx.currentTime + 0.05;
    const beat = 0.42;
    // [start beat, midi note, length in beats]
    const melody: [number, number, number][] = [
      [0, 67, 0.75], [0.75, 67, 0.25],
      [1, 69, 1], [2, 67, 1], [3, 72, 1],
      [4, 71, 2], [6, 67, 0.75], [6.75, 67, 0.25],
      [7, 69, 1], [8, 67, 1], [9, 74, 1],
      [10, 72, 2], [12, 67, 0.75], [12.75, 67, 0.25],
      [13, 79, 1], [14, 76, 1], [15, 72, 1],
      [16, 71, 1], [17, 69, 1], [18, 77, 0.75], [18.75, 77, 0.25],
      [19, 76, 1], [20, 72, 1], [21, 74, 1],
      [22, 72, 3],
    ];
    const bass: [number, number][] = [
      [1, 48], [4, 43], [7, 43], [10, 48], [13, 48], [16, 41], [19, 43], [22, 48],
    ];
    for (const [b, n, len] of melody) bell(t0 + b * beat, midi(n), len * beat, 0.2);
    for (const [b, n] of bass) bell(t0 + b * beat, midi(n), 3 * beat, 0.12);
    // final sparkle
    const end = t0 + 22 * beat;
    for (const [i, n] of [84, 88, 91, 96].entries()) bell(end + 0.9 + i * 0.07, midi(n), 0.6, 0.06);
  },
};
