import { useState, useCallback, useRef } from 'react';
import {
  detectFlutePitch,
  DEFAULT_FLUTE_CONFIG,
  formatFrequency,
  getClosestNoteInfo,
} from '../utils/pitchDetection';

type DetectionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'analyzing'
  | 'success'
  | 'failed'
  | 'cancelled';

interface DetectionState {
  status: DetectionStatus;
  progress: number; // 0-100
  totalSamples: number;
  collectedSamples: number;
  currentFrequency: number | null;
  detectedFrequency: number | null;
  confidence: number;
  attempts: number;
  maxAttempts: number;
  message: string;
}

interface DetectionResult {
  frequency: number;
  confidence: number;
}

export const useFluteDetection = () => {
  const [state, setState] = useState<DetectionState>({
    status: 'idle',
    progress: 0,
    totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
    collectedSamples: 0,
    currentFrequency: null,
    detectedFrequency: null,
    confidence: 0,
    attempts: 0,
    maxAttempts: 3,
    message: 'Ready to detect your flute pitch',
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Perform a single detection attempt
  const detectOnce = useCallback(
    async (
      attemptNumber: number,
      maxAttempts: number
    ): Promise<DetectionResult | null> => {
      return new Promise(async (resolve) => {
        if (!audioContextRef.current || !analyserRef.current) {
          resolve(null);
          return;
        }

        const config = {
          ...DEFAULT_FLUTE_CONFIG,
          sampleCount: 12, // Slightly fewer samples per attempt for speed
          sampleIntervalMs: 120,
        };

        const result = await detectFlutePitch(
          audioContextRef.current,
          analyserRef.current,
          config,
          (collected, total, currentFreq) => {
            const progress = Math.round((collected / total) * 100);
            setState((prev) => ({
              ...prev,
              status: 'listening',
              progress,
              collectedSamples: collected,
              totalSamples: total,
              currentFrequency: currentFreq,
              message: `Attempt ${attemptNumber}/${maxAttempts}: Listening... ${progress}%`,
            }));
          }
        );

        if (result && result.confidence >= 0.7) {
          resolve({
            frequency: result.frequency,
            confidence: result.confidence,
          });
        } else {
          resolve(null);
        }
      });
    },
    []
  );

  // Main detection function with multiple attempts
  const startDetection = useCallback(
    async (onSuccess?: (frequency: number) => void) => {
      // Reset state
      setState({
        status: 'requesting_permission',
        progress: 0,
        totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
        collectedSamples: 0,
        currentFrequency: null,
        detectedFrequency: null,
        confidence: 0,
        attempts: 0,
        maxAttempts: 3,
        message: 'Requesting microphone access...',
      });

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // Request microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
          },
        });

        if (signal.aborted) {
          stream.getTracks().forEach((track) => track.stop());
          setState((prev) => ({
            ...prev,
            status: 'cancelled',
            message: 'Detection cancelled',
          }));
          return;
        }

        mediaStreamRef.current = stream;

        // Setup audio context
        const audioContext = new AudioContext({ sampleRate: 44100 });
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096; // Higher resolution for better detection
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Warm-up delay to let audio stabilize
        setState((prev) => ({
          ...prev,
          status: 'listening',
          message: 'Get ready... Start playing Sa on your flute',
        }));
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Perform multiple detection attempts
        const maxAttempts = 3;
        let bestResult: DetectionResult | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          if (signal.aborted) break;

          setState((prev) => ({
            ...prev,
            attempts: attempt,
            status: 'listening',
            message: `Attempt ${attempt}/${maxAttempts}: Blow steadily on your flute...`,
          }));

          const result = await detectOnce(attempt, maxAttempts);

          if (result) {
            if (!bestResult || result.confidence > bestResult.confidence) {
              bestResult = result;
            }

            // If we have a very confident result, we can stop early
            if (result.confidence >= 0.9) {
              break;
            }
          }

          // Brief pause between attempts
          if (attempt < maxAttempts && !signal.aborted) {
            setState((prev) => ({
              ...prev,
              status: 'analyzing',
              message: `Analyzing... preparing for attempt ${attempt + 1}`,
            }));
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        cleanup();

        if (signal.aborted) {
          setState((prev) => ({
            ...prev,
            status: 'cancelled',
            message: 'Detection cancelled',
          }));
          return;
        }

        if (bestResult) {
          const noteInfo = getClosestNoteInfo(bestResult.frequency);
          setState({
            status: 'success',
            progress: 100,
            totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
            collectedSamples: 0,
            currentFrequency: null,
            detectedFrequency: bestResult.frequency,
            confidence: bestResult.confidence,
            attempts: maxAttempts,
            maxAttempts,
            message: `Detected ${formatFrequency(bestResult.frequency)}${
              noteInfo ? ` (${noteInfo.note}${noteInfo.octave})` : ''
            }`,
          });

          if (onSuccess) {
            onSuccess(bestResult.frequency);
          }
        } else {
          setState({
            status: 'failed',
            progress: 0,
            totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
            collectedSamples: 0,
            currentFrequency: null,
            detectedFrequency: null,
            confidence: 0,
            attempts: maxAttempts,
            maxAttempts,
            message:
              'Could not detect a stable pitch. Please try again in a quieter environment and blow steadily.',
          });
        }
      } catch (err) {
        cleanup();
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';

        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          setState({
            status: 'failed',
            progress: 0,
            totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
            collectedSamples: 0,
            currentFrequency: null,
            detectedFrequency: null,
            confidence: 0,
            attempts: 0,
            maxAttempts: 3,
            message: 'Microphone permission denied. Please allow microphone access and try again.',
          });
        } else {
          setState({
            status: 'failed',
            progress: 0,
            totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
            collectedSamples: 0,
            currentFrequency: null,
            detectedFrequency: null,
            confidence: 0,
            attempts: 0,
            maxAttempts: 3,
            message: `Detection failed: ${errorMessage}`,
          });
        }
      }
    },
    [detectOnce, cleanup]
  );

  const cancelDetection = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cleanup();
    setState({
      status: 'cancelled',
      progress: 0,
      totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
      collectedSamples: 0,
      currentFrequency: null,
      detectedFrequency: null,
      confidence: 0,
      attempts: 0,
      maxAttempts: 3,
      message: 'Detection cancelled',
    });
  }, [cleanup]);

  const resetDetection = useCallback(() => {
    cleanup();
    setState({
      status: 'idle',
      progress: 0,
      totalSamples: DEFAULT_FLUTE_CONFIG.sampleCount,
      collectedSamples: 0,
      currentFrequency: null,
      detectedFrequency: null,
      confidence: 0,
      attempts: 0,
      maxAttempts: 3,
      message: 'Ready to detect your flute pitch',
    });
  }, [cleanup]);

  return {
    state,
    startDetection,
    cancelDetection,
    resetDetection,
  };
};
