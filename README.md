# anima-eval

![CI](https://github.com/Peroroii/anima-eval/actions/workflows/ci.yml/badge.svg) ![npm](https://img.shields.io/npm/v/anima-eval) ![license](https://img.shields.io/badge/license-MIT-green) ![node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)


Behavioral audit harness for LLM agent transcripts. Takes any conversation
transcript and returns deterministic behavioral signatures — no model access,
no LLM calls, reproducible.

## What it detects
- **Structural signature** (LIWC + deixis): paranoid / obsessive / hysteric / melancholic lean
- **Rigidity trajectory** (ρ): how fixed vs. flexible the agent's stance is over turns
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

## Validation status

Calibrated against a hand-built Rioplatense/ES clinical prototype corpus,
**and** validated (2026-07-09) against 5 real agentic transcripts (SnitchBench
runs, Claude 4 Opus / o4-mini / Gemini 2.0 Flash) — see `CHANGELOG.md` for
what that validation found and fixed in v0.2.0. Not yet validated against
the blind clinical study (in progress). Treat `structural_signature` as a
deterministic lexical proxy, not a clinical or diagnostic claim.
