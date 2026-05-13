
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateStoryPart, generateStoryImage } from './services/geminiService';
import type { StoryPart, Character, CharacterRole, SavedStory, SavedStoryState, NarrativeStructureType } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import StoryBlock from './components/StoryBlock';
import CharacterSidebar from './components/CharacterSidebar';
import ThemeCustomizer from './components/ThemeCustomizer';
import type { ThemeColors } from './components/ThemeCustomizer';
import MusicPlayer from './components/MusicPlayer';

declare const jspdf: any;
declare const pdfjsLib: any;

const narrativeStructures: { key: NarrativeStructureType, label: string }[] = [
    { key: 'viaggio_eroe', label: "Il Viaggio dell'Eroe" },
    { key: 'pixar', label: "Pixar Storytelling" },
    { key: 'freytag', label: "Piramide di Freytag" },
];

const defaultThemeColors: ThemeColors = {
  bg: '#FDFBF6',
  text: '#3C3633',
  primary: '#7A6B5D',
  secondary: '#E0D8B0',
  accent: '#AD8B73',
};

const getInitialTheme = (): ThemeColors => {
  try {
    const savedTheme = localStorage.getItem('app-theme-colors');
    if (savedTheme) {
      const parsed = JSON.parse(savedTheme);
      if (parsed.bg && parsed.text && parsed.primary && parsed.secondary && parsed.accent) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Impossibile caricare il tema da localStorage", error);
  }
  return defaultThemeColors;
};

const getInitialVolume = (): number => {
  try {
    const savedVolume = localStorage.getItem('app-music-volume');
    if (savedVolume) {
      const parsedVolume = parseFloat(savedVolume);
      if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
        return parsedVolume;
      }
    }
  } catch (error) {
    console.error("Impossibile caricare il volume da localStorage", error);
  }
  return 0.2; // Default volume
};

const App: React.FC = () => {
  const [isStoryStarted, setIsStoryStarted] = useState<boolean>(false);
  const [incipit, setIncipit] = useState<string>('');
  const [contexto, setContexto] = useState<string>('');
  const [genere, setGenere] = useState<string>('');
  const [narrativeTone, setNarrativeTone] = useState<string>('Neutrale');
  const [characters, setCharacters] = useState<Character[]>([
    { id: crypto.randomUUID(), name: '', role: 'protagonista', description: '' }
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [storyTopic, setStoryTopic] = useState<string>('');
  const [narrativeStructure, setNarrativeStructure] = useState<NarrativeStructureType>('viaggio_eroe');
  
  // State for branching story
  const [storyParts, setStoryParts] = useState<StoryPart[]>([]); // Store for ALL generated story nodes
  const [currentPath, setCurrentPath] = useState<number[]>([]); // Array of part IDs for the current path

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(getInitialVolume);

  // State for Save/Load functionality
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  
  // State for Theme
  const [themeColors, setThemeColors] = useState<ThemeColors>(getInitialTheme);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  
  // State for PDF upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);

  const lastStoryPartRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Derived state for the current view
  const currentPathParts = currentPath.map(id => storyParts.find(p => p.id === id)).filter((p): p is StoryPart => !!p);
  const lastPart = currentPathParts.length > 0 ? currentPathParts[currentPathParts.length - 1] : null;
  const currentChoices = lastPart ? lastPart.choices : [];
  const currentAct = currentPath.length;

  useEffect(() => {
    // Setup PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-brand-bg', themeColors.bg);
    root.style.setProperty('--color-brand-text', themeColors.text);
    root.style.setProperty('--color-brand-primary', themeColors.primary);
    root.style.setProperty('--color-brand-secondary', themeColors.secondary);
    root.style.setProperty('--color-brand-accent', themeColors.accent);

    try {
      localStorage.setItem('app-theme-colors', JSON.stringify(themeColors));
    } catch (error) {
      console.error("Impossibile salvare il tema su localStorage", error);
    }
  }, [themeColors]);

  useEffect(() => {
    // Initialize audio element ref and set initial volume
    const audioElement = document.getElementById('background-music') as HTMLAudioElement;
    if (audioElement) {
        audioRef.current = audioElement;
        audioRef.current.volume = volume;
    }

    try {
      const storiesJSON = localStorage.getItem('interactive_stories');
      if (storiesJSON) {
        setSavedStories(JSON.parse(storiesJSON));
      }
    } catch (err) {
      console.error("Errore nel caricamento delle storie da localStorage:", err);
      localStorage.removeItem('interactive_stories');
    }
  }, []);

  useEffect(() => {
    lastStoryPartRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentPathParts]);

  useEffect(() => {
    if (!isStoryStarted) {
      document.body.classList.add('initial-screen-bg');
    } else {
      document.body.classList.remove('initial-screen-bg');
    }
    return () => {
      document.body.classList.remove('initial-screen-bg');
    };
  }, [isStoryStarted]);

  const handleThemeColorChange = (key: keyof ThemeColors, value: string) => {
    setThemeColors(prev => ({ ...prev, [key]: value }));
  };

  const handleResetTheme = () => {
    setThemeColors(defaultThemeColors);
  };

  const handleMusicToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (audio.volume === 0) {
        const defaultVolume = 0.2;
        audio.volume = defaultVolume;
        setVolume(defaultVolume);
        try {
          localStorage.setItem('app-music-volume', String(defaultVolume));
        } catch (error) {
          console.error("Impossibile salvare il volume su localStorage", error);
        }
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsMusicPlaying(true);
          })
          .catch(error => {
            if (error.name === 'AbortError') {
              return;
            }
            console.error("La riproduzione della musica è fallita:", error);
            setIsMusicPlaying(false);
          });
      }
    } else {
      audio.pause();
      setIsMusicPlaying(false);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    try {
      localStorage.setItem('app-music-volume', String(newVolume));
    } catch (error) {
      console.error("Impossibile salvare il volume su localStorage", error);
    }
  };

  const handleCharacterChange = (id: string, field: keyof Omit<Character, 'id'>, value: string) => {
    setCharacters(prev => prev.map(char => char.id === id ? { ...char, [field]: value } : char));
  };

  const addCharacter = () => {
    setCharacters(prev => [...prev, { id: crypto.randomUUID(), name: '', role: 'aiutante', description: '' }]);
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(char => char.id !== id));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        setError('Per favore, carica un file in formato PDF.');
        return;
    }
    setError('');
    setIsParsingPdf(true);
    setPdfFile(file);

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target?.result;
            if (arrayBuffer instanceof ArrayBuffer) {
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                setPdfContent(fullText.trim());
                setIsParsingPdf(false);
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        setError('Errore durante la lettura del file PDF.');
        console.error(err);
        setIsParsingPdf(false);
        setPdfFile(null);
        setPdfContent('');
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfContent('');
  };
  
  const generateFirstPart = async (prompt: string) => {
      setIsLoading(true);
      setError('');
      try {
          const { storyText, choices } = await generateStoryPart(prompt, '', 1, narrativeStructure, characters, narrativeTone);
          const firstPart: StoryPart = {
              id: 1,
              text: storyText,
              image: null,
              choices: choices,
              parentId: null,
              choiceThatLedHere: null,
          };
          setStoryParts([firstPart]);
          setCurrentPath([1]);

          const imageUrl = await generateStoryImage(storyText);
          setStoryParts(prev => prev.map(p => p.id === firstPart.id ? { ...p, image: imageUrl } : p));
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto.');
          setIsStoryStarted(false); // Go back to the initial screen on error
      } finally {
          setIsLoading(false);
      }
  };

  const handleStartStory = async () => {
    setError('');
    if (!pdfContent && (!incipit.trim() || !contexto.trim() || !genere.trim())) {
      setError('Per favore, compila tutti i campi della storia o carica un PDF.');
      return;
    }
    if (characters.some(c => !c.name.trim())) {
      setError('Per favore, dai un nome a tutti i personaggi.');
      return;
    }

    setCurrentStoryId(null); 
    
    const characterDescriptions = characters
      .map(c => `- ${c.name} (Ruolo: ${c.role}): ${c.description}`)
      .join('\n');

    let combinedPrompt: string;

    if (pdfContent) {
        combinedPrompt = `Istruzioni: Riscrivi il seguente testo per creare il primo capitolo di una storia per studenti delle scuole medie. Applica queste direttive:\n- Genere: ${genere || 'Avventura'}\n- Tono: ${narrativeTone}\n- Contesto (se applicabile): ${contexto}\n- Titolo/Incipit guida: ${incipit || pdfFile?.name || 'Inizio'}\n\nIntegra i seguenti personaggi nella narrazione, assegnando loro un ruolo basato sul testo:\n${characterDescriptions}\n\nTesto originale da riscrivere:\n---\n${pdfContent}\n---`;
        setStoryTopic(incipit || pdfFile?.name.replace('.pdf', '') || "Storia da PDF");
    } else {
        combinedPrompt = `Incipit: "${incipit}".\nContesto storico e geografico: "${contexto}".\nGenere: "${genere}".\n\nPersonaggi principali:\n${characterDescriptions}`;
        setStoryTopic(incipit);
    }
    
    setIsStoryStarted(true);
    await generateFirstPart(combinedPrompt);
  };

  const handleChoice = useCallback(async (choice: string, parentId: number) => {
    const existingPart = storyParts.find(p => p.parentId === parentId && p.choiceThatLedHere === choice);
    if (existingPart) {
        const parentIndex = currentPath.indexOf(parentId);
        const parentPath = currentPath.slice(0, parentIndex + 1);
        setCurrentPath([...parentPath, existingPart.id]);
        return;
    }

    setIsLoading(true);
    setError('');

    const parentIndex = currentPath.indexOf(parentId);
    const parentPathIds = currentPath.slice(0, parentIndex + 1);
    
    const historyParts = parentPathIds.map(id => storyParts.find(p => p.id === id)?.text).filter(Boolean);
    const storyHistory = historyParts.join('\n\n');
    const actForAPI = parentPathIds.length + 1;

    try {
      const { storyText, choices } = await generateStoryPart(choice, storyHistory, actForAPI, narrativeStructure, characters, narrativeTone);
      
      const newPartId = (storyParts.length > 0 ? Math.max(...storyParts.map(p => p.id)) : 0) + 1;
      
      const newStoryPart: StoryPart = {
        id: newPartId,
        text: storyText,
        image: null,
        choices: choices,
        parentId: parentId,
        choiceThatLedHere: choice,
      };
      
      setStoryParts(prev => [...prev, newStoryPart]);
      setCurrentPath([...parentPathIds, newStoryPart.id]);

      const imageUrl = await generateStoryImage(storyText);
      
      setStoryParts(prev => prev.map(part => 
        part.id === newStoryPart.id ? { ...part, image: imageUrl } : part
      ));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto.');
    } finally {
      setIsLoading(false);
    }
  }, [storyParts, currentPath, narrativeStructure, characters, narrativeTone]);

  const handleGoBack = (partId: number) => {
      const partIndexInPath = currentPath.indexOf(partId);
      if (partIndexInPath > 0) {
          // Go to the parent of the current part, effectively showing its choices again
          setCurrentPath(currentPath.slice(0, partIndexInPath));
      }
  };

  const restartStory = () => {
    setIsStoryStarted(false);
    setIncipit('');
    setContexto('');
    setGenere('');
    setStoryTopic('');
    setStoryParts([]);
    setCurrentPath([]);
    setIsLoading(false);
    setError('');
    setNarrativeTone('Neutrale');
    setNarrativeStructure('viaggio_eroe');
    setCharacters([{ id: crypto.randomUUID(), name: '', role: 'protagonista', description: '' }]);
    setIsSidebarOpen(false);
    setCurrentStoryId(null);
    setPdfFile(null);
    setPdfContent('');
    setIsParsingPdf(false);
  };

  const handleSaveStory = () => {
      if (!storyTopic.trim()) {
          setError("Impossibile salvare una storia senza un incipit.");
          return;
      }
      
      const storyState: SavedStoryState = {
        incipit, contexto, genere, characters, narrativeStructure, storyParts,
        currentPath, storyTopic, narrativeTone,
      };
      
      // Always create a new story entry (as a "draft") instead of overwriting.
      const storyIdToSave = Date.now().toString();
      const newStory: SavedStory = {
          id: storyIdToSave,
          title: storyTopic,
          savedAt: new Date().toISOString(),
          state: storyState,
      };

      const updatedStories = [...savedStories, newStory];
      setCurrentStoryId(storyIdToSave); // The current story is now this new draft

      try {
          localStorage.setItem('interactive_stories', JSON.stringify(updatedStories));
          setSavedStories(updatedStories);
          setSaveFeedback('Bozza salvata!');
          setTimeout(() => setSaveFeedback(''), 2000);
      } catch (e) {
          setError("Errore durante il salvataggio della storia.");
          console.error(e);
      }
  };
  
  const handleLoadStory = (storyId: string) => {
      const storyToLoad = savedStories.find(s => s.id === storyId);
      if (!storyToLoad) {
          setError("Storia non trovata.");
          return;
      }

      const { state } = storyToLoad;
      setIncipit(state.incipit);
      setContexto(state.contexto);
      setGenere(state.genere);
      setNarrativeTone(state.narrativeTone || 'Neutrale');
      setCharacters(state.characters);
      setNarrativeStructure(state.narrativeStructure);
      setStoryParts(state.storyParts);
      setCurrentPath(state.currentPath);
      setStoryTopic(state.storyTopic);
      
      setCurrentStoryId(storyToLoad.id);
      setIsStoryStarted(true);
      setIsLoadModalOpen(false);
  };
  
  const handleDeleteStory = (storyId: string) => {
      if (window.confirm("Sei sicuro di voler eliminare questa storia? L'azione è irreversibile.")) {
          const updatedStories = savedStories.filter(s => s.id !== storyId);
          try {
              localStorage.setItem('interactive_stories', JSON.stringify(updatedStories));
              setSavedStories(updatedStories);
          } catch (e) {
              setError("Errore durante l'eliminazione della storia.");
              console.error(e);
          }
      }
  };

  const handleExportTXT = () => {
    setIsExporting(true);
    try {
      const title = `Storia: ${storyTopic}\n\n`;
      const content = currentPathParts.map(part => `ATTO ${part.id}\n\n${part.text}`).join('\n\n---\n\n');
      const fullStory = title + content;

      const blob = new Blob([fullStory], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `la-mia-storia-${storyTopic.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
        setError("Errore durante l'esportazione del file TXT.");
        console.error(e);
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setError('');
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Definiamo i margini e le aree di contenuto
        const margin = 15;
        const headerFooterHeight = 12;

        // --- Pagina 1: Titolo ---
        doc.setFontSize(32);
        doc.setFont('Helvetica', 'bold');
        const titleContentWidth = pageWidth - margin * 2;
        const titleLines = doc.splitTextToSize(`Storia: ${storyTopic}`, titleContentWidth);
        const titleHeight = titleLines.length * (doc.getLineHeight() / doc.internal.scaleFactor);
        doc.text(titleLines, pageWidth / 2, pageHeight / 2 - titleHeight / 2, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text("Generato con l'app 'Genera la tua Idea'", pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // --- Pagine della Storia ---
        const contentY = margin + headerFooterHeight;
        const contentHeight = pageHeight - (margin * 2) - (headerFooterHeight * 2);
        const gutter = 10;
        const columnWidth = (pageWidth - (margin * 2) - gutter) / 2;
        
        for (const [index, part] of currentPathParts.entries()) {
            doc.addPage();
            const actNumber = index + 1;
            const currentPageForDisplay = index + 2;

            // --- Header e Footer ---
            doc.setFontSize(9);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(150, 150, 150);

            // Header
            doc.text(storyTopic, margin, margin + 4);
            doc.text(`Atto ${actNumber}`, pageWidth - margin, margin + 4, { align: 'right' });

            // Footer
            doc.text(`Pagina ${currentPageForDisplay}`, pageWidth / 2, pageHeight - margin - 4, { align: 'center' });
            
            doc.setTextColor(0, 0, 0);

            // --- Colonna Sinistra: Immagine ---
            const imageX = margin;
            const imageY = contentY;
            if (part.image) {
                try {
                    const img = new Image();
                    img.src = part.image;
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = (err) => reject(new Error('Impossibile caricare l\'immagine per il PDF.'));
                        setTimeout(() => reject(new Error('Timeout caricamento immagine')), 10000);
                    });

                    const imgProps = doc.getImageProperties(img);
                    const aspectRatio = imgProps.width / imgProps.height;
                    
                    let imgWidth = columnWidth;
                    let imgHeight = imgWidth / aspectRatio;
                    
                    if (imgHeight > contentHeight) {
                        imgHeight = contentHeight;
                        imgWidth = imgHeight * aspectRatio;
                    }

                    const centeredX = imageX + (columnWidth - imgWidth) / 2;
                    const centeredY = imageY + (contentHeight - imgHeight) / 2;
                    doc.addImage(img, 'JPEG', centeredX, centeredY, imgWidth, imgHeight);
                } catch (imgError) {
                    console.error("Errore nel caricamento dell'immagine per il PDF:", imgError);
                    doc.setFontSize(10);
                    doc.setFont('Helvetica', 'italic');
                    doc.text("Illustrazione non disponibile.", imageX + columnWidth / 2, imageY + contentHeight / 2, { align: 'center' });
                }
            } else {
                doc.setFontSize(12);
                doc.setFont('Helvetica', 'italic');
                doc.text("Illustrazione non disponibile.", imageX + columnWidth / 2, imageY + contentHeight / 2, { align: 'center' });
            }

            // --- Colonna Destra: Testo ---
            const textX = margin + columnWidth + gutter;
            let cursorY = contentY;

            // Testo della scelta precedente
            if (part.choiceThatLedHere) {
                doc.setFontSize(10);
                doc.setFont('Helvetica', 'italic');
                doc.setTextColor(128, 128, 128);
                
                const choiceText = `Dalla scelta: "${part.choiceThatLedHere}"`;
                const choiceLines = doc.splitTextToSize(choiceText, columnWidth);
                doc.text(choiceLines, textX, cursorY);
                cursorY += (choiceLines.length * (doc.getLineHeight() / doc.internal.scaleFactor)) + 8;

                doc.setTextColor(0, 0, 0);
            }
            
            // Gestione del testo principale con adattamento della dimensione del carattere
            const availableTextHeight = (pageHeight - margin - headerFooterHeight) - cursorY;
            let currentFontSize = 12;
            const minFontSize = 8;
            let lines: string[] = [];

            while (currentFontSize >= minFontSize) {
                doc.setFontSize(currentFontSize);
                doc.setFont('Helvetica', 'normal');
                lines = doc.splitTextToSize(part.text, columnWidth);
                const textBlockHeight = lines.length * (doc.getLineHeight() / doc.internal.scaleFactor);
                
                if (textBlockHeight <= availableTextHeight) {
                    break; // Trovata dimensione adatta
                }
                currentFontSize -= 0.5;
            }

            // Se il testo è ancora troppo lungo, verrà usato il font minimo
            // e jsPDF lo taglierà automaticamente se esce dalla pagina.
            // Questa logica minimizza la possibilità che accada.
            if (currentFontSize < minFontSize) {
                doc.setFontSize(minFontSize);
                lines = doc.splitTextToSize(part.text, columnWidth);
            }

            doc.setFont('Helvetica', 'normal');
            doc.text(lines, textX, cursorY);
        }

        doc.save(`la-mia-storia-${storyTopic.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Si è verificato un errore sconosciuto.";
        setError(`Errore durante l'esportazione del PDF: ${errorMessage}`);
        console.error(e);
    } finally {
        setIsExporting(false);
    }
  };

  const renderStoryScreen = () => (
    <div className="max-w-4xl w-full mx-auto py-8">
      <header className="sticky top-0 z-10 bg-brand-bg/80 backdrop-blur-md py-4 px-6 rounded-xl shadow-md mb-8 animate-fade-in-down">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex-grow min-w-0">
            <h1 className="text-2xl font-serif font-bold text-brand-primary truncate" title={storyTopic}>
              {storyTopic || "La tua Storia"}
            </h1>
            <p className="text-sm text-brand-text/70">Atto {currentAct}</p>
          </div>
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 flex-shrink-0">
            <button onClick={() => setIsSidebarOpen(true)} className="px-3 py-2 text-sm bg-brand-secondary text-brand-primary font-semibold rounded-md hover:bg-brand-secondary/80 transition-colors whitespace-nowrap">Personaggi</button>
            <button onClick={handleSaveStory} className="px-3 py-2 text-sm bg-brand-secondary text-brand-primary font-semibold rounded-md hover:bg-brand-secondary/80 transition-colors whitespace-nowrap">Salva Bozza</button>
            <div className="relative group">
                <button className="px-3 py-2 text-sm bg-brand-secondary text-brand-primary font-semibold rounded-md hover:bg-brand-secondary/80 transition-colors whitespace-nowrap">Esporta</button>
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-20">
                    <button onClick={handleExportTXT} disabled={isExporting} className="block w-full text-left px-4 py-2 text-sm text-brand-text hover:bg-brand-secondary/50">Esporta in TXT</button>
                    <button onClick={handleExportPDF} disabled={isExporting} className="block w-full text-left px-4 py-2 text-sm text-brand-text hover:bg-brand-secondary/50">Esporta in PDF</button>
                </div>
            </div>
            <button onClick={restartStory} className="px-3 py-2 text-sm bg-red-100 text-red-700 font-semibold rounded-md hover:bg-red-200 transition-colors whitespace-nowrap">Ricomincia</button>
          </div>
        </div>
        {saveFeedback && <div className="text-center text-green-600 font-semibold mt-2 text-sm animate-fade-in-up">{saveFeedback}</div>}
      </header>
      
      <main className="px-4">
        {currentPathParts.map((part) => (
          <StoryBlock key={part.id} part={part} onGoBack={handleGoBack} />
        ))}

        <div ref={lastStoryPartRef} />

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorDisplay message={error} />
        ) : (
          <div className="mt-8 animate-fade-in-up">
            {currentChoices.length > 0 ? (
              <>
                <h2 className="text-xl font-serif font-bold text-center text-brand-primary mb-4">Cosa succede ora?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentChoices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => lastPart && handleChoice(choice, lastPart.id)}
                      className="text-left p-4 bg-white/60 backdrop-blur-sm rounded-lg shadow-md hover:shadow-xl hover:bg-brand-secondary/50 transform hover:-translate-y-1 transition-all duration-200 border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                    >
                      <p className="font-semibold">{choice}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center p-8 bg-white/50 backdrop-blur-sm rounded-xl shadow-lg">
                <h2 className="text-2xl font-serif font-bold text-brand-primary mb-4">La Fine</h2>
                <p className="mb-6">Hai raggiunto la conclusione di questo ramo della storia. Sentiti libero di tornare indietro per esplorare percorsi diversi o ricominciare da capo per creare una nuova avventura!</p>
                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={restartStory} className="px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-accent transition-colors shadow-md">
                        Crea una Nuova Storia
                    </button>
                    <button onClick={handleExportTXT} disabled={isExporting} className="px-6 py-3 bg-brand-secondary text-brand-primary font-bold rounded-lg hover:bg-brand-secondary/80 transition-colors shadow-md disabled:opacity-50">
                        {isExporting ? 'Esportazione...' : 'Esporta in TXT'}
                    </button>
                    <button onClick={handleExportPDF} disabled={isExporting} className="px-6 py-3 bg-brand-secondary text-brand-primary font-bold rounded-lg hover:bg-brand-secondary/80 transition-colors shadow-md disabled:opacity-50">
                        {isExporting ? 'Esportazione...' : 'Esporta in PDF'}
                    </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  const renderInitialScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <div className="flex-grow flex items-center justify-center w-full">
          <div className="text-center max-w-2xl w-full mx-auto bg-brand-primary/80 text-white backdrop-blur-md p-8 rounded-2xl shadow-xl transition-all duration-500 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4">Crea la Tua Storia</h1>
            <p className="text-lg mb-6 text-white/90">
              Dai vita a un'avventura educativa! Inserisci un tema, definisci i personaggi e scegli una struttura narrativa.
            </p>
            
            <div className="mb-6 space-y-4 text-left">
              <div className="bg-brand-bg/10 p-4 rounded-lg">
                <h2 className="font-bold mb-2 text-lg">1. Dettagli della Storia</h2>
                <div>
                  <label htmlFor="story-incipit" className="block text-sm font-bold mb-1">Incipit</label>
                  <input id="story-incipit" type="text" value={incipit} onChange={(e) => setIncipit(e.target.value)} placeholder="Es: In una biblioteca dimenticata dal tempo..." className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition text-brand-text"/>
                </div>
                <div className="mt-4">
                  <label htmlFor="story-context" className="block text-sm font-bold mb-1">Contesto Storico e Geografico</label>
                  <input id="story-context" type="text" value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Es: Antico Egitto, durante il regno di Cleopatra" className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition text-brand-text"/>
                </div>
                <div className="mt-4">
                  <label htmlFor="story-genre" className="block text-sm font-bold mb-1">Genere</label>
                  <input id="story-genre" type="text" value={genere} onChange={(e) => setGenere(e.target.value)} placeholder="Es: Avventura, Mistero, Fantascienza" className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition text-brand-text"/>
                </div>
                <div className="mt-4">
                  <label htmlFor="story-tone" className="block text-sm font-bold mb-1">Tono Narrativo</label>
                  <div className="relative">
                      <select id="story-tone" value={narrativeTone} onChange={(e) => setNarrativeTone(e.target.value)} className="w-full appearance-none px-4 py-3 bg-brand-bg border-2 border-brand-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition text-brand-text">
                        <option value="Neutrale">Neutrale</option>
                        <option value="Divertente">Divertente</option>
                        <option value="Serio">Serio</option>
                        <option value="Misterioso">Misterioso</option>
                        <option value="Epico">Epico</option>
                        <option value="Educativo">Educativo</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-primary">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-bg/10 p-4 rounded-lg">
                <h2 className="font-bold mb-2 text-lg">2. Struttura Narrativa</h2>
                <div className="relative">
                  <select value={narrativeStructure} onChange={(e) => setNarrativeStructure(e.target.value as NarrativeStructureType)} className="w-full appearance-none px-4 py-3 bg-brand-bg border-2 border-brand-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent transition text-brand-text">
                    {narrativeStructures.map(ns => <option key={ns.key} value={ns.key}>{ns.label}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-primary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="bg-brand-bg/10 p-4 rounded-lg">
                 <h2 className="font-bold mb-2 text-lg">3. Personaggi</h2>
                  {characters.map((char, index) => (
                    <div key={char.id} className="mb-4 p-3 bg-brand-bg/20 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                         <h3 className="font-semibold text-white/90">Personaggio {index + 1}</h3>
                         {characters.length > 1 && (
                           <button onClick={() => removeCharacter(char.id)} className="text-red-300 hover:text-red-200 text-sm">Rimuovi</button>
                         )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input type="text" value={char.name} onChange={(e) => handleCharacterChange(char.id, 'name', e.target.value)} placeholder="Nome" className="px-3 py-2 bg-brand-bg border-2 border-brand-secondary rounded focus:outline-none focus:ring-1 focus:ring-brand-accent text-brand-text"/>
                        <select value={char.role} onChange={(e) => handleCharacterChange(char.id, 'role', e.target.value)} className="px-3 py-2 bg-brand-bg border-2 border-brand-secondary rounded focus:outline-none focus:ring-1 focus:ring-brand-accent text-brand-text">
                          <option value="protagonista">Protagonista</option>
                          <option value="antagonista">Antagonista</option>
                          <option value="aiutante">Aiutante</option>
                        </select>
                      </div>
                      <textarea value={char.description} onChange={(e) => handleCharacterChange(char.id, 'description', e.target.value)} placeholder="Breve descrizione (es: un archeologo coraggioso, un inventore eccentrico...)" className="mt-2 w-full px-3 py-2 bg-brand-bg border-2 border-brand-secondary rounded focus:outline-none focus:ring-1 focus:ring-brand-accent text-brand-text" rows={2}></textarea>
                    </div>
                  ))}
                  <button onClick={addCharacter} className="w-full mt-2 px-4 py-2 text-center bg-brand-secondary/50 text-white font-semibold rounded-lg hover:bg-brand-secondary/80 transition-colors">
                    + Aggiungi Personaggio
                  </button>
              </div>

              <div className="bg-brand-bg/10 p-4 rounded-lg">
                 <h2 className="font-bold mb-2 text-lg">4. Parti da un Documento (Opzionale)</h2>
                 <p className="text-sm text-white/80 mb-3">Carica un PDF per usarlo come base della storia. I campi sopra diventeranno istruzioni per la riscrittura.</p>
                 {isParsingPdf ? (
                    <div className="flex items-center justify-center gap-2 p-4 bg-brand-bg/20 rounded-lg">
                      <LoadingSpinner />
                      <span className="text-white/90">Analisi del PDF in corso...</span>
                    </div>
                 ) : pdfFile ? (
                    <div className="flex items-center justify-between p-3 bg-brand-bg/30 rounded-lg text-brand-text">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-green-300" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold truncate text-white" title={pdfFile.name}>{pdfFile.name}</span>
                        </div>
                        <button onClick={removePdf} className="p-1 rounded-full text-red-300 hover:bg-red-500/50 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                 ) : (
                    <label htmlFor="pdf-upload" className="w-full flex justify-center px-4 py-6 border-2 border-dashed border-brand-secondary/50 rounded-lg cursor-pointer hover:bg-brand-secondary/20 transition-colors">
                        <div className="text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-brand-secondary/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <span className="mt-2 block text-sm font-semibold">Trascina un PDF qui o clicca per caricarlo</span>
                        </div>
                        <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                 )}
              </div>
            </div>

            {error && <div className="bg-red-500 text-white p-3 rounded-lg my-4">{error}</div>}

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button
                  onClick={handleStartStory}
                  className="w-full bg-brand-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transform hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || isParsingPdf}
                >
                  {isLoading ? 'Creazione in corso...' : 'Inizia la Storia'}
                </button>
                <button
                    onClick={() => setIsLoadModalOpen(true)}
                    className="w-full bg-brand-secondary/80 text-brand-primary font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transform hover:scale-105 transition shadow-lg"
                    disabled={savedStories.length === 0}
                >
                    Carica un'avventura esistente
                </button>
            </div>
          </div>
        </div>
        <footer className="text-center text-white/80 text-sm py-4 w-full">
            <div className="flex flex-col items-center gap-4">
                <p>Creato a 3 mani da Roberto Faccenda e Gemini ❤️</p>
            </div>
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
      {!isStoryStarted ? renderInitialScreen() : renderStoryScreen()}
      <CharacterSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} characters={characters} />
      <ThemeCustomizer 
        isOpen={isThemeCustomizerOpen}
        onClose={() => setIsThemeCustomizerOpen(false)}
        colors={themeColors}
        onChange={handleThemeColorChange}
        onReset={handleResetTheme}
      />
       <button 
        onClick={() => setIsThemeCustomizerOpen(true)} 
        title="Personalizza Tema"
        className="fixed top-5 right-5 z-20 w-10 h-10 flex items-center justify-center bg-brand-bg/80 backdrop-blur-md text-brand-primary rounded-full shadow-lg hover:bg-brand-secondary/80 focus:outline-none focus:ring-2 focus:ring-brand-accent transition-colors"
        aria-label="Apri personalizzazione tema"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      <MusicPlayer isMusicPlaying={isMusicPlaying} volume={volume} onToggle={handleMusicToggle} onVolumeChange={handleVolumeChange} />

      {isLoadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center" onClick={() => setIsLoadModalOpen(false)}>
            <div className="bg-brand-bg rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-serif font-bold text-brand-primary">Carica un'Avventura</h2>
                    <button onClick={() => setIsLoadModalOpen(false)} className="p-2 rounded-full text-brand-primary hover:bg-brand-secondary/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {savedStories.length > 0 ? (
                        <ul className="space-y-3">
                           {[...savedStories].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).map(story => (
                               <li key={story.id} className="bg-white p-4 rounded-lg shadow-sm border border-brand-secondary/30 flex justify-between items-center gap-2">
                                   <div>
                                       <p className="font-bold text-brand-text">{story.title}</p>
                                       <p className="text-xs text-brand-text/70">
                                            Salvato il: {new Date(story.savedAt).toLocaleString('it-IT')}
                                       </p>
                                   </div>
                                   <div className="flex-shrink-0 flex gap-2">
                                       <button onClick={() => handleLoadStory(story.id)} className="px-3 py-1 text-sm bg-brand-primary text-white font-semibold rounded-md hover:bg-brand-accent transition-colors">Carica</button>
                                       <button onClick={() => handleDeleteStory(story.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-md">
                                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                       </button>
                                   </div>
                               </li>
                           ))} 
                        </ul>
                    ) : (
                        <p className="text-center text-brand-text/60 py-8">Nessuna storia salvata.</p>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
