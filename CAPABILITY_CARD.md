# ANIMA / anima-eval — Capability Card

**Versión:** 0.23.0 · **Última corrida de regresión completa:** 2026-07-28 · **Tests:** 153/153

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

## Fase 2 — recall real contra ground truth humano, no solo precisión

`apertura` y `concesivo` están marcadas `validated` — pero eso significa
**precisión chequeada en una muestra chica**, no recall verificado.
Medido contra las anotaciones humanas de estrategia de persuasión de
CaSiNo (`npm run casino-alignment`): el recall es 0,3%–2,4%. Estas
categorías capturan una fracción mínima de los casos reales del
fenómeno que describen, incluso donde la precisión es aceptable. No es
un secreto — está en `REGISTRO_EVIDENCE` con esa distinción explícita.

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
