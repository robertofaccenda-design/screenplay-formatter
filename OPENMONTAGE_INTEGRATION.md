# Da Screenplay Formatter a OpenMontage — guida locale

Questa guida copre la Fase 1 dell'integrazione: portare uno `scene_plan.json` esportato da Screenplay Formatter dentro una produzione OpenMontage reale, usando un coding agent locale (Claude Code, Cursor, Windsurf...). La Fase 2 — una pipeline online che non richieda un coding agent aperto sul tuo Mac — è un progetto a parte, da affrontare solo dopo aver validato questo flusso manuale su un paio di sceneggiature vere.

## Perché serve un coding agent e non un semplice upload

OpenMontage non è un servizio hosted: è un insieme di tool Python, manifest YAML e skill Markdown pensati per essere letti ed eseguiti da un agente AI con accesso a un terminale (Python, Node, ffmpeg). Non esiste un endpoint a cui mandare un JSON e ricevere un video indietro — l'agente stesso è l'orchestratore. Questo è il motivo per cui il rendering non ha funzionato nel sandbox di Cowork durante i test (rete bloccata, niente Chrome headless): sul tuo Mac, con un coding agent vero, gira per intero.

## Prerequisiti (una tantum)

- Python 3.10+, Node.js 18+, FFmpeg
- Un coding agent: Claude Code, Cursor, Windsurf o Copilot vanno bene tutti

```bash
git clone https://github.com/calesthio/OpenMontage.git
cd OpenMontage
make setup
make demo   # verifica che il rendering funzioni davvero sul tuo Mac
```

`make demo` produce 3 video dimostrativi in `projects/demos/renders/`. Se li vedi, l'ambiente è pronto.

## Passo 1 — Esporta lo scene_plan dalla sceneggiatura

In Screenplay Formatter, dopo aver formattato il testo, nella sezione **Esporta** premi il pulsante **OpenMontage**. Scarichi `<titolo>_scene_plan.json` — un file conforme a `schemas/artifacts/scene_plan.schema.json` di OpenMontage, con una scena per ogni `scene_heading`, personaggi/dialoghi mappati in `character_actions`, interno/esterno e momento del giorno tradotti in `shot_language` (illuminazione, temperatura colore).

Le durate e lo `shot_language` in questo file sono **stime di partenza** (durata = 1 pagina ≈ 1 minuto, inquadratura sempre "medium/static"): servono a dare a OpenMontage un punto di partenza corretto, non sono la parola finale. È normale e previsto rifinirle nella fase successiva.

## Passo 2 — Apri OpenMontage con l'agente

```bash
cd OpenMontage
claude
```

(o l'equivalente per Cursor/Windsurf/Copilot — funziona con qualsiasi agente che legga file e lanci comandi).

## Passo 3 — Il prompt da incollare

Apri il file `scene_plan.json` esportato, copiane il contenuto, e incolla questo prompt (sostituendo il titolo e, se vuoi, la pipeline):

```text
Ho già uno scene_plan pronto, esportato da Screenplay Formatter, conforme a
schemas/artifacts/scene_plan.schema.json. Voglio usarlo per iniziare una
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
```

Perché funziona: la fase `scene_plan` nel manifest della pipeline `cinematic` richiede in ingresso solo `script` come opzionale e produce l'artifact `scene_plan` — la fase successiva, `assets`, richiede proprio `scene_plan` come unico artifact obbligatorio. Puoi quindi entrare direttamente lì, saltando ricerca e sceneggiatura via AI (la sceneggiatura ce l'hai già, ed è quella vera che hai scritto tu).

## Quale pipeline scegliere

- **cinematic** — scene dialogate, tono drammatico/trailer: il default più adatto a una sceneggiatura con personaggi e dialoghi come quella che esporti da Screenplay Formatter.
- **hybrid** — se hai già girato riprese reali (INCAS Film) e vuoi che OpenMontage le integri con visual generati per i buchi.
- **documentary-montage** — solo se vuoi un montaggio da footage libera reale (Archive.org, Pexels...) senza dialoghi recitati.

## Cosa succede dopo la tua approvazione

L'agente prosegue da solo lungo `assets → edit → compose`: genera immagini/video/narrazione/musica in base a `required_assets` di ogni scena, monta, e produce `projects/<nome-progetto>/renders/final.mp4`. Con budget e provider a pagamento configurati riceverai comunque i gate di approvazione previsti da OpenMontage (stime di costo prima di ogni generazione, self-review prima di consegnare il video).

## Se qualcosa non torna

- Se l'agente non convalida lo schema, puntalo esplicitamente a `schemas/artifacts/scene_plan.schema.json`.
- Se vuoi restare a costo zero, chiedi esplicitamente narrazione Piper TTS e visual da fonti libere (Archive.org/Pexels/Unsplash) invece di provider a pagamento.
- Il file esportato da Screenplay Formatter usa sempre `type: "character_scene"` o `"broll"` per scena: se una scena è puramente descrittiva (nessun dialogo), l'agente la tratterà come B-roll.

## Fase 2 (quando sarai pronto)

Una pipeline online — nessun coding agent da aprire, un tasto sul sito che genera il video — è un progetto infrastrutturale a parte: richiede un server che esegua Python/ffmpeg (e in alcuni casi un headless Chrome), gestione code per render lunghi, e chiavi provider lato server. Se ne parla dopo aver validato questo flusso locale su qualche sceneggiatura reale.
