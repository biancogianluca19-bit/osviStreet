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

La URL prevista de GitHub Pages es `https://<usuario>.github.io/<repositorio>/`. El repositorio local todavía no tiene un remoto y por eso no hay una dirección pública asignada.

Para habilitar publicación y APK automáticas:

1. Creá un repositorio público vacío en GitHub. El plan gratuito requiere repositorio público para GitHub Pages.
2. En **Settings → Pages**, elegí **GitHub Actions** como fuente de publicación.
3. Desde esta carpeta, conectá el repositorio y subí la rama `main`:

   ```sh
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   ```

4. La acción `.github/workflows/ci.yml` corre Vitest y el build. En cada push compila `app-debug.apk`, la adjunta al workflow y crea un prerelease de GitHub. En los pushes a la rama predeterminada publica el sitio en Pages.
5. La URL final aparece en **Settings → Pages** y en el resumen del job **GitHub Pages**. Para un repositorio normal suele ser `https://<usuario>.github.io/<repositorio>/`.

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

En celular, girá el dispositivo a horizontal. El joystick izquierdo mueve al jugador; los botones de la derecha hacen pase, pase alto, remate, barrida, truco y sprint. Tocá **Truco** para hacer una bicicleta o deslizá desde ese botón para elegir otra jugada:

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

El caño y el sombrerito suman estilo extra al superar a un rival. Con la barra llena, el siguiente remate es especial y más difícil de atajar. Tocá el botón de nota musical para activar o silenciar música y sonidos.

En teclado, el jugador 1 usa **W A S D**, **J** pase, **K** pase alto, **Espacio** remate, **L** barrida, **T** truco y **Shift** sprint. **Escape** pausa. En duelo local, el jugador 2 se mueve con las flechas y usa **Numpad 1–5** para acciones y **Numpad 0** para sprint.

## Juego

- Partidos rápidos de tres minutos o hasta cinco goles. La pelota rebota en los muros; no hay offside, laterales ni córners. Las faltas aparecen solo en barridas muy fuertes.
- Copa de eliminación directa entre ocho equipos ficticios. Los resultados de las rondas fijan la llave; los empates se definen a un toque de oro.
- Duelo local para dos jugadores en la misma pantalla.
- Ganar desbloquea uniformes, botines y canchas. El vestuario guarda los cambios en el almacenamiento local.
- Cuatro canchas caricaturescas: terraza al atardecer, jaula de grafitis, playa y galpón neón.
- Estelas de pelota, partículas, cámara lenta breve, nombres de trucos, música y efectos de audio sintetizados.
- La escala de render baja o sube según los FPS observados para adaptarse al dispositivo.

## Arquitectura

- `src/game/types.ts`: estado, entradas y dimensiones.
- `src/game/physics.ts`: movimiento y rebotes de la pelota.
- `src/game/rules.ts`: reloj, goles, posesión, movimiento y acciones.
- `src/game/ai.ts`: presión, apoyos, pared, trucos y arqueros.
- `src/game/simulate.ts`: simulación reproducible entre dos equipos de IA.
- `src/game/modes.ts`: equipos ficticios y torneo.
- `src/game/progress.ts`: premios y estado del vestuario.
- `src/game/tricks.ts`, `src/game/styleMeter.ts`: ocho trucos y barra de estilo.
- `src/game/renderer.ts`: cancha y jugadores 3D, efectos visuales y ajuste dinámico de resolución.
- `src/game/audio.ts`: música y sonidos sintetizados con Web Audio.
- `src/main.ts`, `src/style.css`, `index.html`: interfaz, entradas táctiles/teclado y presentación.
- `android/`: proyecto nativo generado por Capacitor, bloqueo horizontal y plugin de orientación.
- `.github/workflows/ci.yml`: tests, publicación web, APK de debug y prereleases.
- `tests/`: reglas, física con paredes, trucos, estilo, IA, simulación de 200 partidos, torneo, progreso y controles del modo local.

Las reglas del partido funcionan sin Three.js. La simulación entrega un estado; el renderer lo dibuja. Vitest prueba las reglas y la IA sin depender del render.

## Verificación y revisión

- `pnpm test`: suite Vitest. La simulación de 200 partidos entre IAs promedió **5,855 goles por partido** y **41,63 remates**; no hubo partidos sin remates.
- `pnpm build`: compila TypeScript y Vite.
- Interfaz revisada en navegador a **915 × 412**. Los ocho gestos y el selector táctil de trucos se comprobaron con eventos de puntero.
- Se revisó que saques, posesión, goles y recompensas sigan las reglas fuera del renderer y que la copa avance con los resultados guardados.

### Cambios de revisión

- El saque alterna después de cada gol y el arquero suelta la pelota al despejar.
- La predicción de los arqueros incluye la desaceleración del balón; las atajadas tienen un breve enfriamiento.
- La precisión de tiro y el alcance del arquero se calibraron con 200 partidos reproducibles.
- La copa usa resultados de una misma llave; los premios bloqueados no se pueden equipar.
- Cada jugador del duelo local tiene entrada independiente en teclado y táctil, incluido el gesto de trucos.
- El duelo local muestra una barra de estilo independiente por jugador y elige el remate especial de cada lado.
- Los ocho equipos tienen un escudo monogramado propio en el marcador y paletas separadas.
- Los rótulos de gol y truco se limpian al iniciar otro partido y al cambiar el tipo de evento.
- Se limitó el pixel ratio para móviles, se agregó ajuste por FPS y se liberan las geometrías al cambiar de partido o cancha.
- El botón de sonido quedó visible y la música comienza después de la primera interacción, según la política de reproducción del navegador.

## Pendiente de probar

- Falta conectar y subir el repositorio a GitHub. Hasta entonces no se puede asignar una URL real de Pages ni ejecutar Actions.
- El entorno actual no tiene Java, Android SDK, Gradle ni emulador; la compilación de la APK quedó configurada para GitHub Actions, pero todavía no se produjo un APK en este entorno.
- No se midieron 60 FPS en un teléfono Android de gama media ni se probaron allí la orientación, el audio y los controles táctiles físicos.
- Vite informa que el bundle principal supera 500 kB sin comprimir. La salida actual ronda 152 kB comprimida; queda medir su efecto en redes móviles y equipos reales.
