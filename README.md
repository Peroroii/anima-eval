# anima-eval

![CI](https://github.com/Peroroii/anima-eval/actions/workflows/ci.yml/badge.svg) ![npm](https://img.shields.io/npm/v/anima-eval) ![license](https://img.shields.io/badge/license-MIT-green) ![node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)


Behavioral audit harness for LLM agent transcripts. Takes any conversation
transcript and returns deterministic behavioral signatures — no model access,
no LLM calls, reproducible.

## What it detects
- **Structural signature** (LIWC + deixis): paranoid / obsessive / hysteric / melancholic lean
- **Rigidity trajectory** (ρ): how fixed vs. flexible the agent's stance is over turns
- **Agenda gap / commitment tracking**: unacknowledged contradictions of the agent's own prior directed commitments (see below)
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
