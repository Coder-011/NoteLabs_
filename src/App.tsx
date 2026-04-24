import { useState, useEffect } from 'react';
import { BottomNavbar } from './components/BottomNavbar';
import { HomePage } from './pages/Home';
import { EarTrainingPage } from './pages/EarTraining';
import { AlankarsPage } from './pages/Alankars';
import { SettingsPage } from './pages/Settings';
import { PageType } from './types';
import { initDB } from './utils/storage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>(PageType.HOME);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize database on app start
    const init = async () => {
      try {
        await initDB();
        setDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    init();

    // Initialize user ID if not exists
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', `user-${Date.now()}`);
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case PageType.HOME:
        return <HomePage onNavigate={setCurrentPage} />;
      case PageType.EAR_TRAINING:
        return <EarTrainingPage />;
      case PageType.ALANKARS:
        return <AlankarsPage />;
      case PageType.SETTINGS:
        return <SettingsPage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#3d4556] border-t-[#d4a574] animate-spin mx-auto mb-4" />
          <p className="text-[#e4e4e7]">Initializing NoteLabs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {renderPage()}
      <BottomNavbar currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}

export default App;
