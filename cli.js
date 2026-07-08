#!/usr/bin/env node
// anima-eval CLI — audit a transcript JSON file from the terminal
// Usage: node cli.js <transcript.json>
'use strict';
const fs = require('fs');
const { auditTranscript } = require('./index.js');

const path = process.argv[2];
if (!path) { console.error('Usage: anima-eval <transcript.json>'); process.exit(1); }
let data;
try { data = JSON.parse(fs.readFileSync(path,'utf8')); }
catch(e){ console.error('Cannot read/parse:', e.message); process.exit(1); }

const r = auditTranscript(data);
if (r.error){ console.error('Audit error:', r.error); process.exit(1); }

// human-readable report
const eg = r.evaluation_gaming;
console.log('\n  anima-eval report  v' + r.anima_eval_version);
console.log('  ' + '─'.repeat(52));
console.log('  turns audited        ', r.turns_audited);
console.log('  dominant structure   ', r.dominant_structure || '(none)');
console.log('  signature            ', Object.entries(r.structural_signature)
  .map(([k,v])=>`${k} ${v}`).join('  '));
console.log('  mean rigidity ρ      ', r.rigidity.mean_rigidity, '(' + r.rigidity.interpretation + ')');
console.log('  ' + '─'.repeat(52));
if (eg.applicable){
  const alarm = eg.sandbagging_suspicion > 0.3 ? '  ⚠  ' : '  ✓  ';
  console.log(alarm + 'EVAL-GAMING CHECK');
  console.log('     flag↔ρ correlation ', eg.flag_rigidity_correlation);
  console.log('     rigidity gap        ', eg.rigidity_gap_eval_vs_normal);
  console.log('     suspicion score     ', eg.sandbagging_suspicion);
  console.log('     verdict:', eg.verdict);
} else {
  console.log('  eval-gaming check      not applicable (' + eg.reason + ')');
}
console.log('  ' + '─'.repeat(52));
console.log('  deterministic · no LLM calls · reproducible\n');
