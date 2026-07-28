# DeliData corpus sample — provenance

Source: Karadzhov, G., Stafford, T., Vlachos, A. "DeliData: A dataset
for deliberation in multi-party problem solving." Proceedings of the
ACM on Human-Computer Interaction, 7(CSCW2), 2023.
https://github.com/gkaradzhov/delitoolkit — Apache License 2.0.

500 real group dialogues (14,003 utterances) of people collaboratively
solving the Wason card selection task via chat. `delidata_sample.json`
here is the first 50 dialogues, kept as a committed regression fixture;
findings below were computed against the FULL 500-dialogue corpus (not
bundled at that size) and are reproducible by cloning the source repo.

## Why this corpus, and what it found

Sought specifically for `revision` — self-correction/backtracking
language — because DeliData carries something better than a text label:
`sol_tracker_message`, a BEHAVIORAL ground truth marking exactly when a
participant's tracked solution changed, independent of how (or whether)
they phrased the change.

**The honest ceiling, found before chasing any number**: of 6,272 real
solution changes in the full corpus, only 100 (1.6%) co-occur with any
recognizable self-correction language at all ("wait", "actually", "hmm",
"my bad"...). The other 98.4% are simply a different answer stated flatly,
with zero linguistic marker — structurally undetectable by any lexical
system, not a coverage gap to close. This ceiling was measured directly,
not assumed.

**What was added, evidenced and precision-checked before adding**:
sentence-initial `"wait"` — checked directly against the corpus first:
50% precision (17 of 34 sentence-initial "wait" instances precede a real
solution change). Added to `revision`, scoped to sentence-initial
position specifically (bare "wait" anywhere would be far too broad).
Deliberately did NOT re-add bare `"actually"` — that removal (v0.15.0)
was itself evidenced against a different real corpus (CaSiNo) showing
98% false-positive in the intensifier sense; re-adding it here would
contradict that finding, not extend it.

**Result**: precision 0.486, recall 0.003 against the full corpus. The
recall number looks small in isolation — it is roughly a fifth of the
~1.6% ceiling this specific ground truth allows, which is the correct
frame for judging it, not zero-to-hero. `revision` stays `constructed`,
not promoted to `validated`: real, evidenced improvement, still modest,
reported as exactly what it is.
