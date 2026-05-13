import React from 'react';

interface MusicPlayerProps {
  isMusicPlaying: boolean;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isMusicPlaying, volume, onToggle, onVolumeChange }) => {
  return (
    <div 
      className="fixed bottom-5 right-5 z-50"
    >
      <div className="flex items-center gap-3 bg-brand-bg/80 backdrop-blur-md p-2 rounded-full shadow-lg animate-fade-in-up">
        <button 
          onClick={onToggle} 
          title={isMusicPlaying ? "Metti in pausa la musica" : "Riproduci musica"}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-brand-primary text-white rounded-full hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-bg transition-colors"
          aria-label={isMusicPlaying ? "Pausa" : "Play"}
        >
          {isMusicPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          )}
        </button>
        <div className="pr-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={onVolumeChange}
            className="w-24 h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-primary"
            aria-label="Volume musica"
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
