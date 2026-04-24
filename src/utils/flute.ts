// Standard flute notes and frequencies
// Based on Indian classical music system

export const FLUTE_SCALES: Record<string, { baseFrequency: number; displayName: string }> = {
  'C': { baseFrequency: 261.63, displayName: 'C Flute (Middle C)' },
  'D': { baseFrequency: 293.66, displayName: 'D Flute' },
  'E': { baseFrequency: 329.63, displayName: 'E Flute' },
  'F': { baseFrequency: 349.23, displayName: 'F Flute' },
  'G': { baseFrequency: 392.00, displayName: 'G Flute' },
  'A': { baseFrequency: 440.00, displayName: 'A Flute (Standard)' },
  'B': { baseFrequency: 493.88, displayName: 'B Flute' },
};

// Indian classical music note names
export const NOTE_NAMES = ['Pa', 'Dha', 'Ni', 'Sa', 'Re', 'Ga', 'Ma'];

// 15-note system for alankar practice
// Lower octave (mandra saptak): indices 0-6
// Middle octave (madhya saptak): indices 7-13
// Higher octave (taar saptak): index 14
export const ALANKAR_NOTES = [
  'Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni',  // Lower octave (indices 0-6)
  'Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni',  // Middle octave (indices 7-13)
  'Sa',                                          // Higher octave (index 14)
];

// Semitone intervals from Sa for each note (in cents)
// Sa = 0, Re = 204, Ga = 408, Ma = 498, Pa = 702, Dha = 906, Ni = 1110
export const NOTE_INTERVALS = {
  'Sa': 0,
  'Re': 204,
  'Ga': 408,
  'Ma': 498,
  'Pa': 702,
  'Dha': 906,
  'Ni': 1110,
};

export const getFrequencyForNote = (noteIndex: number, saFrequency: number): number => {
  // Convert note index to octave and note name
  const octaveOffset = Math.floor(noteIndex / 7) - 1; // -1, 0, 1 for lower, middle, higher
  const noteInOctave = noteIndex % 7;
  const noteName = NOTE_NAMES[noteInOctave];
  
  const interval = NOTE_INTERVALS[noteName as keyof typeof NOTE_INTERVALS] || 0;
  const centOffset = interval + octaveOffset * 1200;
  
  // Convert cents to frequency ratio: 2^(cents/1200)
  return saFrequency * Math.pow(2, centOffset / 1200);
};

// Get frequency for a specific note (Pa, Dha, Ni, Sa, Re, Ga, Ma, Pa)
export const getNoteFrequency = (noteName: string, octave: number, saFrequency: number): number => {
  const interval = NOTE_INTERVALS[noteName as keyof typeof NOTE_INTERVALS] || 0;
  // octave: 0 = lower, 1 = middle, 2 = higher
  const centOffset = interval + (octave - 1) * 1200;
  return saFrequency * Math.pow(2, centOffset / 1200);
};

// Calculate deviation in cents between target and detected frequency
export const calculateCentDeviation = (targetFreq: number, detectedFreq: number): number => {
  if (targetFreq === 0 || detectedFreq === 0) return 0;
  return 1200 * Math.log2(detectedFreq / targetFreq);
};

// Check if a note is in tune (within ±2 cents)
export const isInTune = (deviation: number, toleranceCents: number = 2): boolean => {
  return Math.abs(deviation) <= toleranceCents;
};

// Format frequency display
export const formatFrequency = (freq: number): string => {
  return freq.toFixed(2) + ' Hz';
};

// Format deviation display
export const formatDeviation = (deviation: number): string => {
  const sign = deviation > 0 ? '+' : '';
  return sign + deviation.toFixed(2) + ' cents';
};

// Generate alankar pattern notes across all 15 notes (lower to higher octave)
// pattern: [1, 2, 3] means from each starting note, play note, note+1, note+2
export const generateAlankarPattern = (pattern: number[], totalNotes: number = 15): string[] => {
  const result: string[] = [];

  // For each starting position, apply the pattern
  for (let startIndex = 0; startIndex < totalNotes; startIndex++) {
    for (const offset of pattern) {
      const noteIndex = startIndex + offset - 1;
      if (noteIndex >= 0 && noteIndex < totalNotes) {
        result.push(ALANKAR_NOTES[noteIndex]);
      }
    }
  }

  return result;
};

// Example: pattern [1, 2, 3] across 15 notes
// Result: Sa Re Ga | Re Ga Ma | Ga Ma Pa | ... | Sa Re Ga (ascending through all octaves)
