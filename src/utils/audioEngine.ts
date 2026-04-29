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
    audioCtx = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' });
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

  const duration = 0.06;
  const buf = await renderOffline(duration, 48000, (ctx) => {
    const noiseDur = 0.015;
    const noiseLen = Math.ceil(noiseDur * 48000);
    const noiseBuffer = ctx.createBuffer(1, noiseLen, 48000);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.3));
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = accent ? 1200 : 900;
    noiseFilter.Q.value = 1.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = accent ? 0.9 : 0.55;
    noiseSrc.connect(noiseFilter).connect(noiseGain);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1000 : 750;
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(accent ? 0.7 : 0.4, 0);
    oscGain.gain.exponentialRampToValueAtTime(0.001, duration);
    osc.connect(oscGain);

    const master = ctx.createGain();
    master.gain.value = 0.7;
    noiseGain.connect(master);
    oscGain.connect(master);
    master.connect(ctx.destination);

    noiseSrc.start();
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

export async function startTanpura(): Promise<void> {
  await initAudioEngine();
  if (isTanpuraRunning) return;
  isTanpuraRunning = true;
  const ctx = getCtx();
  
  const sampleData = await loadSampleBuffer('Sa');
  if (!sampleData) {
    console.warn("Cannot start Tanpura: No 'Sa' sample found.");
    isTanpuraRunning = false;
    return;
  }

  const buffer = sampleData.buffer;
  let loopDuration = buffer.duration - 0.5; // 500ms crossfade
  if (loopDuration <= 0.1) loopDuration = buffer.duration; // Fallback if too short

  function scheduleNextDrone(time: number) {
    if (!isTanpuraRunning) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.7, time + 0.5); // 500ms crossfade in
    env.gain.setValueAtTime(0.7, time + loopDuration);
    env.gain.linearRampToValueAtTime(0, time + loopDuration + 0.5); // 500ms crossfade out
    
    src.connect(env).connect(masterGain!);
    src.start(time);
    src.stop(time + loopDuration + 0.5);

    droneSources.push(src);
    droneGainNodes.push(env);

    if (droneSources.length > 3) {
      droneSources.shift();
      droneGainNodes.shift();
    }

    const nextTimeMs = (time + loopDuration - ctx.currentTime) * 1000;
    droneTimer = window.setTimeout(() => scheduleNextDrone(time + loopDuration), nextTimeMs - 100);
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
