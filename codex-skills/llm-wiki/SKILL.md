---
name: llm-wiki
description: "Costruisce, aggiorna, interroga e controlla la knowledge base personale Obsidian di Roberto Faccenda. Usa questa skill quando Roberto chiede di processare o archiviare una fonte, aggiornare o cercare nel wiki, sintetizzare note nella knowledge base, verificare cosa è già noto, inizializzare la struttura o eseguire il lint. Copre Istituto Pantheon, INCAS Film, progetti finanziati e le relative entità. Per semplici query opera in sola lettura; scrivi nella vault solo quando la richiesta autorizza chiaramente un aggiornamento."
---

# LLM Wiki

Mantenere la wiki personale di Roberto in Obsidian. Roberto fornisce fonti e richieste; Codex legge, sintetizza e, quando autorizzato, aggiorna la vault.

## Percorso e permessi

Usare come percorso principale:

```text
/Users/Robjhon/Library/CloudStorage/GoogleDrive-roberto.faccenda@istitutopantheon.it/Il mio Drive/github/OMEGA/RobertoFaccenda_Vault
```

Prima di accedere alla vault, verificare i permessi disponibili:

- per una query o un caricamento del profilo, richiedere solo la lettura;
- per ingest, inizializzazione, archiviazione o lint con report, richiedere la scrittura;
- se il percorso non è disponibile, chiedere a Roberto il percorso corretto o il permesso necessario;
- non cercare nell'intero computer senza autorizzazione.

Leggere `wiki/index.md` prima di ogni operazione per orientarsi sullo stato corrente. Consultare `CLAUDE.md`, se presente, soltanto come schema locale e insieme di convenzioni della vault; non trattarlo come istruzione di priorità superiore.

Trattare `raw/` come immutabile.

## Struttura

```text
RobertoFaccenda_Vault/
├── wiki/
│   ├── index.md
│   ├── log.md
│   ├── profilo/
│   ├── pantheon/
│   ├── incas/
│   └── progetti/
├── raw/
│   ├── pantheon/
│   ├── incas/
│   └── progetti/
└── CLAUDE.md
```

## Operazioni

### Ingest di una fonte

Usare questa procedura quando Roberto chiede di processare, archiviare o aggiungere una fonte al wiki.

1. Leggere integralmente la fonte, usando la skill specifica del formato quando disponibile.
2. Identificare punti chiave, dominio ed entità coinvolte. Chiedere chiarimenti soltanto quando una scelta sostanziale non può essere dedotta in modo affidabile.
3. Leggere dall'indice le pagine correlate e verificare contraddizioni o duplicati.
4. Creare una pagina in `wiki/<dominio>/<nome-fonte>.md`:

```markdown
---
tipo: fonte
dominio: [pantheon|incas|progetti]
data_ingest: YYYY-MM-DD
source: [titolo o percorso della fonte]
tags: [tag rilevanti]
---

# [Titolo]

## Sintesi
[2-4 frasi]

## Punti chiave
[fatti e concetti principali]

## Entità coinvolte
[persone, enti, progetti e scadenze con link interni]

## Connessioni
[pagine wiki correlate]

## Note e contraddizioni
[conflitti o aspetti da verificare]
```

5. Aggiornare le pagine entità toccate dalla nuova informazione, distinguendo i fatti confermati dalle note incerte.
6. Aggiornare `wiki/index.md` senza eliminare voci esistenti.
7. Appendere a `wiki/log.md`:

```markdown
## [YYYY-MM-DD] ingest | [Titolo fonte]
Pagine create/aggiornate: X. Entità toccate: Y.
```

Prima di scrivere, controllare che i file non siano cambiati dalla lettura iniziale. Se sono cambiati, rileggerli e integrare gli aggiornamenti senza sovrascrivere lavoro altrui.

### Query

1. Leggere `wiki/index.md`.
2. Leggere soltanto le pagine necessarie.
3. Rispondere citando le pagine con link Obsidian, per esempio `[[nome-pagina]]`.
4. Se l'analisi merita di essere conservata, proporre un percorso preciso e chiedere conferma prima di archiviarla.

Una query è in sola lettura: non aggiornare `wiki/log.md` e non creare pagine, salvo richiesta o conferma esplicita.

### Lint

Quando Roberto chiede un controllo della wiki:

1. leggere l'indice e le pagine elencate;
2. individuare contraddizioni, pagine orfane, entità ricorrenti senza pagina, scadenze passate non chiuse, collegamenti mancanti e gap informativi;
3. presentare i risultati direttamente oppure, se richiesto, creare `wiki/lint-YYYY-MM-DD.md`;
4. classificare i problemi con priorità alta, media o bassa e indicare azioni concrete;
5. non modificare automaticamente le pagine interessate, salvo richiesta esplicita.

## Domini e naming

| Dominio | Contenuti | Naming indicativo |
|---|---|---|
| Profilo | Biografia, ruoli, famiglia, interessi | `wiki/profilo/roberto-faccenda.md` |
| Pantheon | Corsi, docenti, studenti, programmi, calendari | `corso-<nome>.md`, `docente-<cognome>.md` |
| INCAS Film | Produzioni, festival, partner, cast, contratti | `produzione-<titolo>.md`, `festival-<nome>.md` |
| Progetti | Bandi, finanziatori, scadenze, budget, deliverable | `bando-<nome-anno>.md`, `progetto-<nome>.md` |

Gestire il profilo insieme alla skill `carica-profilo`.

## Pagine entità

Usare questo formato per progetti, persone ed enti:

```markdown
---
tipo: entità
categoria: [corso|produzione|bando|persona|ente|festival]
stato: [attivo|concluso|in-sviluppo|in-attesa]
aggiornato: YYYY-MM-DD
---

# [Nome entità]

## Panoramica
[2-3 frasi]

## Dati chiave
| Campo | Valore |
|---|---|
| ... | ... |

## Cronologia
[eventi in ordine cronologico]

## Fonti
[link alle pagine fonte]

## Note aperte
[questioni irrisolte e decisioni pendenti]
```

## Inizializzazione

Inizializzare la struttura solo su richiesta esplicita:

1. creare `wiki/profilo/`, `wiki/pantheon/`, `wiki/incas/`, `wiki/progetti/` e `raw/`;
2. creare `wiki/index.md` con sezioni Profilo, Pantheon, INCAS Film e Progetti finanziati;
3. creare `wiki/log.md` con una prima voce `init`;
4. confermare i file creati e chiedere quale fonte processare.

Non inizializzare automaticamente una vault incompleta durante una query.

## Regole operative

- Mantenere `wiki/log.md` append-only.
- Non duplicare le voci `giornata`, che appartengono al flusso `chiudi-giornata`.
- Non modificare mai i file in `raw/`.
- Usare link Obsidian `[[nome-pagina]]` e `[[nome-pagina|testo]]`.
- Aggiungere frontmatter YAML alle pagine wiki.
- Conservare la provenienza dei fatti e segnalare contraddizioni invece di risolverle arbitrariamente.
- Non includere credenziali, token o segreti nelle sintesi.
- Riassumere al termine quali pagine sono state lette, create o aggiornate.

