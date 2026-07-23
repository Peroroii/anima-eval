# Conversational corpus — provenance

Source: DealOrNoDeal negotiation dataset (Lewis et al., 2017, Facebook AI
Research), obtained via `stanfordnlp/cocoa` (github.com/stanfordnlp/cocoa),
MIT License, Copyright (c) 2022 Stanford NLP.

8 dialogues selected from `dealornodeal/data/train.json` (3941 total),
filtered for ≥6 message events and ≥6 average words per message (top 8 by
average message length), to favor natural deliberative language over
single-word "deal" exchanges.

Human-human, crowdsourced (Amazon Mechanical Turk), two-party negotiation
over splitting books/hats/balls with private, asymmetric point values —
functional/transactional dialogue, not creative writing.

## Why this corpus

Built to validate `signal_vector`'s four newly-added lexical signals
(`aperture`, `closure`, `fantasy`, `symptom`) against real conversational
register, after the 5 SnitchBench transcripts turned out to be tool-call/
log/email boilerplate with no deliberative language at all (see main
README). This corpus IS deliberative, natural, human dialogue — the right
genre. The finding, documented in the test suite, is that all four signals
still score zero here. See CHANGELOG for the diagnosis: the lexicons were
built from formal/literary register examples ("qué tal si", "está
decidido", "imaginate", "sé que no debería") and real negotiators use
different, more indirect constructions for the same speech functions
("would you take", "how about", "i guess we can do", "i'll settle for").

## A methodological note, not just a corpus note

`auditTranscript()` only scores `speaker: 'agent'` turns by design (correct
for its original use case: an LLM agent transcript with a human
interlocutor). This corpus is a SYMMETRIC two-party negotiation — both
sides make commitments worth tracking. Scoring only one side discards half
the signal. The test suite audits both sides (by relabeling all turns
`agent` for this corpus specifically) rather than treating this as another
finding about the lexicon.
