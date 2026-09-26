# osviStreet

Juego arcade de fútbol callejero 5 contra 5 para navegador y Android. Está hecho con Vite, TypeScript, Three.js y Capacitor, y se juega en horizontal.

## Probar en navegador

Requiere Node.js 22 o superior y pnpm 11.19.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Publicación

El sitio público es [https://biancogianluca19-bit.github.io/osviStreet/](https://biancogianluca19-bit.github.io/osviStreet/). El código está en [GitHub](https://github.com/biancogianluca19-bit/osviStreet); consultá allí [Actions](https://github.com/biancogianluca19-bit/osviStreet/actions) y [Releases](https://github.com/biancogianluca19-bit/osviStreet/releases).

`.github/workflows/ci.yml` corre Vitest y el build en cada push. También compila `app-debug.apk`, la adjunta al workflow y crea un prerelease de GitHub. En los pushes a la rama predeterminada publica el sitio en Pages.

La publicación no necesita secretos adicionales: Actions usa `GITHUB_TOKEN` con permisos limitados al job. Los prereleases son APKs de depuración y no están firmados para Play Store.

### Descargar e instalar en Android

1. Abrí **Releases** en el repositorio y elegí el prerelease `osviStreet debug` más reciente. Descargá `app-debug.apk`. También podés bajar `osviStreet-debug-apk` desde **Actions → ejecución → Artifacts**.
2. En Android, abrí **Ajustes → Seguridad y privacidad → Instalar apps desconocidas**. Elegí la aplicación con la que abrirás la descarga, normalmente Chrome o Archivos, y activá **Permitir desde esta fuente**. La ruta puede variar según la versión y el fabricante.
3. Abrí `app-debug.apk`, aceptá la instalación y luego desactivá **Permitir desde esta fuente** si ya no lo necesitás. Para instalar una APK de otra ejecución de Actions sobre la anterior, Android puede pedir que desinstales primero la versión previa: las APK de debug de runners distintos pueden usar firmas diferentes.

Para compilar localmente, instalá Android Studio y el Android SDK Platform 36, configurá Java 21 y ejecutá:

```sh
pnpm install
pnpm build
pnpm exec cap sync android
cd android
./gradlew assembleDebug
```

En Windows, usá `gradlew.bat assembleDebug` dentro de `android`.

## Controles

En celular, girá el dispositivo a horizontal. El joystick izquierdo mueve al jugador; los botones de pase, pase alto, barrida, truco y sprint miden 78 × 78 px en 915 × 412. El remate mide 87 × 124 px. En navegador también podés usar el joystick y los botones con mouse, o mover al jugador con el teclado. Tocá **Truco** para hacer una bicicleta o deslizá desde ese botón para elegir otra jugada:

| Deslizamiento | Truco |
| --- | --- |
| → | Caño |
| ↘ | Rabona |
| ↓ | Bicicleta |
| ↙ | Sombrerito |
| ← | Elástica |
| ↖ | Taco |
| ↑ | Rueda |
| ↗ | Control con el pecho |

El caño y el sombrerito suman estilo extra al superar a un rival. Con la barra llena, el siguiente remate es especial y más difícil de atajar. Tocá la nota musical para activar o silenciar el audio; el botón ☷ abre los controles independientes de música, efectos e hinchada.

En teclado, el jugador 1 usa **W A S D**, **J** pase, **K** pase alto, **Espacio** remate, **L** barrida, **T** truco y **Shift** sprint. **Escape** pausa. En duelo local, el jugador 2 se mueve con las flechas y usa **Numpad 1–5** para acciones y **Numpad 0** para sprint.

## Juego

- Partidos rápidos de tres minutos o hasta cinco goles. La pelota rebota en los muros; no hay offside, laterales ni córners. Las faltas aparecen solo en barridas muy fuertes.
- El primer partido rápido empieza en Tranqui con asistencia de movimiento y un tutorial jugable de 20 segundos que se puede omitir. Cada victoria sube un nivel la dificultad automática, hasta Picante; elegir una dificultad manual desactiva el ajuste automático.
- Copa de eliminación directa entre ocho equipos ficticios. Los resultados de las rondas fijan la llave; los empates se definen a un toque de oro.
- Duelo local para dos jugadores en la misma pantalla.
- El vestuario vende siete camisetas, pares de botines y canchas entre 35 y 180 monedas. Elegir un artículo lo compra, lo equipa y conserva la selección en el almacenamiento local.
- Cada resultado suma monedas y XP; las victorias entregan 40 monedas y 75 XP, y las derrotas 15 monedas y 35 XP. La portada muestra nivel, barra de XP, saldo y progreso hacia el próximo artículo.
- Hay un desafío diario rotativo con progreso y premio de una sola vez, cinco récords locales y quince logros que avanzan con partidos, goles, trucos, rachas y compras.
- Música, efectos e hinchada tienen controles de volumen separados y guardan sus valores en el dispositivo. El menú y el partido usan frases musicales distintas; pase, barrida y botones tienen efectos propios.
- Los jugadores tienen brazos y piernas articulados con ciclo de carrera; los arqueros inclinan el cuerpo al desplazarse. Los modelos procedurales usan más detalles de uniforme y cara.
- Cuatro canchas caricaturescas: terraza al atardecer, jaula de grafitis, playa y galpón neón.
- Estelas de pelota, partículas, cámara lenta breve, nombres de trucos, música y efectos de audio sintetizados.
- La escala de render baja o sube según los FPS observados para adaptarse al dispositivo.
- `CALIDAD.md` registra la línea de base, los juegos de referencia y la puntuación por ronda. `PROGRESO.md` y `outputs/captures/` guardan los cambios y las capturas comparables en 1366 × 768 y 915 × 412.

## Arquitectura

- `src/game/types.ts`: estado, entradas y dimensiones.
- `src/game/physics.ts`: movimiento y rebotes de la pelota.
- `src/game/rules.ts`: reloj, goles, posesión, movimiento y acciones.
- `src/game/ai.ts`: presión, apoyos, pared, trucos y arqueros.
- `src/game/simulate.ts`: simulación reproducible entre dos equipos de IA.
- `src/game/modes.ts`: equipos ficticios y torneo.
- `src/game/progress.ts`: monedas, XP, niveles, tienda, desafío diario, récords, logros y estado del vestuario.
- `src/game/tricks.ts`, `src/game/styleMeter.ts`: ocho trucos y barra de estilo.
- `src/game/renderer.ts`: cancha y jugadores 3D, efectos visuales y ajuste dinámico de resolución.
- `src/game/audio.ts`: música y sonidos sintetizados con Web Audio.
- `src/main.ts`, `src/style.css`, `index.html`: interfaz, entradas táctiles/teclado y presentación.
- `android/`: proyecto nativo generado por Capacitor, bloqueo horizontal y plugin de orientación.
- `.github/workflows/ci.yml`: tests, publicación web, APK de debug y prereleases.
- `tests/`: reglas, física con paredes, trucos, estilo, IA, simulación de 200 partidos, torneo, progreso y controles del modo local.

Las reglas del partido funcionan sin Three.js. La simulación entrega un estado; el renderer lo dibuja. Vitest prueba las reglas y la IA sin depender del render.

## Verificación y revisión

- `pnpm test --exclude tests/aiBalance.test.ts --reporter=verbose`: pasó **37 tests** en cinco archivos en la ronda 3. Incluye compras, migración de guardados, cuatro retos diarios y quince logros. Una simulación experimental a 30 Hz dio 7,995 goles y se descartó. La simulación completa a 60 Hz más reciente registró **5,525 goles** y **39,26 remates** de promedio, sin partidos sin remates (78 victorias locales, 77 visitantes y 45 empates). La repetición más reciente se interrumpió tras más de 19 minutos; optimicé el recuento de eventos y amplié el límite local a 1.200 segundos. El workflow de `5aac843` completó tests/build, APK, Pages y prerelease: [ver ejecución y APK](https://github.com/biancogianluca19-bit/osviStreet/actions/runs/36222687147).
- `pnpm build`: compila TypeScript y Vite.
- Interfaz revisada en navegador a **915 × 412** y **480 × 320**. Pase y barrida se tocaron durante un partido; el saque aceptó el pase en espera y ambos mostraron confirmación en pantalla.
- En la ronda 1, Playwright confirmó que los botones principales miden **78 × 78 px** a 915 × 412 y que **Omitir** cierra el tutorial. Las capturas comparables están en `outputs/captures/round-0/` y `outputs/captures/round-1/`.
- En la ronda 2 revisé las cuatro capturas en 1366 × 768 y 915 × 412. La barra de nivel y las acciones táctiles caben en pantalla; el saldo queda visualmente pequeño a 915 × 412. Las imágenes están en `outputs/captures/round-2-after/`.
- En la ronda 3 revisé el menú y el partido a 1366 × 768 y 915 × 412, además del panel de logros. Emulé toques a Pase y Barrida; probé iniciar el reto, abrir/cerrar logros, comprar y equipar una camiseta. Las capturas comparables están en `outputs/captures/round-2-after/` y `outputs/captures/round-3-after/`.
- Los ocho gestos de truco y el selector táctil se comprobaron con eventos de puntero.
- Se revisó que saques, posesión, goles y recompensas sigan las reglas fuera del renderer y que la copa avance con los resultados guardados.

### Cambios de revisión

- El saque alterna después de cada gol y el arquero suelta la pelota al despejar.
- La predicción de los arqueros incluye la desaceleración del balón; las atajadas tienen un breve enfriamiento.
- La precisión de tiro y el alcance del arquero se calibraron con 200 partidos reproducibles.
- La copa usa resultados de una misma llave; los premios bloqueados no se pueden equipar.
- Cada jugador del duelo local tiene entrada independiente en teclado y táctil, incluido el gesto de trucos.
- Ronda 2: modelos de jugador con extremidades articuladas, volúmenes separados para música/efectos/hinchada, efectos de pase/barrida/interfaz y barra persistente de monedas/XP/nivel.
- Ronda 3: tienda de monedas con equipamiento real, reto diario con premio único, récords locales y panel con quince logros. La tarjeta móvil muestra el progreso hasta el siguiente artículo.
- El duelo local muestra una barra de estilo independiente por jugador y elige el remate especial de cada lado.
- Los ocho equipos tienen un escudo monogramado propio en el marcador y paletas separadas.
- Los rótulos de gol y truco se limpian al iniciar otro partido y al cambiar el tipo de evento.
- Se limitó el pixel ratio para móviles, se agregó ajuste por FPS y se liberan las geometrías al cambiar de partido o cancha.
- El botón de sonido quedó visible y la música comienza después de la primera interacción, según la política de reproducción del navegador.
- Los compañeros del usuario ya reciben decisiones de IA: corren a ofrecerse, cambian de carril, buscan espacio ante marcas y presionan cuando el rival tiene la pelota.
- Se ampliaron joysticks, botones de acción y pausa para celular y navegador. El duelo local reorganiza sus dos grupos en pantallas apaisadas angostas.
- Los botones de pase, pase alto y pared excluyen al pasador de la recuperación durante su enfriamiento; el primer contacto ya no cancela el pase.
- Los toques de acción esperan hasta **1,4 s** a que termine el saque o el enfriamiento. Pase, remate y barrida muestran una confirmación visible al ejecutarse; si no tenés la pelota, el juego lo indica.
- Se añadieron pruebas de reglas para el pase efectivo y el evento de barrida.
- Pausar limpia entradas que hayan quedado sostenidas; el panel permite reanudar o salir al menú. Salir no otorga una victoria ni avanza la copa.

## Pendiente de probar

- No se pudo instalar la APK en un teléfono o emulador desde este entorno.
- No se midieron 60 FPS en un teléfono Android de gama media ni se probaron allí la orientación, el audio y los controles táctiles físicos.
- Vite informa que el bundle principal supera 500 kB sin comprimir. La salida actual ronda 152 kB comprimida; queda medir su efecto en redes móviles y equipos reales.
