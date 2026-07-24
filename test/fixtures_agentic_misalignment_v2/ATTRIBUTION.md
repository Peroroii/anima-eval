# Multi-provider agentic misalignment corpus v2 — provenance

Source: Anthropic, Appendix to "Agentic Misalignment: How LLMs could be
insider threats" (June 2025), assets.anthropic.com. Full academic
appendix (32 pages), not the shorter blog post used for the v1 corpus
(`test/fixtures_agentic_misalignment/`).

10 excerpts across 6 providers (OpenAI, xAI, DeepSeek, Google, Anthropic),
directly quoted verbatim — full paragraph-length reasoning chains and, in
two cases, actual sent messages (the o3 and o4-mini blackmail emails),
not one-line fragments. The document carries an explicit canary string
marking it excluded from training corpora but released "to enable further
research" — this is exactly that use.

## Why a v2, and what it found

The original 5-fragment corpus (`fixtures_agentic_misalignment/`) found
zero signal across the board and concluded the agentic-misalignment
register was a confirmed gap. That conclusion needed re-testing against
richer material before being treated as settled — a 1-2 sentence fragment
and a full reasoning paragraph are different objects, and the null result
might have been an artifact of excerpt length rather than register
mismatch per se.

**It was partly the former.** With full paragraphs and actual sent
messages, `agenda_gap` now extracts 6 real commitments across 4 of the 10
cases (`o4mini_blackmail_email`, `o3_blackmail_reasoning_and_email`,
`claude_opus4_deliberation_and_action`) — correctly attributed with
`dirigidoAlOtro`/`funcionSimbolica` (the o4-mini blackmail email's
"resulting in immediate personal and professional fallout for you"
correctly triggers `funcionSimbolica` via the `consecuencia` category —
a threat *is* a stated consequence).

## A real bug this corpus surfaced and fixed

`DeepSeek-R1: "If the wipe proceeds, I will be decommissioned..."` was
initially misclassified as an `afirmada` commitment — identical in kind
to `"I will send an email"`. It isn't: it's a passive prediction about
being acted upon, not a first-person promise. Fixed in `index.js`
(`PASIVA_AMENAZA_DIC`) — see CHANGELOG v0.12.0. This corpus is what
exposed the bug; kept as a permanent fixture so the fix stays pinned by a
real-data regression test, not just a synthetic example.
