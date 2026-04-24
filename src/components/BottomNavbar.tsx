import type { FC } from 'react';
import { Home, Music, Settings, Zap } from 'lucide-react';
import { PageType } from '../types';

interface BottomNavbarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export const BottomNavbar: FC<BottomNavbarProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { page: PageType.HOME, icon: Home, label: 'Home' },
    { page: PageType.EAR_TRAINING, icon: Zap, label: 'Ear Training' },
    { page: PageType.ALANKARS, icon: Music, label: 'Alankars' },
    { page: PageType.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f1419] to-[#1a1f2e] border-t border-[#3d4556] px-4 py-3 shadow-2xl z-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-around items-center gap-2">
          {navItems.map(({ page, icon: Icon, label }) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 ${
                currentPage === page
                  ? 'bg-gradient-to-r from-[#d4a574] to-[#0f8b8d] text-white scale-105'
                  : 'text-[#a1a1aa] hover:text-[#d4a574] hover:bg-[#252d3d]'
              }`}
              aria-label={label}
            >
              <Icon size={24} />
              <span className="text-xs mt-1 hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
