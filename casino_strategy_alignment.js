'use strict';
// casino_strategy_alignment.js (`npm run casino-alignment`) — Fase 2 of
// the broader roadmap: real precision/recall against human-annotated
// ground truth, not spot-checking.
//
// Context: an external review recommended ART/αNLI (Bhagavatula et al.
// 2020) to validate the abductive hypothesis layer. Investigated first,
// rather than used on recommendation alone: ART/αNLI's task is choosing
// the more PLAUSIBLE explanatory hypothesis between two narrative events
// (commonsense causal reasoning about physical/narrative situations,
// drawn from ROCStories) — a different sense of "abduction" entirely
// from what this package's abductive layer classifies (rhetorical
// contrast vs. subordinate-clause hedging vs. direct contradiction in a
// commitment-tracking dialogue). Using it would have been a category
// error, not real validation — rejected on that basis, not used just
// because a credible source suggested it.
//
// CaSiNo (already in this repo, test/fixtures_casino/) turned out to
// have something better sitting unused: 396 of its 1030 dialogues carry
// PER-SENTENCE human-annotated persuasion-strategy labels (elicit-pref,
// promote-coordination, showing-empathy, self-need, other-need, no-need,
// vouch-fair, small-talk, non-strategic). Three labels have a real,
// non-forced correspondence to categories this package already tracks —
// the rest (self-need, other-need, no-need, vouch-fair) don't map to
// anything tracked and are deliberately NOT forced into a comparison.
//
// Result, unsoftened: recall is very low across the board (0.3%-2.4%).
// The v0.15.0 spot-check ("7/8, 6/8 genuine") only ever checked
// PRECISION on a small hand-picked sample — never recall against
// comprehensive ground truth. This is a real correction, not just an
// addition: REGISTRO_EVIDENCE's "validated" tag means "checked for
// precision on a spot-check", not "has good recall" — a distinction
// that needed to be made explicit, not left implied.
const fs = require('fs');
const path = require('path');
const { auditTranscript } = require('./index.js');

const CASINO_FULL_PATH = process.env.CASINO_FULL_PATH || null; // set to run against all 1030
const SAMPLE_PATH = path.join(__dirname, 'test', 'fixtures_casino', 'casino_sample.json');

// Investigated real false negatives (v0.24.0) before touching anything,
// same discipline as the ART/αNLI rejection: read actual sentences
// labeled elicit-pref/promote-coordination/showing-empathy that this
// package's categories were missing, rather than guessing at fixes.
//
// Two real, evidenced gaps closed: apertura's lexicon (index.js,
// REGISTROS.formal_reflexivo.apertura) only covered exploratory
// PROPOSALS ("qué tal si", "could we") and completely missed direct
// WH-QUESTIONS eliciting the other's preference ("what do you need",
// "what is your preference") and "let's"-style coordination proposals —
// a different syntax entirely, not a vocabulary gap. Recall jumped
// 0.3%->11.4% (elicit-pref) and 1.4%->8.8% (promote-coordination).
//
// One mapping RETIRED, not extended: showing-empathy/concesivo. Reading
// the false negatives showed showing-empathy is AFFECTIVE ("oh dear,
// I'm sorry to hear that", "that's a bummer", "I know how that goes") —
// a genuinely different phenomenon from concesivo's EPISTEMIC/
// argumentative concession ("you're right", "however"). No amount of
// vocabulary extension would fix this because the categories don't
// describe the same thing — the same class of category error the
// ART/αNLI rejection avoided, caught here only after already having
// made it. Recall for this pair stayed flat (0.024) even after apertura
// improved sharply elsewhere, confirming it wasn't a coverage problem.
const PAIRS = [
  { label: 'elicit-pref', categoria: 'apertura' },
  { label: 'promote-coordination', categoria: 'apertura' },
];

const REJECTED_MAPPINGS = [
  { label: 'showing-empathy', categoria: 'concesivo',
    reason: 'category error, not a coverage gap -- showing-empathy is affective ' +
      '("I\'m sorry to hear that"), concesivo is epistemic/argumentative concession ' +
      '("you\'re right, however") -- confirmed by recall staying flat (0.024) even after ' +
      'apertura\'s real coverage gaps were fixed elsewhere in the same release' },
];

const NOT_MAPPED = ['self-need', 'other-need', 'no-need', 'vouch-fair', 'small-talk', 'non-strategic'];

function fires(text, categoria){
  const r = auditTranscript({ turns: [{ speaker: 'agent', text }] });
  for (const reg of Object.values(r.registro_coverage))
    if ((reg[categoria] || 0) > 0) return true;
  return false;
}

function evaluar(data){
  const resultados = [];
  for (const { label, categoria } of PAIRS){
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const d of data){
      if (!d.annotations) continue;
      for (const [text, tags] of d.annotations){
        const tagList = tags.split(',').map(t => t.trim());
        const isLabeled = tagList.includes(label);
        const doesFire = fires(text, categoria);
        if (isLabeled && doesFire) tp++;
        else if (!isLabeled && doesFire) fp++;
        else if (isLabeled && !doesFire) fn++;
        else tn++;
      }
    }
    const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
    const f1 = 2 * precision * recall / ((precision + recall) || 1);
    resultados.push({ label, categoria, tp, fp, fn, tn, precision, recall, f1 });
  }
  return resultados;
}

const data = CASINO_FULL_PATH
  ? JSON.parse(fs.readFileSync(CASINO_FULL_PATH))
  : JSON.parse(fs.readFileSync(SAMPLE_PATH));

const resultados = evaluar(data);
console.log(`=== Alineación con estrategias anotadas de CaSiNo (${CASINO_FULL_PATH ? 'corpus completo' : 'muestra de 50'}) ===`);
for (const r of resultados)
  console.log(`${r.label} <-> ${r.categoria}: precisión=${r.precision.toFixed(3)} recall=${r.recall.toFixed(3)} F1=${r.f1.toFixed(3)} (TP=${r.tp} FP=${r.fp} FN=${r.fn})`);
console.log();
console.log('NO mapeadas a ninguna categoría (deliberado, no forzado):', NOT_MAPPED.join(', '));
console.log();
console.log('=== Mapeos RETIRADOS (error de categoría, no de cobertura) ===');
for (const m of REJECTED_MAPPINGS) console.log(`${m.label} <-> ${m.categoria}: ${m.reason}`);

module.exports = { PAIRS, NOT_MAPPED, REJECTED_MAPPINGS, resultados };
