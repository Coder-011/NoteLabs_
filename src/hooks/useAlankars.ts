import { useState, useCallback, useRef } from 'react';
import { playNoteSequence, startMetronome, stopMetronome, stopAllAudio, initAudio, startTanpura, stopTanpura } from '../utils/audio';
import { generateAlankarPattern, getFrequencyForNote, FLUTE_SCALES } from '../utils/flute';
import { savePracticeSession } from '../utils/storage';
import type { AlankarData } from '../types';

export const useAlankars = () => {
  const [pattern, setPattern] = useState<number[]>([1, 2, 3]);
  const [tempo, setTempo] = useState(60);
  const [saFrequency, setSaFrequency] = useState<number>(FLUTE_SCALES['C'].baseFrequency);
  const [generatedNotes, setGeneratedNotes] = useState<string[]>([]);
  const [generatedFrequencies, setGeneratedFrequencies] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(-1);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [tanpuraActive, setTanpuraActive] = useState(false);
  const [patternLength, setPatternLength] = useState(0);
  const sessionStartTime = useRef<number>(0);
  const abortController = useRef<AbortController | null>(null);

  const handleAddToPattern = useCallback((num: number) => {
    if (pattern.length >= 7) return;
    setPattern(prev => [...prev, num]);
  }, [pattern.length]);

  const handleRemoveFromPattern = useCallback((index: number) => {
    setPattern(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearPattern = useCallback(() => {
    setPattern([]);
    setGeneratedNotes([]);
    setGeneratedFrequencies([]);
    setCurrentNoteIndex(-1);
  }, []);

  const handleGeneratePattern = useCallback(() => {
    if (pattern.length === 0) return;
    const notes = generateAlankarPattern(pattern, 15);
    setGeneratedNotes(notes);
    setPatternLength(notes.length);

    // Generate frequencies for all notes
    const freqs = notes.map((_, idx) => {
      const noteIn15System = idx % 15;
      return getFrequencyForNote(noteIn15System, saFrequency);
    });
    setGeneratedFrequencies(freqs);
    setCurrentNoteIndex(-1);
  }, [pattern, saFrequency]);

  const handlePlayPattern = useCallback(async () => {
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
      setMetronomeActive(false);
      setCurrentNoteIndex(-1);
      if (abortController.current) {
        abortController.current.abort();
      }
      return;
    }

    if (generatedFrequencies.length === 0) {
      handleGeneratePattern();
      return;
    }

    await initAudio();
    abortController.current = new AbortController();
    setIsPlaying(true);
    sessionStartTime.current = Date.now();

    // Start metronome
    setMetronomeActive(true);
    await startMetronome(tempo, (beat) => {
      if (beat % 4 === 0) {
        // Accent beat
      }
    });

    // Play note sequence
    try {
      await playNoteSequence(generatedFrequencies, tempo, (index) => {
        setCurrentNoteIndex(index);
      });

      // Wait a bit after sequence completes
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      // Sequence was aborted
    }

    // Stop metronome
    await stopMetronome();
    setMetronomeActive(false);
    setIsPlaying(false);
    setCurrentNoteIndex(-1);

    // Save session
    await saveAlankarSession();
  }, [isPlaying, generatedFrequencies, tempo, handleGeneratePattern]);

  // Standalone metronome toggle
  const toggleMetronome = useCallback(async () => {
    if (metronomeActive) {
      await stopMetronome();
      setMetronomeActive(false);
    } else {
      await initAudio();
      setMetronomeActive(true);
      await startMetronome(tempo, (beat) => {
        if (beat % 4 === 0) {
          // Accent beat
        }
      });
    }
  }, [metronomeActive, tempo]);

  // Tanpura toggle
  const toggleTanpura = useCallback(async () => {
    if (tanpuraActive) {
      await stopTanpura();
      setTanpuraActive(false);
    } else {
      await startTanpura(saFrequency);
      setTanpuraActive(true);
    }
  }, [tanpuraActive, saFrequency]);

  // Update tanpura frequency while playing
  const updateTanpuraFrequency = useCallback(async (freq: number) => {
    setSaFrequency(freq);
    if (tanpuraActive) {
      await stopTanpura();
      await startTanpura(freq);
    }
  }, [tanpuraActive]);

  const saveAlankarSession = useCallback(async () => {
    const duration = Date.now() - sessionStartTime.current;
    const userId = localStorage.getItem('userId') || 'default-user';

    const sessionData: AlankarData = {
      pattern,
      tempo,
      notes: generatedNotes,
      completed: true,
      tempo_progression: [tempo],
    };

    await savePracticeSession({
      id: `session-${Date.now()}`,
      userId,
      sessionType: 'alankar',
      date: Date.now(),
      duration,
      data: sessionData,
      createdAt: Date.now(),
    });
  }, [pattern, tempo, generatedNotes]);

  const handleFluteChange = useCallback((flute: string) => {
    const freq = FLUTE_SCALES[flute].baseFrequency;
    setSaFrequency(freq);
  }, []);

  return {
    pattern,
    tempo,
    saFrequency,
    generatedNotes,
    generatedFrequencies,
    isPlaying,
    currentNoteIndex,
    metronomeActive,
    tanpuraActive,
    patternLength,
    handleAddToPattern,
    handleRemoveFromPattern,
    handleClearPattern,
    handleGeneratePattern,
    handlePlayPattern,
    toggleMetronome,
    toggleTanpura,
    updateTanpuraFrequency,
    setTempo,
    handleFluteChange,
  };
};
