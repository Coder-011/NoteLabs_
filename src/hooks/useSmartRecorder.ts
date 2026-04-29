import { useState, useRef, useCallback, useEffect } from 'react';
import { trimSilenceAndConvertToWav } from '../utils/audioBufferToWav';

export type RecorderState = 'idle' | 'ready' | 'recording' | 'processing' | 'done';

interface UseSmartRecorderProps {
  onRecordingComplete?: (blob: Blob | null) => void;
  threshold?: number; // RMS threshold (0.0 to 1.0)
  maxDurationMs?: number; // max recording duration (e.g. 3000 for 3s)
  preRollMs?: number; // sliding buffer duration (e.g. 300ms)
}

function getRMS(dataArray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const norm = (dataArray[i] / 128.0) - 1.0;
    sum += norm * norm;
  }
  return Math.sqrt(sum / dataArray.length);
}

export const useSmartRecorder = ({
  onRecordingComplete,
  threshold = 0.015,
  maxDurationMs = 2000,
  preRollMs = 300
}: UseSmartRecorderProps = {}) => {
  const [state, setState] = useState<RecorderState>('idle');
  
  // Use a ref for the callback to avoid closure staleness
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [rms, setRms] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isThresholdMetRef = useRef(false);
  const chunkSizeMs = 50;

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const processAudio = async () => {
    setState('processing');
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const fullBlob = new Blob(recordedChunksRef.current, { type: mimeType });
    
    try {
      const trimmedWavBlob = await trimSilenceAndConvertToWav(fullBlob);
      if (onRecordingCompleteRef.current) {
        await Promise.resolve(onRecordingCompleteRef.current(trimmedWavBlob));
      }
      setState('idle');
    } catch (e) {
      console.error('Error processing audio', e);
      if (onRecordingCompleteRef.current) {
        onRecordingCompleteRef.current(null);
      }
      setState('idle');
    }
    cleanup();
  };

  const startReadyMode = async (): Promise<boolean> => {
    try {
      cleanup();
      setState('ready');
      isThresholdMetRef.current = false;
      recordedChunksRef.current = [];
      setRms(0);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        } 
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteTimeDomainData(dataArray);
        const currentRms = getRMS(dataArray);
        setRms(currentRms);

        if (!isThresholdMetRef.current && currentRms > threshold) {
          isThresholdMetRef.current = true;
          startRecordingTimer();
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (isThresholdMetRef.current) {
          processAudio();
        } else {
          setState('idle');
        }
      };

      mediaRecorder.start(chunkSizeMs);
      return true;
    } catch (err) {
      console.error('Error accessing microphone', err);
      setState('idle');
      return false;
    }
  };

  const startRecordingTimer = () => {
    setState('recording');
    setTimeRemaining(maxDurationMs / 1000);
    
    let timeElapsed = 0;
    timerIntervalRef.current = setInterval(() => {
      timeElapsed += 1000;
      setTimeRemaining(Math.max(0, (maxDurationMs - timeElapsed) / 1000));
      
      if (timeElapsed >= maxDurationMs) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop(); // triggers onstop
        }
      }
    }, 1000);
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setState('idle');
    }
  };

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    state,
    rms,
    timeRemaining,
    startReadyMode,
    stop,
    threshold
  };
};
