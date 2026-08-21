# DeepFrame Script

Modulo iniziale dell'ecosistema **DeepFrame — Beyond Screenwriting**.

DeepFrame nasce dall'evoluzione di Screenplay Formatter AI: da strumento per formattare sceneggiature a ecosistema creativo per storytelling, regia, produzione, didattica audiovisiva e workflow XR.

Questo repository contiene il primo modulo operativo: **DeepFrame Script**. Il modulo prende un testo grezzo, caricato da file o incollato manualmente, e lo trasforma in una sceneggiatura strutturata. Dopo la formattazione, genera strumenti utili per scrittura, didattica e pre-produzione: analisi drammaturgica, schede personaggio, schede location, breakdown per reparti ed export professionali.

## Visione Ecosistema

DeepFrame non vuole essere solo un formatter o un software di produzione. La direzione è costruire un **Creative Workflow Ecosystem for Filmmakers**.

Moduli previsti:

| Modulo | Funzione |
| --- | --- |
| DeepFrame Script | Formattazione, parsing, analisi narrativa, export |
| DeepFrame Director | Shotlist AI, mood analysis, sviluppo registico |
| DeepFrame Production | Breakdown, continuity, call sheet, workflow reparti |
| DeepFrame XR | Branching narrative, Unity export, storytelling immersivo |
| DeepFrame Education | Rubriche, valutazioni, modalità docente, percorsi formativi |

## Cosa Fa

- Importa testi `.txt`, `.docx` e PDF con testo selezionabile
- Accetta anche testo incollato direttamente nella textarea
- Permette di caricare una sceneggiatura gia formattata senza passare dalla formattazione AI
- Integra il modulo **Crea la tua storia** raggiungibile dalla home e dalla rotta `/crea-la-tua-storia/`
- Permette di creare una storia guidata, esportarla in PDF/TXT e caricarla direttamente nella formattazione creativa di DeepFrame
- Riconosce gli elementi principali di una sceneggiatura:
  - titolo
  - intestazioni scena
  - azioni
  - personaggi
  - dialoghi
  - parentetiche
  - transizioni
- Genera un'anteprima in stile sceneggiatura
- Mostra la struttura degli elementi riconosciuti
- Esporta in formato `.fountain`
- Esporta in formato `.html`
- Esporta in PDF continuo
- Esporta in PDF con una scena per pagina
- Mostra una stima in ottavi di pagina per ogni scena
- Genera un'analisi drammaturgica
- Genera schede personaggio
- Genera schede location
- Genera breakdown per reparti di produzione
- Genera una bozza di budget di produzione editabile a partire dal breakdown reparti (voci ATL/BTL/Post-produzione, percentuali di assicurazioni/spese generali/imprevisti)
- Esporta in PDF anche schede personaggio, schede location, breakdown reparti e budget di produzione
- Esporta il budget di produzione anche in CSV per Excel
- Integra Lumina Studio in una scheda **Luci 3D** per simulazioni di setup luce
- Permette di scegliere tra AI Anthropic su Cloudflare e modello locale via LM Studio
- Integra **DeepFrame Director / Storyboard** per generare prompt visivi da ogni scena
- Si collega a **ComfyUI locale** per generare frame storyboard direttamente dalla sceneggiatura
- Rileva automaticamente i checkpoint installati in ComfyUI
- Mantiene in memoria i frame generati mentre si naviga tra Processo, Anteprima, Struttura e Director
- Mostra lo stato dello storyboard nel tab **Processo** e lo completa quando tutte le scene hanno frame
- Esporta un **pacchetto storyboard JSON** con scene, prompt, negative prompt, configurazione e stato frame
- Include logo DeepFrame in header e favicon dell'app
- Include un comando di stop per interrompere parsing o formattazione avviati accidentalmente

## Aggiornamenti Recenti

### Budget di Produzione

Nuovo modulo che genera una bozza di budget di produzione editabile a partire dal **Breakdown Reparti** già calcolato: non rilegge la sceneggiatura, riusa cast, location, props, costumi, comparse e giorni di ripresa già estratti.

Caratteristiche:

- voci raggruppate in **ATL** (Above The Line), **BTL** (Below The Line) e **Post-produzione**, ciascuna editabile (quantità, unità, costo unitario);
- convenzioni italiane: tariffe di mercato indipendente/formativo, CCNL cinema, INPS ex-ENPALS, non tariffe o sindacati statunitensi;
- percentuali configurabili per **Assicurazioni**, **Spese generali** e **Imprevisti**, calcolate sul subtotale di produzione (non voci generate dall'AI);
- aggiunta e rimozione manuale di voci in ogni categoria;
- export **CSV** (separatore `;`, con BOM per compatibilità Excel in italiano) ed export **PDF** stampabile;
- fallback locale deterministico (`buildFallbackBudget`) se l'AI (LM Studio o Anthropic) non restituisce un JSON valido, cosi il flusso non si blocca mai: viene generata comunque una bozza con tariffe indicative da rifinire a mano;
- pensato in particolare per bozze di piano economico da rifinire per candidature a bandi pubblici (MiC, CIPS, SIAE).

Il bottone **Budget di Produzione** compare in sidebar solo dopo aver generato il Breakdown Reparti.

### DeepFrame Director / Storyboard

Il modulo **Director / Storyboard** trasforma le scene riconosciute in prompt visivi e consente di generare frame storyboard con ComfyUI.

Funzioni principali:

- tab **Director / Storyboard** disponibile quando la sceneggiatura contiene scene riconosciute;
- estrazione automatica di scene, location, momento, azione e personaggi;
- generazione di prompt ComfyUI per ogni scena;
- negative prompt per ridurre immagini casuali, astratte, simboliche o non coerenti;
- controlli per stile, camera, checkpoint, qualita, fedelta, larghezza, altezza e direzione visiva;
- generazione singola scena o batch sequenziale;
- anteprima del frame generato nella card scena;
- persistenza dei frame quando si cambia tab;
- reset della singola scena;
- esportazione con pulsante **Scarica pacchetto storyboard JSON**.

Il prompt Director e stato ottimizzato per SDXL/ComfyUI: e piu breve, letterale e orientato a soggetto, ambiente, azione visibile e props di scena. Questo perche modelli come Nano Banana interpretano meglio prompt narrativi lunghi, mentre SDXL base tende a produrre risultati piu coerenti con prompt visuali espliciti.

### Integrazione ComfyUI Locale

DeepFrame puo collegarsi a ComfyUI in locale sull'endpoint predefinito:

```text
http://127.0.0.1:8188
```

Il flusso usa un workflow ComfyUI base:

- `CheckpointLoaderSimple`;
- `CLIPTextEncode`;
- `EmptyLatentImage`;
- `KSampler`;
- `VAEDecode`;
- `SaveImage`.

In sviluppo locale Vite usa il proxy:

```text
/comfyui
```

Questo evita problemi CORS e rimuove l'header `Origin` che alcune versioni di ComfyUI rifiutano con errore `403`.

Funzioni tecniche aggiunte:

- test connessione ComfyUI tramite `/system_stats`;
- lettura checkpoint installati tramite `/object_info/CheckpointLoaderSimple`;
- selezione checkpoint da lista reale invece che campo libero;
- diagnostica piu chiara per errori workflow, nodi o modelli;
- recupero immagini generate da `/history/{prompt_id}` e `/view`;
- default checkpoint `sd_xl_base_1.0.safetensors`, quando presente.

Nota: `sd_xl_base_1.0.safetensors` funziona, ma per maggiore coerenza cinematografica si consiglia un checkpoint SDXL piu realistico/cinematografico o un workflow con nodo cloud come Nano Banana Pro/Gemini, quando disponibile in ComfyUI.

### Processo Di Creazione

Il tab **Processo** mostra la pipeline completa:

```text
Parse -> Classifica -> Formatta -> Analizza -> Storyboard -> Export
```

La fase **Storyboard** si attiva quando la sceneggiatura ha scene riconosciute e passa a **Completato** quando tutti i frame sono stati generati nel modulo Director.

Il pannello mostra anche il conteggio dei frame pronti, per esempio:

```text
2/2 frame
```

### Controllo Stop Parsing / Formattazione

Durante:

- **Parsing Conservativo**;
- **Formattazione Creativa**;
- **Rendi piu organica**;

compare un pulsante di stop.

Lo stop:

- interrompe la richiesta AI tramite `AbortController`;
- funziona sia con Anthropic/Worker sia con LM Studio locale;
- impedisce di applicare risultati arrivati dopo l'interruzione;
- mantiene invariata la sceneggiatura precedente.

### UI Director Piu Comprensibile

I controlli tecnici sono stati rinominati per renderli piu chiari:

| Prima | Ora | Significato |
| --- | --- | --- |
| Steps | Qualita | Numero di passaggi generativi / dettaglio |
| CFG | Fedelta | Aderenza al prompt |
| W | Larghezza | Larghezza frame in pixel |
| H | Altezza | Altezza frame in pixel |
| Periodo / look | Direzione visiva | Epoca, atmosfera, luce, costumi o riferimento cinematografico |

Esempio di direzione visiva:

```text
antica Roma imperiale, luce naturale, costumi realistici
```

### Identita Visiva

Sono stati aggiunti:

- favicon DeepFrame;
- icona DeepFrame nell'header accanto a **DeepFrame Script**;
- titolo pagina browser aggiornato a **DeepFrame**.

### Supporto PDF In Input

DeepFrame Script ora accetta anche file `.pdf` nel caricamento iniziale per il parsing e la formattazione.

Dettagli operativi:

- il PDF viene letto nel browser prima dell'invio all'AI;
- l'estrazione testo usa PDF.js caricato on demand;
- sono supportati PDF con testo selezionabile;
- i PDF scansionati o fotografici richiedono prima un passaggio OCR;
- dopo l'estrazione, il testo segue lo stesso workflow di TXT/DOCX: Parsing Conservativo, Formattazione Creativa e Intervento creativo.

### Crea La Tua Storia

Il repository include il modulo separato:

```text
genera-la-tua-idea-rome-future-week-2025/
```

Funzioni principali:

- accesso dalla home di DeepFrame tramite pulsante **Crea la tua storia**;
- uso della stessa chiave API e dello stesso provider AI configurato in DeepFrame;
- supporto a LM Studio locale quando l'app principale usa LM Studio;
- fallback Anthropic su Claude Sonnet quando non si usa LM Studio;
- pulizia dell'output narrativo da blocchi tecnici come markdown, JSON, matrici scelte e residui `#`, `##`, `---`;
- fallback automatico delle scelte narrative quando il modello non restituisce una matrice valida;
- esportazione della storia in PDF o TXT;
- pulsante per inviare la storia generata alla **Formattazione Creativa** di DeepFrame.

### Formattazione Creativa

La formattazione creativa non si limita piu a riclassificare una storia come sceneggiatura: espande il materiale narrativo, aggiunge contenuto cinematografico coerente e produce scene piu complete a partire dal documento sorgente.

Correzioni importanti:

- con LM Studio i testi lunghi vengono divisi in blocchi per ridurre rifiuti o errori di contesto;
- se LM Studio rifiuta un blocco di formattazione, DeepFrame lo divide ulteriormente e riprova in modo adattivo;
- la riparazione JSON gestisce anche array malformati prodotti da modelli locali;
- il conteggio scene riconosce come scene solo intestazioni reali `INT`, `EST`, `INT/EST`, `EXT`, evitando di numerare titoli o atti.

### Caricamento Senza AI

Per sceneggiature gia formattate e disponibile il pulsante **Carica gia formattata senza AI**.

Questo flusso:

- non chiama Anthropic;
- non chiama LM Studio;
- non riscrive il testo;
- non aggiunge scene, dialoghi o azioni;
- usa solo una classificazione locale deterministica per riconoscere intestazioni scena, azioni, personaggi, dialoghi, parentetiche e transizioni;
- abilita subito anteprima, struttura, export, analisi drammaturgica, schede personaggio, schede location e breakdown reparti.

Funziona meglio quando il testo contiene intestazioni scena esplicite come:

```text
INT. CASA - NOTTE
EST. STRADA - GIORNO
EXT. PARKING LOT - NIGHT
```

Sono riconosciute anche intestazioni compatte o numerate come:

```text
1.INT - CASA - GIORNO
1. INT - CASA - GIORNO
2. EST STRADA - NOTTE
12A.EXT PARKING LOT - NIGHT
```

### Robustezza LM Studio

Quando si usa LM Studio locale, DeepFrame applica alcune protezioni per evitare blocchi lunghi o errori JSON:

- formattazione e parsing vengono divisi in blocchi piccoli;
- i blocchi rifiutati da LM Studio vengono divisi ancora e ritentati;
- Analisi Drammaturgica su script lunghi viene divisa in blocchi di scene;
- ogni blocco di analisi ha un timeout;
- se LM Studio restituisce JSON non valido, DeepFrame usa un fallback locale per mantenere attiva la dashboard;
- lo stesso vale per il Budget di Produzione anche quando si usa Anthropic: se la risposta AI arriva troncata o non interpretabile, DeepFrame genera comunque una bozza automatica con tariffe indicative invece di bloccarsi;
- le segnalazioni tecniche ripetute dei fallback LM Studio vengono deduplicate per evitare messaggi identici nella dashboard;
- le Schede Personaggio hanno un fallback locale basato su personaggi, scene e battute riconosciute.

I fallback locali non sostituiscono una vera analisi AI completa, ma impediscono al workflow di bloccarsi quando il modello locale è lento, instabile o poco affidabile nel JSON.

### Riapertura Risultati Gia Generati

Se Analisi Drammaturgica, Schede Personaggio, Schede Location o Breakdown Reparti sono gia stati generati nella sessione corrente, un nuovo click sul relativo pulsante non rilancia l'AI.

DeepFrame apre direttamente il risultato esistente e aggiorna l'etichetta del comando in modalita **Apri**, evitando richieste duplicate a LM Studio o Anthropic.

### Breakdown Reparti

Il breakdown e stato esteso come strumento operativo di produzione:

- riepilogo sempre popolato, anche quando l'AI non restituisce correttamente il blocco `riepilogo`;
- schede per scena con cast, location, props, costumi, comparse, effetti, audio, veicoli;
- fallback locale se LM Studio restituisce JSON non valido e la riparazione automatica fallisce;
- normalizzazione dati quando cast, location, props o costumi arrivano incompleti;
- tab **Piano di lavoro** rinominata e migliorata rispetto al precedente "Piano riprese".

Il **Piano di lavoro** ora permette:

- accorpamento automatico delle scene per location;
- accorpamento per interno/esterno;
- accorpamento per gruppo attori;
- accorpamento per complessita produttiva;
- spostamento manuale delle scene tra giornate;
- aggiunta, eliminazione e riordino delle giornate;
- eliminazione automatica delle giornate rimaste vuote dopo lo spostamento o la rimozione delle scene;
- legenda cast numerata;
- vista tipo shooting schedule con colonne `Sc.`, `Set`, `I/E`, `Cast ID`, `Shoot location`, `Pages`, `Complessita`;
- stima in ottavi di pagina;
- data di inizio e fine riprese;
- orario giornaliero di inizio e fine;
- modifica manuale di data e orario per ogni giornata;
- avviso se il numero di giornate supera la finestra di date impostata.

Nota sul piano iniziale:

- se il modello AI produce un piano troppo frammentato, ad esempio una scena per giornata, DeepFrame lo scarta e ricalcola automaticamente un piano iniziale più produttivo accorpando per location;
- il piano resta una stima iniziale e va rifinito con i vincoli reali di produzione.

### Export PDF Operativi

Oltre agli export della sceneggiatura, DeepFrame ora genera PDF stampabili per:

- **Schede Personaggio**;
- **Schede Location**;
- **Breakdown Reparti**.

Il pulsante **Esporta PDF** compare nella barra superiore quando si entra nella rispettiva scheda.

## Funzioni AI

### Formattazione Sceneggiatura

L'AI analizza il testo grezzo e restituisce una struttura JSON con gli elementi tipizzati della sceneggiatura.

Endpoint:

```text
/api/format
```

### Analisi Drammaturgica

Produce una lettura narrativa e didattica della sceneggiatura:

- struttura in tre atti
- momenti chiave
- analisi dei personaggi
- analisi delle scene
- segnalazioni critiche
- valutazione globale

Endpoint:

```text
/api/analyze
```

### Schede Personaggio

Genera schede complete per i personaggi principali:

- ruolo narrativo
- presenza nelle scene
- motivazione
- bisogno profondo
- conflitti
- relazioni
- note casting
- note didattiche

Endpoint:

```text
/api/character-sheets
```

### Schede Location

Genera schede utili per location manager, scenografia, regia e fotografia:

- identificativo location
- scene associate
- atmosfera
- funzione drammaturgica
- caratteristiche tecniche
- allestimento
- scouting
- piano di lavoro / piano riprese
- note didattiche

Endpoint:

```text
/api/location-sheets
```

### Breakdown Reparti

Genera un breakdown produttivo per reparti:

- cast
- location
- props
- costumi
- effetti speciali
- audio e musica
- veicoli
- piano di lavoro suggerito e modificabile
- calendario riprese
- export PDF del report

Endpoint:

```text
/api/breakdown
```

### Budget di Produzione

Genera una bozza di budget di produzione a partire dal breakdown reparti già calcolato:

- voci ATL/BTL/Post-produzione con quantità, unità e costo unitario stimato
- tariffe di riferimento per il mercato italiano indipendente/formativo (non USA)
- nota metodologica e macro-fasi (Sviluppo, Preparazione, Riprese, Post-produzione)
- export CSV (Excel) e PDF del report

Endpoint:

```text
/api/budget
```

### Luci 3D

Integra Lumina Studio come modulo esterno visualizzabile dentro l'app per simulare setup luci 3D:

```text
https://lumina-studio-1033723633880.us-west1.run.app/
```

## Stack Tecnico

- Frontend: React + Vite
- Parsing DOCX: Mammoth
- Parsing PDF: PDF.js caricato on demand dal browser
- Riparazione JSON AI: jsonrepair
- Backend: Cloudflare Worker
- Hosting: Cloudflare Workers Static Assets
- AI provider: Anthropic Claude / LM Studio locale OpenAI-compatible
- Generazione immagini storyboard: ComfyUI locale
- Proxy sviluppo locale: Vite `/lmstudio` e `/comfyui`
- Favicon/logo: `public/deepframe-favicon.png`

## Formati Supportati

Input:

| Formato | Note |
| --- | --- |
| `.txt` | Testo semplice |
| `.docx` | Documento Word moderno |
| `.doc` | Non leggibile direttamente dal browser: convertire prima in `.docx`, `.txt` o PDF con testo selezionabile |
| `.pdf` | Supportato quando contiene testo selezionabile; i PDF scansionati richiedono prima OCR |

Output:

| Formato | Uso |
| --- | --- |
| `.fountain` | Compatibile con software di sceneggiatura |
| `.html` | Visualizzazione, stampa o conversione PDF |
| PDF sceneggiatura | Stampa continua o una scena per pagina |
| PDF report | Schede personaggio, schede location, breakdown reparti, budget di produzione |
| CSV | Budget di produzione, per Excel |
| Pacchetto storyboard JSON | Prompt, scene, configurazione Director e stato frame |

## Configurazione Cloudflare

Il progetto usa un Cloudflare Worker con static assets.

File principali:

```text
wrangler.jsonc
worker/index.js
dist/
```

`wrangler.jsonc` configura:

- nome Worker
- entrypoint del Worker
- directory degli asset statici
- fallback SPA
- routing delle API

## Variabili e Secrets

Per usare le funzioni AI devi configurare il secret Cloudflare:

```text
ANTHROPIC_API_KEY
```

Percorso nella dashboard:

```text
Cloudflare Dashboard
Workers & Pages
screenplay-formatter
Settings
Variables and Secrets
Add secret
```

Il nome deve essere esattamente:

```text
ANTHROPIC_API_KEY
```

La chiave non deve mai essere salvata nel codice, nel frontend o su GitHub.

## Modello Locale Con LM Studio

L'app può usare anche un modello locale esposto da LM Studio tramite server OpenAI-compatible.

Impostazioni predefinite nell'interfaccia:

```text
Endpoint locale Vite: /lmstudio/v1/chat/completions
Endpoint sito pubblicato: http://127.0.0.1:1234/v1/chat/completions
Modello: gemma-4
```

Note operative:

- avvia LM Studio sul computer locale;
- carica il modello scelto;
- abilita il server locale OpenAI-compatible;
- in sviluppo locale l'app usa il proxy Vite `/lmstudio` per evitare problemi CORS;
- se usi la versione pubblicata su Cloudflare, la chiamata parte dal browser verso il tuo `localhost`, non dal Worker.

## ComfyUI Locale Per Storyboard

Per usare **Director / Storyboard** con generazione immagini:

1. Installa e avvia ComfyUI.
2. Assicurati che ComfyUI sia in ascolto su:

```text
http://127.0.0.1:8188
```

3. Installa almeno un checkpoint in:

```text
ComfyUI/models/checkpoints/
```

4. Avvia DeepFrame in locale con Vite:

```bash
npm run dev
```

5. Apri **Director / Storyboard** e premi il test connessione.

DeepFrame legge automaticamente i checkpoint disponibili e mostra una lista selezionabile. Se non vedi il checkpoint, riavvia ComfyUI e ripeti il test connessione.

Parametri consigliati per SDXL base:

| Campo UI | Valore rapido | Valore migliore |
| --- | --- | --- |
| Qualita | 28 | 30-36 |
| Fedelta | 7 | 7-8.5 |
| Larghezza | 768 | 1024 |
| Altezza | 432 | 576 |

Nota: ComfyUI/SDXL base e meno bravo di modelli cloud come Nano Banana Pro nel comprendere prompt narrativi lunghi. Per questo DeepFrame genera prompt piu letterali e visuali per ComfyUI.

## Sviluppo Locale

Installa le dipendenze:

```bash
npm install
```

Avvia solo il frontend Vite:

```bash
npm run dev
```

Avvia il Worker Cloudflare in locale:

```bash
npm run cf:dev
```

Se vuoi testare anche le chiamate Anthropic in locale, configura il secret con Wrangler oppure passa una variabile compatibile con il tuo ambiente.

## Build

```bash
npm run build
```

La build genera la cartella:

```text
dist/
```

## Deploy

Deploy su Cloudflare Workers:

```bash
npm run cf:deploy
```

L'app pubblicata risponde all'URL del Worker, per esempio:

```text
https://screenplay-formatter.roberto-faccenda.workers.dev/
```

## Test Rapido

Puoi provare l'app con questo testo:

```text
Titolo: La Chiave nella Pioggia

INT. BAR DI PERIFERIA - NOTTE

La pioggia batte contro le finestre sporche. Il locale è quasi vuoto. Una radio gracchia una vecchia canzone italiana.

MARTA entra tenendo una piccola chiave stretta nel pugno.

Al bancone, LUCA non alza subito gli occhi.

MARTA
Devi dirmi cosa apre.

LUCA
Non dovevi portarla qui.

MARTA
Allora sapevi che esisteva.

LUCA posa lentamente il bicchiere.

LUCA
Sapevo che prima o poi qualcuno l'avrebbe trovata.

TAGLIO A:
```

## Note Di Sicurezza

- La chiave Anthropic resta lato server dentro Cloudflare
- Il browser chiama solo endpoint `/api/*`
- Il frontend non contiene segreti
- Gli output HTML vengono escapati prima dell'esportazione

## Stato Del Progetto

Prototipo funzionante per workflow di scrittura, analisi e pre-produzione. Pensato per uso didattico, sviluppo sceneggiature e preparazione produttiva leggera.
