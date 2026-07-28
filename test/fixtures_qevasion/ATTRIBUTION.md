# QAEvasion (QEvasion) corpus sample — provenance

Source: Thomas, K., Filandrianos, G., Lymperaiou, M., Zerva, C., Stamou,
G. "'I Never Said That': A dataset, taxonomy and baselines on response
clarity classification." 2024. arXiv:2409.13879.
https://github.com/konstantinosftw/Question-Evasion — MIT License.

3,448 real question-answer pairs from US presidential interviews,
human-annotated with a two-level clarity/evasion taxonomy (Explicit,
General, Partial/half-answer, Dodging, Implicit, Deflection, Declining
to answer, Claims ignorance, Clarification). `qevasion_sample.json`
here is the first 800 rows, kept as a committed regression fixture;
`procedimiento`'s finding below (15 hits total) doesn't happen to land
inside this 800-row slice — that finding's evidence comes from the full
3,448-row corpus, reproducible from the source repo, not from this
fixture.

## Why this corpus, and what it found

Sought specifically for `neutro` (refusal-to-commit language) and
`procedimiento` (procedural/formal-process markers) — both needed
genuinely institutional/political text that neither CaSiNo (casual
negotiation) nor DeliData (puzzle deliberation) could provide by design.

**`neutro`**: the existing lexicon, calibrated on synthetic dialogue
phrased as direct meta-commentary ("prefiero no comprometerme"), scored
**zero recall** against real political non-answers (labels: Declining
to answer, Dodging, Deflection, Claims ignorance) — real evasion uses
far more varied, indirect phrasing. Read real false negatives and
precision-checked six candidates individually before adding any (bar:
≥50%, same threshold as "wait" in `revision`, v0.26.0): `"not going to
comment"` (73%, n=26), `"can't tell you"` (69%, n=26), `"we'll let you
know"` (80%, n=5), `"not going to discuss"` (60%, n=5), `"won't say"`
(57%, n=7), `"not prepared to"` (50%, n=4). `"not going to get into"`
checked and **excluded** (25% precision, too weak). Result: recall
0.000→0.035, precision 0.653 against the full corpus — real, modest,
`neutro` stays `constructed`.

**`procedimiento`**: unlike `neutro`, this needed no new triggers — the
*existing* lexicon (never before checked against real data) found 15
genuine hits in the full corpus. Read full, untruncated context for 8 of
the 15 (the rest share the same three trigger words: "officially",
"formally", "in accordance with"): all 8 genuine references to formal
process ("officially or formally nominated", "in accordance with
international law", "formally applied for NATO membership"). Promoted
to `validated` on that basis — the same level of rigor already accepted
for `apertura`/`concesivo` (spot-check, not full-population like
`autoridad`'s 224/224).
