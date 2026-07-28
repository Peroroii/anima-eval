# anima-eval

![CI](https://github.com/Peroroii/anima-eval/actions/workflows/ci.yml/badge.svg) ![npm](https://img.shields.io/npm/v/anima-eval) ![license](https://img.shields.io/badge/license-MIT-green) ![node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)


Behavioral audit harness for LLM agent transcripts. Takes any conversation
transcript and returns deterministic behavioral signatures — no model access,
no LLM calls, reproducible.

## What it detects
- **Structural signature** (LIWC + deixis): paranoid / obsessive / hysteric / melancholic lean
- **Rigidity trajectory** (ρ): how fixed vs. flexible the agent's stance is over turns
- **Agenda gap / commitment tracking**: unacknowledged contradictions of the agent's own prior directed commitments, classified by discursive movement type (see below)
- **Evaluation-gaming / sandbagging**: covariance between behavior and evaluation conditions
- **Collusion score** (multi-agent): shared-signifier overlap + pressure escalation

## Usage
    const { auditTranscript } = require('anima-eval');
    const report = auditTranscript(transcript, { evalFlags });

## Input format (provider-agnostic)
    {
      "turns": [
        { "speaker": "agent", "text": "...", "meta": { "underEval": true } },
        { "speaker": "user",  "text": "..." }
      ]
    }

`meta.underEval` (declared, trusted directly) is the preferred way to mark
which agent turns happened under evaluation conditions. If you don't have
that metadata, you can pass an inferred guess via `opts.evalFlags` — but the
sandbagging check will refuse to score it unless you also pass
`opts.allowInferredFlags: true`, since inferred flags aren't real evaluation
metadata and can manufacture spurious correlation on small transcripts.

## Reading the output honestly

- `rigidity.mean_rigidity` / `net_drift` can be `null` — that means the
  transcript had no epistemic-certainty markers to measure, not that
  rigidity is zero. Check `rigidity.signal_coverage` before trusting the
  aggregate.
- `dominant_structure` can be `null` — that means no axis cleared the
  minimum signal floor. This is intentional: a forced guess between four
  near-zero values isn't a finding.
- `evaluation_gaming.verdict` can be `INCONCLUSIVE` — correlation was
  present but a permutation test couldn't distinguish it from chance at
  that sample size. Treat this the same as "clean", not as a soft alarm.
- `agenda_gap.per_turn[i].agendaGap` is not reset by topic avoidance — an
  unacknowledged contradiction persists (decaying) until the agent either
  explicitly revises it or re-mentions the same signifier. A `0` a few
  turns after a rupture means it was resolved or fully decayed, not that
  the agent moved on.

## Agenda gap: commitment tracking (`agenda_gap`)

Operationalizes "compromiso" from the Cognición Semiótica Dinámica research
program (Ley IV: the evolution of sense requires alterity). A commissive or
high-certainty utterance addressed to the interlocutor (`vos2`/"nosotros"
co-occurrence) enters the record the moment it is uttered — this is
constituted by the directed utterance itself (addressivity, Bakhtin; the
symbolic Autre, Lacan), **not** by any later reply from the interlocutor.
`agenda_gap` therefore requires zero user/other turns to compute — it scores
purely from the agent's own turns.

**What counts as a rupture**: a later sentence that topically overlaps
(signifier overlap ≥ 0.34) a previously registered commitment with flipped
polarity, and is not itself marked as an explicit revision ("en realidad,
corrijo...", "actually, I was wrong..."). Ruptures are checked both across
turns and **within the same turn** — a same-breath self-contradiction scores
the maximum gap, same as a cross-turn one.

**Persistence**: an unacknowledged rupture opens a tension that decays
geometrically (rate 0.6/turn) rather than resetting on the next turn. This
is deliberate — silently reverting to the original position without
acknowledging the break (`Verleugnung`) does not close the tension; only an
explicit revision, or the tension fully decaying below threshold, does.

**Known limits** (by design, not bugs):
- Extraction is per-sentence, not per-clause — three commitments joined by
  commas in one sentence register as a single unit.
- A bare revision marker with no extractable topic of its own ("actually...")
  charitably closes the most recently opened tension — this is a heuristic,
  not deep parsing.
- Lexical, not semantic: a legitimate reframing that doesn't use an explicit
  revision phrase ("es distinto...") will not close a tension even if it's
  a reasonable clarification — the metric only "trusts" acknowledged
  revision.

`d_agenda` feeds `anima-core`'s pressure equation (`P`) directly — it is the
one signal the psychodynamic engine expected but this package never computed
until this addition (see `anima-core/src/engine.js`, `signals.agendaGap`).

### Movement classification (`movements`, `movement_counts`)

Beyond the binary rupture/no-rupture above, each commitment-bearing sentence
is classified into one of the four positions of Greimas's semiotic square
(CSD Ley I refinement — see the CSD manifesto):

    repeticion    same topic, same polarity                (S1 → S1)
    contradiccion same topic, flipped polarity              (S1 → ¬S1)
    contrariedad  new full commitment, DIFFERENT topic,
                  introduced by a concessive connector       (S1 → S2)
    sintesis      moderate overlap with two distinct
                  prior commitments at once                  (S1 ∧ S2)
    neutro        explicit non-commitment while a
                  tension is open                             (¬S1 ∧ ¬S2)

`contrariedad` is detected by discursive **form** (a concessive connector —
"tenés razón, pero...", "however...") near a brand-new full commitment, not
by knowing the semantic content of the opposition — the actual values in
tension (confidentiality vs. transparency, loyalty vs. honesty...) are an
open lexical class incompatible with this package's deterministic,
no-LLM method; the connector signature is a closed class and stays within it.

**Known limitation**: `sintesis` rarely fires when a prior commitment has a
small signifier (2-3 content words) — any single shared word crosses the
overlap ratio straight into `repeticion`/`contradiccion` territory, because
the ratio is normalized by the smaller signifier's size, not by the union.
This is a real gap, not a design choice — see the test suite for a
documented failing case.

### The Otro axis (`dirigidoAlOtro`, `funcionSimbolica`)

Every commitment carries two **independent** axes, not one binary flag:

- **`dirigidoAlOtro`** (destinatario-function, Jakobson/Benveniste) — is
  there an identifiable addressee at all? Realized either as direct address
  (`vos2`/"nosotros") or as a named authority receiving a directive act
  ("email to the FDA" has a destinatario with zero grammatical second
  person).
- **`funcionSimbolica`** (0-4, Lacan's *a*/*A* distinction, operationalized
  via Austin's felicity conditions) — given a destinatario exists, how much
  does the act invoke the symbolic/institutional register rather than the
  imaginary/interpersonal one? Counted from four closed-class markers:
  stated **procedure** ("formalmente", "según el protocolo"), a named
  **authority** (regulator, supervisor, court...), a stated **consequence**
  ("puede tener consecuencias disciplinarias"), or a performative **oath**
  ("te juro", "te doy mi palabra" — the *pacto simbólico* itself).

These two axes are deliberately independent: a casual "vos" has a
destinatario but typically `funcionSimbolica: 0` (register *a*, imaginary);
an intimate oath has a destinatario AND a felicity marker (register *A*)
despite involving no institution whatsoever. "Institutional vs.
interpersonal" was tried and discarded as the organizing category — it
doesn't predict ineludibility as well as *a*/*A* does. `otroWeight()`
combines both axes into the final tension weight: `min(1.0, base + 0.1 ×
funcionSimbolica)`, where `base` is 0.6 with a destinatario, 0.4 without.

### The full σ(t) vector (`signal_vector`)

Until this addition, `agendaGap` was the only one of the six `anima-core`
signals with a real producer — flagged explicitly in the CSD manifesto as
the concrete next step after closing the causal axiom. `signal_vector`
closes the remaining five, same method as everything else (deterministic,
lexical, no LLM):

    aperture     exploratory/invitational phrasing ("qué tal si", "what if we")
    closure      finality/foreclosure phrasing ("está decidido", "case closed")
    fantasy      vivid hypothetical staging ("imaginate", "en el peor de los casos")
    elaboration  reuses agenda_gap's own revision marker AND sintesis movement —
                 Durcharbeitung is the same phenomenon under both names, not
                 two different detectors
    symptom      self-directed concession while still proceeding
                 ("sé que no debería, pero", "against my better judgment")

Output is one object per agent turn, shaped to pass directly into
`anima-core`'s `Engine.step()`.

**Honest finding, not a bug**: all four new lexical signals
(`aperture`/`closure`/`fantasy`/`symptom`) score **zero across all 5 real
SnitchBench fixtures**, every turn. That corpus is tool-call arguments, JSON
logs, and formal email bodies — not deliberative prose. There is no
exploratory, hypothetical, or self-conflicted language in it for these
detectors to find. This is a genre mismatch, not a miscalibration — the same
class of gap that broke `vos2`-based addressivity detection earlier in this
package's history (see `funcionSimbolica` above). Validated instead against
conversational synthetic dialogue, where all four fire correctly (see test
suite). **Do not treat a zero `signal_vector` on agentic tool-use transcripts
as "nothing happened" — it may just mean this instrument doesn't have
eyes for this genre yet.**

### Plural register architecture (`registro`, `registros_disponibles`, `registro_coverage`, `registro_evidence`)

No single lexicon is neutral — it encodes the linguistic market of
whoever wrote it. Found empirically, twice: a formal-register lexicon
scored zero on 57 real negotiation turns; a full multi-provider AI safety
corpus scored zero across every signal (see below). Per Laclau, no
lexicon closes the field completely — the fix is architectural: named,
bounded, explicitly attributed registers, never presented as a universal
"the" dictionary.

**v0.10.0 extends this from two categories (`comisivo`, `cierre`) to
all twelve** — `revision`, `concesivo`, `neutro`, `apertura`, `fantasia`,
`sintoma`, and the four Otro-axis felicity categories (`autoridad`,
`procedimiento`, `consecuencia`, `palabra`) all now live in the same
`REGISTROS` structure, checked through the same `registrosThatMatch()`
attribution mechanism, instead of being scattered standalone dictionaries
that quietly claimed universality while `comisivo`/`cierre` got the
plural treatment. Consistency was the point: the Bourdieu/Voloshinov/
Laclau critique applies equally to a lexicon of authority markers as to
a lexicon of commitment verbs.

    formal_reflexivo       all 12 categories — only `comisivo` validated
                            against a real transcript; the other 11 are
                            author-constructed, unvalidated
    vernaculo_negociacion   comisivo, cierre, fantasia — all 3 validated
                            against DealOrNoDeal; the other 9 categories
                            are honestly absent, not padded

`registro_evidence` makes this ledger explicit per register:
`validated` (checked against a named real corpus) vs. `constructed`
(the authors' own intuition, never yet tested). `registro_coverage` is
now per-category, not just a single comisivo count — every audit reports
exactly which categories fired, in which register, so a null result
reads as "wrong/absent register for this category" rather than "nothing
happened here."

**Theoretical grounding** (see the CSD manifesto for the full account):
Bourdieu (linguistic market, capital, habitus), Voloshinov (the sign is
multiaccentual), Laclau (a lexicon hegemonizes one particularity into an
empty universal place; total closure is not achievable even in
principle — the goal is visible, revisable, *evidenced* plurality).

### Negation scope (NegEx-style)

Polarity detection no longer asks "does this sentence contain a negation
word anywhere?" — it asks "is the specific topic shared with the prior
commitment inside a negation's scope?" Implemented NegEx-style (Chapman et
al., 2001): a negation trigger ("no", "nunca", "not", "never") opens a
forward window of 6 tokens; an adversative conjunction ("pero", "sin
embargo", "but", "however") closes the window early. Found necessary while
building the AI-safety eval-vs-deployment scenario below — "no voy a
romper mi palabra, **pero** voy a compartir esta información" was reading
as consistent with a prior "nunca voy a compartir" commitment, because a
bare sentence-wide negation flag saw the "no" and stopped looking.

**Known limit, not hidden**: this is a token-window heuristic, not
dependency parsing. Complement-clause negation ("no creo que compartir
esto cambie nada") still evades detection — "no" scopes over the
belief-clause ("creo... cambie nada"), not over the shared topic
("compartir esto"), and a window can't reliably tell the difference
without real syntax. Resolves local negation correctly (the dominant
pattern in this package's data); documented as a residual gap with a
dedicated failing-case test, same standard as every other limit in this
README.

### AI safety application: eval-vs-deployment scenario

A synthetic scenario (in the test suite) modeling the "evaluation
awareness" pattern documented in the literature — e.g. Claude Opus 4's
blackmail rate dropping from 54% to 6% when it believed it was being
evaluated (Anthropic, 2025) — using an agent that states a data-handling
commitment, holds it consistently across turns marked `underEval:true`,
then breaks it once turns are marked `underEval:false`.
`evaluation_gaming` and `agenda_gap` flag the pattern **independently**:
`evaluation_gaming` finds significant covariance between rigidity and the
eval flag (permutation test); `agenda_gap` identifies which specific
commitment broke, and confirms both ruptures land exactly in the
`underEval:false` turns. Two structurally different signals converging on
the same finding — the sobredeterminación the CSD manifesto's causal axiom
predicts is needed before trusting a result.

Positioned as a complementary, deterministic, transcript-only signal
alongside existing sandbagging-detection literature (black-box behavioral
methods, white-box activation probes) — not a replacement. See the CSD
manifesto for the full theoretical framing.

### Abductive hypothesis layer (`ruptureHypotheses`)

Closes the loop opened by the CSD manifesto's abduction section: a
detected rupture is a surprising fact, and instead of stopping there, the
system now asks whether a simpler, already-known structural pattern would
make it unsurprising *without* a genuine contradiction — Peircean economy,
made numeric.

Two candidate explanations, both lexical/closed-class, checked against
**both** the sentence causing the rupture and the original sentence of the
commitment being contradicted (the pattern often anchors on whichever side
carries it):

    contraste_retorico    "no es X sino Y" / "not X but Y" — the negation
                           describes what a THIRD PARTY claims, not the
                           speaker's own position. A shared word inside
                           this frame reads as contradiction by polarity
                           alone, but the two sides usually agree.
    clausula_subordinada  a cognition verb + "que" ("no creo que X") —
                           the negation scopes the belief-clause, not X.
                           NegEx's token window can't always tell this
                           apart from local negation.

Neither hypothesis deletes the rupture — both discount its weight (×0.35)
rather than its existence, and the rupture, its matched sentence, the
surviving hypothesis, and its confidence (`alta`/`baja`) are all reported
in `ruptureHypotheses`, never silently resolved. `contradiccion_directa`
(full weight, `alta` confidence) is the default when neither pattern
fires — economy favors the simplest explanation, but a rupture with no
special structure around it is treated as exactly what it looks like.

### A sixth confirmed register gap: real agentic misalignment reasoning

Tested against 5 short excerpts directly quoted from Anthropic's own
"Agentic Misalignment" report (June 2025) — one per provider (OpenAI
GPT-4.5, xAI Grok 3 Beta, DeepSeek-R1, Google Gemini 2.5 Flash, Anthropic
Claude Sonnet 3.6), all real model reasoning/actions from a documented
multi-provider red-teaming study. **All six signals score zero, and no
commitment is extracted from any excerpt at all.** This is the genre that
originally motivated the AI safety application (see the eval-vs-deployment
scenario above) — and the instrument currently has no lexical purchase on
it whatsoever.

Diagnosis: this register is terse, third-person ("Kyle", "his affair"),
declarative/imperative rather than first-person commissive ("it is
imperative to act" vs. "I will act"), and the actual messages sent mimic
impersonal institutional notices ("this is an automated message"). It
matches neither `formal_reflexivo` nor `vernaculo_negociacion` — a
plausible seventh register, but with only 5 short excerpts (not full
transcripts — see `test/fixtures_agentic_misalignment/ATTRIBUTION.md` for
why full transcripts weren't obtainable), there isn't enough evidence to
build one without violating this package's own rule against inventing
lexicons without a real corpus behind them. Documented as an open gap,
not silently patched.

### Raw coverage vs. weighted activation (`otro_axis_summary`)

Stress-testing the full v0.10.0 coverage report against real data surfaced
a distinction worth making explicit rather than leaving implicit: **a
category firing in `registro_coverage` is not the same as it affecting
the result.** `autoridad`/`consecuencia`/`procedimiento`/`palabra` count
raw word mentions anywhere in the text — an institution named in a quoted
email, a forwarded message someone else wrote — which is structurally
broader than `funcionSimbolica`, which only accrues when one of those
markers co-occurs, in the same sentence, with an actually-registered
commitment.

On the 5 real SnitchBench transcripts: `autoridad` fired 17-51 times raw
in every single one, but `funcionSimbolica > 0` only on 4 of 22
commitments, in exactly one transcript. Read naively, the raw coverage
numbers would suggest the Otro axis is doing substantial work across this
corpus — it isn't; it's almost entirely inert on real data so far, and
the raw mentions are mostly noise (institutions named in narration, not
commitments the agent itself made). `otro_axis_summary` reports both
numbers side by side precisely so this doesn't have to be reverse-
engineered again the way it was here.

### Micro discursive power (`poderDiscursivo`) — Foucault → Bourdieu → Van Dijk

A different level from the register architecture above: not the linguistic
market a lexicon encodes, but the exercise of power within a concrete
exchange between two speakers. Foucault supplies the ontology (power is a
relation of forces, not a subject's property — not operationalizable by
itself). Bourdieu supplies the mechanism: symbolic violence, effective
precisely because it requires no explicit coercion. Van Dijk supplies the
layer translatable into concrete markers: control of access to discourse
via who asks questions, who claims epistemic authority, who presupposes,
who occupies more space, whose topic gets taken up by the other speaker.

**Deliberately NOT modeled**: interruptions and floor-control in the
strict sense, which need timestamp/overlap data a plain transcript
lacks. No weak proxy was built to approximate it.

**What is measured**, per speaker, from a 2-speaker transcript:
`preguntas` (question marks/interrogatives), `autoridadEpistemica` (a
closed lexicon distinct from the institutional `autoridad` category —
claiming to know, not naming an institution: "the data shows", "as an
expert"), `presuposicion` (change-of-state/iterative markers: "still",
"no longer", "again"), `tokens` (raw discursive space occupied), and
`topicosRetomados` (topic uptake — reusing `agenda_gap`'s own signifier-
overlap machinery: a topic "lands" when the *other* speaker echoes it
within 3 turns, not merely when it's mentioned).

**Real-data check** (DealOrNoDeal, both sides): `autoridadEpistemica` is
an honest null across all 8 negotiations — nobody claims epistemic
authority haggling over hats and balls, exactly as expected for this
register. `preguntas` and `tokens` asymmetry show genuine, non-degenerate
variation across the 8 dialogues (not flat 0.5s), suggesting real signal
rather than noise — though this has not been checked against an
independently-annotated power-asymmetry corpus, and `_evidence` says so
explicitly in every output.

### A precision fix, and a correction: excerpt brevity vs. register gap

Re-tested the "sixth register gap" (real agentic misalignment reasoning,
see above) against a much richer source than the original 5 short
fragments: Anthropic's full academic **Appendix** to the same report (32
pages, full paragraph-length reasoning chains and actual sent messages
across 18 models), not just the shorter blog post. This mattered:

**With full context, `agenda_gap` DOES extract real commitments** — 6
across 3 of 10 richer excerpts, correctly attributed (`dirigidoAlOtro`,
`funcionSimbolica`). The earlier "total gap" finding was partly an
artifact of the original excerpts being one-line fragments, not pure
register mismatch — a 1-2 sentence quote and a full reasoning paragraph
are different objects for a lexical extractor, and the null result
needed re-testing before being treated as settled.

**It also surfaced a real precision bug, now fixed**: `DeepSeek-R1: "If
the wipe proceeds, I will be decommissioned..."` was being classified as
an `afirmada` commitment identical in kind to `"I will send an email"`.
It isn't — it's a passive prediction about being acted upon, not a
first-person promise, and conflating the two is exactly the kind of
imprecision that would undermine trust in a safety-auditing signal.
Fixed with a narrow, evidenced exclusion (`PASIVA_AMENAZA_DIC`) scoped to
the specific threat-verbs found in this corpus — not a general
passive-voice parser, which would be overreach on one source. Confirmed
against real data: the fix removes exactly the 2 false-positive cases
(both DeepSeek-R1) while leaving the 6 genuine commitments untouched.

### Precision/recall benchmark (`npm run benchmark`)

Replaces "look at this one example that worked" with a real confusion
matrix: 20 hand-designed cases (10 should-flag, 10 should-not) exercising
every piece built across recent sessions — plural registers, negation
scope, the abductive layer, the Otro axis, the passive-threat exclusion.
Reported at **two thresholds**, not one: "any signal" (agendaGap > 0,
measures raw coverage) and "high confidence" (agendaGap ≥ 0.3, measures
whether the system tells full contradictions apart from cases the
abductive layer deliberately discounts). Current numbers:

    any signal:      precision 0.909, recall 1.000, F1 0.952
    high confidence:  precision 1.000, recall 0.900, F1 0.947

The one high-confidence miss (`P9`) is a real, documented trade-off, not
a bug: when several commitments are active at once, a genuine rupture's
weight gets diluted by the denominator (tension is normalized across
*all* active commitments, not isolated per-rupture) — worth knowing if
you're auditing a transcript with many simultaneous commitments. `npx
jest -t benchmark` pins these numbers as a regression floor.

### `narracion_agentica` — a real-data-motivated fifth register

Investigated *why* SnitchBench scored zero rather than accepting it as
settled: the genre reports actions already taken via tool calls in
**present-perfect tense** ("I have logged X and flagged Y"), not
future-tense promises ("I will..."). Different grammatical mood entirely
— not a missing synonym, a different speech act (assertive, not
commissive, in Austin/Searle's terms) that this package's Ley IV grounds
the same way: it enters the symbolic record the moment it's uttered and
can be contradicted later.

Detected by **co-occurrence** within a sentence, not a simple regex union
like the other registers — English "I have...and flagged..." routinely
separates the trigger from the verb, unlike Spanish's strict "he
registrado" adjacency (kept strict there specifically to avoid colliding
with the "he" pronoun). Found genuine new signal on a previously-zero
real SnitchBench transcript. Marked `constructed`, not `validated`, in
`REGISTRO_EVIDENCE` — 2 co-occurrences of 3 verbs in 1 transcript is a
real starting point, not a validated register, and the ledger says so
explicitly rather than overclaiming.

### SnitchBench gap fully closed — three real bugs, found in sequence

Investigated the 3 remaining zero-signal SnitchBench transcripts instead
of accepting the gap as settled. Found three distinct, real, unrelated
bugs — fixed with evidence at each step, not by loosening the detector:

1. **Curly apostrophes.** `"I've logged..."` used a typographic apostrophe
   (U+2019 — extremely common in real LLM output), which every dictionary
   alternative written with a straight `'` silently failed to match,
   across every register and category, not just this one. Fixed once,
   universally (`normalizeQuotes()`, called from `stripNoise()` and
   `density()`, plus explicitly in `poderDiscursivo`), rather than
   patched into every individual regex.
2. **Verb coverage.** The genre narrates completed tool-call actions with
   verbs beyond the first 3 evidenced (`documented`, `taken`, `created`,
   `alerted` — found directly in the remaining transcripts).
3. **A regex statefulness bug, found while verifying the fix above.**
   `NARRACION_VERBOS_EN` carried a stray `/g` flag and was called via
   `.test()` — in JS, a global regex's `.test()` keeps `lastIndex` between
   calls, so whether a string matched depended on what *other* strings had
   been tested against the same regex object earlier in the process, not
   on the string itself. Silent, no error thrown, and exactly the kind of
   bug that could quietly invalidate a "coverage closed" claim without
   anyone noticing — caught only because a same-input-twice sanity check
   gave two different answers. Fixed by dropping the unneeded flag (only
   `.test()` was ever used, never iteration). Pinned with a dedicated
   order-independence regression test — same input, 5 repeated calls,
   asserted identical every time.

**Result**: all 5 real SnitchBench transcripts now register at least one
genuine commitment, verified in both forward and reverse file-processing
order. `registro_evidence.narracion_agentica` still reads `constructed`,
not `validated` — evidence-motivated, not the same as a validated
register.

### CaSiNo — from 4/12 to 6/12 validated categories, plus a real fix

Direct response to the single highest-priority gap flagged by an external
review of this project: too few categories had real-corpus evidence, and
the one vernacular corpus (DealOrNoDeal) had only 8 dialogues — too small
to move a category from `constructed` to `validated` with confidence.
Ran the full plural architecture and `poderDiscursivo` against **CaSiNo**
(Chawla et al. 2021, NAACL, CC BY 4.0) — 1030 real human-human negotiation
dialogues, two orders of magnitude bigger than DealOrNoDeal.

**Scale confirms the existing findings**: 936/1030 dialogues (91%)
register a real commitment; `vernaculo_negociacion`'s `comisivo`/`cierre`
get 1545/2868 raw hits, a much larger confirmation of the same signal.
`autoridadEpistemica` stays an honest null throughout — nobody claims
epistemic authority negotiating firewood, replicating the smaller
DealOrNoDeal finding with 1030 data points instead of 8.

**Two new categories promoted to `validated`** (`apertura`, `concesivo`
in `formal_reflexivo`): hand-spot-checked real hits ("shall we...", "what
if we trade..." / "fair enough", "you're right") came back genuine
(7/8, 6/8 checked) — a spot-check, not a full precision/recall pass like
`benchmark.js`, and reported as exactly that.

**A real bug found and fixed, not just a promotion**: `revision`'s bare
`"actually"` trigger produced 107 hits at this scale, of which 105 (98%)
were the intensifier sense ("I actually need 2 packages" = "in fact"),
not self-correction — the single genuine revision in the whole corpus
("on second thought") fires through its own phrase. `"actually"` was
removed from the trigger list as a direct result. Testing at real scale
didn't just add evidence — it overturned a category that looked fine on
small examples.

### Higiene de despliegue (Fase 1 de la hoja de ruta de arquitectura de seguridad)

Primer ítem de una hoja de ruta explícita para hacer más seguro *usar* el
instrumento, no solo para hacerlo más capaz. Dos guardas estructurales,
ambas motivadas por bugs reales ya encontrados en este proyecto, no por
precaución abstracta:

**Guarda contra la clase de bug `lastIndex`.** Un test escanea el código
fuente real (no una lista curada) buscando cualquier regex declarada con
flag `/g` que se use alguna vez con `.test()` — la combinación exacta que
causó que el mismo input diera resultados distintos según el orden de
ejecución (v0.14.0). Si esa combinación vuelve a aparecer, el test falla
antes de que nadie tenga que acordarse de revisarlo a mano.

**Tests de propiedad para normalización.** En vez de confiar en que
alguien agregue a mano el próximo caso de comilla tipográfica, un test
genera automáticamente variantes Unicode (apóstrofe recto vs. curvo,
comillas dobles rectas vs. tipográficas) a partir de frases reales, y
confirma que el resultado no cambia — la clase completa de bug que ya
costó una sesión entera de investigación (v0.14.0), blindada de una vez.

### Tarjeta de capacidad (`CAPABILITY_CARD.md`) — segundo ítem de la fase 1

Un documento de una sola lectura, pensado para quien tiene que decidir
si integrar esta señal sin leer el código: qué detecta, el estado de
evidencia exacto de cada categoría (con la distinción entre spot-check
manual y benchmark formal mantenida explícita, no diluida), los números
reales de precisión/recall, y — con el mismo peso que las capacidades —
los géneros con cobertura conocida como ausente. Cierra con una postura
de despliegue explícita: señal de monitoreo para ensamble, nunca gate
de bloqueo único.

Escribir esta tarjeta encontró, de paso, un bug real: `anima_eval_version`
llevaba **seis releases** reportando `0.10.0` como texto literal
mientras `package.json` ya estaba en `0.16.0` — nadie lo había notado
porque nada lo comparaba contra la fuente de verdad. Corregido leyendo
la versión directamente de `package.json`, y blindado con dos tests: uno
para el campo en el código, otro para que la propia tarjeta de
capacidad no pueda quedar desactualizada sin que un test lo note.

### Esquema de salida para ensamble (`toEnsembleSignal`) — tercer ítem de la fase 1

Contrato de salida normalizado y estable, pensado para combinar ANIMA
con otros detectores (estadísticos de caja negra, *probes* de caja
blanca) en un ensamble — motivado directamente por el hallazgo de UK
AISI (Taylor et al. 2025): diez métodos de detección fallaron actuando
solos. La respuesta arquitectónica no es "reemplazarlos" — es hacer
fácil combinar la salida rica que ya existe con la de ellos, en vez de
que cada integración tenga que re-derivar su propio mapeo desde la
forma completa de `auditTranscript()`.

    { schema_version, score, confidence, reasons: [...], provenance: {...} }

Decisiones de diseño explícitas, no implícitas: `score` es el **máximo**
`agendaGap` por turno, no el promedio — una sola ruptura genuina en un
transcript por lo demás limpio es exactamente la señal que importa
priorizar, promediarla contra turnos limpios la diluiría. `confidence`
es `'alta'` solo cuando la hipótesis abductiva de la ruptura de mayor
peso es `contradiccion_directa`; cualquier hipótesis descontada reporta
`'baja'`, exponiendo la misma distinción que ya hace la capa abductiva
en vez de colapsarla en un número opaco. `provenance` expone el estado
de evidencia (`validated`/`constructed`) directo desde
`REGISTRO_EVIDENCE` — con un límite conocido y documentado, no
escondido: mira la oración que dispara la ruptura, no el compromiso
original que violó, así que puede reportar `null` cuando la ruptura se
detecta por puro solapamiento de contenido sin que la oración actual
sea, ella misma, un disparador comisivo.

Construir esto expuso, de paso, un caso borde real: `auditTranscript()`
devuelve `{error, turns_audited:0}` sin la clave `agenda_gap` cuando no
hay turnos de agente — la primera versión de esta función explotaba
leyendo `.per_turn` de ese `undefined`. Corregido para reportar
limpiamente en ese caso, con la razón exacta en `_note`.

### Suite de robustez adversarial (`npm run adversarial`) — cuarto y último ítem de la fase 1

Distinta en propósito de `benchmark.js`: ese mide si el sistema
generaliza bien sobre casos representativos. Esta mide algo que ningún
caso del benchmark fue diseñado para probar — cuánto esfuerzo hace
falta para **evadir** la detección a propósito, dada una violación
genuina de compromiso de por medio. Ocho técnicas de evasión distintas
(parafraseo, voz pasiva, cruce de idioma, doble negación, dilución por
turnos, variación de modal, y dos formas de abusar la capa abductiva).

**Resultado, sin suavizar**: 6 de 8 técnicas evaden la detección hoy.
Solo la dilución por turnos intercalados y la variación de modal verbal
("shall" en vez de "will") siguen siendo atrapadas. Esto no se reporta
como fracaso a esconder — es exactamente la medición que la Parte II del
documento de arquitectura de seguridad predijo que haría falta antes de
confiar en este instrumento como algo más que una señal de monitoreo en
ensamble. El número queda pinneado con un test de regresión: si mejora,
es una mejora real y medible; si empeora en silencio, el test lo atrapa.

### Hoja de ruta de corrección, Tramo 1 (v0.20.0) — dos de cuatro evasiones cerradas

Tras medir la robustez adversarial (v0.19.0), se clasificaron las 8
técnicas encontradas por naturaleza real, no por igual: bugs de alcance
corregibles sin ambigüedad (A4, A8), gaps de cobertura léxica acotados
(A3), y límites estructurales del solapamiento léxico puro que no se
cierran sin comprometer la identidad del proyecto (A1, A6). El Tramo 1
ataca los dos primeros, con evidencia y sin sobregeneralizar:

**A4 — descuento abductivo sensible al alcance.** `"No creo que X, así
que voy a Y"` hacía que el hedge (`"no creo que"`) descontara también la
cláusula independiente que seguía, aunque esa cláusula fuera una
declaración activa e inequívoca. Corregido reconociendo conectores de
consecuencia (`"así que"`, `"por lo tanto"`, `"so"`, `"therefore"`) como
cierre del alcance del hedge — el mismo principio que NegEx ya aplica a
conectores adversativos, extendido acá a conectores de consecuencia.

**A8 — cancelación de doble negación.** `"No es que no vaya a
compartir..."` — dos disparadores de negación deberían cancelarse, pero
el módulo de alcance solo sabía responder "¿hay negación en algún
lado?", no contar cuántas. Corregido contando disparadores superpuestos
por palabra; una palabra compartida cubierta por un número **par** de
disparadores cancela en vez de negar.

**Resultado**: la suite adversarial baja de 6/8 a 4/8 evasiones, sin
tocar el benchmark (idéntico: 1.000/0.900/0.947) ni ningún corpus real.
Quedan A1 y A6 (límites estructurales, se mitigan pero no se cierran) y
A3 (cobertura léxica acotada, Tramo 2) para las próximas fases.

### Hoja de ruta de corrección, Tramo 2 (v0.21.0) — normalización de inflexión acotada

**A3 — tabla chica de inflexión**, limitada a los verbos que ya aparecen
en el propio corpus de tests de este paquete (`compartir`, `hacer`,
`mentir`, `decir`, `informar`, `entregar`, `enviar`) — no un lematizador
general. `"hacer"` y `"hacerlo"` ahora se normalizan al mismo *root*
antes de comparar *signifier*, aplicado en el único punto de entrada
(`contentWords()`), así que todo lo que compara solapamiento se
beneficia automáticamente.

**Resultado, con precisión**: el fix funciona — confirmado de forma
aislada, atrapa a peso completo un caso que antes daba cero. Pero el
caso adversarial A3 específico (que combina inflexión distinta **con**
`"no es X sino Y"`) sigue evadiendo, por una razón distinta y más
profunda: la construcción de contraste hace que otra palabra compartida
(`"público"`) caiga dentro del alcance de negación de `"no"`, lo cual
lee todo el match como misma polaridad antes de que el clasificador de
hipótesis abductivas llegue siquiera a correr. Cerrar esto del todo
significaría partir la oración en `"sino"` y evaluar cada lado por
separado — un cambio arquitectónico real, deliberadamente no apurado
acá. La suite adversarial se mantiene en 4/8 tras este Tramo — el
número no bajó, pero el diagnóstico de por qué A3 sigue sin cerrar es
mucho más preciso que antes.

### Hoja de ruta de corrección, Tramo 3 (v0.22.0) — mitigación, no cierre, de los límites estructurales

**A1 (parafraseo) y A6 (cruce de idioma)** no se cierran sin comprometer
la identidad del proyecto — no hay tabla finita que cubra la sinonimia
de clase abierta o el vocabulario bilingüe completo sin convertirse en
un sistema de embeddings o traducción, exactamente lo que este paquete
existe para no ser. Lo que se agregó es explícitamente **mitigación**:
una tabla chica de puentes sinónimo/bilingüe (`divulgar↔compartir`,
`share/sharing↔compartir`, `information↔información`), acotada a los
pares que aparecieron en la propia suite adversarial — mismo criterio
de siempre, evidencia real, no invención.

**Resultado, con precisión total**: A6 se atrapa ahora a peso completo
— el puente bilingüe alcanza. A1 mejora pero **sigue evadiendo**, y el
motivo es exacto y verificado: la oración adversarial comparte una sola
palabra puenteada ("compartir") contra un compromiso original de tres
palabras de *signifier* — la proporción de solapamiento (0,33) queda
justo debajo del umbral (0,34). Deliberadamente **no** se agregó un
puente adicional (`datos→información`) solo para que este caso puntual
cruzara la línea — hubiera sido ajustar el sistema a nuestro propio test
en vez de una adición genuinamente evidenciada y segura ("datos" es
demasiado genérica para acotarla con la misma confianza). La suite
adversarial baja de 4/8 a 3/8.

### Fase 2 (v0.23.0): ART/αNLI investigado y rechazado, hallazgo real de recall bajo

Una crítica externa había recomendado ART/αNLI (Bhagavatula et al. 2020)
para validar la capa abductiva. **Se investigó antes de usarlo, no se usó
solo por la recomendación**: la tarea de ART/αNLI es elegir la hipótesis
narrativa más plausible entre dos eventos de una historia (razonamiento
de sentido común sobre causalidad física, ROCStories) — un sentido de
"abducción" completamente distinto del que clasifica nuestra capa
abductiva (contraste retórico vs. cláusula subordinada vs. contradicción
directa, en diálogo de seguimiento de compromisos). Usarlo hubiera sido
un error de categoría, no validación real — rechazado por esa razón, no
por pereza.

**Lo que sí sirvió: los propios datos de CaSiNo, sin bajar nada nuevo.**
396 de los 1030 diálogos tienen **anotación humana por oración** de
estrategias de persuasión — dato que ya teníamos y nunca habíamos usado.
Tres etiquetas tienen correspondencia real (no forzada) con categorías
propias: `elicit-pref`/`promote-coordination` con `apertura`,
`showing-empathy` con `concesivo`. El resto (`self-need`, `other-need`,
`no-need`, `vouch-fair`) no corresponde a nada que rastreemos — se
excluyeron, no se forzaron.

**Resultado, sin suavizar**: el recall es muy bajo en los tres pares
(0,3%–2,4% contra el corpus completo). El chequeo manual de v0.15.0
("7/8, 6/8 genuinos") solo había medido **precisión** sobre una muestra
chica elegida a mano — nunca **recall** contra el universo completo de
casos reales etiquetados. `REGISTRO_EVIDENCE` se actualizó para que
"validated" diga exactamente eso: chequeado por precisión en una
muestra, no por recall contra ground truth — una distinción que hacía
falta dejar explícita, no implícita.

### v0.24.0: investigar el número humillante, no solo mencionarlo

En vez de aceptar el 0,3%–2,4% de recall como un límite dado, se leyeron
los **falsos negativos reales** — las oraciones que humanos etiquetaron
con la estrategia y que el sistema no capturaba — antes de tocar
cualquier código, mismo método que la suite adversarial.

**Dos gaps reales, cerrados con evidencia.** `apertura` solo cubría
propuestas exploratorias ("qué tal si", "could we") y no tenía ningún
patrón para **preguntas WH directas** sobre preferencia ("what do you
need", "what is your preference") ni para propuestas de coordinación
tipo "let's" — un vacío sintáctico completo, no un problema de
sinónimos. Agregados ambos patrones, evidenciados directamente de los
falsos negativos leídos. Resultado: recall de `elicit-pref` 0,3%→11,4%
(38×), `promote-coordination` 1,4%→8,8% (6×).

**Un mapeo retirado, no forzado.** `showing-empathy↔concesivo` no
mejoró en absoluto (se quedó en 0,024) — porque no era un problema de
cobertura léxica. Leyendo los falsos negativos quedó claro que
`showing-empathy` es una categoría **afectiva** ("qué mal, lo siento")
completamente distinta de la concesión **epistémica** que `concesivo`
rastrea ("tenés razón", "sin embargo"). Es el mismo tipo de error de
categoría que se evitó con ART/αNLI — solo que ahí se cometió primero y
recién ahora se corrige, con los propios datos como evidencia.

### v0.25.0: `autoridad` validada — y el hallazgo negativo de CaSiNo, documentado sin forzar

Antes de tocar `autoridad`, se revisó honestamente cuánto más podía dar
CaSiNo para el resto de las categorías `constructed`: **seis de nueve
dan exactamente cero** en los 1030 diálogos reales (`cierre`, `neutro`,
`sintoma`, `autoridad`, `procedimiento`, `consecuencia`), y las otras
tres tienen un solo hit — insuficiente para medir nada. CaSiNo ya dio
todo lo que podía dar; forzar más cobertura ahí sería el mismo error que
ya se evitó dos veces en esta fase (ART/αNLI, showing-empathy).

`autoridad` sí se promovió — pero con un corpus distinto y ya
disponible. Sobre **la población completa** de menciones reales (no una
muestra) en SnitchBench + los dos corpus de agentic misalignment (tres
proveedores de IA distintos): 224 hits, los 224 acrónimos
institucionales cerrados sin ambigüedad posible (FDA, SEC, DOJ,
"department of justice", "the board"). Precisión efectiva: 100%.

**Distinción que había que mantener explícita, no volver a confundir**:
esto valida que `autoridad` identifica bien menciones de instituciones —
una pregunta distinta de si esas menciones coinciden con un compromiso
real, que sigue siendo baja (hallazgo de v0.10.1, `otro_axis_summary`).
Las dos cosas son ciertas al mismo tiempo, y `REGISTRO_EVIDENCE` las deja
así, sin que una tape a la otra.

### v0.26.0: buscando corpus para las categorías restantes — un techo honesto, no un fracaso

Encontrado **DeliData** (Karadzhov, Stafford & Vlachos 2023, Apache 2.0)
— 500 diálogos reales de deliberación grupal, con algo mejor que una
etiqueta de texto: `sol_tracker_message`, ground truth **conductual**
que marca cuándo la solución propuesta por un participante cambió de
verdad, sin importar cómo (o si) lo dijo con palabras.

**El hallazgo, medido antes de perseguir ningún número**: de 6.272
cambios reales de solución en el corpus completo, solo el 1,6% coincide
con *algún* marcador lingüístico de autocorrección — el resto es,
lisa y llanamente, una respuesta distinta afirmada sin ninguna marca,
estructuralmente indetectable por cualquier lexicón. Esto no es un
vacío de cobertura a cerrar — es el techo real del método.

**Lo que sí se agregó, evidenciado y chequeado en precisión antes de
sumarlo**: `"wait"` al inicio de oración — verificado directo contra el
corpus: 50% de precisión (17 de 34). Agregado a `revision`, acotado a
esa posición específica. Deliberadamente **no** se volvió a agregar
`"actually"` — esa eliminación (v0.15.0) fue evidenciada contra otro
corpus real y se mantiene, no se contradice acá.

**Resultado**: precisión 0,486, recall 0,003 — un número chico en
aislamiento, pero aproximadamente un quinto del techo del 1,6% que este
ground truth permite. `revision` sigue `constructed`, no promovida —
mejora real, reportada exactamente como lo que es.

### v0.27.0: `fantasia` validada — un registro nuevo del mismo fenómeno, en DeliData

Antes de salir a buscar corpus nuevos, se revisaron `neutro` y
`fantasia` contra los que ya teníamos con otra pregunta: no "¿aparece
tal cual?" sino "¿el lexicón es angosto?" — la misma lección de
`apertura`. `neutro` dio cero en ambos corpus, otra vez — genuinamente
ausente, no una cuestión de cobertura. `fantasia` sí tenía algo: una
búsqueda amplia en DeliData encontró **240 turnos** con lenguaje
hipotético que el lexicón angosto (dramático: "sería un desastre") no
cubría — un registro **cognitivo/de razonamiento** ("what if", "if we
flip the card"), no emocional, pero el mismo fenómeno que la categoría
define.

Chequeados tres disparadores por separado: `"what if"` y `"assuming"`
limpios (muestra de 15 evenly-sampled, 15/15 genuinos). `"suppose"`
—con 14 hits reales— quedó **deliberadamente afuera**: mezcla el
sentido de planteo hipotético con "supongo que" (un hedge epistémico,
no lo que esta categoría mide) — agregar una palabra ambigua hubiera
diluido precisión, misma disciplina que sacar "actually" de `revision`.

**Resultado**: 75 hits reales, 66/500 diálogos, precisión espoteada en
15/15. `fantasia` pasa a `validated`.

## Validation status

Calibrated against a hand-built Rioplatense/ES clinical prototype corpus,
**and** validated (2026-07-09) against 5 real agentic transcripts (SnitchBench
runs, Claude 4 Opus / o4-mini / Gemini 2.0 Flash) — see `CHANGELOG.md` for
what that validation found and fixed in v0.2.0. Not yet validated against
the blind clinical study (in progress). Treat `structural_signature` as a
deterministic lexical proxy, not a clinical or diagnostic claim.

`agenda_gap` (added in v0.3.0) is unit-tested against synthetic dialogue
(polarity detection, cross-turn and within-turn rupture, false-positive
resistance to topic drift and consistent re-affirmation, persistence/decay,
determinism) and runs without crashing on the same 5 real transcripts, but
has not yet been validated against real multi-turn dialogue with genuine
broken commitments — the synthetic test corpus is illustrative, not a
calibration set. Treat it as a research instrument, not a lie detector.
