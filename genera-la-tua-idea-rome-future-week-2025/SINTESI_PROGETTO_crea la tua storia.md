# Sintesi Progetto: Generatore di Storie Interattive (Rome Future Week 2025)

Questo documento fornisce una panoramica tecnica e funzionale dell'applicazione "Generatore di Storie Interattive", progettata per scopi educativi (studenti di scuola media).

## 🚀 Panoramica del Progetto
**Nome:** Generatore di Storie Interattive
**Obiettivo:** Consentire agli studenti di creare storie interattive a bivi, dove l'IA (Gemini) genera narrazione e illustrazioni basate su input utente, strutture narrative classiche e contesti educativi (inclusi PDF caricati).

## 🛠️ Stack Tecnologico
- **Frontend:** React 19 (Functional Components, Hooks)
- **Styling:** Tailwind CSS (Utility-first)
- **AI Engine:** Google Gemini SDK (`@google/genai`)
  - **Modello Testo:** `gemini-2.5-flash` (per velocità e precisione nel seguire istruzioni di sistema)
  - **Modello Immagini:** `imagen-4.0-generate-001` (per illustrazioni evocative)
- **Lib Estere:**
  - `jspdf`: Per l'esportazione delle storie in formato PDF.
  - `pdf.js`: Per il parsing di documenti PDF caricati come contesto narrativo.
- **Stato & Persistenza:** React `useState` e `useEffect`, con salvataggio in `localStorage` per storie e preferenze del tema.

## 📁 Struttura dei File Principali
- `/App.tsx`: Orchestratore principale dello stato (storia, personaggi, tema, musica, export).
- `/services/geminiService.ts`: Logica di prompt engineering. Include le istruzioni di sistema per i vari atti e strutture narrative.
- `/types.ts`: Definizioni TypeScript per `StoryPart`, `Character`, `NarrativeStructureType`, ecc.
- `/components/`:
  - `StoryBlock.tsx`: Renderizza i singoli segmenti della storia con animazioni.
  - `CharacterSidebar.tsx`: Gestione dei personaggi (ruoli e descrizioni).
  - `ThemeCustomizer.tsx`: UI per cambiare i colori del brand in tempo reale.
  - `MusicPlayer.tsx`: Controllo del volume e riproduzione audio di sottofondo.
  - `LoadingSpinner.tsx` & `ErrorDisplay.tsx`: Feedback utente.

## 🧩 Funzionalità Core

### 1. Narrativa Dinamica
L'app supporta tre strutture narrative predefinite:
- **Il Viaggio dell'Eroe (Campbell):** Suddivisione in 5 atti (Chiamata, Soglia, Prova Centrale, Ritorno, Resurrezione).
- **Pixar Storytelling:** Basato sulla formula "C'era una volta... Un giorno... A causa di ciò...".
- **Piramide di Freytag:** Esposizione, Azione Ascendente, Climax, Azione Discendente, Risoluzione.

### 2. Gestione Personaggi
Gli utenti possono definire più personaggi assegnando loro ruoli: **Protagonista, Antagonista, Aiutante**. L'IA è istruita a coinvolgere tutti i personaggi definiti nella trama.

### 3. Integrazione Documentale (PDF Context)
È possibile caricare un file PDF. Il testo estratto viene inviato all'IA come contesto aggiuntivo per generare storie basate su materiali didattici specifici.

### 4. Personalizzazione Estetica
- **Temi:** Gli utenti possono modificare i colori primari, secondari e di accento.
- **Multimedialità:** Immagini generate in tempo reale per ogni parte della storia e musica di sottofondo ambientale.

## 🧠 Dettagli Implementativi (Prompt Engineering)
Il `geminiService.ts` utilizza **System Instructions** differenziate per atto e struttura.
- Il modello riceve il riassunto della storia precedente (`storyHistory`) e l'input corrente.
- La risposta dell'IA deve includere la narrazione seguita da una matrice JSON di 3 scelte (tranne nell'ultimo atto).
- Un parser robusto (`parseStoryResponse`) estrae il testo e le opzioni, gestendo potenziali errori di formato dell'IA.

## 💾 Salvataggio ed Esportazione
- Le storie sono salvate in una lista in `localStorage`.
- L'esportazione PDF genera un documento leggibile con tutta la narrazione accumulata lungo il ramo di scelte selezionato dall'utente.
