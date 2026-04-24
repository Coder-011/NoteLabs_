// Advanced pitch detection optimized for flute (bansuri)
// Uses YIN algorithm with noise gating and median filtering for stable results

interface PitchResult {
  frequency: number;
  clarity: number;
  rms: number;
}

interface DetectionConfig {
  sampleCount: number;        // Number of samples to collect
  sampleIntervalMs: number;   // Interval between samples
  rmsThreshold: number;       // Minimum RMS for valid signal
  clarityThreshold: number;   // Minimum clarity for valid pitch
  minFrequency: number;       // Minimum detectable frequency
  maxFrequency: number;       // Maximum detectable frequency
  outlierThresholdCents: number; // Threshold for outlier rejection
}

export const DEFAULT_FLUTE_CONFIG: DetectionConfig = {
  sampleCount: 15,           // Collect 15 samples
  sampleIntervalMs: 150,     // Every 150ms
  rmsThreshold: 0.015,       // Noise gate threshold
  clarityThreshold: 0.85,    // High clarity required
  minFrequency: 200,         // Flute lower bound (~C4)
  maxFrequency: 2000,        // Flute upper bound (~C7)
  outlierThresholdCents: 50, // Reject samples >50 cents apart
};

// YIN-based pitch detection algorithm
function yinPitchDetection(buffer: Float32Array, sampleRate: number): PitchResult {
  const threshold = 0.1; // YIN threshold
  const bufferSize = buffer.length;
  const halfBuffer = Math.floor(bufferSize / 2);

  // Step 1: Calculate difference function
  const difference = new Float32Array(halfBuffer);
  for (let tau = 0; tau < halfBuffer; tau++) {
    let diff = 0;
    for (let i = 0; i < halfBuffer; i++) {
      const delta = buffer[i] - buffer[i + tau];
      diff += delta * delta;
    }
    difference[tau] = diff;
  }

  // Step 2: Cumulative mean normalized difference
  const cmnd = new Float32Array(halfBuffer);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBuffer; tau++) {
    runningSum += difference[tau];
    cmnd[tau] = difference[tau] * tau / runningSum;
  }

  // Step 3: Absolute threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < halfBuffer; tau++) {
    if (cmnd[tau] < threshold) {
      // Found a candidate, look for local minimum
      while (tau + 1 < halfBuffer && cmnd[tau + 1] < cmnd[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  // If no pitch found with threshold, use global minimum
  if (tauEstimate === -1) {
    let minVal = Infinity;
    for (let tau = 2; tau < halfBuffer; tau++) {
      if (cmnd[tau] < minVal) {
        minVal = cmnd[tau];
        tauEstimate = tau;
      }
    }
  }

  // Step 4: Parabolic interpolation for better accuracy
  let betterTau = tauEstimate;
  if (tauEstimate > 0 && tauEstimate < halfBuffer - 1) {
    const alpha = cmnd[tauEstimate - 1];
    const beta = cmnd[tauEstimate];
    const gamma = cmnd[tauEstimate + 1];
    const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
    betterTau = tauEstimate + p;
  }

  // Calculate RMS
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferSize);

  if (betterTau <= 0 || rms < 0.001) {
    return { frequency: -1, clarity: 0, rms };
  }

  const frequency = sampleRate / betterTau;
  const clarity = 1 - cmnd[tauEstimate];

  return { frequency, clarity, rms };
}

// Calculate median of an array
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Reject outliers
function rejectOutliers(frequencies: number[], thresholdCents: number): number[] {
  if (frequencies.length < 3) return frequencies;

  const med = median(frequencies);

  // Convert threshold cents to frequency ratio
  const ratioThreshold = Math.pow(2, thresholdCents / 1200);

  return frequencies.filter(f => {
    const ratio = f / med;
    return ratio <= ratioThreshold && ratio >= 1 / ratioThreshold;
  });
}

// Main detection function that collects multiple samples
export async function detectFlutePitch(
  audioContext: AudioContext,
  analyser: AnalyserNode,
  config: DetectionConfig = DEFAULT_FLUTE_CONFIG,
  onProgress?: (samplesCollected: number, totalSamples: number, currentFreq: number | null) => void
): Promise<{ frequency: number; confidence: number; samplesUsed: number; allSamples: number[] } | null> {
  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);
  const samples: number[] = [];

  for (let i = 0; i < config.sampleCount; i++) {
    analyser.getFloatTimeDomainData(buffer);
    const result = yinPitchDetection(buffer, audioContext.sampleRate);

    // Only accept samples that pass all filters
    if (
      result.frequency > 0 &&
      result.frequency >= config.minFrequency &&
      result.frequency <= config.maxFrequency &&
      result.rms >= config.rmsThreshold &&
      result.clarity >= config.clarityThreshold
    ) {
      samples.push(result.frequency);
    }

    if (onProgress) {
      onProgress(
        i + 1,
        config.sampleCount,
        samples.length > 0 ? samples[samples.length - 1] : null
      );
    }

    // Wait before next sample
    await new Promise(resolve => setTimeout(resolve, config.sampleIntervalMs));
  }

  if (samples.length < 3) {
    return null; // Not enough valid samples
  }

  // Reject outliers
  const cleanSamples = rejectOutliers(samples, config.outlierThresholdCents);

  if (cleanSamples.length < 3) {
    return null;
  }

  // Calculate final frequency as median of clean samples
  const finalFreq = median(cleanSamples);

  // Confidence based on consistency (low standard deviation = high confidence)
  const mean = cleanSamples.reduce((a, b) => a + b, 0) / cleanSamples.length;
  const variance = cleanSamples.reduce((sum, f) => sum + (f - mean) ** 2, 0) / cleanSamples.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // Coefficient of variation

  // Convert CV to confidence score (lower CV = higher confidence)
  const confidence = Math.max(0, Math.min(1, 1 - cv * 10));

  return {
    frequency: finalFreq,
    confidence,
    samplesUsed: cleanSamples.length,
    allSamples: samples,
  };
}

// Quick single-shot detection for real-time display
export function quickDetectPitch(
  audioContext: AudioContext,
  analyser: AnalyserNode
): PitchResult {
  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(buffer);
  return yinPitchDetection(buffer, audioContext.sampleRate);
}

// Validate if a frequency is in flute range
export function isInFluteRange(frequency: number): boolean {
  return frequency >= 200 && frequency <= 2000;
}

// Format frequency for display
export function formatFrequency(freq: number): string {
  return `${freq.toFixed(2)} Hz`;
}

// Get closest note info
export function getClosestNoteInfo(frequency: number, saFrequency: number = 261.63): {
  note: string;
  octave: number;
  deviationCents: number;
} | null {
  if (frequency <= 0) return null;

  const NOTE_INTERVALS: Record<string, number> = {
    'Sa': 0, 'Re': 204, 'Ga': 408, 'Ma': 498,
    'Pa': 702, 'Dha': 906, 'Ni': 1110,
  };

  const centsFromSa = 1200 * Math.log2(frequency / saFrequency);

  let closestNote = '';
  let closestInterval = 0;
  let minDiff = Infinity;

  for (const [note, interval] of Object.entries(NOTE_INTERVALS)) {
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

  const octave = Math.round((closestInterval - NOTE_INTERVALS[closestNote]) / 1200) + 1;
  const deviationCents = centsFromSa - closestInterval;

  return { note: closestNote, octave, deviationCents };
}
