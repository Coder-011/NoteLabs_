// Sample-based audio engine
// Pre-renders all sounds to AudioBuffers for glitch-free playback
// Eliminates real-time synthesis crackling on mobile devices

import { NOTE_INTERVALS } from './flute';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;

// Buffer cache
const bufferCache = new Map<string, AudioBuffer>();
let isEngineReady = false;

// ─── helpers ─────────────────────────────────────────────

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext({ sampleRate: 48000 });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function ensureMasterChain() {
  const ctx = getCtx();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;

    // Soft limiter prevents crackling on loud peaks
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 3;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;

    masterGain.connect(limiter).connect(ctx.destination);
  }
}

function freqOf(note: string, octave: number, baseFreq: number): number {
  const interval = NOTE_INTERVALS[note as keyof typeof NOTE_INTERVALS] ?? 0;
  const centOffset = interval + (octave - 1) * 1200;
  return baseFreq * Math.pow(2, centOffset / 1200);
}

// ─── offline buffer rendering ─────────────────────────────

async function renderOffline(
  durationSec: number,
  sampleRate: number,
  renderer: (ctx: OfflineAudioContext) => void | Promise<void>
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(durationSec * sampleRate), sampleRate);
  await renderer(ctx);
  return ctx.startRendering();
}

// ─── note sample renderer ─────────────────────────────────

async function makeNoteBuffer(frequency: number, duration = 1.2): Promise<AudioBuffer> {
  const key = `note_${frequency.toFixed(2)}_${duration}`;
  if (bufferCache.has(key)) return bufferCache.get(key)!;

  const buf = await renderOffline(duration, 48000, (ctx) => {
    // Warm flute-like tone: triangle + sine
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = frequency;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency;

    // Subtle 2nd harmonic
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = frequency * 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.35, 0.08);   // attack
    gain.gain.linearRampToValueAtTime(0.28, 0.25);   // decay
    gain.gain.linearRampToValueAtTime(0.22, duration - 0.3); // sustain
    gain.gain.linearRampToValueAtTime(0, duration);  // release

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc3.start();
    osc1.stop(duration);
    osc2.stop(duration);
    osc3.stop(duration);
  });

  bufferCache.set(key, buf);
  return buf;
}

// ─── tanpura drone renderer ───────────────────────────────

async function makeTanpuraBuffer(baseFreq: number, duration = 6.0): Promise<AudioBuffer> {
  const key = `tanpura_${baseFreq.toFixed(2)}`;
  if (bufferCache.has(key)) return bufferCache.get(key)!;

  const paFreq = baseFreq * Math.pow(2, 702 / 1200);
  const lowerSa = baseFreq * 0.5;

  const buf = await renderOffline(duration, 48000, (ctx) => {
    const outGain = ctx.createGain();
    outGain.gain.value = 0.22;

    // Layered oscillators
    const freqs = [
      { f: lowerSa, v: 0.4, t: 'sine' as OscillatorType },
      { f: baseFreq, v: 0.8, t: 'sine' as OscillatorType },
      { f: paFreq, v: 0.5, t: 'triangle' as OscillatorType },
      { f: baseFreq * 2, v: 0.15, t: 'sine' as OscillatorType },
    ];

    freqs.forEach(({ f, v, t }) => {
      const osc = ctx.createOscillator();
      osc.type = t;
      osc.frequency.value = f;

      const g = ctx.createGain();
      g.gain.value = v;

      osc.connect(g).connect(outGain);
      osc.start();
      osc.stop(duration);
    });

    // Slow amplitude swell for organic feel
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.85, 0);
    lfoGain.gain.linearRampToValueAtTime(1.0, duration * 0.5);
    lfoGain.gain.linearRampToValueAtTime(0.85, duration);

    outGain.connect(lfoGain).connect(ctx.destination);
  });

  bufferCache.set(key, buf);
  return buf;
}

// ─── metronome click renderer ─────────────────────────────

async function makeClickBuffer(accent: boolean): Promise<AudioBuffer> {
  const key = accent ? 'click_accent' : 'click_normal';
  if (bufferCache.has(key)) return bufferCache.get(key)!;

  const duration = 0.08;
  const buf = await renderOffline(duration, 48000, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = accent ? 'square' : 'sine';
    osc.frequency.value = accent ? 900 : 700;

    const gain = ctx.createGain();
    const peak = accent ? 0.7 : 0.45;
    gain.gain.setValueAtTime(peak, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    // Filter click harshness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = accent ? 3500 : 2500;

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(duration);
  });

  bufferCache.set(key, buf);
  return buf;
}

// ─── playback helpers ─────────────────────────────────────

function playBuffer(buf: AudioBuffer, when?: number, loop = false, offset = 0): AudioBufferSourceNode {
  ensureMasterChain();
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  src.connect(masterGain!);

  const t = when ?? ctx.currentTime;
  if (offset > 0 && loop) {
    src.start(t, offset % buf.duration);
  } else {
    src.start(t);
  }
  return src;
}

// ─── public API ───────────────────────────────────────────

export async function initAudioEngine(): Promise<void> {
  if (isEngineReady) return;
  getCtx();
  ensureMasterChain();

  // Pre-render essential samples in parallel
  await Promise.all([
    makeClickBuffer(false),
    makeClickBuffer(true),
  ]);

  isEngineReady = true;
}

export async function playNoteByFrequency(frequency: number, duration = 1.0): Promise<void> {
  await initAudioEngine();
  const buf = await makeNoteBuffer(frequency, duration + 0.2);
  playBuffer(buf);
}

export async function playNoteSequence(
  frequencies: number[],
  tempoBPM: number,
  onNotePlay?: (index: number) => void
): Promise<void> {
  await initAudioEngine();
  const ctx = getCtx();
  const beatDur = 60 / tempoBPM;
  const noteDur = Math.max(0.5, beatDur * 0.9);

  const buffers = await Promise.all(
    frequencies.map((f) => makeNoteBuffer(f, noteDur + 0.25))
  );

  const startTime = ctx.currentTime + 0.05; // tiny lookahead

  buffers.forEach((buf, i) => {
    const t = startTime + i * beatDur;
    playBuffer(buf, t);
    if (onNotePlay) {
      const delayMs = (t - ctx.currentTime) * 1000;
      setTimeout(() => onNotePlay(i), Math.max(0, delayMs));
    }
  });

  const total = frequencies.length * beatDur + noteDur;
  await new Promise((r) => setTimeout(r, total * 1000));
}

// ─── metronome (sample-based, loop-free) ──────────────────

let metronomeInterval: ReturnType<typeof setInterval> | null = null;
let isMetronomeRunning = false;

export async function startMetronome(tempoBPM: number, onTick?: (beat: number) => void): Promise<void> {
  await initAudioEngine();
  await stopMetronome();

  const beatMs = 60000 / tempoBPM;
  let beat = 0;

  const [normalBuf, accentBuf] = await Promise.all([
    makeClickBuffer(false),
    makeClickBuffer(true),
  ]);

  isMetronomeRunning = true;

  // Play first click immediately
  const buf = beat % 4 === 0 ? accentBuf : normalBuf;
  playBuffer(buf);
  if (onTick) onTick(beat);
  beat++;

  metronomeInterval = setInterval(() => {
    if (!isMetronomeRunning) return;
    const b = beat % 4 === 0 ? accentBuf : normalBuf;
    playBuffer(b);
    if (onTick) onTick(beat);
    beat++;
  }, beatMs);
}

export async function stopMetronome(): Promise<void> {
  isMetronomeRunning = false;
  if (metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
  }
}

// ─── tanpura (sample-based seamless loop) ─────────────────

let tanpuraSource: AudioBufferSourceNode | null = null;
let tanpuraGainNode: GainNode | null = null;

export async function startTanpura(baseFrequency: number): Promise<void> {
  await initAudioEngine();
  await stopTanpura();

  const ctx = getCtx();
  const buf = await makeTanpuraBuffer(baseFrequency, 6);

  tanpuraGainNode = ctx.createGain();
  tanpuraGainNode.gain.setValueAtTime(0, ctx.currentTime);
  tanpuraGainNode.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 1.5);
  tanpuraGainNode.connect(masterGain!);

  tanpuraSource = ctx.createBufferSource();
  tanpuraSource.buffer = buf;
  tanpuraSource.loop = true;
  tanpuraSource.connect(tanpuraGainNode);
  tanpuraSource.start();
}

export async function stopTanpura(): Promise<void> {
  if (tanpuraGainNode) {
    const ctx = getCtx();
    const now = ctx.currentTime;
    tanpuraGainNode.gain.cancelScheduledValues(now);
    tanpuraGainNode.gain.setValueAtTime(tanpuraGainNode.gain.value, now);
    tanpuraGainNode.gain.linearRampToValueAtTime(0, now + 0.8);

    setTimeout(() => {
      tanpuraSource?.stop();
      tanpuraSource?.disconnect();
      tanpuraGainNode?.disconnect();
      tanpuraSource = null;
      tanpuraGainNode = null;
    }, 900);
  }
}

export function isTanpuraPlaying(): boolean {
  return !!tanpuraSource;
}

// ─── master control ───────────────────────────────────────

export function stopAllAudio(): void {
  stopMetronome();
  stopTanpura();

  // Stop any lingering sources by disconnecting master briefly
  if (masterGain) {
    const now = getCtx().currentTime;
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
    masterGain.gain.linearRampToValueAtTime(0.7, now + 0.15);
  }
}

// ─── old API compat wrappers ──────────────────────────────

export async function initAudio(): Promise<void> {
  return initAudioEngine();
}

export async function playNote(
  noteName: string,
  octave: number,
  saFrequency: number,
  duration = 0.8
): Promise<void> {
  const freq = freqOf(noteName, octave, saFrequency);
  return playNoteByFrequency(freq, duration);
}

export async function playMetronomeClick(accent = false): Promise<void> {
  await initAudioEngine();
  const buf = await makeClickBuffer(accent);
  playBuffer(buf);
}
