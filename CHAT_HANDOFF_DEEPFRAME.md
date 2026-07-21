# Riepilogo chat - DeepFrame / Screenplay Formatter

Documento creato per riprendere il lavoro in una nuova chat senza perdere contesto.

## Progetto

- Nome iniziale: **Screenplay Formatter AI**
- Direzione attuale: trasformazione in **DeepFrame**, ecosistema creativo multi-settoriale.
- Primo modulo operativo: **DeepFrame Script**
- Repo GitHub: `https://github.com/robertofaccenda-design/screenplay-formatter`
- URL Cloudflare Worker: `https://screenplay-formatter.roberto-faccenda.workers.dev/`
- Cartella progetto locale principale: `/Users/Robjhon/Documents/github/screenplay-formatter`
- Copia usata spesso per push/deploy nella chat: `/Users/Robjhon/Documents/github/screenplay-formatter/.push-repo-1777559112`

## Cosa fa l'app

L'app prende una bozza di sceneggiatura o un file testuale e la trasforma in un output più ordinato e operativo per il lavoro audiovisivo.

Funzioni principali emerse durante la chat:

- Upload o incolla testo di sceneggiatura.
- Supporto previsto per `.txt`, `.docx` e `.doc`, con nota importante: Mammoth lavora bene soprattutto con `.docx`, mentre i vecchi `.doc` possono essere problematici.
- Validazione dell'input per evitare che documenti non sceneggiatura, come bandi o PDF amministrativi, vengano trattati come script.
- Formattazione in stile sceneggiatura.
- Analisi drammaturgica.
- Schede personaggio.
- Breakdown dei reparti.
- Schede location.
- Export HTML protetto da contenuti non escapati.
- Export PDF.
- Export PDF con interruzione di pagina per ogni scena tramite pulsante aggiuntivo tipo `PDF/page`.
- Indicazione degli ottavi di pagina per ogni scena.
- BYOK: l'utente può inserire la propria API key Anthropic personale.
- Doppia modalità di formattazione:
  - **Parsing Conservativo**: classifica senza aggiungere contenuto e mantiene il testo il più invariato possibile.
  - **Formattazione Creativa**: mantiene il comportamento più libero/assistito e può trasformare una bozza grezza in formato sceneggiatura.

## API key Anthropic / BYOK

È stata introdotta la logica BYOK:

- L'utente può inserire una propria chiave Anthropic nell'interfaccia.
- Può scegliere se ricordarla nel browser.
- Se il campo è vuoto, l'app prova a usare la chiave configurata come secret nel Worker Cloudflare.
- Il messaggio di errore per API key mancante è stato reso più umano rispetto al testo tecnico originale.

Errore originale visto:

```text
API key non configurata. Imposta ANTHROPIC_API_KEY nei secrets del Worker Cloudflare.
```

Direzione desiderata:

- Messaggi più comprensibili per l'utente finale.
- Niente linguaggio troppo tecnico se non strettamente necessario.

## Problemi risolti durante la chat

### Pagina bianca su Cloudflare

All'inizio la pagina su Cloudflare risultava bianca. È stata sistemata fino a visualizzare correttamente l'app.

### Errori JSON nelle funzioni AI

Errore ricorrente:

```text
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

È comparso in:

- Analisi drammaturgica.
- Schede personaggio.
- Breakdown dei reparti.
- Schede location.

La logica è stata progressivamente corretta per gestire meglio risposte vuote o non JSON.

### Onboarding interattivo

È stato costruito un onboarding interattivo sopra l'interfaccia dell'app.

Richieste visive applicate:

- I riquadri devono comparire uno alla volta, non tutti insieme.
- I riquadri devono essere più centrali rispetto allo sfondo.
- La scheda 5 deve essere allineata al pulsante `Formatta Sceneggiatura`.
- Le linee di collegamento devono partire e arrivare correttamente ai riquadri evidenziati.
- Il riquadro 1 deve collegarsi bene al pulsante `Onboarding`.
- Prima dell'onboarding deve esserci una landing page iniziale.

## Landing page

È stata introdotta una landing page prima dell'app.

Prima direzione:

- Landing per presentare DeepFrame / DeepFrame Script.
- CTA per entrare nell'app e avviare l'onboarding.

Nuova direzione grafica più recente:

- File concept HTML: `/Users/Robjhon/Documents/github/screenplay-formatter/deepframe_landing_page_v2.html`
- Logo concept: `/Users/Robjhon/Documents/github/screenplay-formatter/deepframe_logo_concept.png`
- Grafica desiderata:
  - sfondo nero;
  - logo grande `DeepFrame`;
  - `Deep` bianco e `Frame` blu;
  - claim: `Beyond Screenwriting.`;
  - look minimale e premium;
  - CTA per aprire DeepFrame Script;
  - sezione ecosistema creativo.

Nota: nella chat è stata aggiornata la landing nella copia `.push-repo-1777559112`, ma il commit non è riuscito per problemi di permessi su `.git/index.lock`.

## README

È stato richiesto un README in italiano che spieghi cosa fa l'app e che possa essere pubblicato su GitHub.

Direzione README:

- Descrivere l'app in modo semplice.
- Spiegare input supportati.
- Spiegare BYOK.
- Spiegare funzioni principali.
- Spiegare deploy Cloudflare.
- Inserire limiti noti, soprattutto `.doc` vs `.docx`.

## GitHub / Cloudflare

Repo GitHub:

```text
https://github.com/robertofaccenda-design/screenplay-formatter
```

Deploy:

- Il progetto è su Cloudflare.
- In precedenza si è usato Cloudflare Workers.
- Comandi utili presenti in `package.json`:

```bash
npm run build
npm run cf:deploy
```

Problemi noti durante la chat:

- `git push` ha fallito più volte per problema di rete/DNS:

```text
Could not resolve host: github.com
```

- Un commit ha fallito per problemi di permessi:

```text
Unable to create '.git/index.lock': Operation not permitted
```

Aggiornamento del 2026-05-13:

- Cloudflare Workers Builds è collegato al repository GitHub `robertofaccenda-design/screenplay-formatter`.
- Configurazione Cloudflare verificata da dashboard:
  - Git repository: `robertofaccenda-design/screenplay-formatter`
  - Production branch: `master`
  - Build command: `npm run build`
  - Deploy command: `npx wrangler deploy`
  - Version command: `npx wrangler versions upload`
  - Root directory: `/`
  - Secret `ANTHROPIC_API_KEY` presente nelle variabili/secrets Cloudflare.
- Il deploy manuale via API Cloudflare fatto in precedenza va considerato provvisorio: la fonte ufficiale è tornata a essere GitHub.
- È stato preparato un commit pulito nella copia `.push-repo-1777559112`, che contiene tutte le feature precedenti più i due pulsanti:

```text
11a18ba Add conservative and creative format modes
```

- Il commit è stato pushato su GitHub `master` e Cloudflare ha avviato/completato il deploy automatico.
- È stata poi corretta la validazione della modalità creativa:

```text
ad38318 Allow creative formatting for raw drafts
```

- Anche questo commit è stato pushato su `master` e Cloudflare ha pubblicato una nuova deployment automatica.
- Verifica live effettuata: il bundle pubblicato contiene `DeepFrame Script`, `Beyond Screenwriting`, `Parsing Conservativo` e `Formattazione Creativa`.

### Decisione su Parsing Conservativo / Formattazione Creativa

- **Parsing Conservativo**
  - Usa un prompt neutro.
  - Non deve aggiungere scene, intestazioni, azioni, personaggi, battute, transizioni o dettagli non presenti.
  - Non deve riscrivere in stile cinematografico.
  - Mantiene il controllo più severo sulla natura del testo: se il testo non sembra una sceneggiatura, può essere bloccato.

- **Formattazione Creativa**
  - Usa il prompt creativo/originale.
  - Non deve essere bloccata dalla mancanza di tag `INT.`, `EST.`, `INT./EST.` o simili.
  - Deve accettare anche bozze grezze senza struttura già da sceneggiatura.
  - Mantiene solo il filtro anti-documenti amministrativi/bandi, per evitare che testi chiaramente non narrativi vengano trattati come script.

File modificati negli ultimi commit:

- `/Users/Robjhon/Documents/github/screenplay-formatter/.push-repo-1777559112/src/App.jsx`
- `/Users/Robjhon/Documents/github/screenplay-formatter/.push-repo-1777559112/worker/index.js`
- `/Users/Robjhon/Documents/github/screenplay-formatter/.push-repo-1777559112/functions/api/format.js`
- `/Users/Robjhon/Documents/github/screenplay-formatter/.push-repo-1777559112/netlify/functions/format.js`

Verifiche effettuate sugli ultimi commit:

- `npm run build` passa nella cartella `.push-repo-1777559112`.
- `node --check` passa sugli endpoint modificati.
- `eslint` segnala problemi già presenti nella base DeepFrame, non introdotti dai commit recenti:
  - `process` non definito nelle funzioni Netlify;
  - regola React `static-components` su un componente interno già esistente;
  - alcuni warning di dipendenze hook già esistenti.

## Design / UX richiesti

Preferenze espresse:

- Interfaccia meno desktop-only e più mobile friendly.
- Limite più visibile sulla lunghezza del testo.
- Eliminare icone a sinistra dei pulsanti.
- Testi utente più umani e meno tecnici.
- Onboarding visivo, guidato e progressivo.
- Landing page premium, nera, essenziale, DeepFrame.

## Direzione strategica

L'utente vuole trasformare l'app in un ecosistema multi-settoriale.

Moduli immaginati o nominati:

- **DeepFrame Script**: sceneggiatura, formattazione, analisi, export.
- **DeepFrame Director**: regia, shotlist, mood, visual storytelling.
- **DeepFrame Production**: breakdown, reparti, continuità, produzione.
- **DeepFrame Educational**: didattica, rubriche, valutazione, workflow per scuole e accademie.
- Possibile estensione verso XR / narrative immersive.

Idea specifica per DeepFrame Educational:

- Integrare o collegare un modulo per vedere posizioni delle luci usando questa app:

```text
https://lumina-studio-1033723633880.us-west1.run.app/
```

Possibile direzione:

- Usare DeepFrame per analizzare una scena.
- Generare proposta luci.
- Visualizzare schema luci o setup in un ambiente tipo Lumina Studio.

## Ultimo aggiornamento: integrazione Lumina Studio

Operazione effettuata il 13 maggio 2026:

- Integrato il modulo esterno Lumina Studio dentro DeepFrame Script come nuova scheda **Luci 3D**.
- URL integrato:

```text
https://lumina-studio-1033723633880.us-west1.run.app/
```

- La scheda usa un iframe interno e include anche un pulsante **Apri esterno**.
- Commit GitHub pubblicato:

```text
78be18b Embed Lumina Studio lighting module
```

- Verifica live completata su Cloudflare Worker:

```text
https://screenplay-formatter.roberto-faccenda.workers.dev/
```

- Il bundle live contiene:
  - `Luci 3D`
  - `Lumina Studio`
  - `lumina-studio-1033723633880.us-west1.run.app`

## Ultimo aggiornamento: AI locale con LM Studio

Operazione avviata il 13 maggio 2026:

- Aggiunto selettore **Motore AI** nell'interfaccia.
- Opzioni disponibili:
  - **Anthropic**: usa la chiave personale BYOK o il secret Cloudflare `ANTHROPIC_API_KEY`.
  - **LM Studio locale**: usa il server locale OpenAI-compatible di LM Studio.
- Configurazione predefinita LM Studio:

```text
Endpoint locale Vite: /lmstudio/v1/chat/completions
Endpoint sito pubblicato: http://127.0.0.1:1234/v1/chat/completions
Modello: gemma-4
```

- Le chiamate LM Studio partono direttamente dal browser, perché Cloudflare non può raggiungere il `localhost` della macchina dell'utente.
- In sviluppo locale è stato aggiunto un proxy Vite `/lmstudio` verso `http://127.0.0.1:1234` per ridurre problemi CORS.
- La scelta provider, endpoint e modello vengono salvati nel browser.
- L'integrazione locale è stata collegata a:
  - Parsing Conservativo
  - Formattazione Creativa
  - Analisi Drammaturgica
  - Schede Personaggio
  - Schede Location
  - Breakdown
- Fix successivo: rafforzato il prompt locale di **Analisi Drammaturgica** per evitare risposte JSON valide ma vuote con Gemma/LM Studio.
- Aggiunto unwrap dei payload locali quando il modello restituisce wrapper come `{ "analysis": ... }`, `{ "elements": ... }`, `{ "breakdown": ... }`.
- Fix successivo: aggiunto `response_format: { type: "json_object" }` per le funzioni locali a oggetto e secondo tentativo automatico di riparazione JSON quando LM Studio restituisce errori tipo `Colon expected`.
- Fix successivo: rafforzati anche i prompt locali di **Schede Personaggio**, **Schede Location** e **Breakdown Reparti** con schemi completi compatibili con la UI; aggiunti alias per wrapper locali come `character_sheets`, `schede_personaggio`, `location_sheets`, `schede_location`, `breakdown_reparti`.
- Fix successivo: reso opzionale il `response_format` per LM Studio. L'app prova prima JSON mode e, se LM Studio lo rifiuta, ripete automaticamente la richiesta senza quel parametro.

## Aggiornamento 2026-05-14: Crea la tua storia integrato in DeepFrame

Il modulo `genera-la-tua-idea-rome-future-week-2025` e stato collegato al progetto principale DeepFrame.

Stato attuale:

- La home di DeepFrame contiene un collegamento a `/crea-la-tua-storia/`.
- Il generatore storia usa la stessa configurazione AI impostata in DeepFrame:
  - se DeepFrame usa **LM Studio locale**, anche `Crea la tua storia` chiama LM Studio dal browser;
  - altrimenti usa Anthropic con modello Sonnet.
- Il modello Claude configurato per le storie e `claude-sonnet-5`, non Haiku (aggiornato il 2026-07-21: `claude-sonnet-4-20250514` era stato ritirato e causava errori "model: claude-sonnet-4-20250514" negli endpoint Cloudflare `functions/api/format.js` e `worker/index.js`).
- Il generatore puo esportare la storia in PDF o TXT.
- A fine storia e stato aggiunto un pulsante per caricare il testo creato dentro la **Formattazione Creativa** di DeepFrame.
- La chiave API e condivisa con quella inserita dall'utente per il parsing/formattazione.

Fix applicati al generatore:

- rimossi dall'output narrativo blocchi tecnici come:
  - code fence ```json;
  - `scelte_critiche`;
  - `Scelte - Matrice JSON`;
  - residui markdown `#`, `##`, `---`;
  - code o sezioni scelte in coda agli atti.
- Se il modello non produce una matrice scelte valida prima dell'atto finale, l'app genera scelte fallback invece di bloccarsi.
- La gestione LM Studio tollera risposte non perfette e segnala meglio quando il modello locale non e raggiungibile.

Commit rilevanti pubblicati:

```text
a79530b Use LM Studio or Sonnet for stories
f7bf19f Fallback story choices when missing
765b085 Tolerate invalid story choices
```

## Aggiornamento 2026-05-14: Formattazione creativa e parsing scene

Migliorie applicate alla formattazione:

- La **Formattazione Creativa** espande il materiale narrativo e crea nuova materia scenica coerente invece di limitarsi a trasformare il testo in formato sceneggiatura.
- Con LM Studio i testi lunghi vengono spezzati in blocchi per ridurre errori e richieste rifiutate dal modello.
- La riparazione JSON ora prova a riparare anche array prodotti da LM Studio, non solo oggetti.
- Le scene vengono contate solo quando l'elemento e una vera intestazione `INT`, `EST`, `INT/EST`, `EXT`, ecc.
- Titoli, atti e intestazioni narrative non vengono piu conteggiati come scene.

Commit rilevanti pubblicati:

```text
a1fda6f Chunk LM Studio formatting requests
8e22304 Count only real scene headings
c1f312d Expand material in creative formatting
813aa7b Repair LM Studio array JSON
```

## Aggiornamento 2026-05-14: Breakdown Reparti e Piano di lavoro

Il Breakdown Reparti e diventato piu operativo e vicino a un workflow di produzione.

Migliorie dati e robustezza:

- Il prompt breakdown richiede cast, location, props, costumi, comparse, effetti speciali, audio/musica, veicoli e piano di lavoro.
- Se LM Studio genera JSON non valido e la riparazione fallisce, DeepFrame crea un fallback locale usando gli elementi gia formattati.
- Il fallback locale crea:
  - scene da vere intestazioni `INT/EST`;
  - cast dagli elementi `character`;
  - location dalle intestazioni scena;
  - costumi base;
  - piano di lavoro base.
- Il riepilogo del breakdown ora viene sempre popolato: se l'AI non compila `riepilogo`, viene ricostruito da scene, cast, location e piano di lavoro.

Migliorie UI Breakdown:

- `Piano riprese` e stato rinominato in **Piano di lavoro**.
- Il piano permette accorpamento automatico scene per:
  - location;
  - interno/esterno;
  - attori;
  - complessita produttiva.
- Le scene possono essere spostate manualmente tra giornate.
- Le giornate possono essere aggiunte, eliminate e riordinate.
- Il piano mostra una legenda cast numerata.
- Ogni giornata ha una vista tipo shooting schedule ispirata a software professionali, con:
  - numero giornata;
  - data;
  - orario;
  - numero scene;
  - pagine/ottavi stimati;
  - Cast ID;
  - location riprese;
  - tabella scene con `Sc.`, `Set`, `I/E`, `Cast ID`, `Shoot location`, `Pages`, `Complessita`.
- Aggiunto calendario riprese:
  - data inizio;
  - data fine;
  - orario inizio;
  - orario fine;
  - pulsante **Applica date**;
  - modifica manuale di data e orario per singola giornata;
  - avviso se il piano ha piu giornate rispetto alla finestra impostata.

Export:

- Aggiunto pulsante **Esporta PDF** per:
  - Schede Personaggio;
  - Schede Location;
  - Breakdown Reparti.
- Il PDF viene generato tramite finestra di stampa del browser con HTML dedicato.

Commit rilevanti pubblicati:

```text
9c2b156 Improve production breakdown views
757150c Fallback local breakdown on invalid JSON
7ef076f Enhance breakdown work plan grouping
9ae730a Add shooting schedule details to work plan
295740a Rebuild breakdown summary from available data
14f21b4 Add PDF export for operational sheets
00d7c97 Add shooting calendar controls to breakdown
```

Bundle online verificati durante il lavoro:

```text
index-CixiqfkI.js
index-CzEdzDy5.js
index-X3agCI5N.js
index-Cf8jM58H.js
index-Cz2_zqgM.js
```

## Aggiornamento 2026-05-16: Intervento creativo organico

È stato aggiunto un nuovo flusso accanto a **Formattazione Creativa**:

- pannello **Intervento creativo**;
- selettore tono/genere:
  - rendi piu organica;
  - rendi piu crime;
  - rendi piu thriller;
  - rendi piu noir;
  - rendi piu drammatica;
  - rendi piu commedia;
- opzioni:
  - aggiungi un elemento sorpresa;
  - aggiungi un personaggio;
  - nota libera dell'autore.

Implementazione:

- nuovo `mode: "organic"` per il formatter;
- supporto sia su LM Studio locale sia su endpoint Cloudflare/Netlify;
- prompt dedicato per rendere lo script piu organico senza tradire nucleo narrativo, lingua e personaggi esistenti.

Commit pubblicato:

```text
a774103 Add guided organic screenplay rewrite mode
```

Verifica live completata su Cloudflare: il bundle pubblicato contiene `Intervento creativo`, `Rendi più organica` e `Rendi piu crime`.

## Aggiornamento 2026-05-16: PDF come input di parsing

DeepFrame Script ora supporta il caricamento di file `.pdf` nella dropzone principale, oltre a `.txt`, `.docx` e `.doc`.

Comportamento:

- il PDF viene letto lato browser;
- PDF.js viene caricato on demand da CDN solo quando serve leggere un PDF;
- il testo estratto viene inserito nella textarea e segue lo stesso workflow degli altri input;
- i PDF con testo selezionabile sono supportati;
- i PDF scansionati o fotografici non producono testo utile e richiedono prima OCR;
- il messaggio utente segnala esplicitamente quando il PDF non contiene testo selezionabile.

File modificati:

- `/Users/Robjhon/Documents/github/screenplay-formatter/src/App.jsx`
- `/Users/Robjhon/Documents/github/screenplay-formatter/README.md`

Verifiche effettuate:

```text
npm run lint
npm run build
```

Commit locale preparato:

```text
5a901fa Add PDF input support for screenplay parsing
```

Stato deploy:

- commit `5a901fa` pushato su `origin/master`;
- verifica successiva: Cloudflare Worker live contiene il supporto PDF nel bundle pubblicato.

## Aggiornamento 2026-05-16: caricamento sceneggiatura gia formattata senza AI

È stato aggiunto un nuovo flusso per importare una sceneggiatura gia formattata senza passare da Anthropic o LM Studio.

Comportamento:

- nuovo pulsante **Carica gia formattata senza AI** nella sidebar;
- nessuna chiamata a `/api/format`;
- nessun intervento creativo o riscrittura;
- classificazione locale deterministica in elementi `scene_heading`, `action`, `character`, `dialogue`, `parenthetical`, `transition`, `title`, `blank`;
- dopo il caricamento vengono sbloccati anteprima, struttura, export, Analisi Drammaturgica, Schede Personaggio, Schede Location e Breakdown Reparti;
- se il testo non contiene intestazioni tipo `INT.`, `EST.` o `EXT.`, l'app segnala di usare Formattazione Creativa.

Miglioria collegata:

- l'estrazione PDF lato browser ora prova a ricostruire le righe usando le coordinate PDF.js, utile per sceneggiature PDF con testo selezionabile.

File modificati:

- `/Users/Robjhon/Documents/github/screenplay-formatter/src/App.jsx`
- `/Users/Robjhon/Documents/github/screenplay-formatter/README.md`
- `/Users/Robjhon/Documents/github/screenplay-formatter/CHAT_HANDOFF_DEEPFRAME.md`

Verifiche effettuate:

```text
npm run lint
npm run build
```

Commit pubblicati collegati:

```text
25bea09 Add direct formatted screenplay import
066be15 Accept compact numbered scene headings
```

Dettaglio fix successivo:

- riconosciute intestazioni scena compatte/numerate tipo `1.INT`, `1. INT`, `2. EST`, `12A.EXT`;
- questo evita che il caricamento senza AI fallisca quando il copione numerato non usa il punto standard dopo INT/EST.

## Aggiornamento 2026-05-16: robustezza LM Studio

Sono stati aggiunti diversi fallback per rendere LM Studio locale meno fragile su script lunghi.

Problemi osservati:

- LM Studio rifiutava richieste troppo lunghe con messaggio generico;
- Analisi Drammaturgica poteva produrre JSON non valido (`Colon expected`);
- Analisi Drammaturgica poteva restare appesa per molti minuti;
- Schede Personaggio poteva superare il timeout;
- modelli locali poco stabili generano spesso JSON incompleto o non riparabile.

Fix applicati:

- Formattazione/Parsing LM Studio:
  - chunk iniziale ridotto;
  - retry adattivo: se un blocco viene rifiutato, viene diviso ulteriormente e ritentato.
- Analisi Drammaturgica:
  - divisione in blocchi di scene;
  - timeout per richiesta locale;
  - budget massimo complessivo;
  - fallback locale per i blocchi che producono JSON non valido o non rispondono in tempo.
- Schede Personaggio:
  - payload alleggerito;
  - timeout dedicato;
  - fallback locale basato su personaggi, scene, battute e citazione rappresentativa.

Commit pubblicati:

```text
7e67f48 Chunk LM Studio dramaturgical analysis
3ead7c0 Fallback local analysis for invalid LM Studio JSON
a8dbdd4 Timeout long LM Studio analysis requests
e1031db Fallback local character sheets for LM Studio timeout
069c0c0 Adaptively split LM Studio formatting chunks
```

Verifiche effettuate:

```text
npm run lint
npm run build
```

## Aggiornamento 2026-05-16: Piano di lavoro meno frammentato

Problema osservato:

- su un film reale girato in 34 giorni, il piano automatico poteva proporre 112 giornate perché prendeva quasi alla lettera il `piano_lavoro_suggerito` dell'AI;
- in pratica l'AI stava generando una giornata per scena.

Fix applicato:

- se il piano AI iniziale è palesemente troppo frammentato, DeepFrame lo scarta;
- l'app ricalcola automaticamente un piano iniziale accorpando per location;
- i pulsanti **Accorpa per Location / INT-EST / Attori / Complessità** restano disponibili per ricalcoli manuali;
- il piano resta una stima iniziale da rifinire con vincoli reali di produzione.

Commit pubblicato:

```text
35fb7b3 Cap over-fragmented breakdown work plans
```

Verifiche effettuate:

```text
npm run lint
npm run build
```

## Aggiornamento 2026-05-16: gestione DOC/DOCX più chiara

Problema osservato:

```text
Can't find end of central directory : is this a zip file ?
```

Causa:

- Mammoth legge bene i `.docx`, che internamente sono zip;
- i vecchi `.doc` non sono zip e non sono leggibili direttamente dal browser con Mammoth;
- lo stesso errore può comparire con file rinominati `.docx` ma non realmente validi.

Fix applicato:

- i `.doc` non vengono più passati a Mammoth;
- l'app mostra un messaggio chiaro: convertire prima in `.docx`, `.txt` o PDF con testo selezionabile;
- intercettato anche il caso `.docx` corrotto o rinominato male;
- UI e README aggiornati per indicare `TXT · DOCX · PDF`.

Commit pubblicato:

```text
f306244 Show friendly unsupported DOC error
```

## Aggiornamento 2026-05-17: segnalazioni LM Studio deduplicate

Problema osservato:

- in Analisi Drammaturgica, se LM Studio falliva su piu blocchi, la sezione **Analisi / Segnalazioni** poteva mostrare piu messaggi identici tipo `LM Studio JSON non valido`;
- il risultato era tecnicamente corretto, ma poco leggibile e sembrava un errore moltiplicato.

Fix applicato:

- le segnalazioni tecniche generate dai fallback locali vengono normalizzate e deduplicate;
- se lo stesso problema LM Studio compare su piu blocchi, la dashboard mostra un solo avviso rappresentativo;
- resta visibile il messaggio utile per capire il limite del modello locale, senza riempire la pagina di duplicati.

Commit pubblicato:

```text
6607950 Deduplicate LM Studio fallback analysis signals
```

Verifiche effettuate:

```text
npm run lint
npm run build
```

## Aggiornamento 2026-05-17: Piano di lavoro senza giornate vuote

Problema osservato:

- nel Breakdown Reparti, spostando manualmente scene da una giornata all'altra, poteva rimanere una giornata senza scene;
- il piano continuava a mostrarla anche se non aveva piu contenuto produttivo.

Fix applicato:

- dopo spostamenti o rimozioni di scene, il piano viene compattato automaticamente;
- le giornate vuote vengono eliminate;
- le giornate rimanenti vengono rinumerate in ordine;
- vengono preservati i dati utili delle giornate ancora valide, come data, orari e note quando presenti.

Commit pubblicato:

```text
9359b4e Remove empty work plan days after scene moves
```

Verifiche effettuate:

```text
npm run lint
npm run build
```

## Aggiornamento 2026-05-17: riapertura risultati gia generati

Problema osservato:

- se l'utente aveva gia generato Analisi Drammaturgica, Breakdown Reparti, Schede Location o Schede Personaggio, un nuovo click rilanciava l'AI;
- questo era lento con LM Studio e poteva sovrascrivere o peggiorare un risultato gia utile.

Fix applicato:

- se il risultato esiste gia nella sessione corrente, il pulsante apre direttamente la relativa scheda;
- non viene inviata una nuova richiesta ad Anthropic o LM Studio;
- le etichette dei pulsanti passano a **Apri Analisi**, **Apri Breakdown**, **Apri Schede Location** e **Apri Schede Personaggio** quando il dato e gia disponibile.

Commit pubblicato:

```text
a5d84ad Open existing analysis artifacts without regenerating
```

Verifiche effettuate:

```text
npm run lint
npm run build
```

## File importanti citati

- `/Users/Robjhon/Documents/github/screenplay-formatter/src/App.jsx`
- `/Users/Robjhon/Documents/github/screenplay-formatter/genera-la-tua-idea-rome-future-week-2025/`
- `/Users/Robjhon/Documents/github/screenplay-formatter/.push-repo-1777559112/src/App.jsx`
- `/Users/Robjhon/Documents/github/screenplay-formatter/worker/index.js`
- `/Users/Robjhon/Documents/github/screenplay-formatter/wrangler.jsonc`
- `/Users/Robjhon/Documents/github/screenplay-formatter/README.md`
- `/Users/Robjhon/Documents/github/screenplay-formatter/DEEPFRAME — PROJECT SUMMARY.md`
- `/Users/Robjhon/Documents/github/screenplay-formatter/deepframe_landing_page_v2.html`
- `/Users/Robjhon/Documents/github/screenplay-formatter/deepframe_logo_concept.png`

## Prossimi passi consigliati

1. Continuare a lavorare sulla cartella principale:

```text
/Users/Robjhon/Documents/github/screenplay-formatter
```

2. Considerare `.push-repo-1777559112` come copia storica/temporanea, non come fonte primaria.
3. Sistemare o monitorare i permessi Git locali: in alcune sessioni serve richiedere permesso di scrittura su `.git`.
4. Testare:
   - caricamento landing;
   - ingresso app;
   - onboarding;
   - inserimento API key BYOK;
   - Parsing Conservativo;
   - Formattazione Creativa con testo grezzo senza `INT.`/`EST.`;
   - Formattazione Creativa da storia generata;
   - Crea la tua storia con Anthropic/Sonnet;
   - Crea la tua storia con LM Studio locale;
   - analisi;
   - schede personaggio;
   - breakdown;
   - piano di lavoro: accorpamento location, INT/EST, cast, complessita;
   - calendario riprese: data inizio/fine e orari;
   - schede location;
   - export HTML;
   - export PDF;
   - export PDF/page con una scena per pagina;
   - export PDF Schede Personaggio;
   - export PDF Schede Location;
   - export PDF Breakdown Reparti;
   - ottavi di pagina per scena.

## Prompt breve per nuova chat

Puoi iniziare una nuova chat caricando questo file e scrivendo:

```text
Riprendiamo il progetto DeepFrame / Screenplay Formatter da questo riepilogo.
Prima cosa: controlla lo stato della repo, capisci quale cartella è quella attiva per Cloudflare, poi aiutami a completare i prossimi passi senza perdere le feature già implementate.
```
