import { useState, useEffect, useRef } from 'react';
import { Settings, User, Trophy, BarChart3, Download, Trash2, Upload } from 'lucide-react';
import { getUserStatistics } from '../utils/storage';
import { exportProfileBackup, importProfileBackup } from '../utils/samplerStorage';
import { FluteProfileManager } from '../components/FluteProfileManager';

export const SettingsPage = () => {
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      const profile = JSON.parse(saved);
      setUserName(profile.name || '');
    }

    const userId = localStorage.getItem('userId') || 'default-user';
    getUserStatistics(userId).then(setStats);
  }, []);

  const handleSaveProfile = () => {
    const profile = {
      id: localStorage.getItem('userId') || 'default-user',
      name: userName,
      createdAt: Date.now(),
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));
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
        alert('Backup imported successfully! Please refresh to see changes.');
        window.location.reload();
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
            <div className="mb-6">
              <FluteProfileManager />
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
