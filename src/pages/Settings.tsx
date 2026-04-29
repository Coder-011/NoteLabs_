import { useState, useEffect, useRef } from 'react';
import { Settings, User, Trophy, BarChart3, Download, Trash2, Mic, Play, Plus, Loader, Upload } from 'lucide-react';
import { getUserStatistics } from '../utils/storage';
import { 
  getProfiles, addProfile, setActiveProfile, deleteProfile, getActiveProfile,
  saveSample, getSamplesForProfile, exportProfileBackup, importProfileBackup,
  type FluteProfile, type FluteSample
} from '../utils/samplerStorage';
import { useSmartRecorder } from '../hooks/useSmartRecorder';
import { playSampleNote } from '../utils/audioEngine';

const ALL_NOTES = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];

export const SettingsPage = () => {
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Profile State
  const [profiles, setProfiles] = useState<FluteProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<FluteProfile | null>(null);
  const [samples, setSamples] = useState<FluteSample[]>([]);
  const [newProfileName, setNewProfileName] = useState('');

  // Recorder State
  const [recordingNote, setRecordingNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state: recorderState, rms, timeRemaining, startReadyMode, stop, threshold } = useSmartRecorder({
    onRecordingComplete: async (blob) => {
      if (activeProfile && activeProfile.id && recordingNote) {
        await saveSample(activeProfile.id, recordingNote, blob);
        await loadProfilesAndSamples();
      }
      setRecordingNote(null);
    }
  });

  const loadProfilesAndSamples = async () => {
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
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      const profile = JSON.parse(saved);
      setUserName(profile.name || '');
    }

    const userId = localStorage.getItem('userId') || 'default-user';
    getUserStatistics(userId).then(setStats);
    
    loadProfilesAndSamples();
  }, []);

  const handleSaveProfile = () => {
    const profile = {
      id: localStorage.getItem('userId') || 'default-user',
      name: userName,
      createdAt: Date.now(),
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));
  };

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
    await startReadyMode();
  };

  const handlePlaySample = (note: string) => {
    playSampleNote(note, 1.4);
  };

  const handleExportData = async () => {
    try {
      const backupJson = await exportProfileBackup();
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(backupJson);
      const exportFileDefaultName = `notelabs-sampler-backup-${Date.now()}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      alert('Failed to export backup');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await importProfileBackup(json);
        await loadProfilesAndSamples();
        alert('Backup imported successfully!');
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      localStorage.clear();
      setStats(null);
      setUserName('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] pb-32 px-4 pt-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="heading-lg mb-2 text-center">Settings & Profile</h1>
        <p className="text-secondary text-center mb-12">Manage your profile, instruments, and data</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            
            {/* Sampler Engine UI */}
            <div className="card animate-fade-in mb-6">
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

              {activeProfile && (
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
                                  RECORDING... {Math.ceil(timeRemaining)}s
                                </div>
                              )}
                              {recorderState === 'processing' && (
                                <div className="text-blue-400 text-xs font-bold flex items-center justify-center gap-1">
                                  <Loader size={12} className="animate-spin" /> PROC
                                </div>
                              )}
                              <button onClick={() => stop()} className="mt-2 text-xs text-red-400 underline">Cancel</button>
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
              )}
            </div>

            {/* Profile Section */}
            <div className="card animate-fade-in mb-6">
              <h2 className="heading-md mb-6 flex items-center gap-3">
                <User className="text-[#d4a574]" size={24} />
                Your Identity
              </h2>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-[#e4e4e7] font-semibold mb-2">Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="input-field"
                  />
                </div>
              </div>

              <button onClick={handleSaveProfile} className="w-full btn btn-primary">
                Save Profile
              </button>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="card animate-fade-in">
                <h2 className="heading-md mb-6 flex items-center gap-3">
                  <BarChart3 className="text-[#0f8b8d]" size={24} />
                  Your Statistics
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#252d3d] rounded-lg p-4 text-center">
                    <p className="text-secondary text-sm mb-2">Total Sessions</p>
                    <p className="text-3xl font-bold text-[#d4a574]">{stats.totalSessions}</p>
                  </div>
                  <div className="bg-[#252d3d] rounded-lg p-4 text-center">
                    <p className="text-secondary text-sm mb-2">Ear Training</p>
                    <p className="text-3xl font-bold text-[#0f8b8d]">{stats.earTrainingCount}</p>
                  </div>
                  <div className="bg-[#252d3d] rounded-lg p-4 text-center">
                    <p className="text-secondary text-sm mb-2">Alankars</p>
                    <p className="text-3xl font-bold text-[#8b5cf6]">{stats.alankarCount}</p>
                  </div>
                  <div className="bg-[#252d3d] rounded-lg p-4 text-center">
                    <p className="text-secondary text-sm mb-2">Avg Accuracy</p>
                    <p className="text-3xl font-bold text-[#d4a574]">{Math.round(stats.averageAccuracy)}%</p>
                  </div>
                  <div className="bg-[#252d3d] rounded-lg p-4 text-center col-span-2">
                    <p className="text-secondary text-sm mb-2">Total Practice Time</p>
                    <p className="text-3xl font-bold text-[#0f8b8d]">
                      {Math.round(stats.totalTime / 1000 / 60)}
                    </p>
                    <p className="text-secondary text-xs mt-1">minutes</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Achievements Sidebar */}
            <div className="card animate-fade-in">
              <h2 className="heading-md mb-6 flex items-center gap-3">
                <Trophy className="text-[#d4a574]" size={24} />
                Achievements
              </h2>

              <div className="space-y-3 mb-8">
                {['Beginner', 'Dedication', 'Perfect Pitch', 'Speed Master'].map((achievement, idx) => (
                  <div key={idx} className="bg-[#252d3d] rounded-lg p-4 border border-[#3d4556] hover:border-[#d4a574] transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] rounded-lg flex items-center justify-center text-white font-bold mb-2">
                      🏆
                    </div>
                    <p className="text-[#e4e4e7] font-semibold text-sm">{achievement}</p>
                    <p className="text-secondary text-xs mt-1">Locked</p>
                  </div>
                ))}
              </div>

              <p className="text-secondary text-sm text-center">
                Complete practice sessions to unlock achievements
              </p>
            </div>

            {/* Data Management */}
            <div className="card animate-fade-in">
              <h2 className="heading-md mb-6 flex items-center gap-3">
                <Settings className="text-[#0f8b8d]" size={24} />
                Data Management
              </h2>

              <div className="space-y-4">
                <button
                  onClick={handleExportData}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Backup Profile (Sampler)
                </button>
                
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2"
                >
                  <Upload size={20} />
                  Restore Profile (Sampler)
                </button>

                <button
                  onClick={handleClearData}
                  className="w-full btn bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/30 flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} />
                  Clear App Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="card mt-6 text-center animate-fade-in">
          <p className="text-secondary text-sm mb-2">NoteLabs v2.0 (Smart Sampler)</p>
          <p className="text-secondary text-xs">Professional Flute Practice Companion</p>
        </div>
      </div>
    </div>
  );
};
