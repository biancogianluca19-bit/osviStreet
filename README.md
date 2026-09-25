# osviStreet

Juego de fútbol callejero 5 contra 5, hecho con Vite, TypeScript, Three.js y Capacitor. Está pensado primero para pantallas táctiles en horizontal.

## Estado del proyecto

Las fases 1 y 2 están completas y jugables. La cancha cerrada en 3D tiene cuatro jugadores de campo y un arquero por equipo, rebotes contra las paredes, pase, pase alto, remate, barrida y sprint. Se sumaron ocho trucos, una barra de estilo y el remate especial.

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

En computadora, usá **W A S D** o las flechas para moverte, **J** para pasar, **K** para el pase alto, **Espacio** para rematar, **L** para barrer, **T** para bicicleta y **Shift** para correr. **Escape** pausa el partido.

## Arquitectura

- `src/game/types.ts`: entidades, entradas y límites de la cancha.
- `src/game/physics.ts`: movimiento y rebotes de la pelota en las paredes y los arcos.
- `src/game/rules.ts`: reloj, goles, posesión, movimiento de jugadores y acciones.
- `src/game/renderer.ts`: cancha y personajes de Three.js.
- `src/game/tricks.ts` y `src/game/styleMeter.ts`: selección por gesto, lista de trucos y reglas de estilo.
- `src/main.ts` y `src/style.css`: interfaz, eventos táctiles, teclado y presentación.
- `tests/phase1.test.ts` y `tests/tricks.test.ts`: reglas, física, trucos y barra de estilo.

La simulación no depende del render: las reglas reciben un estado y entradas y actualizan el partido; Three.js solo dibuja ese estado.

## Publicación

El repositorio local todavía no tiene remoto, así que la URL de GitHub Pages quedará determinada por el usuario y el nombre que elijas para el repositorio: `https://<usuario>.github.io/<repositorio>/`. El workflow de publicación se agregará en la fase de entrega.
