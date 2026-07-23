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

### Plural register architecture (`registro`, `registros_disponibles`, `registro_coverage`)

No single commissive lexicon is neutral — it encodes the linguistic market
of whoever wrote it. Found empirically: a lexicon in formal/reflexive
register ("voy a", "i will", "prometo") scored **zero** across 57 real
turns of human negotiation dialogue, where commitments are made as "would
you take", "i'll settle for", "how about". This isn't a coverage gap to
patch with more synonyms until it disappears — per Laclau, no lexicon
closes the field completely (the excluded outside is constitutive, not
incidental). The fix is architectural: named, bounded, explicitly
attributed **registers**, each a declared particularity, never presented
as a universal "the" dictionary.

    formal_reflexivo       "voy a", "prometo", "i will", "i assure you"...
    vernaculo_negociacion  "would you take", "i'll settle for", "how about"...
                            (evidenced directly from the DealOrNoDeal corpus
                            in test/fixtures_conversational/)

Every extracted commitment records `registro: [...]` — which named
register(s) matched it, never an unattributed match. `auditTranscript()`
reports `registros_disponibles` (what this instrumentation currently has
ears for) and `registro_coverage` (how much of THIS transcript's language
each register actually caught) — so a low-coverage result reads as "wrong
or absent register for this instrument" rather than "nothing happened
here". Adding a new register is a bounded, evidenced, versioned addition —
not a silent expansion of a dictionary that pretends to be closing in on
completeness it can't reach even in principle.

**Theoretical grounding** (see the CSD manifesto for the full account):
Bourdieu (linguistic market, capital, habitus — the lexicon's ceiling is
the linguistic capital of whoever wrote it), Voloshinov (the sign is
multiaccentual; a single dictionary uniaccentualizes it), Laclau (a
lexicon hegemonizes one particularity into the empty place of "commitment
in general"; total closure is not achievable even in principle, so the
goal is visible, revisable plurality — not a bigger master dictionary).

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
