import { getActiveProfile, getSample } from './samplerStorage';
import { NOTE_INTERVALS } from './flute';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;

const decodedBufferCache = new Map<string, AudioBuffer>();
let isEngineReady = false;

// ─── helpers ─────────────────────────────────────────────

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass({ sampleRate: 48000, latencyHint: 'playback' });
  }
  return audioCtx;
}

export function resumeAudioContextSync(): void {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(console.error);
  }
}

function ensureMasterChain() {
  const ctx = getCtx();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;

    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 6;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    masterGain.connect(limiter).connect(ctx.destination);
  }
}

// ─── offline buffer rendering for Metronome (Fallback) ───

async function renderOffline(
  durationSec: number,
  sampleRate: number,
  renderer: (ctx: OfflineAudioContext) => void | Promise<void>
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSec * sampleRate), sampleRate);
  await renderer(ctx);
  return ctx.startRendering();
}

async function makeClickBuffer(accent: boolean): Promise<AudioBuffer> {
  const key = accent ? 'click_accent' : 'click_normal';
  if (decodedBufferCache.has(key)) return decodedBufferCache.get(key)!;

  const duration = 0.08;
  const buf = await renderOffline(duration, 48000, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(accent ? 1200 : 800, 0);
    osc.frequency.exponentialRampToValueAtTime(accent ? 400 : 300, 0.01);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(accent ? 1.0 : 0.7, 0);
    oscGain.gain.exponentialRampToValueAtTime(0.001, duration);
    osc.connect(oscGain);

    const master = ctx.createGain();
    master.gain.value = 0.9;
    oscGain.connect(master);
    master.connect(ctx.destination);

    osc.start();
    osc.stop(duration);
  });

  decodedBufferCache.set(key, buf);
  return buf;
}

// ─── sampler loading ─────────────────────────────────────

async function loadSampleBuffer(noteName: string): Promise<{ buffer: AudioBuffer, rate: number } | null> {
  const profile = await getActiveProfile();
  if (!profile || !profile.id) return null;

  const cacheKey = `${profile.id}_${noteName}`;
  if (decodedBufferCache.has(cacheKey)) {
    return { buffer: decodedBufferCache.get(cacheKey)!, rate: 1.0 };
  }

  let sample = await getSample(profile.id, noteName);
  let rate = 1.0;

  if (!sample) {
    // Adaptive fallback to 'Sa'
    sample = await getSample(profile.id, 'Sa');
    if (!sample) return null; 

    // E.g. interval is 702 for Pa. rate = 2^(702/1200) = 1.4983 (approx 1.5)
    const cents = NOTE_INTERVALS[noteName as keyof typeof NOTE_INTERVALS] || 0;
    rate = Math.pow(2, cents / 1200);
  }

  const arrayBuffer = await sample.blob.arrayBuffer();
  const ctx = getCtx();
  
  const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
  
  if (rate === 1.0) {
    decodedBufferCache.set(cacheKey, decodedBuffer);
  }
  
  return { buffer: decodedBuffer, rate };
}

// ─── public API ───────────────────────────────────────────

export async function initAudioEngine(): Promise<void> {
  if (isEngineReady) return;
  getCtx();
  ensureMasterChain();
  await Promise.all([
    makeClickBuffer(false),
    makeClickBuffer(true),
  ]);
  isEngineReady = true;
}

export async function initAudio(): Promise<void> {
  return initAudioEngine();
}

function playBuffer(buf: AudioBuffer, when?: number, rate = 1.0, durationSec = 1.0): AudioBufferSourceNode {
  ensureMasterChain();
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when ?? ctx.currentTime);
  // Anti-Popping 50ms fade
  env.gain.linearRampToValueAtTime(1, (when ?? ctx.currentTime) + 0.05);
  env.gain.setValueAtTime(1, (when ?? ctx.currentTime) + durationSec - 0.05);
  env.gain.linearRampToValueAtTime(0, (when ?? ctx.currentTime) + durationSec);

  src.connect(env).connect(masterGain!);
  src.start(when ?? ctx.currentTime);
  src.stop((when ?? ctx.currentTime) + durationSec);
  return src;
}

export async function playSampleNote(noteName: string, durationSec = 1.4, when?: number): Promise<void> {
  await initAudioEngine();
  const sampleData = await loadSampleBuffer(noteName);
  if (!sampleData) {
    console.warn('No sample recorded for', noteName, 'and fallback Sa is missing.');
    return;
  }
  playBuffer(sampleData.buffer, when, sampleData.rate, durationSec);
}

export async function playNoteSequence(
  notes: string[],
  tempoBPM: number,
  onNotePlay?: (index: number) => void
): Promise<void> {
  await initAudioEngine();
  const ctx = getCtx();
  const beatDur = 60 / tempoBPM;
  const noteDur = Math.max(0.55, beatDur * 0.92);

  const startTime = ctx.currentTime + 0.08;

  for (let i = 0; i < notes.length; i++) {
    const t = startTime + i * beatDur;
    playSampleNote(notes[i], noteDur, t);
    
    if (onNotePlay) {
      const delayMs = (t - ctx.currentTime) * 1000;
      setTimeout(() => onNotePlay(i), Math.max(0, delayMs));
    }
  }

  const total = notes.length * beatDur + noteDur;
  await new Promise((r) => setTimeout(r, total * 1000));
}

// ─── metronome ─────────────────────────────────────────────

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

  const playClick = (b: number) => {
    const isAccent = b % 4 === 0;
    const buf = isAccent ? accentBuf : normalBuf;
    
    const ctx = getCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(masterGain!);
    src.start();
    
    if (onTick) onTick(b);
  };

  playClick(beat);
  beat++;

  metronomeInterval = setInterval(() => {
    if (!isMetronomeRunning) return;
    playClick(beat);
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

export async function playMetronomeClick(accent = false): Promise<void> {
  await initAudioEngine();
  const buf = await makeClickBuffer(accent);
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(masterGain!);
  src.start();
}

// ─── tanpura drone ────────────────────────────────────────

let droneSources: AudioBufferSourceNode[] = [];
let droneGainNodes: GainNode[] = [];
let droneTimer: number | null = null;
let isTanpuraRunning = false;

export async function startTanpura(baseFreq: number = 261.63): Promise<void> {
  await initAudioEngine();
  if (isTanpuraRunning) return;
  isTanpuraRunning = true;
  const ctx = getCtx();

  const loopDuration = 4.0; // 4 seconds per strum

  function scheduleNextDrone(time: number) {
    if (!isTanpuraRunning) return;

    const droneMaster = ctx.createGain();
    droneMaster.gain.setValueAtTime(0, time);
    droneMaster.gain.linearRampToValueAtTime(0.8, time + 1.0);
    droneMaster.gain.setValueAtTime(0.8, time + loopDuration - 1.0);
    droneMaster.gain.linearRampToValueAtTime(0, time + loopDuration);
    droneMaster.connect(masterGain!);

    const harmonics = [
      { ratio: 1.0, gain: 0.5 },    // Sa (Fundamental)
      { ratio: 1.4983, gain: 0.4 }, // Pa (Perfect 5th)
      { ratio: 2.0, gain: 0.3 },    // Sa' (Octave)
      { ratio: 2.9966, gain: 0.1 }  // Pa' (Octave 5th)
    ];

    harmonics.forEach(h => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = baseFreq * h.ratio;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = baseFreq * 6;
      filter.Q.value = 2;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = Math.random() * 0.5 + 0.2; // Slow shimmer
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 100;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(time);
      lfo.stop(time + loopDuration);

      const oscEnv = ctx.createGain();
      oscEnv.gain.value = h.gain;
      
      osc.connect(filter).connect(oscEnv).connect(droneMaster);
      osc.start(time);
      osc.stop(time + loopDuration);
      
      // Type assertion because we're mixing types in the droneSources array for simplicity
      droneSources.push(osc as unknown as AudioBufferSourceNode);
    });

    droneGainNodes.push(droneMaster);

    if (droneGainNodes.length > 5) {
      droneGainNodes.shift();
    }
    if (droneSources.length > 20) {
      droneSources = droneSources.slice(-20);
    }

    const nextTimeMs = (time + loopDuration - 1.0 - ctx.currentTime) * 1000;
    droneTimer = window.setTimeout(() => scheduleNextDrone(time + loopDuration - 1.0), nextTimeMs - 100);
  }

  scheduleNextDrone(ctx.currentTime);
}

export async function stopTanpura(): Promise<void> {
  isTanpuraRunning = false;
  if (droneTimer) clearTimeout(droneTimer);
  
  const ctx = getCtx();
  droneGainNodes.forEach(env => {
    env.gain.cancelScheduledValues(ctx.currentTime);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  });
  
  setTimeout(() => {
    droneSources.forEach(src => {
        try { src.stop(); src.disconnect(); } catch (e) {}
    });
    droneSources = [];
    droneGainNodes = [];
  }, 600);
}

export function isTanpuraPlaying(): boolean {
  return isTanpuraRunning;
}

export function stopAllAudio(): void {
  stopMetronome();
  stopTanpura();

  if (masterGain) {
    const now = getCtx().currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
    masterGain.gain.linearRampToValueAtTime(0.85, now + 0.2);
  }
}
