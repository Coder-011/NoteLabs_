import * as Tone from 'tone';
import { NOTE_INTERVALS } from './flute';

let synth: Tone.Synth | null = null;
let polySynth: Tone.PolySynth | null = null;
let isInitialized = false;

// Initialize Tone.js audio context
export const initAudio = async (): Promise<void> => {
  if (isInitialized) return;

  await Tone.start();

  synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.05,
      decay: 0.2,
      sustain: 0.8,
      release: 0.5,
    },
  }).toDestination();

  polySynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.05,
      decay: 0.1,
      sustain: 0.6,
      release: 0.4,
    },
  }).toDestination();

  // Lower volume
  synth.volume.value = -6;
  if (polySynth) polySynth.volume.value = -8;

  isInitialized = true;
};

// Play a single note by frequency (in Hz)
export const playNoteByFrequency = async (frequency: number, duration: number = 0.8): Promise<void> => {
  await initAudio();
  if (!synth) return;

  const now = Tone.now();
  synth.triggerAttackRelease(frequency, duration, now);
};

// Play a note by name and octave using a base Sa frequency
export const playNote = async (
  noteName: string,
  octave: number,
  saFrequency: number,
  duration: number = 0.8
): Promise<void> => {
  const { getNoteFrequency } = await import('./flute');
  const frequency = getNoteFrequency(noteName, octave, saFrequency);
  await playNoteByFrequency(frequency, duration);
};

// Play a sequence of notes with delays
export const playNoteSequence = async (
  frequencies: number[],
  tempoBPM: number,
  onNotePlay?: (index: number) => void
): Promise<void> => {
  await initAudio();
  if (!synth) return;

  const beatDuration = 60 / tempoBPM; // seconds per beat
  const now = Tone.now();

  frequencies.forEach((freq, index) => {
    const time = now + index * beatDuration;
    synth!.triggerAttackRelease(freq, beatDuration * 0.8, time);

    if (onNotePlay) {
      // Callback after the note starts
      setTimeout(() => onNotePlay(index), index * beatDuration * 1000);
    }
  });

  // Return a promise that resolves when the sequence is done
  const totalDuration = frequencies.length * beatDuration * 1000;
  await new Promise(resolve => setTimeout(resolve, totalDuration));
};

// Play metronome click
export const playMetronomeClick = async (accent: boolean = false): Promise<void> => {
  await initAudio();

  const clickSynth = new Tone.MembraneSynth({
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
  }).toDestination();

  clickSynth.volume.value = accent ? -4 : -12;
  clickSynth.triggerAttackRelease(accent ? 'C2' : 'C1', '32n');

  // Clean up after a short delay
  setTimeout(() => clickSynth.dispose(), 500);
};

// Start a metronome loop
let metronomeLoop: Tone.Loop | null = null;

export const startMetronome = async (tempoBPM: number, onTick?: (beat: number) => void): Promise<void> => {
  await initAudio();
  await stopMetronome();

  Tone.Transport.bpm.value = tempoBPM;

  let beatCount = 0;
  metronomeLoop = new Tone.Loop((time) => {
    const isAccent = beatCount % 4 === 0;
    const clickSynth = new Tone.MembraneSynth({
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    }).toDestination();
    clickSynth.volume.value = isAccent ? -4 : -12;
    clickSynth.triggerAttackRelease(isAccent ? 'C2' : 'C1', '32n', time);

    if (onTick) {
      Tone.Draw.schedule(() => onTick(beatCount), time);
    }

    beatCount++;
  }, '4n').start(0);

  Tone.Transport.start();
};

export const stopMetronome = async (): Promise<void> => {
  if (metronomeLoop) {
    metronomeLoop.stop();
    metronomeLoop.dispose();
    metronomeLoop = null;
  }
  Tone.Transport.stop();
  Tone.Transport.cancel();
};

// Pitch detection using Web Audio API
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;

export const startPitchDetection = async (
  onPitchDetected: (frequency: number, clarity: number) => void
): Promise<void> => {
  audioContext = new AudioContext();
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const source = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);

  const detect = () => {
    if (!analyser) return;

    analyser.getFloatTimeDomainData(buffer);
    const { frequency, clarity } = autoCorrelate(buffer, audioContext!.sampleRate);

    if (frequency > 0 && clarity > 0.8) {
      onPitchDetected(frequency, clarity);
    }

    requestAnimationFrame(detect);
  };

  detect();
};

export const stopPitchDetection = (): void => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
};

// Autocorrelation algorithm for pitch detection
function autoCorrelate(buffer: Float32Array, sampleRate: number): { frequency: number; clarity: number } {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  const correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) {
    return { frequency: -1, clarity: 0 };
  }

  let lastCorrelation = 1;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }

    correlation = 1 - correlation / MAX_SAMPLES;
    correlations[offset] = correlation;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }
    lastCorrelation = correlation;
  }

  if (!foundGoodCorrelation || bestOffset === -1) {
    return { frequency: -1, clarity: 0 };
  }

  const frequency = sampleRate / bestOffset;
  const clarity = bestCorrelation;

  return { frequency, clarity };
}

// Get note name from frequency (for pitch detection feedback)
export const getNoteFromFrequency = (frequency: number, saFrequency: number): { note: string; octave: number; deviation: number } | null => {
  if (frequency <= 0) return null;

  // Calculate cents from Sa
  const centsFromSa = 1200 * Math.log2(frequency / saFrequency);

  // Find the closest note
  let closestNote = '';
  let closestInterval = 0;
  let minDiff = Infinity;

  for (const [note, interval] of Object.entries(NOTE_INTERVALS)) {
    // Check in all octaves around the detected frequency
    for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset++) {
      const totalInterval = interval + octaveOffset * 1200;
      const diff = Math.abs(centsFromSa - totalInterval);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = note;
        closestInterval = totalInterval;
      }
    }
  }

  // Calculate octave (0=lower, 1=middle, 2=higher)
  const octave = Math.round((closestInterval - NOTE_INTERVALS[closestNote as keyof typeof NOTE_INTERVALS]) / 1200) + 1;
  const deviation = centsFromSa - closestInterval;

  return { note: closestNote, octave, deviation };
};

// Stop all audio and clean up
export const stopAllAudio = (): void => {
  stopMetronome();
  stopPitchDetection();

  if (synth) {
    synth.triggerRelease(Tone.now());
  }
  if (polySynth) {
    polySynth.releaseAll();
  }

  Tone.Transport.stop();
  Tone.Transport.cancel();
};
