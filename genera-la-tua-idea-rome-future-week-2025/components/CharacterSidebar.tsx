import React from 'react';
import type { Character } from '../types';

interface CharacterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
}

const roleLabels: { [key in Character['role']]: string } = {
  protagonista: 'Protagonista',
  antagonista: 'Antagonista',
  aiutante: 'Aiutante',
};

const roleColors: { [key in Character['role']]: string } = {
  protagonista: 'bg-blue-100 text-blue-800',
  antagonista: 'bg-red-100 text-red-800',
  aiutante: 'bg-green-100 text-green-800',
};

const CharacterSidebar: React.FC<CharacterSidebarProps> = ({ isOpen, onClose, characters }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[90vw] bg-brand-bg shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-brand-secondary/50">
            <h2 id="sidebar-title" className="text-xl font-serif font-bold text-brand-primary">
              Personaggi
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-brand-primary hover:bg-brand-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Chiudi la barra dei personaggi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {characters.length > 0 ? (
              characters.map((char) => (
                <div key={char.id} className="bg-white p-4 rounded-lg shadow-sm border border-brand-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-brand-text">{char.name || 'Senza nome'}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleColors[char.role]}`}
                    >
                      {roleLabels[char.role]}
                    </span>
                  </div>
                  <p className="text-sm text-brand-text/80 leading-relaxed">{char.description || 'Nessuna descrizione.'}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-brand-text/60 mt-8">Nessun personaggio definito.</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default CharacterSidebar;
