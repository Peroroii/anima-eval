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
