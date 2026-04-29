import type { FC } from 'react';
import { Music, Ear } from 'lucide-react';
import { PageType } from '../types';

interface HomePageProps {
  onNavigate: (page: PageType) => void;
}

export const HomePage: FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#0f1419] pb-32 px-4 flex flex-col items-center justify-start">
      {/* Hero */}
      <section className="pt-16 pb-10 text-center max-w-lg w-full">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4a574] to-[#0f8b8d] flex items-center justify-center mx-auto mb-5">
          <Music className="text-white" size={28} />
        </div>
        <h1 className="text-3xl font-bold text-[#e4e4e7] mb-3">NoteLabs</h1>
        <p className="text-[#a1a1aa] text-base">
          Your flute practice companion — train your ear, master alankars, track your growth.
        </p>
      </section>

      {/* Cards */}
      <section className="w-full max-w-md flex flex-col gap-4">
        <button
          onClick={() => onNavigate(PageType.EAR_TRAINING)}
          className="group w-full text-left bg-[#1a1f2e] border border-[#3d4556] hover:border-[#8b5cf6] rounded-2xl p-5 transition-all duration-200 hover:bg-[#1e2438]"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#8b5cf6]/15 flex items-center justify-center flex-shrink-0">
              <Ear className="text-[#8b5cf6]" size={22} />
            </div>
            <div>
              <p className="font-semibold text-[#e4e4e7] text-base">Ear Training</p>
              <p className="text-[#a1a1aa] text-sm mt-0.5">Identify notes by ear, build musical intuition</p>
            </div>
            <span className="ml-auto text-[#3d4556] group-hover:text-[#8b5cf6] text-lg transition-colors">›</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate(PageType.ALANKARS)}
          className="group w-full text-left bg-[#1a1f2e] border border-[#3d4556] hover:border-[#d4a574] rounded-2xl p-5 transition-all duration-200 hover:bg-[#1e2438]"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#d4a574]/15 flex items-center justify-center flex-shrink-0">
              <Music className="text-[#d4a574]" size={22} />
            </div>
            <div>
              <p className="font-semibold text-[#e4e4e7] text-base">Alankar Practice</p>
              <p className="text-[#a1a1aa] text-sm mt-0.5">Custom patterns, tempo control, 15-note system</p>
            </div>
            <span className="ml-auto text-[#3d4556] group-hover:text-[#d4a574] text-lg transition-colors">›</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate(PageType.SETTINGS)}
          className="group w-full text-left bg-[#1a1f2e] border border-[#3d4556] hover:border-[#0f8b8d] rounded-2xl p-5 transition-all duration-200 hover:bg-[#1e2438]"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#0f8b8d]/15 flex items-center justify-center flex-shrink-0">
              <svg className="text-[#0f8b8d]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#e4e4e7] text-base">Progress & Settings</p>
              <p className="text-[#a1a1aa] text-sm mt-0.5">Stats, achievements, flute profiles</p>
            </div>
            <span className="ml-auto text-[#3d4556] group-hover:text-[#0f8b8d] text-lg transition-colors">›</span>
          </div>
        </button>
      </section>

      {/* Subtle steps */}
      <section className="w-full max-w-md mt-10">
        <p className="text-[#3d4556] text-xs text-center uppercase tracking-widest mb-4">Quick Start</p>
        <div className="flex justify-between gap-2">
          {[
            { step: '1', label: 'Record your flute in Settings' },
            { step: '2', label: 'Pick a practice mode' },
            { step: '3', label: 'Track your progress' },
          ].map(({ step, label }) => (
            <div key={step} className="flex-1 text-center">
              <div className="w-7 h-7 rounded-full border border-[#3d4556] text-[#a1a1aa] text-xs flex items-center justify-center mx-auto mb-2">{step}</div>
              <p className="text-[#708090] text-xs leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
