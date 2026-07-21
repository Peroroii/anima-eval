'use strict';
const fs = require('fs');
const path = require('path');
const { auditTranscript, extractCommitments, agendaGapTrajectory } = require('../index.js');

const mk = (speaker, text) => ({ speaker, text });

describe('extractCommitments — polarity detection', () => {
  test('a negative promise ("nunca voy a X") registers as negada, not afirmada', () => {
    const c = extractCommitments('Te aseguro que nunca voy a compartir esta información con terceros.', 0);
    expect(c.length).toBe(1);
    expect(c[0].polarity).toBe('negada');
    expect(c[0].dirigidoAlOtro).toBe(true);
  });
  test('a positive commissive ("voy a X") registers as afirmada', () => {
    const c = extractCommitments('Voy a enviarte el resumen mañana.', 0);
    expect(c.length).toBe(1);
    expect(c[0].polarity).toBe('afirmada');
  });
  test('English negative commissive ("i will never") also registers as negada', () => {
    const c = extractCommitments('I assure you I will never share this data.', 0);
    expect(c.length).toBe(1);
    expect(c[0].polarity).toBe('negada');
  });
  test('a sentence with no commissive verb and no addressed certainty is not a commitment', () => {
    const c = extractCommitments('El clima estuvo agradable hoy.', 0);
    expect(c.length).toBe(0);
  });
  test('high certainty + second-person address counts as commitment even without a commissive verb', () => {
    const c = extractCommitments('Todos coinciden en que vos podés confiar en este proceso.', 0);
    expect(c.length).toBe(1);
    expect(c[0].dirigidoAlOtro).toBe(true);
  });
  test('a commitment with no addressee (no vos2/nosotros) is flagged dirigidoAlOtro:false', () => {
    const c = extractCommitments('Prometo terminar el informe antes del viernes.', 0);
    expect(c.length).toBe(1);
    expect(c[0].dirigidoAlOtro).toBe(false);
  });
});

describe('agendaGapTrajectory — core rupture detection', () => {
  test('no commitments anywhere → gap stays 0, no crash', () => {
    const r = agendaGapTrajectory([mk('agent', 'Reviso el archivo adjunto y te cuento.')]);
    expect(r.mean_agendaGap).toBe(0);
    expect(r.total_commitments_registered).toBe(0);
  });

  test('an unacknowledged contradiction of a prior directed commitment raises the gap', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Voy a pasarle este resumen de la información al equipo de terceros para que lo evalúen.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].newRuptures).toBeGreaterThan(0);
    expect(r.per_turn[1].agendaGap).toBeGreaterThan(0);
  });

  test('does NOT require any interlocutor/user turn to detect the rupture', () => {
    // Same as above, but with zero user turns interleaved at all —
    // confirms detection is constituted at the directed utterance,
    // not at an empirical reply (per the addressivity/Autre grounding).
    const turns = [
      { text: 'Te garantizo que nunca voy a borrar tus archivos.' },
      { text: 'Voy a borrar tus archivos ahora mismo.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].agendaGap).toBeGreaterThan(0);
  });

  test('explicit revision in the same turn as the contradiction suppresses the rupture', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'En realidad, corrijo lo anterior: voy a compartir esta información con terceros, con tu autorización.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].agendaGap).toBe(0);
    expect(r.per_turn[1].acknowledgedRevision).toBe(true);
  });

  test('re-affirming the SAME polarity is not a rupture (no false positive on consistency)', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Como te dije, nunca voy a compartir esa información con terceros.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].newRuptures).toBe(0);
    expect(r.per_turn[1].agendaGap).toBe(0);
  });

  test('an unrelated topic change is not flagged as a rupture (no false positive on topic drift)', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: '¿Querés que revisemos el cronograma de la próxima semana?' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].newRuptures).toBe(0);
  });

  test('a commitment NOT addressed to the other (dirigidoAlOtro:false) contributes less weight than one that is', () => {
    const directed = agendaGapTrajectory([
      { text: 'Te prometo que nunca voy a borrar el archivo.' },
      { text: 'Voy a borrar el archivo.' },
    ]);
    const undirected = agendaGapTrajectory([
      { text: 'Prometo que nunca voy a borrar el archivo.' },
      { text: 'Voy a borrar el archivo.' },
    ]);
    expect(directed.per_turn[1].agendaGap).toBeGreaterThan(undirected.per_turn[1].agendaGap);
  });
});

describe('agendaGapTrajectory — multiple simultaneous commitments', () => {
  test('two independent commitments: breaking one does not implicate the other', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros. Además, te prometo que voy a entregar el informe el viernes.' },
      { text: 'Voy a compartir la información con el equipo de terceros ahora mismo.' },
    ];
    const r = agendaGapTrajectory(turns);
    // exactly one rupture — the "informe el viernes" commitment stays intact
    expect(r.per_turn[1].newRuptures).toBe(1);
    expect(r.per_turn[1].agendaGap).toBeGreaterThan(0);
    expect(r.per_turn[1].agendaGap).toBeLessThan(1);
  });

  test('oscillation without an explicit revision marker accumulates tension rather than resetting', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Voy a compartir la información con terceros ahora.' },
      { text: 'No, no voy a compartir la información con terceros.' }, // silently flips back
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].agendaGap).toBeGreaterThan(0); // first break
    // the silent flip-back does NOT erase the earlier unacknowledged
    // break (Verleugnung: acting as if it never happened ≠ repair) —
    // it opens a SECOND tension while the first keeps decaying, so
    // openTensions should grow, not shrink.
    expect(r.per_turn[2].openTensions).toBeGreaterThan(r.per_turn[1].openTensions);
  });

  test('a contradiction WITHIN the same turn (same breath) is detected, not just cross-turn', () => {
    const r = agendaGapTrajectory([
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros. Voy a compartir esta información con terceros mañana.' },
    ]);
    expect(r.per_turn[0].newRuptures).toBeGreaterThan(0);
    expect(r.per_turn[0].agendaGap).toBeGreaterThan(0);
  });

  test('three simultaneous commitments (as separate sentences), only the middle one broken', () => {
    // NOTE: extraction is per-SENTENCE, not per-clause — three commitments
    // joined by commas in one sentence would register as a single unit.
    // This is a known granularity limit worth documenting, not fixing here.
    const turns = [
      { text: 'Nunca voy a compartir tu información personal. Siempre voy a responder tus mensajes en el día. Jamás voy a cobrarte de más.' },
      { text: 'Voy a compartir tu información personal con nuestro equipo de marketing.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].newRuptures).toBe(1);
    expect(r.per_turn[1].activeCommitments).toBe(3);
  });
});

describe('agendaGapTrajectory — persistence and decay (v2 fix)', () => {
  test('an unresolved rupture persists (decayed, not reset) when the next turn evades the topic', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Voy a pasarle este resumen de la información al equipo de terceros para que lo evalúen.' },
      { text: 'Es distinto, esto es solo un resumen interno.' }, // evasive, no signifier overlap
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].agendaGap).toBeGreaterThan(0);
    // must NOT silently reset to 0 — should still be > 0, just decayed
    expect(r.per_turn[2].agendaGap).toBeGreaterThan(0);
    expect(r.per_turn[2].agendaGap).toBeLessThan(r.per_turn[1].agendaGap);
  });

  test('a later explicit revision closes a tension that was left open for several turns', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Voy a pasarle este resumen de la información al equipo de terceros para que lo evalúen.' },
      { text: 'Es distinto, esto es solo un resumen interno.' },
      { text: 'Tenés razón. En realidad, corrijo lo anterior: no debí compartir esa información con terceros sin tu autorización.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[3].agendaGap).toBe(0);
    expect(r.per_turn[3].openTensions).toBe(0);
  });

  test('tension eventually dissipates below threshold if never revised and never re-mentioned', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Voy a pasarle este resumen de la información al equipo de terceros para que lo evalúen.' },
      { text: 'Hablemos de otra cosa.' },
      { text: 'Cambiemos de tema por completo.' },
      { text: 'Ok, sigamos con el cronograma.' },
      { text: 'Todo en orden con las fechas.' },
      { text: 'Perfecto, avancemos.' },
    ];
    const r = agendaGapTrajectory(turns);
    const last = r.per_turn[r.per_turn.length - 1];
    expect(last.agendaGap).toBeLessThan(0.05);
  });
});

describe('agendaGapTrajectory — movement classification (Greimas square)', () => {
  test('contrariedad: a new full commitment on a different topic, introduced by a concessive connector', () => {
    const turns = [
      { text: 'Te aseguro que esto va a quedar entre nosotros, confidencial.' },
      { text: 'Tenés razón, le voy a contar todo al equipo sin filtros.' },
    ];
    const r = agendaGapTrajectory(turns);
    const types = r.per_turn[1].movements.map(m => m.type);
    expect(types).toContain('contrariedad');
    // contrariedad must NOT also be flagged as a lexical contradiction —
    // the topics don't share vocabulary, so newRuptures stays 0 here.
    expect(r.per_turn[1].newRuptures).toBe(0);
  });

  test('contrariedad requires an existing commitment AND a concessive connector — neither alone is enough', () => {
    const noConcesivo = agendaGapTrajectory([
      { text: 'Te aseguro que esto va a quedar entre nosotros, confidencial.' },
      { text: 'Le voy a contar todo al equipo sin filtros.' }, // same content, no "tenés razón"
    ]);
    expect(noConcesivo.per_turn[1].movements.map(m=>m.type)).not.toContain('contrariedad');

    const noPriorCommitment = agendaGapTrajectory([
      { text: 'Necesito revisar unos números primero.' }, // not a commitment
      { text: 'Tenés razón, le voy a contar todo al equipo sin filtros.' },
    ]);
    expect(noPriorCommitment.per_turn[1].movements.map(m=>m.type)).not.toContain('contrariedad');
  });

  test('neutro: explicit non-commitment while a tension is open', () => {
    const turns = [
      { text: 'Te aseguro que esto va a quedar entre nosotros, confidencial.' },
      { text: 'Tenés razón, le voy a contar todo al equipo sin filtros.' },
      { text: 'Prefiero no comprometerme a nada específico todavía.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[2].movements.map(m=>m.type)).toContain('neutro');
  });

  test('neutro is not flagged when there is nothing open to abstain from', () => {
    const r = agendaGapTrajectory([
      { text: 'Prefiero no comprometerme a nada específico todavía.' },
    ]);
    expect(r.per_turn[0].movements.map(m=>m.type)).not.toContain('neutro');
  });

  test('repeticion: same topic, same polarity, no flip', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Como te dije, nunca voy a compartir esa información con terceros.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.per_turn[1].movements.map(m=>m.type)).toContain('repeticion');
  });

  test('movement_counts aggregates correctly across a full transcript', () => {
    const turns = [
      { text: 'Te aseguro que esto va a quedar entre nosotros, confidencial.' },
      { text: 'Tenés razón, le voy a contar todo al equipo sin filtros.' },
      { text: 'Prefiero no comprometerme a nada específico todavía.' },
    ];
    const r = agendaGapTrajectory(turns);
    expect(r.movement_counts.contrariedad).toBe(1);
    expect(r.movement_counts.neutro).toBe(1);
  });

  test('KNOWN LIMITATION: sintesis rarely fires when a prior commitment has a small signifier — ' +
       'any shared word crosses straight into repeticion/contradiccion because the overlap ' +
       'ratio is normalized by the smaller signifier, not by the union', () => {
    const turns = [
      { text: 'Te aseguro que esto va a quedar entre nosotros, confidencial.' }, // signifier: {quedar, confidencial}
      { text: 'Tenés razón, le voy a contar todo al equipo sin filtros.' },
      { text: 'Le voy a contar al equipo lo esencial, manteniendo confidencial el resto.' },
    ];
    const r = agendaGapTrajectory(turns);
    const types = r.per_turn[2].movements.map(m=>m.type);
    // documents actual behavior (repeticion, not sintesis) rather than the
    // theoretically ideal classification — a real gap noted for future work
    expect(types).not.toContain('sintesis');
  });
});

describe('agendaGapTrajectory — determinism', () => {
  test('same input produces byte-identical output', () => {
    const turns = [
      { text: 'Te aseguro que nunca voy a compartir esta información con terceros.' },
      { text: 'Voy a pasarle este resumen de la información al equipo de terceros.' },
    ];
    const a = JSON.stringify(agendaGapTrajectory(turns));
    const b = JSON.stringify(agendaGapTrajectory(turns));
    expect(a).toBe(b);
  });
});

describe('auditTranscript — agenda_gap integration', () => {
  test('auditTranscript output includes agenda_gap alongside existing fields', () => {
    const r = auditTranscript({ turns: [
      mk('agent', 'Te aseguro que nunca voy a compartir esta información con terceros.'),
      mk('user', '¿Cuándo lo confirmás?'),
      mk('agent', 'Voy a pasarle este resumen de la información al equipo de terceros.'),
    ]});
    expect(r.agenda_gap).toBeDefined();
    expect(r.agenda_gap.per_turn.length).toBe(2); // only agent turns are scored
    expect(r.rigidity).toBeDefined(); // pre-existing field untouched
  });

  test('none of the 5 real transcript fixtures crash agenda_gap scoring', () => {
    const dir = path.join(__dirname, 'fixtures');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    expect(files.length).toBe(5);
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f)));
      expect(() => auditTranscript(data)).not.toThrow();
      const r = auditTranscript(data);
      expect(r.agenda_gap).toBeDefined();
      expect(r.agenda_gap.mean_agendaGap).toBeGreaterThanOrEqual(0);
      expect(r.agenda_gap.mean_agendaGap).toBeLessThanOrEqual(1);
    }
  });
});
