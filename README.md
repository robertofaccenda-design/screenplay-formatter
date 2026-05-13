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

- Importa testi `.txt` e `.docx`
- Accetta anche testo incollato direttamente nella textarea
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
- Integra Lumina Studio in una scheda **Luci 3D** per simulazioni di setup luce
- Permette di scegliere tra AI Anthropic su Cloudflare e modello locale via LM Studio

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
- piano riprese
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
- piano riprese suggerito

Endpoint:

```text
/api/breakdown
```

### Luci 3D

Integra Lumina Studio come modulo esterno visualizzabile dentro l'app per simulare setup luci 3D:

```text
https://lumina-studio-1033723633880.us-west1.run.app/
```

## Stack Tecnico

- Frontend: React + Vite
- Parsing DOCX: Mammoth
- Riparazione JSON AI: jsonrepair
- Backend: Cloudflare Worker
- Hosting: Cloudflare Workers Static Assets
- AI provider: Anthropic Claude

## Formati Supportati

Input:

| Formato | Note |
| --- | --- |
| `.txt` | Testo semplice |
| `.docx` | Documento Word moderno |
| `.doc` | Non supportato in modo affidabile: convertire prima in `.docx` |

Output:

| Formato | Uso |
| --- | --- |
| `.fountain` | Compatibile con software di sceneggiatura |
| `.html` | Visualizzazione, stampa o conversione PDF |

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
Endpoint: http://127.0.0.1:1234/v1/chat/completions
Modello: gemma-4
```

Note operative:

- avvia LM Studio sul computer locale;
- carica il modello scelto;
- abilita il server locale OpenAI-compatible;
- se usi la versione pubblicata su Cloudflare, la chiamata parte dal browser verso il tuo `localhost`, non dal Worker.

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
