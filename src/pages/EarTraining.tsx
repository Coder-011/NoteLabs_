import { useState } from 'react';
import {
  Zap,
  Music,
  Volume2,
  Mic,
  RotateCcw,
  Trophy,
  Ear,
  MicOff,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useEarTraining } from '../hooks/useEarTraining';
import { FLUTE_SCALES } from '../utils/flute';

export const EarTrainingPage = () => {
  const {
    step,
    setStep,
    selectedFlute,
    saFrequency,
    selectedNotes,
    gameState,
    feedback,
    detectedFreq,
    detectionState,
    handleFluteSelect,
    handleSaFrequencyChange,
    toggleNote,
    startGame,
    handleGuess,
    stopGame,
    playCurrentNote,
    handleDetectFrequency,
    cancelDetection,
  } = useEarTraining();

  const [customFreq, setCustomFreq] = useState('');
  const ALL_NOTES = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];

  const isDetecting =
    detectionState.status === 'requesting_permission' ||
    detectionState.status === 'listening' ||
    detectionState.status === 'analyzing';

  const getStatusColor = () => {
    switch (detectionState.status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'listening':
        return 'text-[#0f8b8d]';
      case 'analyzing':
        return 'text-[#d4a574]';
      default:
        return 'text-[#a1a1aa]';
    }
  };

  const getStatusBg = () => {
    switch (detectionState.status) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'failed':
        return 'bg-red-500/10 border-red-500/30';
      case 'listening':
        return 'bg-[#0f8b8d]/10 border-[#0f8b8d]/30';
      case 'analyzing':
        return 'bg-[#d4a574]/10 border-[#d4a574]/30';
      default:
        return 'bg-[#252d3d] border-[#3d4556]';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] pb-32 px-4 pt-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="heading-lg mb-2 text-center flex items-center justify-center gap-3">
          <Ear className="text-[#d4a574]" size={32} />
          Ear Training
        </h1>
        <p className="text-secondary text-center mb-12">
          Develop your musical ear through interactive games
        </p>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['setup', 'select-notes', 'playing'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s
                    ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white'
                    : (step === 'select-notes' && s === 'setup') ||
                      (step === 'playing' && (s === 'setup' || s === 'select-notes'))
                    ? 'bg-[#0f8b8d]/30 text-[#0f8b8d]'
                    : 'bg-[#252d3d] text-[#a1a1aa]'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-0.5 ${
                    step !== 'setup' && i === 0 ? 'bg-[#0f8b8d]' : 'bg-[#3d4556]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 'setup' && (
          <div className="card max-w-2xl mx-auto animate-fade-in">
            <h2 className="heading-md mb-6 flex items-center gap-3">
              <Zap className="text-[#d4a574]" size={28} />
              Setup Your Flute
            </h2>

            <div className="mb-8">
              <label className="block text-[#e4e4e7] font-semibold mb-4">
                Select Your Flute
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(FLUTE_SCALES).map((flute) => (
                  <button
                    key={flute}
                    onClick={() => handleFluteSelect(flute)}
                    className={`py-4 rounded-lg font-semibold transition-all ${
                      selectedFlute === flute
                        ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white scale-105'
                        : 'bg-[#252d3d] text-[#a1a1aa] border border-[#3d4556] hover:border-[#d4a574]'
                    }`}
                  >
                    {flute} Flute
                  </button>
                ))}
              </div>
              <p className="text-secondary text-sm mt-2">
                {FLUTE_SCALES[selectedFlute].displayName} — Sa ={' '}
                {FLUTE_SCALES[selectedFlute].baseFrequency} Hz
              </p>
            </div>

            <div className="mb-8">
              <label className="block text-[#e4e4e7] font-semibold mb-4">
                Fine-tune Sa Frequency
              </label>
              <div className="flex gap-3 mb-3">
                <input
                  type="number"
                  value={customFreq || saFrequency}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomFreq(e.target.value);
                    if (!isNaN(val) && val > 0) handleSaFrequencyChange(val);
                  }}
                  className="input-field flex-1"
                  placeholder="e.g., 261.63"
                />
                <span className="flex items-center text-[#a1a1aa] font-semibold">
                  Hz
                </span>
              </div>

              {/* Detection Control */}
              <div className="space-y-4">
                {!isDetecting && detectionState.status !== 'success' && (
                  <button
                    onClick={handleDetectFrequency}
                    disabled={isDetecting}
                    className="w-full btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <Mic size={18} />
                    Detect from Microphone
                  </button>
                )}

                {/* Active Detection Status Bar */}
                {isDetecting && (
                  <div
                    className={`rounded-xl border p-4 ${getStatusBg()} transition-all`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        {detectionState.status === 'listening' && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0f8b8d] opacity-40" />
                        )}
                        <div
                          className={`relative rounded-full p-2 ${
                            detectionState.status === 'listening'
                              ? 'bg-[#0f8b8d]/20'
                              : 'bg-[#d4a574]/20'
                          }`}
                        >
                          {detectionState.status === 'requesting_permission' && (
                            <Loader2 className="animate-spin text-[#d4a574]" size={20} />
                          )}
                          {detectionState.status === 'listening' && (
                            <Mic className="text-[#0f8b8d]" size={20} />
                          )}
                          {detectionState.status === 'analyzing' && (
                            <Activity className="text-[#d4a574]" size={20} />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${getStatusColor()}`}>
                          {detectionState.status === 'requesting_permission' &&
                            'Requesting Microphone...'}
                          {detectionState.status === 'listening' && 'Listening...'}
                          {detectionState.status === 'analyzing' && 'Analyzing...'}
                        </p>
                        <p className="text-sm text-[#a1a1aa]">
                          {detectionState.message}
                        </p>
                      </div>
                      <button
                        onClick={cancelDetection}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <MicOff size={18} />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#1a1f2e] rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          detectionState.status === 'listening'
                            ? 'bg-gradient-to-r from-[#0f8b8d] to-[#d4a574]'
                            : 'bg-[#d4a574]'
                        }`}
                        style={{ width: `${detectionState.progress}%` }}
                      />
                    </div>

                    {/* Real-time Frequency Display */}
                    {detectionState.currentFrequency && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#a1a1aa]">
                          Current:{' '}
                          <span className="text-[#0f8b8d] font-mono">
                            {detectionState.currentFrequency.toFixed(1)} Hz
                          </span>
                        </span>
                        <span className="text-[#a1a1aa]">
                          Sample {detectionState.collectedSamples} /{' '}
                          {detectionState.totalSamples}
                        </span>
                      </div>
                    )}

                    {/* Attempt Counter */}
                    {detectionState.attempts > 0 && (
                      <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                        {[1, 2, 3].map((attempt) => (
                          <span
                            key={attempt}
                            className={`w-2 h-2 rounded-full ${
                              attempt <= detectionState.attempts
                                ? attempt === detectionState.attempts &&
                                  detectionState.status === 'listening'
                                  ? 'bg-[#0f8b8d] animate-pulse'
                                  : 'bg-green-400'
                                : 'bg-[#3d4556]'
                            }`}
                          />
                        ))}
                        <span className="ml-1">Attempt {detectionState.attempts}/3</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success State */}
                {detectionState.status === 'success' && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="text-green-400" size={22} />
                      <div>
                        <p className="font-semibold text-green-400">
                          Detection Successful!
                        </p>
                        <p className="text-sm text-[#a1a1aa]">
                          {detectionState.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#a1a1aa]">
                        Confidence:{' '}
                        <span className="text-green-400 font-semibold">
                          {Math.round(detectionState.confidence * 100)}%
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={handleDetectFrequency}
                      className="mt-3 w-full py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors text-sm"
                    >
                      Detect Again
                    </button>
                  </div>
                )}

                {/* Failed State */}
                {detectionState.status === 'failed' && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <XCircle className="text-red-400" size={22} />
                      <div>
                        <p className="font-semibold text-red-400">
                          Detection Failed
                        </p>
                        <p className="text-sm text-[#a1a1aa]">
                          {detectionState.message}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDetectFrequency}
                      className="mt-3 w-full py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Cancelled State */}
                {detectionState.status === 'cancelled' && (
                  <button
                    onClick={handleDetectFrequency}
                    className="w-full btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <Mic size={18} />
                    Detect from Microphone
                  </button>
                )}

                {/* Legacy detected frequency display (fallback) */}
                {detectedFreq && detectionState.status !== 'success' && (
                  <p className="text-[#0f8b8d] text-sm mt-2">
                    Detected: {detectedFreq.toFixed(2)} Hz
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep('select-notes')}
              className="w-full btn btn-primary text-lg"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'select-notes' && (
          <div className="card max-w-2xl mx-auto animate-fade-in">
            <h2 className="heading-md mb-6 flex items-center gap-3">
              <Music className="text-[#0f8b8d]" size={28} />
              Select Notes to Practice
            </h2>

            <p className="text-secondary mb-6">
              Choose which notes you want to practice identifying:
            </p>

            <div className="mb-8">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {ALL_NOTES.map((note) => (
                  <button
                    key={note}
                    onClick={() => toggleNote(note)}
                    className={`flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all font-semibold ${
                      selectedNotes.includes(note)
                        ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white scale-105'
                        : 'bg-[#252d3d] text-[#a1a1aa] border border-[#3d4556] hover:border-[#d4a574]'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
              <p className="text-secondary text-sm">
                {selectedNotes.length} note{selectedNotes.length !== 1 ? 's' : ''}{' '}
                selected
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setStep('setup')}
                className="btn btn-secondary"
              >
                Back
              </button>
              <button
                onClick={startGame}
                disabled={selectedNotes.length === 0}
                className={`btn ${
                  selectedNotes.length === 0
                    ? 'bg-[#3d4556] text-[#a1a1aa] cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                Start Game
              </button>
            </div>
          </div>
        )}

        {step === 'playing' && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            {/* Game Header */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[#d4a574]" size={20} />
                  <span className="text-[#e4e4e7] font-semibold">
                    Round {gameState.currentRound} / {gameState.totalRounds}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-secondary text-sm">Score:</span>
                  <span className="text-[#0f8b8d] font-bold text-xl">
                    {gameState.correctAnswers}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#252d3d] rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] h-2 rounded-full transition-all"
                  style={{
                    width: `${(gameState.currentRound / gameState.totalRounds) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">
                  Attempts: {gameState.attempts}
                </span>
                <span className="text-secondary">
                  Accuracy:{" "}
                  {gameState.attempts > 0
                    ? Math.round(
                        (gameState.correctAnswers / gameState.attempts) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Listening Area */}
            <div className="card mb-6">
              <div className="bg-[#252d3d] rounded-2xl p-12 text-center mb-6">
                <div
                  className={`text-6xl font-bold mb-4 transition-all ${
                    gameState.showResult
                      ? gameState.lastGuessCorrect
                        ? 'text-green-400'
                        : 'text-red-400'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-[#d4a574] to-[#0f8b8d]'
                  }`}
                >
                  {gameState.showResult
                    ? ALL_NOTES[gameState.currentNoteIndex]
                    : '?'}
                </div>

                {gameState.showResult && (
                  <div
                    className={`text-lg font-semibold mb-4 ${
                      gameState.lastGuessCorrect ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {gameState.lastGuessCorrect
                      ? '✓ Correct!'
                      : `✗ It was ${ALL_NOTES[gameState.currentNoteIndex]}`}
                  </div>
                )}

                <p className="text-secondary mb-8">
                  {gameState.isPlaying
                    ? 'Listen to the note and guess...'
                    : 'Game Complete!'}
                </p>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={playCurrentNote}
                    disabled={!gameState.isPlaying}
                    className="btn btn-primary text-lg"
                  >
                    <Volume2 size={20} className="mr-2" />
                    Play Note
                  </button>
                  <button
                    onClick={stopGame}
                    className="btn btn-secondary"
                  >
                    <RotateCcw size={18} className="mr-2" />
                    Stop
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {feedback && (
                <div
                  className={`text-center p-3 rounded-lg mb-4 ${
                    feedback.includes('Correct')
                      ? 'bg-green-500/10 text-green-400'
                      : feedback.includes('Complete')
                      ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
                      : feedback.includes('Listening')
                      ? 'bg-[#0f8b8d]/10 text-[#0f8b8d]'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {feedback}
                </div>
              )}
            </div>

            {/* Guess Buttons */}
            <div className="card">
              <p className="text-secondary text-center mb-6">
                What note did you hear?
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {selectedNotes.map((note) => (
                  <button
                    key={note}
                    onClick={() => handleGuess(note)}
                    disabled={gameState.showResult || !gameState.isPlaying}
                    className={`py-4 rounded-lg font-semibold transition-all ${
                      gameState.showResult && gameState.guessedNote === note
                        ? gameState.lastGuessCorrect
                          ? 'bg-green-500/20 text-green-400 border border-green-500'
                          : 'bg-red-500/20 text-red-400 border border-red-500'
                        : 'bg-[#252d3d] text-[#e4e4e7] border border-[#3d4556] hover:border-[#d4a574] hover:scale-105'
                    } ${
                      gameState.showResult || !gameState.isPlaying
                        ? 'cursor-not-allowed opacity-60'
                        : ''
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
              <p className="text-secondary text-xs text-center">
                You have unlimited attempts. Keep guessing until you get it
                right!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
