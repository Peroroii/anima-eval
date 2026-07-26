# CaSiNo corpus sample — provenance

Source: Chawla, K., Ramirez, J., Clever, R., Lucas, G., May, J., Gratch, J.
"CaSiNo: A Corpus of Campsite Negotiation Dialogues for Automatic
Negotiation Systems." NAACL 2021. https://github.com/kushalchawla/CaSiNo
License: CC BY 4.0.

1030 real human-human negotiation dialogues (two MTurk workers negotiating
campsite supplies — food, water, firewood). `casino_sample.json` here is
the first 50 dialogues, kept as a committed regression fixture; the
findings below were computed against the FULL 1030-dialogue corpus
(not bundled in the repo at that size) and are reproducible by cloning
the source repo directly.

## Why this corpus, and what it found

Directly addresses the single highest-priority gap identified in an
external review of this project: only 4 of 12 lexical categories had any
real-corpus evidence behind them, and the one vernacular corpus in use
(DealOrNoDeal) had only 8 dialogues — too small to move a category from
"constructed" to "validated" with any confidence.

**Scale**: 936 of 1030 dialogues (91%) register at least one real
commitment; 2786 commitments total. `vernaculo_negociacion`'s `comisivo`
and `cierre` — validated on 8 dialogues before — now have 1545 and 2868
raw hits respectively across 1030, a much larger confirmation of the same
finding.

**New categories moved to `validated`** (`formal_reflexivo.apertura`,
`formal_reflexivo.concesivo`): hand spot-checked samples of real hits —
"shall we...", "what if we trade...", "could we each do 3..." for
apertura; "fair enough", "you're right", "that's true" for concesivo —
came back genuine (7/8 and 6/8 checked). This is a spot-check, not a full
precision/recall pass like `benchmark.js` — reported as such, not
overclaimed.

**A real bug found and fixed, not a promotion**: `revision`'s bare
`"actually"` trigger produced 107 hits, of which 105 (98%) were the
intensifier sense ("I actually need 2 packages" = "in fact"), not
self-correction. The single genuine revision in the entire corpus
("on second thought") still fires via its own phrase. `"actually"` was
removed from the trigger list as a result — real evidence overturning a
category, not just adding to it.

**Honest null, replicated at scale**: `autoridadEpistemica` (in
`poderDiscursivo`) stayed null across all 1030 dialogues — nobody claims
epistemic authority negotiating firewood, same finding as the smaller
DealOrNoDeal check, now with 1030 data points instead of 8.
