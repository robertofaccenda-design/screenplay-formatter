# Continuità — DeepFrame × IntelliMaker

Primo modulo operativo, accessibile dalla scheda **Continuità / IntelliMaker** anche senza sceneggiatura già formattata. Non modifica i media né avvia il motore Python CineCrew.

## Contributo concreto di CineCrew

Il ponte importa il JSON `SceneBlueprint` / FilmDSL dell'upstream https://github.com/Ironieser/CineCrew, in particolare `shots[].narrative_layer`, `staging_layer.entities`, `camera` e `consistency_constraints`. Conserva anche i livelli render/assembly non utilizzati, per esportare nuovamente il piano. Il mapping è basato su `src/schemas/blueprint.py` (blob upstream `313c3485a441a82a2255d0417de0bc5e90378426`).

Questa è un'implementazione JavaScript del ponte verso FilmDSL, non una portabilità completa della pipeline CineCrew. Non invoca `VisualJudgeAgent` Python: la revisione del girato è un adattamento DeepFrame che usa l'endpoint locale esistente e un prompt distinto, orientato a osservazione, incertezza e revisione umana. Il VisualJudge originale controlla media generati e propone prompt di rigenerazione; non è un rilevatore live validato per il girato reale.

CineCrew mantiene i vincoli in liste di testo: il modulo li mostra come promemoria e richiede di aggiungere/approvare valori strutturati per oggetto, mano, costume o stato. Non assume automaticamente che il contenuto del piano sia visibile nel take.

## Prova senza AI (3 minuti)

1. Avvia `npm ci` e `npm run dev`, entra nell'app dalla landing e chiudi l'eventuale tour.
2. Apri **Continuità / IntelliMaker**, poi **Carica esempio sintetico**.
3. Scegli `12C`; approva il vincolo tazza / mano / destra. Se importi un vero FilmDSL, aggiungi il vincolo con la relativa fonte.
4. Inserisci il take `12C / 02`. Apri il confronto manuale: seleziona visibile, scrivi `sinistra` e documenta l'evidenza. Confronta.
5. Il registro deve indicare **Possibile discrepanza**, non un rigiro obbligatorio. Con `destra` indica nessuna discrepanza nel dato; con non visibile/incerto indica **Non valutabile**.
6. Annota la decisione (da verificare, intenzionale, pickup richiesto o da valutare in montaggio) ed esporta progetto/report.

L'esempio è sintetico e non viene caricato automaticamente. Le osservazioni manuali vengono dichiarate manuali nel report.

## Piano da una scena tramite modello locale

Configura **Motore AI → LM Studio**, endpoint e modello. Incolla una sola scena (20–16.000 caratteri) nella sezione dedicata e premi **Proponi piano FilmDSL**. La risposta deve superare la validazione; non sono previsti fallback che fabbricano un piano riuscito. Il testo non viene inviato prima del clic. La generazione è una proposta DeepFrame in formato CineCrew, non l'esecuzione dei suoi agenti Python.

## Revisione visiva di un take

- Carica JPEG/PNG/WebP fino a 8 MB (ridimensionato a massimo 1280 px per lato lungo), oppure un video locale fino a 500 MB decodificabile dal browser.
- Sul video seleziona un punto con i controlli e premi **Usa il fotogramma visualizzato**. È un singolo campione, non l'analisi dell'intero take.
- Facoltativamente carica un riferimento approvato. Inserisci l'ID take e approva almeno un vincolo.
- Solo il clic su **Invia fotogrammi a LM Studio per revisione visiva** invia le immagini e il contesto all'endpoint configurato. Il video integrale non viene inviato.
- Serve un modello con supporto immagini. Il modulo non carica modelli, non verifica il server e non garantisce supporto vision del modello scelto. In sviluppo può essere usato il proxy Vite `/lmstudio` già presente; dal sito ospitato restano applicabili CORS e restrizioni del browser verso localhost.
- Risposte invalide vengono rifiutate; vincoli omessi o dettagli non visibili restano non valutabili. Destra/sinistra anatomica, occlusioni e identità possono essere interpretate male: verificare sempre i riferimenti.
- Il confronto dei valori è normalizzato per maiuscole/spazi ma non semantico: sinonimi possono generare segnalazioni da rivedere.

Non sono stati eseguiti test reali con il server LM Studio del Mac dell'utente. I test automatici coprono dati, validazione e composizione della richiesta, non l'accuratezza del modello.

## Stato e persistenza

Piano e registro restano nello stato React anche cambiando scheda; ricaricare la pagina li elimina. Nessun autosalvataggio o database viene introdotto. Esportare prima di chiudere. Importare/sostituire un piano azzera revisioni e approvazioni; l'importazione del report riprende piano e vincoli da riapprovare, non ripristina decisioni storiche come attuali. I report contengono nomi dei file e timestamp in secondi dall'inizio del video, non timecode SMPTE o immagini. Ogni revisione conserva i vincoli usati al momento del confronto.

## Confini e sviluppo successivo

Questo primo modulo non registra la camera, non monitora il set in tempo reale, non misura la latenza né decide se rigirare. Non rileva automaticamente asse, sguardi o raccordi dinamici da un singolo fotogramma. Non genera inserti o ripara il girato. Il prossimo passo è una validazione con take reali etichettati, incluse occlusioni, seguita da campionamento temporale, mapping scena/shot/take e confronto fra inquadrature collegate.

## Verifiche

`node --test tests/continuity.test.mjs` controlla import FilmDSL, errori strutturali, vincoli non approvati, mismatch, incertezza, risposte modello e report. `npm run build` compila app e modulo storia. Nessun test richiede API a pagamento.

Licenza e provenienza: `THIRD_PARTY_NOTICES.md` e `licenses/CineCrew-Apache-2.0.txt`. Le dipendenze e gli eventuali modelli restano soggetti alle rispettive condizioni.
