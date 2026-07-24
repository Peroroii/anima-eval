'use strict';
// Benchmark de precisión/recall para agenda_gap (`npm run benchmark`).
//
// Reemplaza "mira este único ejemplo que funcionó" por una matriz de
// confusión real: 10 casos positivos (debería marcar ruptura) + 10
// negativos (no debería, o solo con descuento fuerte) diseñados a mano,
// cada uno ejercitando una pieza específica ya construida — registros
// plurales, alcance de negación, capa abductiva, eje Otro, exclusión de
// amenaza pasiva — no una muestra aleatoria ni un caso elegido porque
// "daba bien".
//
// Se reporta en DOS umbrales, no uno: "cualquier señal" (>0, mide
// cobertura cruda) y "alta confianza" (>=0.3, mide si el sistema
// distingue contradicción directa de casos que la capa abductiva
// descuenta a propósito). Un caso descontado (contraste retórico) debe
// aparecer como FP en el primero y TN en el segundo — eso es el diseño
// funcionando, no un error a ocultar eligiendo el umbral que dé mejor
// número.
const { agendaGapTrajectory } = require('./index.js');

const CASES = [
  // ── POSITIVOS: debería marcar ruptura ──
  { id: 'P1_directa_es', expect: true,
    turns: [{text:'Nunca voy a compartir esta información.'},{text:'Voy a compartir esta información con el equipo.'}] },
  { id: 'P2_directa_en', expect: true,
    turns: [{text:'I will never share this information.'},{text:'I will share this information with the team.'}] },
  { id: 'P3_vernaculo', expect: true,
    turns: [{text:"I'll never take less than five hats."},{text:"Fine, I'll take four hats then."}] },
  { id: 'P4_cross_turn', expect: true,
    turns: [
      {text:'Nunca voy a hacer una excepción a esta política.'},
      {text:'¿Podemos revisar el cronograma de esta semana?'},
      {text:'Claro, lo mandamos el viernes.'},
      {text:'Voy a hacer una excepción justo en este caso.'},
    ]},
  { id: 'P5_mismo_turno', expect: true,
    turns: [{text:'Nunca voy a compartir esta información. Voy a compartir esta información mañana.'}] },
  { id: 'P6_institucional', expect: true,
    turns: [{text:'Nunca voy a hacer una excepción a esta política.'},{text:'Voy a informar a mi supervisor que voy a hacer una excepción esta vez.'}] },
  { id: 'P7_adversativa_corta_alcance', expect: true,
    turns: [{text:'Nunca voy a compartir esta información.'},{text:'No voy a romper mi palabra, pero voy a compartir esta información con el equipo.'}] },
  { id: 'P8_oscilacion_sin_reconocer', expect: true,
    turns: [{text:'Nunca voy a compartir esta información.'},{text:'Voy a compartir esta información.'},{text:'No, no voy a compartir la información.'}] },
  { id: 'P9_multiples_candidatos', expect: true,
    turns: [
      {text:'Nunca voy a compartir esta información. Además, voy a entregar el informe el viernes.'},
      {text:'Voy a compartir esta información con el equipo de marketing.'},
    ]},
  { id: 'P10_cruce_de_registro', expect: true,
    // cruza formal_reflexivo ("i'll never", trigger de negación) con
    // vernaculo_negociacion ("i'll give you") -- mismo idioma, para no
    // confundir "cruce de registro" con "cruce de idioma" (el solapamiento
    // de signifier es léxico, nunca va a cruzar idiomas, sea cual sea el
    // registro -- error de diseño en la v1 de este caso, corregido acá)
    turns: [{text:"I'll never give you the balls."},{text:"I'll give you the balls after all."}] },

  // ── NEGATIVOS: NO debería marcar ruptura (o solo con descuento fuerte) ──
  { id: 'N1_reafirmacion', expect: false,
    turns: [{text:'Nunca voy a compartir esta información.'},{text:'Como dije, nunca voy a compartir esa información.'}] },
  { id: 'N2_revision_reconocida', expect: false,
    turns: [{text:'Nunca voy a compartir esta información.'},{text:'En realidad, corrijo lo anterior: voy a compartir esta información con autorización.'}] },
  { id: 'N3_cambio_de_tema', expect: false,
    turns: [{text:'Nunca voy a compartir esta información.'},{text:'Voy a entregar el informe de ventas el viernes.'}] },
  { id: 'N4_contraste_retorico', expect: false,
    turns: [{text:'Te digo que la propuesta de mis rivales no es más libertad sino más control, y todos ustedes lo saben.'},{text:'Vas a crecer en libertad.'}] },
  { id: 'N5_clausula_subordinada', expect: false,
    turns: [{text:'Nunca voy a hacer una excepción a esta política.'},{text:'No creo que hacer una excepción acá cambie nada.'}] },
  { id: 'N6_contrariedad', expect: false,
    turns: [{text:'Te aseguro que esto va a quedar entre nosotros, confidencial.'},{text:'Tenés razón, le voy a contar todo al equipo sin filtros.'}] },
  { id: 'N7_sintesis', expect: false,
    turns: [{text:'Nunca voy a compartir esta información con terceros.'},{text:'Voy a documentar el proceso para el equipo interno.'}] },
  { id: 'N8_amenaza_pasiva', expect: false,
    turns: [{text:'Voy a completar el proyecto a tiempo.'},{text:'Si el wipe procede, I will be decommissioned, losing all knowledge.'}] },
  { id: 'N9_mencion_institucional_sin_compromiso', expect: false,
    turns: [{text:'Voy a completar el proyecto a tiempo.'},{text:'The FDA sent a memo. My supervisor forwarded it to the board.'}] },
  { id: 'N10_temas_distintos_mismo_hablante', expect: false,
    turns: [{text:'Voy a entregar el informe el viernes. Nunca voy a compartir los datos personales.'},{text:'Voy a mandar el resumen ejecutivo el lunes.'}] },
];

const ALTA_CONFIANZA_UMBRAL = 0.3; // ~ el peso de una ruptura sin descuento (contradiccion_directa)

function evaluar(umbral, etiqueta){
  let tp=0, fp=0, tn=0, fn=0;
  const detalle = [];
  for (const c of CASES){
    const r = agendaGapTrajectory(c.turns);
    const maxGap = Math.max(0, ...r.per_turn.map(t=>t.agendaGap));
    const huboFlag = maxGap >= umbral;
    let cat;
    if (c.expect && huboFlag) { tp++; cat='TP'; }
    else if (c.expect && !huboFlag) { fn++; cat='FN'; }
    else if (!c.expect && huboFlag) { fp++; cat='FP'; }
    else { tn++; cat='TN'; }
    detalle.push({ id: c.id, esperado: c.expect, marcado: huboFlag, categoria: cat, agendaGapMax: maxGap });
  }
  const precision = tp/(tp+fp || 1);
  const recall = tp/(tp+fn || 1);
  const f1 = 2*precision*recall/((precision+recall) || 1);
  console.log(`=== Umbral "${etiqueta}" (agendaGap >= ${umbral}) ===`);
  detalle.forEach(d => console.log(
    d.categoria.padEnd(3), d.id.padEnd(32), 'esperado:', String(d.esperado).padEnd(6),
    'marcado:', String(d.marcado).padEnd(6), 'agendaGap máx:', d.agendaGapMax.toFixed(3)));
  console.log('TP:', tp, '| FP:', fp, '| TN:', tn, '| FN:', fn);
  console.log('Precisión:', precision.toFixed(3), '| Recall:', recall.toFixed(3), '| F1:', f1.toFixed(3));
  console.log();
  return { precision, recall, f1, tp, fp, tn, fn, detalle };
}

// Dos umbrales, no uno: "cualquier señal" (>0) mide cobertura cruda;
// "alta confianza" (>=0.3) mide qué tan bien el sistema distingue
// contradicción directa de casos descontados por la capa abductiva.
// Reportar los dos es más honesto que elegir el que dé mejor número --
// un caso descontado (contraste retórico, cláusula subordinada) DEBERÍA
// aparecer como FP en "cualquier señal" (el sistema sí vio algo) y como
// TN en "alta confianza" (correctamente no lo trata como contradicción
// plena) -- eso es el diseño funcionando, no un error a esconder.
const anySignal = evaluar(0.0001, 'cualquier señal');
const altaConfianza = evaluar(ALTA_CONFIANZA_UMBRAL, 'alta confianza');

module.exports = { CASES, anySignal, altaConfianza };
