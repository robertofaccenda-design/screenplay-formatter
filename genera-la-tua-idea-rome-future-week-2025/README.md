# Crea La Tua Storia

Modulo narrativo collegato a **DeepFrame Script**.

Questo modulo permette di generare una storia guidata per atti, esportarla e inviarla direttamente alla **Formattazione Creativa** di DeepFrame per trasformarla in sceneggiatura.

## Integrazione Con DeepFrame

Il modulo viene pubblicato dentro la stessa build di DeepFrame alla rotta:

```text
/crea-la-tua-storia/
```

La home di DeepFrame contiene un collegamento diretto a questa rotta.

## Provider AI

Il generatore usa la stessa configurazione AI scelta in DeepFrame:

- **LM Studio locale** quando l'app principale usa LM Studio;
- **Anthropic Claude Sonnet** quando l'app principale usa Anthropic/Cloudflare.

La chiave API usata e la stessa inserita per parsing e formattazione.

## Funzioni

- Generazione storia per atti.
- Caricamento di un PDF o documento sorgente.
- Scelte narrative tra gli atti.
- Fallback automatico quando il modello non restituisce scelte valide.
- Pulizia dell'output da markdown tecnico o JSON residuo.
- Export in PDF.
- Export in TXT.
- Invio diretto della storia alla Formattazione Creativa di DeepFrame.

## Note Tecniche

- Il modulo viene compilato con una configurazione Vite dedicata.
- La build finale viene prodotta dentro:

```text
dist/crea-la-tua-storia/
```

- Il comando principale del repository esegue anche questa build:

```bash
npm run build
```

## Problemi Gia Gestiti

- Output con blocchi di codice JSON o `scelte_critiche`.
- Sezioni tipo `Scelte - Matrice JSON` in coda agli atti.
- Titoli con residui markdown `#`, `##`, `---`.
- Scelte vuote o non valide prima dell'atto finale.
- Uso di Haiku sostituito da Sonnet per maggiore qualita narrativa.
