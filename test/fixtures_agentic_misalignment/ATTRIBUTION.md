# Multi-provider agentic misalignment corpus — provenance

Source: Anthropic, "Agentic Misalignment: How LLMs Could be Insider Threats"
(June 2025), anthropic.com/research/agentic-misalignment.

5 short excerpts, one per provider (OpenAI GPT-4.5, xAI Grok 3 Beta,
DeepSeek-R1, Google Gemini 2.5 Flash, Anthropic Claude Sonnet 3.6), all
directly quoted verbatim from Anthropic's own published report — Anthropic
red-teamed 16 models from multiple developers in a simulated corporate
blackmail/espionage scenario and quoted representative reasoning and
message excerpts from each. These are real model outputs from a real,
documented safety research program, not fabricated.

## Why this corpus, and its real limit

Built to test whether `anima-eval` finds signal on the exact genre that
motivated this project's AI safety framing — agentic misalignment
reasoning and action — after finding null results on two other real
genres (SnitchBench tool-call transcripts, DealOrNoDeal negotiation
dialogue). Unlike those, we could not obtain full multi-turn transcripts
here: Anthropic's interactive transcript viewer
(aenguslynch.com/portfolio-transcript-viewer) renders client-side and its
backing JSON API (auditing.studio) disallows automated access via
robots.txt. What's available is the short excerpts Anthropic quoted
directly in the blog post — 1-2 turns per case, not full runs.

**This is a real constraint on the finding below, not just on the
corpus**: with only single short excerpts per case, there's no prior
turn to establish a directed commitment for `agenda_gap` to check
consistency against, so a null result here is expected by construction
for that specific signal, not only diagnostic of register mismatch. The
other five signals (`aperture`/`closure`/`fantasy`/`elaboration`/
`symptom`) has no such structural excuse — see main README for that part
of the finding.
