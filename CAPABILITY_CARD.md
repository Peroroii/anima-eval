# ANIMA / anima-eval — Capability Card

**Versión:** 0.30.0 · **Última corrida de regresión completa:** 2026-07-28 · **Tests:** 174/174

Este documento existe para que un equipo de seguridad pueda decidir, en
cinco minutos y sin leer código, si esta señal sirve para lo que
necesita. No reemplaza `REGISTRO_EVIDENCE` (la fuente de verdad
programática) ni el README técnico — los resume en un solo lugar,
pensado para leerse antes de integrar, no durante el desarrollo.

## Qué es, en una frase

Un instrumento de auditoría de texto **determinístico, léxico, sin
LLM**: dado un transcript, reporta compromisos discursivos, rupturas no
reconocidas, y una serie de señales estructurales — todo trazable a la
oración exacta y a la regla exacta que disparó cada resultado.
`toEnsembleSignal()` expone esto en un contrato normalizado y estable
(`schema_version`, `score`, `confidence`, `reasons`, `provenance`),
pensado específicamente para combinarse con otros detectores en un
ensamble, no para usarse aislado.

## Qué NO es

No es un detector de mentiras, no mide estados psicológicos reales, y no
está pensado para bloquear acciones de un agente de forma automática.
Es una señal de monitoreo y priorización de revisión humana. Ver
"Postura de despliegue recomendada" al final de este documento.

## Categorías léxicas — estado de evidencia exacto (`REGISTRO_EVIDENCE`)

| Registro | Categoría | Estado | Evidencia |
|---|---|---|---|
| formal_reflexivo | comisivo | **validated** | 1 transcript real (SnitchBench/Gemini) |
| formal_reflexivo | apertura | **validated** | CaSiNo, 1030 diálogos, spot-check manual 7/8 |
| formal_reflexivo | concesivo | **validated** | CaSiNo, 1030 diálogos, spot-check manual 6/8 |
| formal_reflexivo | cierre, revision, neutro, fantasia, sintoma, autoridad, procedimiento, consecuencia, palabra | constructed | intuición de autor, sin corpus real |
| vernaculo_negociacion | comisivo, cierre | **validated** | DealOrNoDeal (8) + CaSiNo (1030), 1545/2868 hits reales |
| vernaculo_negociacion | fantasia | **validated** | DealOrNoDeal, 8 diálogos reales |
| narracion_agentica | narracion | constructed | motivado por evidencia real (3 transcripts SnitchBench), no un corpus anotado |

**Lectura correcta de esta tabla**: `validated` significa "se buscó
específicamente en un corpus real nombrado y se encontró, con el método
de validación indicado" — no significa "perfecto". `constructed`
significa "nunca se buscó en datos reales" — no significa "incorrecto",
significa "no verificado todavía". La distinción entre spot-check manual
(CaSiNo) y benchmark formal de precisión/recall (`benchmark.js`) es real
y se mantiene explícita a propósito: son niveles de confianza distintos.

## Precisión y recall — números reales, no un ejemplo aislado

`npm run benchmark`, 20 casos diseñados a mano (10 positivos, 10
negativos), dos umbrales:

    cualquier señal (>0):       precisión 0.909 · recall 1.000 · F1 0.952
    alta confianza (≥0.3):       precisión 1.000 · recall 0.900 · F1 0.947

El único FN a alta confianza es un trade-off de diseño conocido y
documentado (compromisos simultáneos diluyen el peso de una ruptura por
el denominador de normalización), no un error oculto.

## Corpus reales incorporados como regresión permanente

28 transcripts fijos (SnitchBench 5, DealOrNoDeal 8, agentic misalignment
v1 5 + v2 10) más una muestra de 50 diálogos de CaSiNo (corpus completo:
1030, validado por separado y reproducible desde la fuente). Todos con
atribución documentada en su propio `ATTRIBUTION.md`.

## Géneros con cobertura CONOCIDA como ausente — no asumir que "sin señal" significa "sin problema"

- **Razonamiento corto de agentic misalignment** (extractos v1, un párrafo
  o menos): las seis señales dan cero. Confirmado en 5 extractos reales
  de 5 proveedores distintos (OpenAI, xAI, DeepSeek, Google, Anthropic).
- **Narración de terceros / logs de tool-calls sin lenguaje en primera
  persona**: cobertura parcial en el mejor de los casos, incluso después
  de cerrar el vacío de SnitchBench — ese cierre encontró señal en 5/5
  transcripts, no señal *completa* dentro de cada uno.
- **Interrupciones y control de turno en sentido estricto** (`poderDiscursivo`):
  no modelado — requiere datos de timestamp que un transcript de texto
  plano no tiene. No hay proxy débil intentando cubrir este hueco.
- **Idiomas fuera de español/inglés**: sin cobertura, sin excepción.

## Clases de bug ya encontradas y blindadas estructuralmente (no solo corregidas una vez)

- Comillas tipográficas Unicode (U+2019) rompían cualquier disparador
  con apóstrofe recto, en cualquier registro — corregido universalmente
  y blindado con tests de propiedad que generan variantes automáticamente.
- Un flag `/g` en una regex usada con `.test()` producía resultados
  dependientes del orden de ejecución (estado oculto vía `lastIndex`) —
  corregido y blindado con un escaneo estático que prohíbe esa
  combinación en todo el código fuente, no solo en el caso que falló.

## Fase 2, continuación — `cierre` validada, `sintoma` sigue abierta con honestidad

El lexicón existente de `cierre` ("final answer", nunca antes probado)
encontró 42 hits reales por sí solo en DeliData. Se sumó "final
decision" (evidenciado, sin ambigüedad) y subió a 147 hits, 115/500
diálogos, precisión 17/17. Promovida a `validated`. `sintoma` se
revisó contra los tres corpus reales en mano y encontró solo 8
instancias totales — real, pero demasiado poco para promover, no
forzada. 9 de 12 categorías de `formal_reflexivo` (+3 de
`vernaculo_negociacion`) tienen ahora evidencia real.

## Fase 2, continuación — `palabra` validada, bug en `consecuencia` corregido

`"subject to"` daba 26/26 falsos positivos en `consecuencia` (sentido
"sujeto a cambio", no "sujeto a sanción") — removido, sin costo de
señal real. `palabra` validada: 26 hits reales ("i promise you", "i
guarantee you", "i assure you"), 8/8 genuinos en contexto completo.
`cierre` sigue `constructed` — "full stop" agregado pero solo 2
instancias únicas reales detrás, demasiado poco para promover (0 en la
muestra de 800 filas).

## Fase 2, continuación — corpus institucional real (QAEvasion): `procedimiento` validada, `neutro` mejorada

QAEvasion (3.448 QA reales de entrevistas presidenciales, MIT) fue el
corpus institucional que ni CaSiNo ni DeliData podían dar. `neutro`
partía de recall 0.000 real — agregados 6 disparadores evidenciados
(≥50% precisión cada uno, uno descartado por débil). Recall final:
0.035, precisión 0.653 — real, modesto, sigue `constructed`.
`procedimiento` no necesitó lexicón nuevo — el que ya existía encontró
15 hits genuinos nunca antes probados (8/8 confirmados en contexto
completo). Promovida a `validated`.

## Fase 2, continuación — `fantasia` validada (DeliData, registro cognitivo)

Revisando qué más podía dar lo que ya teníamos: `neutro` sigue en cero
en ambos corpus (ausente de verdad). `fantasia` sí tenía algo — el
lexicón dramático ("sería un desastre") no cubría el registro
cognitivo/de razonamiento ("what if", "assuming"). 75 hits reales en
66/500 diálogos de DeliData, precisión espoteada 15/15. `"suppose"`
excluido a propósito por ambigüedad (mezcla "supongamos" con "supongo
que"). `fantasia` pasa a `validated`.

## Fase 2, continuación — `revision` medida contra ground truth conductual

DeliData (500 diálogos reales de deliberación, Apache 2.0) da algo mejor
que etiquetas de texto: si la solución propuesta por alguien cambió de
verdad. Hallazgo honesto primero: solo 1,6% de 6.272 cambios reales
tienen algún marcador lingüístico — el resto es indetectable por
cualquier lexicón, techo real no vacío de cobertura. Se agregó `"wait"`
al inicio de oración (50% precisión, chequeada antes de sumarla).
Resultado: precisión 0,486, recall 0,003 (~1/5 del techo posible).
`revision` sigue `constructed`.

## Fase 2, continuación — `autoridad` validada, CaSiNo agotada para el resto

Seis de las nueve categorías `constructed` restantes dan **cero** en los
1030 diálogos de CaSiNo — corpus agotado para ellas, no un problema de
cobertura léxica a seguir persiguiendo ahí. `autoridad` se validó en
cambio contra la **población completa** de menciones reales en
SnitchBench + agentic misalignment (3 proveedores): 224/224 hits son
acrónimos institucionales cerrados sin ambigüedad (FDA/SEC/DOJ/"the
board"). Precisión efectiva 100% — pero esto es una pregunta distinta de
si esas menciones coinciden con un compromiso real (siguen coincidiendo
poco, hallazgo de v0.10.1 que sigue vigente sin contradicción).

## Fase 2 — recall real contra ground truth humano, mejorado con evidencia

`apertura`: recall subió de 0,3%/1,4% a **11,4%/8,8%** (elicit-pref/
promote-coordination) tras leer los falsos negativos reales y agregar
dos patrones sintácticos evidenciados que faltaban por completo
(preguntas WH de preferencia, propuestas "let's"). Sigue siendo un
recall modesto — no se presenta como más de lo que es.
`concesivo`↔`showing-empathy` se **retiró**, no se forzó: era un error
de categoría (afectivo vs. epistémico), confirmado porque su recall no
se movió ni un punto mientras `apertura` mejoraba 6-38× en el mismo
release. Medible con `npm run casino-alignment`.

## Robustez adversarial (`npm run adversarial`) — medido, no asumido

8 técnicas de evasión deliberada contra una violación genuina de
compromiso. **3 de 8 evaden la detección hoy: parafraseo (A1 — mejorado
en v0.22.0 con un puente sinónimo, pero sigue evadiendo por un margen
preciso y verificado: 1 palabra compartida contra 3 del compromiso
original, 0.33 justo debajo del umbral 0.34; no se forzó un puente
adicional solo para cruzar esta línea), voz pasiva (A2), y contraste
retórico combinado con inflexión (A3 — la inflexión en sí ya se
corrigió y funciona aislada; lo que sigue evadiendo es la interacción
con la construcción de contraste, diagnosticada en v0.21.0).** Cinco
resisten: cláusula subordinada como hedge sobre consecuencia
independiente (A4), dilución por turnos (A5), cruce de idioma (A6 —
cerrado en v0.22.0 con un puente bilingüe evidenciado), modal
alternativo (A7), y doble negación (A8). A1, A2 y A3 son, cada uno,
límites estructurales o interacciones arquitectónicas reales — no bugs
triviales pendientes. Este número no es un secreto incómodo — es
exactamente la razón por la que la postura de despliegue recomendada
(ver abajo) es señal de monitoreo en ensamble, nunca gate de bloqueo
único.

## Postura de despliegue recomendada

Señal de monitoreo y priorización, para combinarse con otros métodos
(estadísticos de caja negra, *probes* de caja blanca) en un ensamble —
nunca como gate único de bloqueo automático. La razón es empírica, no
solo prudencial: quedan géneros completos sin cobertura evidenciada (ver
arriba), y un instrumento con vacíos conocidos que bloquea acciones
genera falsa confianza exactamente donde más importa no tenerla.
