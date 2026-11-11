/**
 * Microphone "blow" detection.
 *
 * Blowing straight into a phone mic produces a loud, broadband burst of noise
 * that is far louder than talking or room noise. We track the room's noise
 * floor (slowly) and treat anything well above it as breath.
 *
 * Browser voice processing (noise suppression, AGC, echo cancellation) is
 * turned off because it is specifically designed to remove this kind of sound.
 */

export async function requestMic(): Promise<MediaStream | undefined> {
  if (!navigator.mediaDevices?.getUserMedia) return undefined;
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
  } catch {
    return undefined;
  }
}

export type BreathSample = {
  /** raw loudness */
  rms: number;
  /** loudness that counts as a blow right now */
  threshold: number;
  /** 0..1, for visuals (flames lean even on gentle breath) */
  level: number;
  /** 0..1, how hard the user is blowing; 0 = not blowing */
  intensity: number;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Absolute minimum loudness treated as a blow. Raise if talking blows candles out. */
const MIN_THRESHOLD = 0.07;

export class BlowDetector {
  private stream: MediaStream;
  private source: MediaStreamAudioSourceNode;
  private analyser: AnalyserNode;
  private data: Float32Array<ArrayBuffer>;
  private floor = 0.01;
  private stopped = false;

  constructor(stream: MediaStream, ctx: AudioContext) {
    this.stream = stream;
    this.source = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0;
    this.source.connect(this.analyser);
    this.data = new Float32Array(this.analyser.fftSize);
  }

  get active() {
    return !this.stopped;
  }

  sample(): BreathSample {
    if (this.stopped) return { rms: 0, threshold: 1, level: 0, intensity: 0 };
    this.analyser.getFloatTimeDomainData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) sum += this.data[i] * this.data[i];
    const rms = Math.sqrt(sum / this.data.length);

    const threshold = Math.max(MIN_THRESHOLD, this.floor * 4);
    // Learn the room noise only while nobody is blowing.
    if (rms < threshold) this.floor += (rms - this.floor) * 0.01;

    const level = clamp((rms - this.floor * 1.5) / 0.3, 0, 1);
    const intensity = rms > threshold ? clamp((rms - threshold) / 0.35, 0.15, 1) : 0;
    return { rms, threshold, level, intensity };
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    try {
      this.source.disconnect();
    } catch {
      /* already disconnected */
    }
    this.stream.getTracks().forEach((t) => t.stop());
  }
}
