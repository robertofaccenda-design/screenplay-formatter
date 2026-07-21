---
name: carica-profilo
description: "Carica il contesto operativo di Roberto Faccenda dalla sua wiki Obsidian organizzata secondo la skill llm-wiki. Usa questa skill quando Roberto chiede di caricare, ricaricare o consultare il suo profilo, contesto personale, contesto giornaliero o vault; quando domanda \"chi sono\"; oppure quando un'attività richiede chiaramente informazioni sui suoi ruoli o progetti. Leggi solo le pagine pertinenti e tratta la vault come sola lettura, salvo richiesta esplicita di modifica."
---

# Carica profilo

Caricare dalla wiki Obsidian il contesto necessario per il task corrente, evitando di leggere dati non pertinenti.

## Dipendenza

Usare `llm-wiki` come riferimento per la struttura e il formato della vault. Se `llm-wiki` non è disponibile, limitarsi a leggere i percorsi descritti qui. Non creare né modificare pagine senza una richiesta esplicita dell'utente.

## Percorso della vault

Usare come percorso principale:

```text
/Users/Robjhon/Library/CloudStorage/GoogleDrive-roberto.faccenda@istitutopantheon.it/Il mio Drive/github/OMEGA/RobertoFaccenda_Vault
```

Se il percorso non è accessibile:

1. verificare se occorre richiedere a Roberto il permesso di lettura per quel percorso;
2. dopo aver ottenuto il permesso, cercare `RobertoFaccenda_Vault/wiki/index.md` nelle sole directory accessibili, usando `rg --files` o gli strumenti di ricerca disponibili;
3. se la vault non viene trovata, segnalarlo brevemente senza bloccare attività che non dipendono dal profilo.

Non eseguire ricerche estese nell'intero computer senza autorizzazione.

## Procedura

### 1. Leggere il catalogo

Leggere sempre `{vault}/wiki/index.md` per conoscere le pagine e i progetti disponibili.

Se manca, segnalare che il wiki non risulta inizializzato e proseguire con gli altri file disponibili.

### 2. Leggere il profilo

Leggere sempre `{vault}/wiki/profilo/roberto-faccenda.md`.

Se manca, segnalarlo. Creare la pagina nel formato definito da `llm-wiki` solo se Roberto lo richiede esplicitamente e dopo aver ottenuto l'eventuale permesso di scrittura.

### 3. Leggere il contesto giornaliero

Se esiste, leggere `{vault}/_contesto_giornaliero.md`.

Se il file è temporaneamente indisponibile o bloccato, proseguire senza interrompere il task.

### 4. Leggere solo i domini pertinenti

Usare `wiki/index.md` per selezionare esclusivamente le pagine necessarie:

| Ambito | Percorso |
|---|---|
| Didattica, corsi, studenti, Istituto Pantheon | `wiki/pantheon/` |
| Produzioni, festival, contratti, INCAS Film | `wiki/incas/` |
| Bandi, finanziamenti, rendicontazioni | `wiki/progetti/` |

Per una richiesta generica di caricamento del contesto, fermarsi al catalogo, al profilo e al contesto giornaliero.

### 5. Proteggere i dati

- Non riportare credenziali, token, dati finanziari o altri segreti eventualmente presenti nei file.
- Non copiare nel messaggio finale informazioni personali non necessarie al task.
- Trattare `raw/` come fonte in sola lettura e consultarla soltanto se una pagina pertinente la indica come necessaria.

### 6. Confermare il caricamento

Rispondere in modo breve indicando:

- identità e ruoli principali ricavati dalla pagina profilo;
- progetti attivi pertinenti;
- disponibilità del contesto giornaliero;
- eventuali file essenziali mancanti.

Non presentare come attuali informazioni che non sono state lette durante la sessione. Terminare chiedendo quale attività svolgere, a meno che Roberto abbia già fornito un task: in quel caso, procedere direttamente.

