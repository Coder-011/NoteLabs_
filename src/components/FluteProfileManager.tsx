import { useState, useEffect } from 'react';
import { Mic, Play, Plus, Loader, Trash2 } from 'lucide-react';
import { playSampleNote, resumeAudioContextSync } from '../utils/audioEngine';
import { 
  getProfiles, addProfile, setActiveProfile, deleteProfile, getActiveProfile, initSamplerDB,
  saveSample, getSamplesForProfile,
  type FluteProfile, type FluteSample
} from '../utils/samplerStorage';
import { useSmartRecorder } from '../hooks/useSmartRecorder';


const ALL_NOTES = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];

export const FluteProfileManager = () => {
  const [profiles, setProfiles] = useState<FluteProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<FluteProfile | null>(null);
  const [samples, setSamples] = useState<FluteSample[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [recordingNote, setRecordingNote] = useState<string | null>(null);

  const { state: recorderState, rms, timeRemaining, startReadyMode, stop, threshold } = useSmartRecorder({
    onRecordingComplete: async (blob) => {
      if (blob && activeProfile && activeProfile.id && recordingNote) {
        await saveSample(activeProfile.id, recordingNote, blob);
        await loadProfilesAndSamples();
      }
      setRecordingNote(null);
    }
  });

  const loadProfilesAndSamples = async () => {
    await initSamplerDB();
    const profs = await getProfiles();
    setProfiles(profs);
    const active = await getActiveProfile();
    setActiveProfileState(active || null);
    if (active && active.id) {
      const samps = await getSamplesForProfile(active.id);
      setSamples(samps);
    }
  };

  useEffect(() => {
    loadProfilesAndSamples();
  }, []);

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      await addProfile(newProfileName);
      setNewProfileName('');
      await loadProfilesAndSamples();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSelectProfile = async (id: number) => {
    await setActiveProfile(id);
    await loadProfilesAndSamples();
  };

  const handleDeleteProfile = async (id: number) => {
    if (confirm('Delete this profile? All its samples will be lost.')) {
      await deleteProfile(id);
      await loadProfilesAndSamples();
    }
  };

  const handleRecordNote = async (note: string) => {
    if (recorderState !== 'idle' && recorderState !== 'done') {
      stop();
      setRecordingNote(null);
      return;
    }
    setRecordingNote(note);
    const success = await startReadyMode();
    if (!success) {
      setRecordingNote(null);
    }
  };

  const handlePlaySample = (note: string) => {
    resumeAudioContextSync();
    playSampleNote(note, 1.4);
  };

  return (
    <div className="card animate-fade-in w-full">
      <h2 className="heading-md mb-6 flex items-center gap-3">
        <Mic className="text-[#0f8b8d]" size={24} />
        Smart Sampling Profiles
      </h2>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          placeholder="New Flute Name (e.g. C# Bass)"
          className="input-field flex-1"
        />
        <button onClick={handleAddProfile} className="btn btn-primary flex items-center gap-1">
          <Plus size={18} /> Add
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {profiles.map(p => (
          <div key={p.id} className="relative group">
            <button
              onClick={() => p.id && handleSelectProfile(p.id)}
              className={`py-2 px-4 rounded-lg font-semibold transition-all ${
                p.isActive
                  ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white'
                  : 'bg-[#252d3d] text-[#a1a1aa] border border-[#3d4556] hover:border-[#d4a574]'
              }`}
            >
              {p.name}
            </button>
            {!p.isActive && (
              <button 
                onClick={() => p.id && handleDeleteProfile(p.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {activeProfile ? (
        <div className="bg-[#1c2230] p-4 rounded-xl border border-[#3d4556]">
          <h3 className="text-[#e4e4e7] font-semibold mb-4">Record Notes for {activeProfile.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_NOTES.map(note => {
              const hasSample = samples.some(s => s.noteName === note);
              const isRecording = recordingNote === note;
              
              return (
                <div key={note} className="bg-[#252d3d] rounded-lg p-3 border border-[#3d4556] flex flex-col items-center">
                  <span className="text-[#e4e4e7] font-bold text-lg mb-2">{note}</span>
                  
                  {isRecording ? (
                    <div className="w-full text-center">
                      {recorderState === 'ready' && (
                        <div className="text-yellow-400 text-xs font-bold animate-pulse">
                          WAITING (RMS: {rms.toFixed(3)})
                        </div>
                      )}
                      {recorderState === 'recording' && (
                        <div className="text-red-400 text-xs font-bold">
                          REC... {Math.ceil(timeRemaining)}s
                        </div>
                      )}
                      {recorderState === 'processing' && (
                        <div className="text-blue-400 text-xs font-bold flex items-center justify-center gap-1">
                          <Loader size={12} className="animate-spin" /> PROC
                        </div>
                      )}
                      <button onClick={() => { stop(); setRecordingNote(null); }} className="mt-2 text-xs text-red-400 underline">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => handleRecordNote(note)}
                        className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${hasSample ? 'bg-[#d4a574]/20 text-[#d4a574] hover:bg-[#d4a574]/30' : 'bg-[#3d4556] text-white hover:bg-[#4d576a]'}`}
                        disabled={recordingNote !== null}
                      >
                        <Mic size={16} />
                      </button>
                      {hasSample && (
                        <button 
                          onClick={() => handlePlaySample(note)}
                          className="flex-1 py-2 rounded-md bg-[#0f8b8d]/20 text-[#0f8b8d] hover:bg-[#0f8b8d]/30 flex items-center justify-center transition-colors"
                        >
                          <Play size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {recordingNote && recorderState === 'ready' && (
            <div className="mt-6">
              <p className="text-secondary text-sm mb-2 text-center">Blow into the flute to start recording automatically.</p>
              <div className="w-full h-4 bg-[#252d3d] rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, rms * 500)}%` }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white"
                  style={{ left: `${threshold * 500}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-6 bg-[#252d3d] rounded-xl border border-[#3d4556]">
          <p className="text-[#a1a1aa]">Create or select a profile to start recording notes.</p>
        </div>
      )}
    </div>
  );
};
