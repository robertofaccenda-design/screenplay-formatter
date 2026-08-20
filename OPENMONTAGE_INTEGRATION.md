# Da un'idea (o da una sceneggiatura) a un video — tutorial DeepFrame → OpenMontage

Questo tutorial copre l'intero percorso: partire da un'idea o da una sceneggiatura già scritta, generare il file `scene_plan.json` da DeepFrame, capire dove va portato quel file e quali sono le operazioni finali che producono davvero un video con [OpenMontage](https://github.com/calesthio/OpenMontage).

**Il flusso in breve:**

```
Idea grezza ──▶ "Crea la tua storia" (opzionale) ──▶ Sceneggiatura formattata in DeepFrame
                                                              │
                                                              ▼
                                          (opzionale) Storyboard visivo — DeepFrame Director
                                                              │
                                                              ▼
                                          Pulsante "OpenMontage" → scene_plan.json
                                                              │
                                                              ▼
                                Progetto OpenMontage locale (coding agent: Claude Code, Cursor...)
                                                              │
                                                              ▼
                                          assets → edit → compose → renders/final.mp4
```

Le fasi in DeepFrame (formattazione, storyboard, export) girano nel browser o sul sito pubblicato. La parte OpenMontage, invece, richiede un coding agent locale sul tuo Mac: non è un servizio a cui si manda un file e si riceve un video, è un insieme di tool Python/Node/ffmpeg pensato per essere eseguito da un agente con accesso a un terminale.

---

## Passo 0 — Da dove parti

**Hai già una sceneggiatura** (Fountain, Word, PDF con testo selezionabile, o testo grezzo)? Importala in DeepFrame e vai direttamente al Passo 1.

**Hai solo un'idea**, non ancora una sceneggiatura? Usa il generatore collegato **"Crea la tua storia"**: genera una storia per atti a partire da un'idea o da un tema, poi esportala e importala in DeepFrame usando la modalità di formattazione **creativa** (non conservativa): trasforma la prosa narrativa in scene vere e proprie, con intestazioni scena, personaggi e dialoghi — il formato che serve ai passi successivi.

In entrambi i casi arrivi allo stesso punto: una sceneggiatura formattata in DeepFrame, pronta per l'export.

---

## Passo 1 — Esporta lo scene_plan dalla sceneggiatura

Nella sezione **Esporta** di DeepFrame, dopo aver formattato il testo, premi il pulsante **OpenMontage**. Scarichi `<titolo>_scene_plan.json`, conforme allo schema `scene_plan.schema.json` di OpenMontage: una scena per ogni intestazione scena, personaggi e dialoghi mappati in `character_actions`, interno/esterno e momento del giorno tradotti in `shot_language` (illuminazione, temperatura colore).

Durate e `shot_language` sono **stime di partenza** (durata = 1 pagina ≈ 1 minuto, inquadratura sempre "medium/static"): danno a OpenMontage un punto di partenza corretto, non sono la parola finale. È normale rifinirle nel passo successivo, quando l'agente le rivede insieme a te.

---

## Passo 1bis (opzionale) — Genera uno storyboard visivo prima di esportare

Nel pannello **DeepFrame Director** puoi generare un frame per scena — gratis via **Pollinations.ai** o in locale via **ComfyUI** — e poi esportare tutto in un **PDF storyboard** (pulsante "Esporta storyboard PDF": un frame per scena con cast, ambientazione e sinossi).

Questo passo è utile per condividere con cast/troupe un riferimento visivo prima di girare o generare, ma è indipendente dall'export OpenMontage: il PDF non entra nella pipeline di OpenMontage, serve a te e al tuo team per validare la direzione visiva prima di spendere tempo/budget nella generazione vera.

---

## Passo 2 — Dove va messo il JSON: prerequisiti e apertura di OpenMontage

Il file `scene_plan.json` non va "posizionato" in una cartella particolare del tuo Mac: lo consegni direttamente al coding agent, dentro la conversazione, e sarà lui a scriverlo nel posto giusto (vedi Passo 3).

**Prerequisiti (una tantum):**

- Python 3.10+, Node.js 18+, FFmpeg
- Un coding agent: Claude Code, Cursor, Windsurf o Copilot vanno bene tutti

```bash
git clone https://github.com/calesthio/OpenMontage.git
cd OpenMontage
make setup
make demo   # verifica che il rendering funzioni davvero sul tuo Mac
```

`make demo` produce 3 video dimostrativi in `projects/demos/renders/`. Se li vedi, l'ambiente è pronto.

**Apri OpenMontage con l'agente:**

```bash
cd OpenMontage
claude
```

(o l'equivalente per Cursor/Windsurf/Copilot).

---

## Passo 3 — Il prompt da incollare

Apri il file `scene_plan.json` esportato al Passo 1, copiane il contenuto, e incolla questo prompt (sostituendo il titolo e, se vuoi, la pipeline):

````text
Ho già uno scene_plan pronto, esportato da DeepFrame, conforme allo
schema scene_plan.schema.json. Voglio usarlo per iniziare una
produzione OpenMontage con la pipeline "cinematic", saltando le fasi
research, proposal e script.

Inizializza un nuovo progetto (init_project), poi scrivi questo contenuto
come artifact/checkpoint della fase scene_plan seguendo il protocollo di
checkpoint standard (skills/meta/checkpoint-protocol.md). Fermati e
mostrami un riepilogo delle scene con una stima di costo PRIMA di avviare
la generazione asset — non voglio spese senza approvazione esplicita.

Titolo: <titolo del progetto>

scene_plan.json:
```json
<incolla qui il contenuto del file esportato>
```
````

**Ecco dove finisce davvero il JSON:** l'agente lo scrive come `projects/<nome-progetto>/checkpoint_scene_plan.json`, dentro l'envelope di checkpoint standard di OpenMontage (versione, project_id, stage, status, timestamp, artifacts...). Da lì in poi il progetto vive dentro `OpenMontage/projects/<nome-progetto>/`.

Perché funziona: la fase `scene_plan` nel manifest della pipeline `cinematic` richiede in ingresso solo `script` come opzionale e produce l'artifact `scene_plan` — la fase successiva, `assets`, richiede proprio `scene_plan` come unico artifact obbligatorio. Entri quindi direttamente lì, saltando ricerca e sceneggiatura via AI (la sceneggiatura ce l'hai già, ed è quella vera che hai scritto tu o generato con "Crea la tua storia").

---

## Passo 4 — Quale pipeline scegliere

- **cinematic** — scene dialogate, tono drammatico/trailer: il default più adatto a una sceneggiatura con personaggi e dialoghi come quella che esporti da DeepFrame.
- **hybrid** — se hai già girato riprese reali (INCAS Film) e vuoi che OpenMontage le integri con visual generati per i buchi.
- **documentary-montage** — solo se vuoi un montaggio da footage libera reale (Archive.org, Pexels...) senza dialoghi recitati.

---

## Passo 5 — Operazioni conclusive: dall'approvazione al video

Dopo che approvi il riepilogo scene e la stima di costo del Passo 3, l'agente prosegue da solo lungo le fasi restanti:

1. **assets** — genera immagini/video/narrazione/musica in base a `required_assets` di ogni scena (provider a pagamento se configurati, oppure narrazione Piper TTS e visual da fonti libere se resti a costo zero — vedi sotto).
2. **edit** — monta le scene secondo `shot_language` e `transition_out`.
3. **compose** — produce il file finale.

Il video completo arriva in `OpenMontage/projects/<nome-progetto>/renders/final.mp4`. Con budget e provider a pagamento configurati ricevi comunque i gate di approvazione previsti da OpenMontage (stima di costo prima di ogni generazione, self-review prima di consegnare il video) — non parte nulla senza che tu lo veda prima.

---

## Se qualcosa non torna

- Se l'agente non convalida lo schema, puntalo esplicitamente al file `scene_plan.schema.json`, dentro `schemas/artifacts/` nel repo OpenMontage.
- Se vuoi restare a costo zero, chiedi esplicitamente narrazione Piper TTS e visual da fonti libere (Archive.org/Pexels/Unsplash) invece di provider a pagamento.
- Il file esportato da DeepFrame usa sempre `type: "character_scene"` o `"broll"` per scena: se una scena è puramente descrittiva (nessun dialogo), l'agente la tratterà come B-roll.
- Se il rendering non parte affatto, verifica di aver eseguito davvero `make demo` con successo prima di partire da un vero scene_plan — se la demo non funziona, il problema è nell'ambiente locale (Python/Node/ffmpeg), non nel JSON.

---

## Fase 2 (quando sarai pronto)

Una pipeline online — nessun coding agent da aprire, un tasto sul sito che genera il video — è un progetto infrastrutturale a parte: richiede un server che esegua Python/ffmpeg (e in alcuni casi un headless Chrome), gestione code per render lunghi, e chiavi provider lato server. Se ne parla dopo aver validato questo flusso locale su qualche sceneggiatura reale (es. una produzione INCAS Film).
