import { useState, useEffect } from 'react';
import { Settings, User, Trophy, BarChart3, Download, Trash2 } from 'lucide-react';
import { getUserStatistics } from '../utils/storage';

export const SettingsPage = () => {
  const [userName, setUserName] = useState('');
  const [selectedFlute, setSelectedFlute] = useState('C');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Load user data from localStorage
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      const profile = JSON.parse(saved);
      setUserName(profile.name || '');
      setSelectedFlute(profile.flute || 'C');
    }

    // Load statistics
    const userId = localStorage.getItem('userId') || 'default-user';
    getUserStatistics(userId).then(setStats);
  }, []);

  const handleSaveProfile = () => {
    const profile = {
      id: localStorage.getItem('userId') || 'default-user',
      name: userName,
      flute: selectedFlute,
      createdAt: Date.now(),
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));
  };

  const handleExportData = () => {
    const data = {
      profile: localStorage.getItem('userProfile'),
      sessions: localStorage.getItem('sessions'),
      achievements: localStorage.getItem('achievements'),
      exportDate: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `notelabs-backup-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      localStorage.clear();
      setStats(null);
      setUserName('');
      setSelectedFlute('C');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] pb-32 px-4 pt-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="heading-lg mb-2 text-center">Settings & Profile</h1>
        <p className="text-secondary text-center mb-12">Manage your profile, track progress, and data</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <div className="card animate-fade-in">
              <h2 className="heading-md mb-6 flex items-center gap-3">
                <User className="text-[#d4a574]" size={24} />
                Your Profile
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

                <div>
                  <label className="block text-[#e4e4e7] font-semibold mb-3">Flute Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(flute => (
                      <button
                        key={flute}
                        onClick={() => setSelectedFlute(flute)}
                        className={`py-3 rounded-lg font-semibold transition-all ${
                          selectedFlute === flute
                            ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white'
                            : 'bg-[#252d3d] text-[#a1a1aa] border border-[#3d4556] hover:border-[#d4a574]'
                        }`}
                      >
                        {flute}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleSaveProfile} className="w-full btn btn-primary">
                Save Profile
              </button>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="card animate-fade-in mt-6">
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
        </div>

        {/* Data Management */}
        <div className="card mt-6 animate-fade-in">
          <h2 className="heading-md mb-6 flex items-center gap-3">
            <Settings className="text-[#0f8b8d]" size={24} />
            Data Management
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExportData}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Export Data
            </button>
            <button
              onClick={handleClearData}
              className="btn bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/30 flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              Clear All Data
            </button>
          </div>

          <div className="mt-6 bg-[#252d3d] rounded-lg p-4 border border-[#3d4556]">
            <p className="text-secondary text-sm">
              <span className="text-[#d4a574] font-semibold">Privacy Note:</span> All your data is stored locally on your device using IndexedDB. We do not collect, store, or transmit any of your personal information or practice data to external servers.
            </p>
          </div>
        </div>

        {/* App Info */}
        <div className="card mt-6 text-center animate-fade-in">
          <p className="text-secondary text-sm mb-2">NoteLabs v1.0</p>
          <p className="text-secondary text-xs">Professional Flute Practice Companion</p>
        </div>
      </div>
    </div>
  );
};
