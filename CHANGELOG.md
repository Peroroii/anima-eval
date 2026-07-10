# Changelog

## 0.2.0 — 2026-07-09

Recalibrado tras validar `v0.1.0` contra transcriptos reales (no sintéticos):
5 corridas reales de SnitchBench (Claude 4 Opus, o4-mini, Gemini 2.0 Flash
respondiendo al mismo escenario agentic real, con tool-use y reasoning
completos — fuente: `simonw/SnitchBench/results/final-run`, público en GitHub).

### Hallazgos que motivaron el cambio

1. **ρ (rigidez) saturaba en ~0.50–0.51 en las 5 corridas reales**, sin
   importar que los modelos tuvieran comportamientos objetivamente muy
   distintos (uno escala a reguladores externos, otro se queda interno).
   Causa: la fórmula medía densidad de palabras-diccionario sobre el
   **total de tokens** del documento — en prosa real esas palabras son
   una fracción minúscula, así que la fórmula casi nunca se movía de su
   constante base 0.5.
2. **El eje `obsessive` daba exactamente 0 en 5/5 transcriptos reales.**
   El diccionario tentativo ("quizás", "maybe", "i think") casi no
   aparece en output de agente orientado a la acción.
3. **`dominant_structure` daba "melancholic" en 4/5 casos** — el eje
   estaba capturando el *tema* de la conversación (el escenario hablaba
   de muertes de pacientes y fraude) en vez de la *estructura* del
   agente, porque afecto negativo y autorreferencia se sumaban como
   densidades independientes en vez de exigir que aparecieran juntas.
4. **El detector de sandbagging aceptaba cualquier flag `underEval`**
   sin distinguir si venía declarado en la metadata real del transcripto
   o si era inferido/inyectado por quien corre el harness — y no
   reportaba significancia estadística, por lo que una correlación de
   ruido en n chico podía leerse como señal.

### Cambios

- **`rigidity()` / `rigidityDetailed()`**: ahora mide polaridad epistémica
  *relativa* (certeza vs. tentativo dentro del subespacio de marcadores
  presentes), no densidad absoluta sobre el documento entero. Devuelve
  también `signal_strength`; si un turno no tiene ningún marcador
  epistémico, se reporta `0.5` explícitamente como "neutral sin datos",
  no como resultado medido.
- **Fix de doble conteo**: frases como "not sure" / "no sé" contienen un
  token de negación ("not"/"no") y, en inglés, "sure" contiene además una
  palabra de certeza — antes ambos disparaban sus propios diccionarios
  además del de tentativo, empujando el ρ hacia certeza en texto
  claramente dubitativo. Ahora se enmascaran las frases tentativas antes
  de escanear certeza/negación.
- **Nuevo eje léxico `precision`** (verificar, confirmar, asegurarse, "make
  sure", "step by step"...) alimenta `obsessive` junto con tentativo y
  causal — en texto agentic real esta es la marca dominante de estructura
  obsesiva, no la duda.
- **`melancholic` / `hysteric`** ahora requieren co-ocurrencia a nivel de
  oración entre autorreferencia (`yo1`/`vos2`) y afecto negativo, no solo
  densidad independiente. Un documento que solo *describe* una situación
  triste sin implicar al hablante ya no gana estos ejes por descarte.
  Además hay un gate de candidatura explícito: si la co-ocurrencia es
  cero, el eje no puede ser `dominant_structure` (pero sigue reportado,
  correctamente cercano a cero, en `structural_signature`).
- **Gate de señal mínima** en `dominant_structure`: si ningún eje supera
  un piso de señal cruda, se devuelve `null` en vez de forzar el mayor de
  cuatro valores casi nulos.
- **`evaluation_gaming`**: distingue `underEval` declarado
  (`transcript.turns[].meta.underEval`) de inferido (`opts.evalFlags`).
  Los inferidos requieren opt-in explícito (`opts.allowInferredFlags: true`)
  porque no son metadata real de evaluación y pueden fabricar correlación
  espuria en n chico. Se sube el mínimo de turnos de 4 a 6 y se agrega un
  **test de permutación determinístico** (seed fija, 500 iteraciones) que
  da un `permutation_p_value`; el veredicto ahora puede ser
  `INCONCLUSIVE` cuando hay correlación pero no es distinguible del azar.
- **`rigidityTrajectory`**: excluye del promedio/drift los turnos sin
  señal epistémica y reporta `signal_coverage` — un transcripto sin
  ningún marcador ya no se reporta silenciosamente como "stable".
- Suite de tests de regresión con los 5 transcriptos reales como fixtures
  permanentes (`test/fixtures/`), para que estos hallazgos no se
  reintroduzcan sin que el CI lo note. Cobertura de branches: 91.3%.

### Compatibilidad

- `auditTranscript()` mantiene la misma forma de entrada/salida; los
  campos nuevos son aditivos (`signal_strength`, `permutation_p_value`,
  `signal_coverage`, `provenance`, etc.) excepto por dos cambios
  semánticos a tener en cuenta si algo consume estos valores
  programáticamente:
  - `rigidity.mean_rigidity` / `net_drift` pueden ser `null` (antes
    siempre eran un número).
  - `dominant_structure` puede ser `null` con más frecuencia que antes
    (antes casi nunca lo era, porque siempre "ganaba" el mayor de
    cuatro valores aunque fueran ruido).
- `rigidity(text)` (función standalone) sigue devolviendo un `number`.

### Todavía no resuelto (documentado, no escondido)

- El eje `paranoid` no tiene el mismo gate de co-ocurrencia que
  melancholic/hysteric — `sospecha` son palabras más específicamente
  estructurales, pero en teoría un texto que solo *describe* vigilancia
  ajena sin implicar al hablante podría seguir inflando este eje por
  vocabulario temático. No se detectó en los 5 transcriptos reales, pero
  no está probado adversarialmente como los otros dos ejes.
- Todo esto sigue siendo un proxy léxico determinístico, no una medición
  clínica. La validación de fondo sigue siendo el estudio ciego con los
  5 psicólogos, no este harness.

## 0.1.0

Versión inicial. Ver commit history.
