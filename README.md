# NoteLabs

A professional flute practice companion Progressive Web App (PWA) built with React, TypeScript, and Tailwind CSS. NoteLabs helps musicians master ear training, practice alankar patterns, and track their musical progress.

## Features

### Ear Training
- **Flute Setup**: Select your flute type (C, D, E, F, G, A, B) or enter a custom Sa frequency
- **Frequency Detection**: Use your microphone to automatically detect your flute's Sa note
- **Note Selection**: Choose which notes (Sa, Re, Ga, Ma, Pa, Dha, Ni) to practice
- **Interactive Game**: The app plays a note and you guess which one it is
- **Unlimited Attempts**: Keep guessing until you get it right
- **Score Tracking**: Track your accuracy and progress across 10 rounds per session

### Alankar Practice
- **Custom Patterns**: Create alankar patterns with 1-7 notes (e.g., [1,2,3], [1,2,3,4,5])
- **15-Note System**: Generates patterns across all 15 notes from lower to higher octave
- **Flute Selection**: Choose your flute type for accurate frequency generation
- **Tempo Control**: Adjustable BPM from 30 to 240 with visual metronome
- **Audio Playback**: Hear the pattern played with highlighted notes
- **Real-time Visualization**: See which note is currently playing

### Settings & Profile
- **User Profile**: Save your name and preferred flute type
- **Statistics**: View total sessions, practice time, ear training accuracy, and alankar count
- **Achievements**: Track your musical milestones
- **Data Export**: Export all your practice data as JSON
- **Privacy First**: All data stored locally via IndexedDB

### Technical Features
- **Responsive Design**: Optimized for laptops, tablets, and mobile devices
- **PWA Ready**: Install as a standalone app with offline support
- **Progressive Web App**: Manifest and service worker ready
- **Efficient Storage**: IndexedDB with automatic cleanup for optimal performance
- **Audio Engine**: Built with Tone.js for high-quality synthesized audio

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 3
- **Audio**: Tone.js
- **State Management**: React Hooks + Zustand
- **Storage**: IndexedDB (via idb library)
- **Build Tool**: Vite 8
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ installed

### Installation

```bash
# Clone the repository
git clone https://github.com/Coder-011/NoteLabs_.git
cd NoteLabs_

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Deploy to GitHub Pages

The project is configured with `base: '/NoteLabs_/'` in `vite.config.ts` for GitHub Pages deployment.

1. Build the project: `npm run build`
2. Push the `dist` folder contents to the `gh-pages` branch, or
3. Enable GitHub Pages in repository settings and point it to the build output

## Project Structure

```
NoteLabs_
├── public/
│   ├── favicon.svg
│   ├── manifest.json      # PWA manifest
│   └── icons.svg
├── src/
│   ├── components/
│   │   └── BottomNavbar.tsx
│   ├── hooks/
│   │   ├── useEarTraining.ts
│   │   └── useAlankars.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── EarTraining.tsx
│   │   ├── Alankars.tsx
│   │   └── Settings.tsx
│   ├── utils/
│   │   ├── audio.ts       # Tone.js audio engine
│   │   ├── flute.ts       # Note frequencies & alankar generation
│   │   └── storage.ts     # IndexedDB operations
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## License

MIT License - feel free to use and modify as needed.

## Author

Coder-011
