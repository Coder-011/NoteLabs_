import { useState, useCallback, useRef } from 'react';
import { playNoteByFrequency, initAudio } from '../utils/audio';
import { getFrequencyForNote, FLUTE_SCALES } from '../utils/flute';
import { savePracticeSession } from '../utils/storage';
import type { EarTrainingData } from '../types';

interface GameState {
  currentNoteIndex: number;
  attempts: number;
  correctAnswers: number;
  isPlaying: boolean;
  showResult: boolean;
  lastGuessCorrect: boolean | null;
  guessedNote: string | null;
  currentRound: number;
  totalRounds: number;
}

const ALL_NOTES = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];

export const useEarTraining = () => {
  const [step, setStep] = useState<'setup' | 'select-notes' | 'playing'>('setup');
  const [selectedFlute, setSelectedFlute] = useState('C');
  const [saFrequency, setSaFrequency] = useState<number>(FLUTE_SCALES['C'].baseFrequency);
  const [selectedNotes, setSelectedNotes] = useState<string[]>(['Sa', 'Re', 'Ga']);
  const [gameState, setGameState] = useState<GameState>({
    currentNoteIndex: 0,
    attempts: 0,
    correctAnswers: 0,
    isPlaying: false,
    showResult: false,
    lastGuessCorrect: null,
    guessedNote: null,
    currentRound: 0,
    totalRounds: 10,
  });
  const [feedback, setFeedback] = useState<string>('');
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const sessionStartTime = useRef<number>(0);

  const handleFluteSelect = useCallback((flute: string) => {
    setSelectedFlute(flute);
    setSaFrequency(FLUTE_SCALES[flute].baseFrequency);
  }, []);

  const handleSaFrequencyChange = useCallback((freq: number) => {
    setSaFrequency(freq);
  }, []);

  const toggleNote = useCallback((note: string) => {
    setSelectedNotes(prev => {
      if (prev.includes(note)) {
        return prev.filter(n => n !== note);
      }
      return [...prev, note];
    });
  }, []);

  const getRandomNote = useCallback((): { note: string; index: number } => {
    const randomIndex = Math.floor(Math.random() * selectedNotes.length);
    const note = selectedNotes[randomIndex];
    const noteIndex = ALL_NOTES.indexOf(note);
    return { note, index: noteIndex };
  }, [selectedNotes]);

  const playCurrentNote = useCallback(async () => {
    await initAudio();
    const noteIndex = gameState.currentNoteIndex;
    const freq = getFrequencyForNote(noteIndex, saFrequency);
    await playNoteByFrequency(freq, 1.0);
  }, [gameState.currentNoteIndex, saFrequency]);

  const startGame = useCallback(async () => {
    if (selectedNotes.length === 0) return;
    await initAudio();
    sessionStartTime.current = Date.now();

    const { index } = getRandomNote();
    setGameState({
      currentNoteIndex: index,
      attempts: 0,
      correctAnswers: 0,
      isPlaying: true,
      showResult: false,
      lastGuessCorrect: null,
      guessedNote: null,
      currentRound: 1,
      totalRounds: 10,
    });
    setFeedback('');
    setStep('playing');

    // Play first note after a short delay
    setTimeout(() => {
      const freq = getFrequencyForNote(index, saFrequency);
      playNoteByFrequency(freq, 1.0);
    }, 500);
  }, [selectedNotes, getRandomNote, saFrequency]);

  const handleGuess = useCallback(async (guessedNote: string) => {
    const currentNote = ALL_NOTES[gameState.currentNoteIndex];
    const isCorrect = guessedNote === currentNote;

    setGameState(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      showResult: true,
      lastGuessCorrect: isCorrect,
      guessedNote,
    }));

    if (isCorrect) {
      setFeedback(`Correct! That was ${currentNote}`);

      // Move to next round after delay
      setTimeout(() => {
        if (gameState.currentRound < gameState.totalRounds) {
          const { index } = getRandomNote();
          setGameState(prev => ({
            ...prev,
            currentNoteIndex: index,
            showResult: false,
            lastGuessCorrect: null,
            guessedNote: null,
            currentRound: prev.currentRound + 1,
          }));
          setFeedback('');

          // Play next note
          setTimeout(() => {
            const freq = getFrequencyForNote(index, saFrequency);
            playNoteByFrequency(freq, 1.0);
          }, 300);
        } else {
          // Game complete
          setGameState(prev => ({ ...prev, isPlaying: false }));
          setFeedback('Game Complete! Great job!');
          saveSession();
        }
      }, 1500);
    } else {
      setFeedback(`Not quite... Try again!`);
      setTimeout(() => {
        setGameState(prev => ({ ...prev, showResult: false, guessedNote: null }));
        setFeedback('');
      }, 1200);
    }
  }, [gameState.currentNoteIndex, gameState.currentRound, gameState.totalRounds, getRandomNote, saFrequency]);

  const saveSession = useCallback(async () => {
    const duration = Date.now() - sessionStartTime.current;
    const userId = localStorage.getItem('userId') || 'default-user';

    const sessionData: EarTrainingData = {
      selectedNotes,
      difficulty: selectedNotes.length <= 3 ? 'easy' : selectedNotes.length <= 5 ? 'medium' : 'hard',
      correctAnswers: gameState.correctAnswers,
      totalAttempts: gameState.attempts,
      accuracy: gameState.attempts > 0 ? (gameState.correctAnswers / gameState.attempts) * 100 : 0,
    };

    await savePracticeSession({
      id: `session-${Date.now()}`,
      userId,
      sessionType: 'ear-training',
      date: Date.now(),
      duration,
      data: sessionData,
      createdAt: Date.now(),
    });
  }, [selectedNotes, gameState.correctAnswers, gameState.attempts]);

  const stopGame = useCallback(() => {
    if (gameState.attempts > 0) {
      saveSession();
    }
    setStep('select-notes');
    setGameState({
      currentNoteIndex: 0,
      attempts: 0,
      correctAnswers: 0,
      isPlaying: false,
      showResult: false,
      lastGuessCorrect: null,
      guessedNote: null,
      currentRound: 0,
      totalRounds: 10,
    });
    setFeedback('');
  }, [gameState.attempts, saveSession]);

  const handleDetectFrequency = useCallback(async () => {
    try {
      const { startPitchDetection, stopPitchDetection } = await import('../utils/audio');
      setFeedback('Listening... Play your Sa note');

      await startPitchDetection((frequency) => {
        setDetectedFreq(frequency);
        setSaFrequency(frequency);
        setFeedback(`Detected: ${frequency.toFixed(2)} Hz`);
        stopPitchDetection();
      });

      // Stop after 3 seconds
      setTimeout(() => {
        stopPitchDetection();
      }, 3000);
    } catch (err) {
      setFeedback('Microphone access denied or not available');
    }
  }, []);

  return {
    step,
    setStep,
    selectedFlute,
    saFrequency,
    selectedNotes,
    gameState,
    feedback,
    detectedFreq,
    handleFluteSelect,
    handleSaFrequencyChange,
    toggleNote,
    startGame,
    handleGuess,
    stopGame,
    playCurrentNote,
    handleDetectFrequency,
  };
};
