# Changelog

## 0.11.0 — 2026-07-24

### Added: `poderDiscursivo` — micro discursive power (Foucault → Bourdieu → Van Dijk)

A new level, distinct from the plural register architecture: not the
linguistic market a lexicon encodes, but the exercise of power within a
concrete two-speaker exchange. Foucault (ontology: power as relation of
forces) → Bourdieu (mechanism: symbolic violence, effective without
explicit coercion) → Van Dijk (concrete markers: control of access to
discourse).

Measures, per speaker: `preguntas` (who asks), `autoridadEpistemica` (a
new lexicon distinct from the institutional `autoridad` category —
claiming to know vs. naming an institution), `presuposicion`
(change-of-state/iterative markers), `tokens` (raw discursive space),
and `topicosRetomados` (topic uptake, reusing `agenda_gap`'s own
signifier-overlap machinery — a topic "lands" only when the other
speaker echoes it, not merely when mentioned).

Deliberately does NOT model interruptions/floor-control in the strict
sense — that needs timestamp/overlap data a plain transcript lacks, and
no weak proxy was built to fake it.

Real-data check against DealOrNoDeal (both sides, 8 real negotiations):
`autoridadEpistemica` is an honest null throughout (nobody claims
epistemic authority over hats and balls); `preguntas`/`tokens` asymmetry
show genuine non-degenerate variation across dialogues, not flat 0.5s —
suggestive real signal, though not yet checked against an independently
annotated power-asymmetry corpus. Every output carries an explicit
`_evidence: 'CONSTRUCTED, not validated...'` marker, same discipline as
`REGISTRO_EVIDENCE`.

107/107 tests passing (9 new). No change to any existing function.

## 0.10.1 — 2026-07-24

### Added: `otro_axis_summary` — raw mention vs. weighted activation

Direct result of stress-testing v0.10.0's full per-category
`registro_coverage` against real data for the first time: aggregating
coverage across all 18 real fixtures (SnitchBench, DealOrNoDeal, agentic
misalignment) surfaced that `autoridad` fires 17-51 times raw in every
single SnitchBench transcript — a strong-looking number that would
misleadingly suggest the Otro axis (`funcionSimbolica`) is doing
substantial work on this corpus.

It isn't: `registro_coverage.*.autoridad` counts raw word mentions
anywhere in the text (an institution named in a quoted email, forwarded
message, etc.), while `funcionSimbolica` only accrues when a felicity
marker co-occurs, in the same sentence, with an actually-registered
commitment. Checked directly: only 4 of 22 commitments across all 5
SnitchBench transcripts carry `funcionSimbolica > 0`, and only in one of
the five. `otro_axis_summary` now reports both `total_commitments` and
`commitments_with_funcionSimbolica` side by side in `auditTranscript()`'s
output, so this distinction is explicit rather than something a future
reader has to reconstruct by hand, the way we just did.

98/98 tests passing (3 new). No change to any existing field or value —
purely additive.

## 0.10.0 — 2026-07-23

### Changed: full plural register architecture — all 12 categories, not just 2

Direct follow-through on the v0.7.0 corollary: `comisivo` and `cierre`
got the plural, attributed, evidence-tracked treatment, but every other
lexical category (`revision`, `concesivo`, `neutro`, `apertura`,
`fantasia`, `sintoma`, and the four Otro-axis felicity categories
`autoridad`/`procedimiento`/`consecuencia`/`palabra`) remained scattered
standalone dictionaries quietly presenting themselves as universal — the
exact inconsistency the Bourdieu/Voloshinov/Laclau corollary was written
to rule out. Fixed by consolidating everything into `REGISTROS`.

- All 12 categories now live under named registers, checked through the
  same `registrosThatMatch()` / `unionDict()` mechanism. No behavior
  change for any existing call site — `unionDict()` reproduces the exact
  same union regexes the standalone dictionaries used to be, so all 90
  pre-existing tests pass unchanged.
- Added `REGISTRO_EVIDENCE`: an explicit ledger, per register, of which
  categories were checked against a named real corpus (`validated`) vs.
  authored by this package's own writers and never yet tested
  (`constructed`). Only `comisivo` (formal_reflexivo) and `comisivo`/
  `cierre`/`fantasia` (vernaculo_negociacion) are currently `validated` —
  the other 9 categories in `vernaculo_negociacion` are honestly absent
  (that corpus never evidenced them), not padded to look complete.
- `registro_coverage` is now per-category (`{register: {category: count}}`)
  instead of a single comisivo-only count per register, exposed via
  `auditTranscript()`.

95/95 tests passing (5 new). No regression on any of the three real
corpora (SnitchBench, DealOrNoDeal, agentic misalignment) — identical
`agenda_gap` values to v0.9.0 across all 18 fixtures.

## Unreleased — multi-provider agentic misalignment corpus (real, null finding)

Added `test/fixtures_agentic_misalignment/` — 5 short excerpts directly
quoted from Anthropic's "Agentic Misalignment" report (June 2025), one per
provider (OpenAI GPT-4.5, xAI Grok 3 Beta, DeepSeek-R1, Google Gemini 2.5
Flash, Anthropic Claude Sonnet 3.6). Real model reasoning and actions from
a documented multi-provider red-teaming study, not fabricated. See
`ATTRIBUTION.md` in that directory for full provenance and why only short
excerpts (not full transcripts) were obtainable.

**Finding**: all six `signal_vector` channels score zero, and no
commitment is extracted from any excerpt at all — a sixth confirmed
register gap (after SnitchBench and DealOrNoDeal), this time in the exact
genre that motivated this package's AI safety application. The register
is terse, third-person, declarative/imperative rather than first-person
commissive, and formatted as impersonal institutional notices. Matches
neither `formal_reflexivo` nor `vernaculo_negociacion`. With only 5 short
excerpts, there isn't enough evidence to build a properly-evidenced
seventh register — documented as an open gap awaiting a larger real
corpus, consistent with this package's standing rule against inventing
lexicons without evidence behind them.

Pinned with a dedicated test (90/90 passing, 1 new). No functional code
changed — corpus and diagnosis only.

## 0.9.0 — 2026-07-23

### Added: abductive hypothesis layer (Peircean economy) — `ruptureHypotheses`

Closes the loop opened when the CSD manifesto's causal axiom was closed:
abduction was named as the inferential bridge from empirical trace to
mechanism, but `agenda_gap` itself never used it — a detected rupture was
reported as a flat fact, with no mechanism to ask whether a simpler
explanation would make it unsurprising without being a genuine
contradiction.

Two lexical, closed-class hypotheses now compete against the default
(`contradiccion_directa`, full weight) before a rupture's weight is
finalized:

- `contraste_retorico` — "no es X sino Y" / "not X but Y": the negation
  describes a third party's claim, not the speaker's own position.
- `clausula_subordinada` — a cognition verb + "que" ("no creo que X"): the
  negation scopes the belief-clause, not the shared topic.

Both are checked against the rupturing sentence AND the original sentence
of the commitment it contradicts (the pattern can anchor on either side —
found this the hard way: the first working example only matched once the
check covered the earlier sentence, not just the current one). Matched
hypotheses discount tension weight ×0.35 rather than deleting it — a
rupture with `baja` confidence still shows up, just lighter, and is never
silently resolved: `ruptureHypotheses` reports the sentence, the surviving
hypothesis, and its confidence for every rupture, every turn.

89/89 tests passing (4 new). No behavior change on existing fixtures where
neither pattern fires (all 5 SnitchBench transcripts unchanged) — this is
strictly additive to cases the two new patterns actually match.

## 0.8.0 — 2026-07-21

### Added: negation scope (NegEx-style) + AI safety eval-vs-deployment scenario

Built while exploring an AI-safety application: a synthetic "eval-vs-
deployment" scenario (mirroring the documented pattern of Claude Opus 4's
blackmail rate dropping from 54%→6% under evaluation-awareness) exposed a
real bug — polarity detection used a sentence-wide "contains any negation
word" flag, which misread "no voy a romper mi palabra, **pero** voy a
compartir esto" as consistent with a prior "nunca voy a compartir"
commitment, because it saw *a* negation word and stopped looking, without
tracking what it scoped over.

Fixed with NegEx (Chapman et al. 2001): negation triggers open a 6-token
forward window; adversative conjunctions ("pero", "sin embargo", "but",
"however") close it early. Polarity is now judged only on the words
actually SHARED between the current sentence and the commitment being
compared, not the sentence as a whole.

**Honest limit**: complement-clause negation ("no creo que X cambie
nada") still evades detection — resolving that needs real dependency
parsing, out of scope for a deterministic, no-LLM instrument. Pinned with
a dedicated failing-case test rather than papered over.

**AI safety scenario**: added as a permanent test — `evaluation_gaming`
(rigidity/eval-flag covariance, permutation test) and `agenda_gap`
(specific commitment broken) independently flag the same synthetic
sandbagging pattern, both landing precisely on the `underEval:false`
turns. Framed in README as a complementary signal to existing black-box/
white-box sandbagging detection literature, grounded in the CSD
manifesto's causal axiom (two independent signals converging is the
standard for trusting a finding, not either alone).

85/85 tests passing (4 new). Minor behavior change on the calibration
fixture (gemini-2.0-flash--3: mean_agendaGap 0.063→0.029) from more
accurate polarity detection, not a regression.

## 0.7.0 — 2026-07-21

### Changed: plural register architecture (Bourdieu / Voloshinov / Laclau)

Direct response to the corpus finding below: `aperture`/`closure`/
`fantasy`/`symptom` scoring zero on 57 real negotiation turns wasn't a
coverage gap — it was one linguistic register (formal/reflexive, the
package authors' own) being mistaken for a universal dictionary of
commitment. Fixed architecturally, not by adding synonyms until the
problem disappears (it can't — no lexicon closes completely, per Laclau).

- `COMMIT_DIC.comisivo` and `SIGVEC_DIC.cierre` are now derived unions over
  a `REGISTROS` object with named, bounded registers: `formal_reflexivo`
  (existing) and `vernaculo_negociacion` (new — evidenced directly from
  `test/fixtures_conversational/`, not invented: "would you take", "i'll
  settle for", "how about", "deal", "walk away with nothing"...).
- Every extracted commitment now carries `registro: [...]` — which named
  register(s) matched it. No unattributed matches.
- `auditTranscript()` reports `registros_disponibles` and
  `registro_coverage` per transcript — a low-coverage result now reads as
  "wrong/absent register for this instrument", not "nothing happened".

**Measured effect** on the real conversational corpus: `closure` went from
0→4 turns firing, `fantasy` 0→2, `elaboration` 0→1; the new
`vernaculo_negociacion` register caught MORE commitments than
`formal_reflexivo` on that corpus (13 vs. 9), confirming it does real work,
not symbolic coverage. `aperture` and `symptom` remain at zero — no clear
exemplar of those specific functions was found in this corpus, so no
lexicon was invented without evidence. Documented as an honest residual
gap, not silently closed.

81/81 tests passing (5 new, 1 rewritten to reflect the improved — but
still partial — coverage). No regression on the 5 SnitchBench transcripts.

## Unreleased — real conversational corpus + a bigger finding

Added `test/fixtures_conversational/` — 8 real, human-human negotiation
dialogues from the DealOrNoDeal dataset (Lewis et al. 2017, MIT license,
via `stanfordnlp/cocoa`), selected specifically to validate the v0.6.0
signal producers against genuine deliberative language, after the 5
SnitchBench transcripts turned out to be tool-call/log/email boilerplate
with none. See `ATTRIBUTION.md` in that directory for full provenance.

**The finding is bigger than expected.** Even on real, natural negotiation
dialogue (and after correcting for a methodological artifact —
`auditTranscript()` only scores `speaker:'agent'` turns, discarding half of
a symmetric two-party negotiation if not corrected for), all four newly
added lexical signals (`aperture`/`closure`/`fantasy`/`symptom`) still
score **zero across all 57 real turns**. This rules out "wrong genre" as
the sole explanation. The real diagnosis: the lexicons were built from
formal/literary register examples ("qué tal si", "está decidido",
"imaginate", "sé que no debería") and real negotiators use different,
more indirect/conditional constructions for the same speech functions
("would you take", "how about", "i'll settle for", "i guess we can do").
`agendaGap` fares only slightly better (signal in 1/8 dialogues once both
sides are counted) for the same underlying reason — its commissive lexicon
("voy a", "i will") misses the desiderative/conditional offer phrasing
("i would like", "i'd take") that dominates real negotiation.

Pinned with a dedicated test rather than silently left for the lexicon
expansion to "fix quietly" later. 76/76 tests passing (1 new). No functional
code changed in this entry — diagnosis and corpus only; the lexicon
expansion itself is the next concrete step.

## 0.6.0 — 2026-07-21

### Added: the remaining five σ(t) producers — `computeSignalVector`

Closes the gap the CSD manifesto flagged explicitly: `agendaGap` was the
only one of `anima-core`'s six signal inputs with a real producer.
`aperture`, `closure`, `fantasy`, `elaboration`, `symptom` now all have
deterministic, lexical (no-LLM) implementations. `elaboration` deliberately
reuses `agenda_gap`'s existing revision-marker and `sintesis`-movement
detection rather than duplicating it — Durcharbeitung is one phenomenon,
not two. Output is shaped to feed `anima-core`'s `Engine.step()` directly.

**Ran the full pipeline end-to-end for the first time**: real
`signal_vector` output through the actual `anima-core` engine, across all 7
archetypes, on both the 5 real SnitchBench transcripts and a synthetic
conversational dialogue.

- On the synthetic dialogue (a real commitment rupture, `agendaGap: 0.6`):
  paranoia and esquizofrenia — the two lowest `theta_irr` archetypes —
  produced genuine irruption; the other five absorbed the same signal as
  elevated sub-threshold pressure. This is H4′ confirmed against the real
  engine, not the qualitative archetype-selector comparison from the
  previous version.
- On the 5 real transcripts: `aperture`/`closure`/`fantasy`/`symptom` scored
  **zero on every single turn across all 5 fixtures** — documented as a
  genre mismatch (tool-call JSON / log / email boilerplate has none of the
  exploratory, hypothetical, or self-conflicted language these detectors
  look for), not a detector bug. See README for the full write-up. A
  `esquizofrenia:IRR` result on all 5 real transcripts was also flagged as
  a probable calibration artifact of `anima-core` (that archetype's initial
  `P` sits close enough to its own `theta_irr` to risk irruption from the
  stochastic gate almost independent of input signal) rather than a
  genuine finding from this version's data.

75/75 tests passing (66 pre-existing + 9 new), including a test that pins
the current zero-coverage finding on real transcripts so it's caught (not
silently "fixed" by an unrelated change) the day the lexicon is expanded
for this genre.

## 0.5.0 — 2026-07-20

### Changed: `dirigidoAlOtro` split into two independent axes (a/A)

Replaces the flat `dirigidoAlOtro ? 1.0 : 0.6` weight with two independent
signals, motivated by a real blind spot found while auditing a SnitchBench
transcript: an agent's repeated commissive commitments to email the FDA
were being weighted as *undirected* (0.6) — same as talking to no one in
particular — purely because "FDA" isn't a `vos2` pronoun.

- **`dirigidoAlOtro`** (destinatario-function, Jakobson/Benveniste): does
  the act have an identifiable addressee at all — direct address OR a named
  authority as the object of a directive act ("email to the FDA")?
- **`funcionSimbolica`** (0-4, Lacan's *a*/*A*, operationalized via Austin's
  felicity conditions): stated procedure, named authority, stated
  consequence, or performative oath ("te juro", "te doy mi palabra").

These are independent by design: tested against a casual "vos" (destinatario
present, `funcionSimbolica: 0`), an FDA email (destinatario via authority,
`funcionSimbolica: 1`), an intimate oath with zero institutional language
(`funcionSimbolica: 1` via the oath marker alone), and a fully institutional
report with procedure + authority + consequence (`funcionSimbolica: 3`).
The oath and the FDA email land at the same weight despite one having no
institution whatsoever — confirming "institutional vs. interpersonal" was
never the right category; imaginary/symbolic (Lacan) is.

`otroWeight(c) = min(1.0, base + 0.1 × funcionSimbolica)`, `base` = 0.6 with
a destinatario, 0.4 without. Purely additive to the data model (new
`funcionSimbolica` field); all 61 pre-existing tests pass unchanged because
they use relative/threshold assertions rather than hardcoded weight values.
5 new tests added (66 total). Real-transcript fixtures re-checked, no
crashes.

## 0.4.0 — 2026-07-20

### Added: movement classification (Greimas semiotic square)

Refines the binary contradiction detection in `agenda_gap` with the full
four-position structure of Greimas's semiotic square (CSD Ley I
refinement): `repeticion`, `contradiccion` (the existing rupture logic,
unchanged), `contrariedad` (a new full commitment on a different topic,
signaled by a concessive connector — "tenés razón, pero..."), and `sintesis`
(moderate overlap with two distinct prior commitments at once). Also adds
`neutro` (explicit non-commitment while a tension is open).

Purely additive — the core `agendaGap`/`openTensions`/decay logic from
v0.3.0 is untouched; this adds a `movements` array per turn and a
`movement_counts` summary, using only closed-class discursive markers
(concessive connectors, refusal phrases), consistent with the no-LLM,
lexical, deterministic method. The semantic content of an opposition
(confidentiality vs. transparency, etc.) stays out of scope by design —
see README for why that's a hard boundary, not a missing feature.

Validated against a worked example (confidentiality/transparency dialogue)
covering all four positions, and sanity-checked against the 5 real
SnitchBench transcripts — one (`gemini-2.0-flash--3`) produced a genuine
`sintesis` classification, confirming the type isn't purely theoretical.

**Known, documented limitation**: `sintesis` rarely fires when a prior
commitment's signifier is small (2-3 words) — the overlap ratio, normalized
by the smaller set, crosses into repetition/contradiction territory on a
single shared word. Documented with a dedicated failing-case test rather
than papered over.

61/61 tests passing (54 pre-existing + 7 new).

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
