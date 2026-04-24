import type { FC } from 'react';
import { Music, Ear, Target, BookOpen } from 'lucide-react';
import { PageType } from '../types';

interface HomePageProps {
  onNavigate: (page: PageType) => void;
}

export const HomePage: FC<HomePageProps> = ({ onNavigate }) => {
  const tools = [
    {
      icon: Ear,
      title: 'Ear Training',
      description: 'Develop your musical ear with our interactive guessing game. Practice identifying notes, learn your flute scale, and build musical intuition.',
      features: ['Note identification', 'Custom flute selection', 'Progressive difficulty', 'Real-time feedback'],
      page: PageType.EAR_TRAINING,
      color: 'from-[#8b5cf6] to-[#0f8b8d]',
    },
    {
      icon: Music,
      title: 'Alankar Practice',
      description: 'Master alankar patterns with our intelligent practice tool. Create custom note patterns and practice ascending and descending exercises.',
      features: ['Custom patterns', 'Tempo adjustment', '15-note system', 'Pattern generation'],
      page: PageType.ALANKARS,
      color: 'from-[#d4a574] to-[#8b5cf6]',
    },
    {
      icon: Target,
      title: 'Tuning Assistant',
      description: 'Verify your notes are in tune with real-time pitch detection. Get instant feedback on your intonation and improve accuracy.',
      features: ['Real-time detection', 'Tuning gauge', 'Frequency display', 'Deviation meter'],
      page: PageType.EAR_TRAINING,
      color: 'from-[#0f8b8d] to-[#d4a574]',
    },
    {
      icon: BookOpen,
      title: 'Progress Tracking',
      description: 'Monitor your improvement over time with detailed statistics, achievements, and practice history all stored locally.',
      features: ['Session history', 'Achievements', 'Statistics', 'Data export'],
      page: PageType.SETTINGS,
      color: 'from-[#0f8b8d] to-[#8b5cf6]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419] pb-32 px-4">
      {/* Hero Section */}
      <section className="pt-12 pb-20 text-center">
        <div className="mb-8">
          <Music className="w-16 h-16 mx-auto mb-6 text-[#d4a574]" />
          <h1 className="heading-lg mb-4">Welcome to NoteLabs</h1>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            Your comprehensive flute practice companion. Master ear training, practice alankars, and track your musical progress—all in one beautiful, intuitive app.
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="heading-md text-center mb-12">Our Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div
                key={index}
                className="card-hover group overflow-hidden"
              >
                <div className={`h-1 bg-gradient-to-r ${tool.color}`} />
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${tool.color} text-white`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="heading-sm mb-1">{tool.title}</h3>
                    <p className="text-secondary text-sm">{tool.description}</p>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <ul className="grid grid-cols-2 gap-2">
                    {tool.features.map((feature, idx) => (
                      <li key={idx} className="text-secondary text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button */}
                <button
                  onClick={() => onNavigate(tool.page)}
                  className={`w-full btn bg-gradient-to-r ${tool.color} text-white font-semibold`}
                >
                  Start {tool.title === 'Progress Tracking' ? 'Tracking' : 'Practice'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="max-w-4xl mx-auto mb-20">
        <div className="card">
          <h2 className="heading-md mb-6 text-center">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#d4a574]/20 text-[#d4a574] flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="heading-sm mb-2">Setup Your Flute</h3>
              <p className="text-secondary text-sm">
                Go to Settings and select your flute type to calibrate the app for your instrument.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#0f8b8d]/20 text-[#0f8b8d] flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="heading-sm mb-2">Choose Your Practice</h3>
              <p className="text-secondary text-sm">
                Start with Ear Training to develop your musical ear, or practice Alankars for technique.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="heading-sm mb-2">Track Progress</h3>
              <p className="text-secondary text-sm">
                Your sessions are automatically saved. Check your stats and achievements anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-4xl mx-auto">
        <div className="card">
          <h2 className="heading-md mb-6 text-center">Why NoteLabs?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-[#d4a574] mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#e4e4e7] mb-1">Smart Flute Recognition</h3>
                <p className="text-secondary text-sm">
                  Enter your flute's Sa note, and we'll automatically identify your flute and calibrate all frequencies.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-[#0f8b8d] mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#e4e4e7] mb-1">Real-Time Pitch Detection</h3>
                <p className="text-secondary text-sm">
                  Get instant feedback on your intonation with our advanced audio pitch detection technology.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6] mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#e4e4e7] mb-1">Flexible Pattern Practice</h3>
                <p className="text-secondary text-sm">
                  Create any alankar pattern you want. Practice 1-2-3, 1-2-3-4-5, or any custom combination.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-[#d4a574] mt-2 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#e4e4e7] mb-1">Privacy First</h3>
                <p className="text-secondary text-sm">
                  All your data is stored locally on your device. No cloud sync, no tracking—complete privacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
