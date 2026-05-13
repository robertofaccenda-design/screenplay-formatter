import React from 'react';

export interface ThemeColors {
  bg: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  onChange: (key: keyof ThemeColors, value: string) => void;
  onReset: () => void;
}

const colorOptions: { key: keyof ThemeColors; label: string; description: string }[] = [
  { key: 'bg', label: 'Sfondo', description: 'Colore principale di sfondo dell\'app.' },
  { key: 'text', label: 'Testo', description: 'Colore del testo principale.' },
  { key: 'primary', label: 'Primario', description: 'Colore per titoli, bottoni principali e accenti importanti.' },
  { key: 'secondary', label: 'Secondario', description: 'Colore per sfondi di sezioni, bordi e elementi meno importanti.' },
  { key: 'accent', label: 'Accento', description: 'Colore per link, bottoni secondari ed elementi interattivi.' },
];

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ isOpen, onClose, colors, onChange, onReset }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-brand-bg shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-customizer-title"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-brand-secondary/50">
            <h2 id="theme-customizer-title" className="text-xl font-serif font-bold text-brand-primary">
              Personalizza Tema
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-brand-primary hover:bg-brand-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Chiudi personalizzazione tema"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {colorOptions.map(({ key, label, description }) => (
              <div key={key} className="border border-brand-secondary/30 p-3 rounded-lg">
                <label htmlFor={`color-${key}`} className="block text-sm font-bold text-brand-text mb-1">{label}</label>
                <p className="text-xs text-brand-text/70 mb-2">{description}</p>
                <div className="flex items-center gap-2">
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={colors[key]}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-10 h-10 p-0 border-none rounded-md cursor-pointer bg-transparent"
                    aria-label={`Scegli il colore per ${label}`}
                  />
                   <input
                    type="text"
                    value={colors[key]}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-brand-secondary/50 rounded-md text-brand-text"
                    aria-label={`Valore esadecimale per ${label}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <footer className="p-4 border-t border-brand-secondary/50">
            <button
              onClick={onReset}
              className="w-full px-4 py-2 text-center bg-brand-secondary text-brand-primary font-semibold rounded-lg hover:bg-brand-secondary/80 transition-colors"
            >
              Reimposta Predefiniti
            </button>
          </footer>
        </div>
      </aside>
    </>
  );
};

export default ThemeCustomizer;
