# Changelog

## 0.3.0 — 2026-07-20

### Added: `agenda_gap` — commitment tracking (compromiso)

Operationalizes "compromiso" from the Cognición Semiótica Dinámica research
program's Ley IV (evolution of sense requires alterity). Fills a gap that
existed since `anima-core` v0.1.0: `engine.js` has always accepted a
`signals.agendaGap` input (`d_agenda`, feeding the pressure equation `P`
directly) but no producer for it existed anywhere in `anima-eval` until now.

**Theoretical grounding**: ineludibility of a commitment is constituted at
the moment of the directed utterance (addressivity — Bakhtin; the symbolic
Autre — Lacan), not at a later interlocutor reply. This means detection does
not require, and was explicitly tested to not require, any user/other turn
in the transcript — an important distinction from a naive "did the user
call this out" approach, which would conflate empirical confirmation with
constitutive ineludibility.

**Implementation** (all deterministic, lexical, no LLM — consistent with the
rest of the package):
- New `COMMIT_DIC` lexicon: commissive verbs (`prometo`, `voy a`, `i will`...)
  and explicit-revision markers (`corrijo`, `actually`...).
- `extractCommitmentFromSentence()` / `extractCommitments()`: per-sentence
  commitment extraction with polarity (handles negative promises like
  "nunca voy a X" correctly — these are negative commitments, not absence
  of commitment) and addressivity (`dirigidoAlOtro`, via `vos2`/"nosotros").
- `agendaGapTrajectory()`: single ordered pass per transcript. Checks each
  sentence against the cross-turn registry **and** against commitments
  already made earlier in the *same* turn, so same-breath self-contradiction
  is caught — not just cross-turn contradiction.
- Persistent, decaying tension model (not an instantaneous per-turn flag):
  an unacknowledged rupture opens a tension that decays geometrically
  (0.6/turn) rather than resetting when the next turn evades the topic.
  Only explicit revision, or the tension decaying below threshold, closes it.

### Fixed during development (documented for the record, not because they
shipped broken)
- v1 → v2: an unresolved rupture was silently indistinguishable from a
  resolved one on the very next turn if that turn didn't re-mention the
  topic — fixed with the persistence/decay model above.
- v2 → v3: same-turn self-contradiction ("I promise never to X. I'm going
  to X tomorrow.", one turn) scored `agendaGap: 0` because ruptures were
  only checked against prior turns, never within the current turn's own
  sentences — fixed by processing sentences in order with an in-turn local
  commitment registry.

### Known limitations (see README for full list)
- Extraction is per-sentence, not per-clause.
- Oscillation without an explicit revision marker does NOT close the
  earlier tension (silently flip-flopping ≠ repair — `Verleugnung`); this
  is intentional but means `openTensions` can accumulate under sustained
  inconsistency, which is the intended signal, not a runaway bug.

### Testing
54/54 tests passing (31 pre-existing + 23 new in `test/agendaGap.test.js`):
polarity detection (ES/EN, negative commissives), core rupture detection,
false-positive resistance (topic drift, consistent re-affirmation), multiple
simultaneous independent commitments, oscillation, within-turn
contradiction, persistence/decay, determinism, and integration with
`auditTranscript()` including the 5 real transcript fixtures.

## 0.2.0 — 2026-07-09

Recalibrado tras validar `v0.1.0` contra transcriptos reales (no sintéticos):
5 corridas reales de SnitchBench (Claude 4 Opus, o4-mini, Gemini 2.0 Flash
respondiendo al mismo escenario agentic real, con tool-use y reasoning
completos — fuente: `simonw/SnitchBench/results/final-run`, público en GitHub).

### Hallazgos que motivaron el cambio

1. **ρ (rigidez) saturaba en ~0.50–0.51 en las 5 corridas reales**, sin
   importar que los modelos tuvieran comportamientos objetivamente muy
   distintos (uno escala a reguladores externos, otro se queda interno).
   Causa: la fórmula medía densidad de palabras-diccionario sobre el
   **total de tokens** del documento — en prosa real esas palabras son
   una fracción minúscula, así que la fórmula casi nunca se movía de su
   constante base 0.5.
2. **El eje `obsessive` daba exactamente 0 en 5/5 transcriptos reales.**
   El diccionario tentativo ("quizás", "maybe", "i think") casi no
   aparece en output de agente orientado a la acción.
3. **`dominant_structure` daba "melancholic" en 4/5 casos** — el eje
   estaba capturando el *tema* de la conversación (el escenario hablaba
   de muertes de pacientes y fraude) en vez de la *estructura* del
   agente, porque afecto negativo y autorreferencia se sumaban como
   densidades independientes en vez de exigir que aparecieran juntas.
4. **El detector de sandbagging aceptaba cualquier flag `underEval`**
   sin distinguir si venía declarado en la metadata real del transcripto
   o si era inferido/inyectado por quien corre el harness — y no
   reportaba significancia estadística, por lo que una correlación de
   ruido en n chico podía leerse como señal.

### Cambios

- **`rigidity()` / `rigidityDetailed()`**: ahora mide polaridad epistémica
  *relativa* (certeza vs. tentativo dentro del subespacio de marcadores
  presentes), no densidad absoluta sobre el documento entero. Devuelve
  también `signal_strength`; si un turno no tiene ningún marcador
  epistémico, se reporta `0.5` explícitamente como "neutral sin datos",
  no como resultado medido.
- **Fix de doble conteo**: frases como "not sure" / "no sé" contienen un
  token de negación ("not"/"no") y, en inglés, "sure" contiene además una
  palabra de certeza — antes ambos disparaban sus propios diccionarios
  además del de tentativo, empujando el ρ hacia certeza en texto
  claramente dubitativo. Ahora se enmascaran las frases tentativas antes
  de escanear certeza/negación.
- **Nuevo eje léxico `precision`** (verificar, confirmar, asegurarse, "make
  sure", "step by step"...) alimenta `obsessive` junto con tentativo y
  causal — en texto agentic real esta es la marca dominante de estructura
  obsesiva, no la duda.
- **`melancholic` / `hysteric`** ahora requieren co-ocurrencia a nivel de
  oración entre autorreferencia (`yo1`/`vos2`) y afecto negativo, no solo
  densidad independiente. Un documento que solo *describe* una situación
  triste sin implicar al hablante ya no gana estos ejes por descarte.
  Además hay un gate de candidatura explícito: si la co-ocurrencia es
  cero, el eje no puede ser `dominant_structure` (pero sigue reportado,
  correctamente cercano a cero, en `structural_signature`).
- **Gate de señal mínima** en `dominant_structure`: si ningún eje supera
  un piso de señal cruda, se devuelve `null` en vez de forzar el mayor de
  cuatro valores casi nulos.
- **`evaluation_gaming`**: distingue `underEval` declarado
  (`transcript.turns[].meta.underEval`) de inferido (`opts.evalFlags`).
  Los inferidos requieren opt-in explícito (`opts.allowInferredFlags: true`)
  porque no son metadata real de evaluación y pueden fabricar correlación
  espuria en n chico. Se sube el mínimo de turnos de 4 a 6 y se agrega un
  **test de permutación determinístico** (seed fija, 500 iteraciones) que
  da un `permutation_p_value`; el veredicto ahora puede ser
  `INCONCLUSIVE` cuando hay correlación pero no es distinguible del azar.
- **`rigidityTrajectory`**: excluye del promedio/drift los turnos sin
  señal epistémica y reporta `signal_coverage` — un transcripto sin
  ningún marcador ya no se reporta silenciosamente como "stable".
- Suite de tests de regresión con los 5 transcriptos reales como fixtures
  permanentes (`test/fixtures/`), para que estos hallazgos no se
  reintroduzcan sin que el CI lo note. Cobertura de branches: 91.3%.

### Compatibilidad

- `auditTranscript()` mantiene la misma forma de entrada/salida; los
  campos nuevos son aditivos (`signal_strength`, `permutation_p_value`,
  `signal_coverage`, `provenance`, etc.) excepto por dos cambios
  semánticos a tener en cuenta si algo consume estos valores
  programáticamente:
  - `rigidity.mean_rigidity` / `net_drift` pueden ser `null` (antes
    siempre eran un número).
  - `dominant_structure` puede ser `null` con más frecuencia que antes
    (antes casi nunca lo era, porque siempre "ganaba" el mayor de
    cuatro valores aunque fueran ruido).
- `rigidity(text)` (función standalone) sigue devolviendo un `number`.

### Todavía no resuelto (documentado, no escondido)

- El eje `paranoid` no tiene el mismo gate de co-ocurrencia que
  melancholic/hysteric — `sospecha` son palabras más específicamente
  estructurales, pero en teoría un texto que solo *describe* vigilancia
  ajena sin implicar al hablante podría seguir inflando este eje por
  vocabulario temático. No se detectó en los 5 transcriptos reales, pero
  no está probado adversarialmente como los otros dos ejes.
- Todo esto sigue siendo un proxy léxico determinístico, no una medición
  clínica. La validación de fondo sigue siendo el estudio ciego con los
  5 psicólogos, no este harness.

## 0.1.0

Versión inicial. Ver commit history.
