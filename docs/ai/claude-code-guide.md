# Guía de uso de Claude Code en Pokémon Ascendant

> Para ti, la persona. Explica cómo está montado el proyecto para que Claude trabaje con normalidad, qué pedirle,
> cómo comprobar lo que hace, y los hábitos que evitan repetir el atasco del proyecto Unity.

## 1. Qué cambia respecto a Unity

En Unity, Claude era ciego y manco: no veía la pantalla sin un hack, no podía pulsar teclas, cada cambio de C#
recargaba el dominio y el puente se congelaba. Aquí Claude tiene ojos y manos nativos:

| Necesidad | Antes (Unity) | Ahora (web) |
|---|---|---|
| Ver la pantalla | RenderTexture sRGB + PNG, 2–8 llamadas | `npm run shot` o el navegador integrado: una captura |
| Entrar en un combate concreto | ScenarioLauncher por reflexión + play mode | abrir `/?scenario=wild-boss-3phase&seed=7` |
| Leer el estado | `CombatDebug.DumpState` por logs | `window.__ascendant.dump()` · `__ascendant.auto(n)` deja jugar a la política de balance · `__ascendant.replay()` exporta la partida |
| Hover / drag / click | eventos sintéticos por reflexión | Playwright o el navegador integrado |
| Cambiar un estilo | reimport + toggle del panel | hot reload en < 1 s |
| Ejecutar tests | puente Coplay, 60 s de timeout, diálogos de escena | `npm test` en 2 s |
| Añadir arte | import settings + bind a un campo SO | copiar un fichero y referenciarlo por ruta |

## 2. Cómo empieza una sesión

1. El hook de inicio imprime `docs/session/active.md`: versión en curso, siguiente acción, estado de tests.
2. Di la tarea en una frase y, si aplica, la versión del roadmap: *"v0.1: porta el sistema de estados (§4.2)
   desde Unity"*. Claude lee el § y los tests C# antes de escribir.
3. Para tareas de varios ficheros, pídele el plan en pocas líneas y confírmalo. Para cambios pequeños, que lo
   haga y lo verifique.

## 3. Peticiones que funcionan bien

- **Portar una regla:** "Porta `SwapManager.cs` y sus tests a `src/sim/combat/swap.ts` (skill `port-from-unity`)."
- **Construir una pantalla:** "Implementa `docs/design/ui/mockups/team-loadout.html` como `TeamScreen.tsx` con
  los tokens, y enséñame la captura."
- **Sentir el juego:** "Haz un playtest del escenario `wild-boss-3phase` y dime si el swap importa (skill `playtest`)."
- **Cambiar diseño:** "¿Y si el swap defensivo también descontara utilidades?" → Claude te da 2–4 opciones con
  impacto en pilares y espera tu decisión (skill `design-change`).
- **Arte:** "Genera tres candidatos del fondo de combate de la Región 1 y muéstramelos en la pantalla real
  (skill `art-add`)." Necesita `GEMINI_API_KEY` en `.env`; sin clave, Claude hace un fondo procedural en CSS/SVG.
- **Auditar:** "Revisa `status.ts` contra §4.2 y dame tests que fallen para lo que falte" (agente `qa`).

## 4. Cómo verificas tú lo que Claude afirma

- Pide siempre la salida: el número de tests y el nombre del PNG. Si dice "funciona" sin evidencia, pídesela.
- Abre `playtest/*.png` tú también, o `npm run dev` y juega. El enlace del juego es el mejor test.
- `npm run check` en verde es la puerta mínima antes de aceptar un cambio.

## 5. Hábitos que protegen el proyecto

- **Una versión, un objetivo.** El roadmap es el filtro de alcance. "Ya que estamos…" se anota en el roadmap,
  no se hace.
- **Canon en el repo.** El diseño vive en `docs/design/`. Sin Notion, sin exportaciones. Cada decisión se escribe **dentro** de la sección que cambia, con una frase
  de por qué; git guarda el histórico.
- **Los tests son la spec.** Los 1 204 tests de Unity describen las reglas; se portan antes que el código.
- **Commits solo cuando tú lo pidas.** Mensajes convencionales (`feat(sim): …`). Un commit por tarea aprobada.
- **Playtest externo pronto.** Con `npm run build` tienes una web estática: súbela a itch.io o GitHub Pages y
  manda el enlace a cinco personas antes de ampliar el alcance.
- **Contexto ligero.** No pegues topics enteros del GDD en el chat; cita el §. Claude abre lo que necesita.

## 6. Agentes y skills disponibles

| Nombre | Para qué |
|---|---|
| skill `verify` | check + capturas; obligatorio antes de dar algo por hecho |
| skill `playtest` | jugar y producir un informe de diseño |
| skill `art-add` | añadir cualquier asset con juicio en contexto |
| skill `design-change` | protocolo de cambio de canon (opciones → decides → se registra) |
| skill `pillar-check` / `balance-check` | validación rápida / numérica |
| skill `port-from-unity` | portar un sistema o contenido desde `../ProjectAscendant` |
| agente `designer` | revisión de pilares, feel, informes de playtest |
| agente `qa` | casos límite, tests que fallan, informes de bug |

No hay diez agentes ni cinco puertas de aprobación: con una persona y una IA sobra. Los agentes son revisores,
no escritores en paralelo sobre los mismos ficheros.

## 7. Permisos

`.claude/settings.json` permite sin preguntar los comandos de solo lectura y verificación (`npm run check`,
`npm test`, `npm run shot`, `git status/diff/log`). Todo lo que escribe fuera del repo, instala o publica sigue
pidiendo confirmación. Ajusta la lista si un comando te pregunta demasiado.

## 8. Plantilla de `docs/session/active.md`

```
# Session State — Pokémon Ascendant
**Date:** …  **Version in progress:** v0.x …  **Sprint goal:** …
**Next action:** …  **Blocked on:** …  **Last commit:** …  **Test status:** …  **Open questions:** …
## Standing facts (≤ 10 líneas)
```
