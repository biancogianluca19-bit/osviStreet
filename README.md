# osviStreet

Juego de fútbol callejero 5 contra 5, hecho con Vite, TypeScript, Three.js y Capacitor. Está pensado primero para pantallas táctiles en horizontal.

## Estado del proyecto

La fase 1 está completa y jugable: cancha cerrada en 3D, cuatro jugadores de campo y un arquero por equipo, rebotes contra las paredes, pase, pase alto, remate, barrida y sprint. Gana el primer equipo que llega a cinco goles; si eso no pasa, termina a los tres minutos.

## Ejecutar en desarrollo

Requiere Node.js 22 o superior y pnpm.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Controles

En celular, girá la pantalla a horizontal. Mové al jugador con el joystick de la izquierda. Los botones de la derecha hacen pase, pase alto, remate y barrida. Mantené **Sprint** para correr más rápido.

En computadora, usá **W A S D** o las flechas para moverte, **J** para pasar, **K** para el pase alto, **Espacio** para rematar, **L** para barrer y **Shift** para correr. **Escape** pausa el partido.

## Arquitectura

- `src/game/types.ts`: entidades, entradas y límites de la cancha.
- `src/game/physics.ts`: movimiento y rebotes de la pelota en las paredes y los arcos.
- `src/game/rules.ts`: reloj, goles, posesión, movimiento de jugadores y acciones.
- `src/game/renderer.ts`: cancha y personajes de Three.js.
- `src/main.ts` y `src/style.css`: interfaz, eventos táctiles, teclado y presentación.
- `tests/phase1.test.ts`: reglas y física de la primera fase.

La simulación no depende del render: las reglas reciben un estado y entradas y actualizan el partido; Three.js solo dibuja ese estado.

## Publicación

El repositorio local todavía no tiene remoto, así que la URL de GitHub Pages quedará determinada por el usuario y el nombre que elijas para el repositorio: `https://<usuario>.github.io/<repositorio>/`. El workflow de publicación se agregará en la fase de entrega.
