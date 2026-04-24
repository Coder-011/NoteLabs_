import { useState } from 'react';
import { Music, Play, Square, Volume2, Clock, Trash2, Radio, Waves, Mic } from 'lucide-react';
import { useAlankars } from '../hooks/useAlankars';
import { FLUTE_SCALES } from '../utils/flute';

export const AlankarsPage = () => {
  const {
    pattern,
    tempo,
    saFrequency,
    generatedNotes,
    isPlaying,
    currentNoteIndex,
    metronomeActive,
    tanpuraActive,
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
  } = useAlankars();

  const [selectedFlute, setSelectedFlute] = useState('C');
  const [customFreq, setCustomFreq] = useState('');
  const [showTanpuraSettings, setShowTanpuraSettings] = useState(false);

  const handleFluteSelect = (flute: string) => {
    setSelectedFlute(flute);
    handleFluteChange(flute);
  };

  const handleCustomFreqChange = (val: string) => {
    setCustomFreq(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 50 && num < 2000) {
      updateTanpuraFrequency(num);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] pb-32 px-4 pt-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="heading-lg mb-2 text-center flex items-center justify-center gap-3">
          <Music className="text-[#d4a574]" size={32} />
          Alankar Practice
        </h1>
        <p className="text-secondary text-center mb-12">Master alankar patterns across all 15 notes</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pattern Creator */}
          <div className="card animate-fade-in">
            <h2 className="heading-md mb-6 flex items-center gap-3">
              <Music className="text-[#d4a574]" size={24} />
              Create Pattern
            </h2>

            <div className="mb-6">
              <label className="block text-[#e4e4e7] font-semibold mb-3">Current Pattern</label>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[48px] p-3 bg-[#252d3d] rounded-lg">
                {pattern.length === 0 ? (
                  <p className="text-secondary italic">No pattern selected</p>
                ) : (
                  pattern.map((num, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRemoveFromPattern(idx)}
                      className="px-4 py-2 bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white rounded-lg hover:scale-110 transition-transform font-semibold"
                      title="Click to remove"
                    >
                      {num} ✕
                    </button>
                  ))
                )}
              </div>
              <p className="text-secondary text-xs">
                {pattern.length}/7 notes — Click a number to remove it
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-[#e4e4e7] font-semibold mb-3">Add Notes (1–7)</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <button
                    key={num}
                    onClick={() => handleAddToPattern(num)}
                    disabled={pattern.length >= 7}
                    className={`py-3 rounded-lg font-semibold transition-all ${
                      pattern.length >= 7
                        ? 'bg-[#3d4556] text-[#a1a1aa] cursor-not-allowed'
                        : 'bg-[#252d3d] text-[#e4e4e7] border border-[#3d4556] hover:bg-[#d4a574] hover:text-black hover:border-[#d4a574]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGeneratePattern}
                disabled={pattern.length === 0}
                className={`flex-1 btn ${pattern.length === 0 ? 'bg-[#3d4556] text-[#a1a1aa] cursor-not-allowed' : 'btn-primary'}`}
              >
                Generate Pattern
              </button>
              <button
                onClick={handleClearPattern}
                className="btn btn-secondary"
                title="Clear pattern"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Practice Tools — Tanpura & Metronome */}
          <div className="card animate-fade-in">
            <h2 className="heading-md mb-6 flex items-center gap-3">
              <Waves className="text-[#8b5cf6]" size={24} />
              Practice Tools
            </h2>

            {/* Tanpura Section */}
            <div className="mb-6 p-4 bg-[#252d3d]/50 rounded-lg border border-[#3d4556]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio size={18} className="text-[#d4a574]" />
                  <span className="text-[#e4e4e7] font-semibold">Tanpura Drone</span>
                </div>
                <button
                  onClick={toggleTanpura}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    tanpuraActive
                      ? 'bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/30'
                      : 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white hover:shadow-lg'
                  }`}
                >
                  {tanpuraActive ? 'Stop Drone' : 'Start Drone'}
                </button>
              </div>

              {tanpuraActive && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse" />
                  <span className="text-[#d4a574] text-xs">Playing — Sa {saFrequency.toFixed(2)} Hz</span>
                </div>
              )}

              <button
                onClick={() => setShowTanpuraSettings(!showTanpuraSettings)}
                className="text-secondary text-xs hover:text-[#d4a574] transition-colors"
              >
                {showTanpuraSettings ? 'Hide' : 'Show'} frequency settings ▾
              </button>

              {showTanpuraSettings && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-secondary text-xs mb-2">Select Flute (sets Sa frequency)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.keys(FLUTE_SCALES).map(flute => (
                        <button
                          key={flute}
                          onClick={() => handleFluteSelect(flute)}
                          className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                            selectedFlute === flute
                              ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white'
                              : 'bg-[#1a1f2e] text-[#a1a1aa] border border-[#3d4556] hover:border-[#d4a574]'
                          }`}
                        >
                          {flute}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-secondary text-xs mb-2 flex items-center gap-1">
                      <Mic size={12} />
                      Custom Frequency (Hz)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={customFreq || saFrequency}
                        onChange={(e) => handleCustomFreqChange(e.target.value)}
                        className="input-field flex-1 text-sm"
                        placeholder="261.63"
                        min="50"
                        max="2000"
                        step="0.01"
                      />
                      <span className="flex items-center text-[#a1a1aa] text-sm font-semibold">Hz</span>
                    </div>
                    <p className="text-secondary text-xs mt-1">
                      Current: {saFrequency.toFixed(2)} Hz
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Metronome Section */}
            <div className="mb-6 p-4 bg-[#252d3d]/50 rounded-lg border border-[#3d4556]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-[#0f8b8d]" />
                  <span className="text-[#e4e4e7] font-semibold">Metronome</span>
                </div>
                <button
                  onClick={toggleMetronome}
                  disabled={isPlaying}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    isPlaying
                      ? 'bg-[#3d4556] text-[#a1a1aa] cursor-not-allowed'
                      : metronomeActive
                        ? 'bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/30'
                        : 'bg-gradient-to-r from-[#0f8b8d] to-[#8b5cf6] text-white hover:shadow-lg'
                  }`}
                >
                  {metronomeActive ? 'Stop' : 'Start'}
                </button>
              </div>

              {metronomeActive && (
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 size={14} className="text-[#0f8b8d] animate-pulse" />
                  <span className="text-[#0f8b8d] text-xs">Active — {tempo} BPM</span>
                </div>
              )}

              <div>
                <label className="block text-secondary text-xs mb-2">Tempo</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="30"
                    max="240"
                    value={tempo}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    disabled={isPlaying}
                    className="flex-1 h-2 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-lg font-bold text-[#d4a574] w-12 text-center">{tempo}</div>
                </div>
                <div className="flex justify-between text-xs text-secondary mt-1">
                  <span>30</span>
                  <span>120</span>
                  <span>240</span>
                </div>
              </div>
            </div>

            {/* Pattern Playback */}
            <button
              onClick={handlePlayPattern}
              disabled={pattern.length === 0}
              className={`w-full btn text-lg flex items-center justify-center gap-2 ${
                pattern.length === 0
                  ? 'bg-[#3d4556] text-[#a1a1aa] cursor-not-allowed'
                  : isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'btn-primary'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square size={20} />
                  Stop Playing
                </>
              ) : (
                <>
                  <Play size={20} />
                  {generatedNotes.length > 0 ? 'Play Pattern' : 'Generate & Play'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Notes */}
        {generatedNotes.length > 0 && (
          <div className="mt-8 card animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-md">Generated Pattern Notes</h2>
              <span className="badge-gold">{generatedNotes.length} notes</span>
            </div>

            <div className="bg-[#252d3d] rounded-lg p-6 mb-6 overflow-x-auto">
              <div className="flex flex-wrap gap-2">
                {generatedNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                      isPlaying && currentNoteIndex === idx
                        ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white scale-110 shadow-lg'
                        : 'bg-[#1a1f2e] text-[#e4e4e7] border border-[#3d4556]'
                    }`}
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-[#252d3d] rounded-lg p-3 text-center">
                <p className="text-secondary text-xs">Pattern</p>
                <p className="text-[#d4a574] font-semibold">[{pattern.join(', ')}]</p>
              </div>
              <div className="bg-[#252d3d] rounded-lg p-3 text-center">
                <p className="text-secondary text-xs">Tempo</p>
                <p className="text-[#0f8b8d] font-semibold">{tempo} BPM</p>
              </div>
              <div className="bg-[#252d3d] rounded-lg p-3 text-center">
                <p className="text-secondary text-xs">Flute</p>
                <p className="text-[#8b5cf6] font-semibold">{selectedFlute}</p>
              </div>
              <div className="bg-[#252d3d] rounded-lg p-3 text-center">
                <p className="text-secondary text-xs">Total Notes</p>
                <p className="text-[#d4a574] font-semibold">{generatedNotes.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 card">
          <h3 className="heading-sm mb-4">How to Use</h3>
          <div className="space-y-3 text-secondary text-sm">
            <p>
              1. <span className="text-[#d4a574]">Create a pattern</span> by adding numbers (1-7). For example, [1,2,3] creates a 3-note ascending pattern.
            </p>
            <p>
              2. <span className="text-[#0f8b8d]">Start the tanpura drone</span> to create a harmonic backdrop for your practice. Choose your flute type or enter a custom Sa frequency.
            </p>
            <p>
              3. <span className="text-[#8b5cf6]">Start the metronome</span> to keep time. Adjust the tempo to your comfort level.
            </p>
            <p>
              4. <span className="text-[#d4a574]">Generate and play</span> the pattern to hear all notes across all 15 notes (lower to higher octave).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
