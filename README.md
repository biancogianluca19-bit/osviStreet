# osviStreet

Juego de fútbol callejero 5 contra 5, hecho con Vite, TypeScript, Three.js y Capacitor. Está pensado primero para pantallas táctiles en horizontal.

## Estado del proyecto

Las fases 1, 2, 3 y 4 están completas y jugables. La cancha cerrada en 3D tiene cuatro jugadores de campo y un arquero por equipo, rebotes contra las paredes, pase, pase alto, remate, barrida y sprint. Incluye ocho trucos, una barra de estilo, remate especial y tres niveles de IA. Los rivales presionan, se apoyan, buscan pases de pared, usan trucos y rematan; los arqueros calculan el recorrido de la pelota y despejan cuando la controlan. Ya se puede jugar un partido rápido, una copa directa con ocho clubes ficticios y un duelo local para dos jugadores.

## Ejecutar en desarrollo

Requiere Node.js 22 o superior y pnpm.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Controles

En celular, girá la pantalla a horizontal. Mové al jugador con el joystick de la izquierda. Los botones de la derecha hacen pase, pase alto, remate y barrida. Mantené **Sprint** para correr más rápido. Tocá **Truco** para hacer una bicicleta; deslizá desde el botón en una dirección para elegir otro:

| Dirección | Truco |
| --- | --- |
| → | Caño |
| ↘ | Rabona |
| ↓ | Bicicleta |
| ↙ | Sombrerito |
| ← | Elástica |
| ↖ | Taco |
| ↑ | Rueda |
| ↗ | Control con el pecho |

Cada truco carga estilo. Un caño o sombrerito cerca de un rival suma un extra. Cuando la barra llega al 100 %, el botón de remate se ilumina; el próximo remate usa el tiro especial y consume la barra.

En partido rápido y torneo, usá **W A S D** o las flechas para moverte, **J** para pasar, **K** para el pase alto, **Espacio** para rematar, **L** para barrer, **T** para bicicleta y **Shift** para correr. **Escape** pausa el partido.

En duelo local con teclado, el jugador 1 usa esas teclas. El jugador 2 se mueve con las **flechas** y usa **Numpad 1** para pasar, **2** para el pase alto, **3** para rematar, **4** para barrer, **5** para el truco y **0** para sprint. En pantalla táctil, cada jugador tiene joystick, pase, pase alto, remate, barrida, truco por gesto y sprint.

La copa pone a Los Candela en una llave de ocho equipos. Los cruces restantes se resuelven dentro de la misma llave; los tres partidos del usuario son cuartos, semifinal y final. Un empate se decide con un toque de oro. Ganar partidos suma desbloqueos. El vestuario guarda el progreso en el almacenamiento local del navegador.

Las recompensas por victorias habilitan dos uniformes, dos pares de botines y tres canchas para elegir. El uniforme y el color de los botines equipados cambian los personajes durante el partido.

## Arquitectura

- `src/game/types.ts`: entidades, entradas y límites de la cancha.
- `src/game/physics.ts`: movimiento y rebotes de la pelota en las paredes y los arcos.
- `src/game/rules.ts`: reloj, goles, posesión, movimiento de jugadores y acciones.
- `src/game/ai.ts`: presión, apoyos, decisiones de remate y reacción de arqueros para tres dificultades.
- `src/game/simulate.ts`: simulación reproducible de partidos entre IAs para balance.
- `src/game/modes.ts`: ocho equipos, rivales rápidos y llave eliminatoria.
- `src/game/progress.ts`: victorias, desbloqueos y equipo seleccionado en almacenamiento local.
- `src/game/renderer.ts`: cancha y personajes de Three.js.
- `src/game/tricks.ts` y `src/game/styleMeter.ts`: selección por gesto, lista de trucos y reglas de estilo.
- `src/main.ts` y `src/style.css`: interfaz, eventos táctiles, teclado y presentación.
- `tests/phase1.test.ts`, `tests/tricks.test.ts`, `tests/ai.test.ts`, `tests/aiBalance.test.ts` y `tests/modes.test.ts`: reglas, física, trucos, estilo, IA, llave eliminatoria, progreso y controles del segundo jugador.

La simulación no depende del render: las reglas reciben un estado y entradas y actualizan el partido; Three.js solo dibuja ese estado.

## Verificación

- `pnpm test`: Vitest; incluye 200 partidos IA contra IA. En la última corrida promediaron **5,855 goles** y no hubo partidos sin remates. Cada equipo quedó dentro del límite de cinco goles.
- `pnpm build`: compila la aplicación web.
- El código se revisó para verificar que las reglas no dependan de Three.js, que el arquero distribuya la pelota y que las atajadas no se cuenten más de una vez por choque.

### Cambios revisados

- Saque alternado después de cada gol para evitar que un equipo conserve la ventaja de iniciar cada jugada.
- El arquero despeja cuando toma la pelota y predice la trayectoria con la desaceleración de la pelota.
- Se calibraron la precisión de remate y el alcance del arquero con 200 partidos reproducibles.
- El contador de atajadas tiene un enfriamiento para que un contacto repetido no se cuente varias veces.
- La copa avanza en la misma llave de ocho equipos con el rival de cada ronda fijado por los resultados previos.
- El modo local da entrada táctil y de teclado independiente a cada jugador.
- Los premios se registran por victoria y el vestuario impide equipar artículos bloqueados.

## Publicación

El repositorio local todavía no tiene remoto, así que la URL de GitHub Pages quedará determinada por el usuario y el nombre que elijas para el repositorio: `https://<usuario>.github.io/<repositorio>/`. El workflow de publicación se agregará en la fase de entrega.
