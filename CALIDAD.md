# CALIDAD

## Referencias: qué resuelven bien

La vara es que se entienda rápido, cada entrada produzca una respuesta clara y haya un motivo visible para volver. Esto resume las páginas públicas de los juegos; no es una afirmación de que sus interfaces o contenido deban copiarse.

| Área | Observación de referencia |
| --- | --- |
| Primeros 30 segundos | **Football Legends** ofrece partido rápido y torneo; **Soccer Skills** vincula arrastrar con movimiento y potencia de tiro; **Penalty Shooters 2** plantea de inmediato una tanda con roles de pateador y arquero. **Smash Karts** concentra la acción en partidas de tres minutos. Las fichas dejan claro qué se hace y cuánto dura el ciclo. |
| Sensación al jugar | **Soccer Skills** hace que dirección e intensidad del arrastre cambien el movimiento y el remate. **Penalty Shooters 2** convierte apuntar, soltar y leer al arquero en una decisión de tiempo. **Football Legends** da acciones diferenciadas —barrida, tiro y jugada especial—; **Drift Hunters** premia sostener el derrape y ajustar el auto; **Madalin Stunt Cars** permite buscar saltos y trucos; **Smash Karts** suma objetos que alteran cada persecución. Cada juego ofrece decisiones legibles con consecuencias inmediatas. |
| Gráficos | **Soccer Skills** y **Drift Hunters** se presentan en 3D; **Madalin Stunt Cars** ofrece mapas amplios con rampas y pistas; **Smash Karts** usa una arena 3D de lectura rápida. **Football Legends** conserva siluetas simples y contrastadas. La presentación acompaña el tipo de juego y deja que el objetivo se lea rápido. |
| Sonido | Las fichas públicas consultadas no describen música, mezcla ni efectos de **Football Legends**, **Soccer Skills**, **Penalty Shooters 2**, **Drift Hunters**, **Madalin Stunt Cars** o **Smash Karts**. No atribuyo una ventaja de audio a un título sin comprobarla. Para osviStreet, la vara será que pelota, pared, barrida, truco, gol e interfaz tengan señales propias; menú, partido y público deben tener niveles controlables. |
| Progresión | **Penalty Shooters 2** arma una copa de eliminación con tensión creciente. **Drift Hunters** convierte puntos de derrape en autos, tuning y circuitos. **Smash Karts** premia partidas con experiencia, niveles, monedas y cosméticos. **Football Legends** agrega torneo al partido rápido y **Soccer Skills** lleva al jugador por rondas de copa. Los premios se conectan con una acción concreta y una siguiente meta visible. |

### Fuentes de referencia

- [Football Legends · Poki](https://poki.com/en/g/football-legends)
- [Soccer Skills Champions League · Poki](https://poki.com/en/g/soccer-skills-champions-league)
- [Penalty Shooters 2 · Poki](https://poki.com/es/g/penalty-shooters-2)
- [Drift Hunters · CrazyGames](https://www.crazygames.com/game/drift-hunters)
- [Madalin Stunt Cars 2 · CrazyGames](https://www.crazygames.com/game/madalin-stunt-cars-2)
- [Smash Karts · CrazyGames](https://www.crazygames.com/game/smash-karts)

## Línea de base de osviStreet

Escala de 1 a 10, contra la vara de producto terminado pedida para este trabajo. Inspeccioné el menú y un partido en escritorio y en 915 × 412. El botón de pase respondió y mostró confirmación. La partida de prueba que dejé sin mover terminó 0–5; no cuenta como medición de dificultad porque no jugué el partido. La carpeta `assets-cc0` no existe, así que el renderer actual usa modelos y materiales procedurales.

| Área | Nota inicial | Evidencia y brecha |
| --- | ---: | --- |
| Primeros 30 segundos | 5/10 | Se puede iniciar un partido o elegir copa/duelo desde una portada clara. No hay tutorial jugable, los controles no se anticipan y a 915 × 412 los rótulos y el vestuario se comprimen demasiado. |
| Sensación al jugar | 4/10 | Hay confirmaciones visuales, cámara lenta y respuestas para algunos eventos. Pase y barrida son botones independientes, pero falta medir y mejorar su comodidad táctil. La sesión sin intervención acabó antes de evaluar el control sostenido; la IA rival marcó cinco goles mientras el usuario no movía a su jugador. |
| Gráficos | 5/10 | Paleta toon coherente, cancha reconocible, 10 jugadores, escudos y cuatro identidades de cancha. Los personajes, la multitud y la ciudad son geométricos y repetitivos; no hay bloom ni animación articulada de carrera, golpeo, atajada o celebración. |
| Sonido | 3/10 | Hay ambiente, música y sonidos sintetizados para golpe, pared, truco, gol y atajada. El audio empieza silenciado, no hay canales independientes ni señal sonora de botones, pase por arriba, barrida y sprint. |
| Progresión | 3/10 | Copa y siete cosméticos/canchas desbloqueables por victorias. No hay monedas, niveles, premios por progreso, desafío diario, récord local, logros ni botón grande de revancha en todas las salidas. |

**Puntuación inicial:** 20/50. Las fotos de base muestran que la escena se sostiene mejor en escritorio que en el encuadre móvil.

### Capturas de antes

Escritorio, 1366 × 768:

![Menú inicial en escritorio](outputs/captures/round-0/menu-1366x768.png)

Partido y controles, 915 × 412:

![Partido inicial en móvil horizontal](outputs/captures/round-0/match-915x412.png)

También se guardaron las cuatro vistas de menú y partido en ambos tamaños en `outputs/captures/round-0/`.

## Ronda 1 · controles, entrada e IA

| Área | Nota | Cambio observado |
| --- | ---: | --- |
| Primeros 30 segundos | 7/10 | El primer partido rápido arranca en Tranqui y presenta un tutorial de tres acciones con contador de 20 segundos y botón para omitir. La portada móvil todavía queda apretada. |
| Sensación al jugar | 6/10 | Los botones táctiles ahora miden 78 × 78 px a 915 × 412; el remate mide 87 × 124 px. La primera jaula tiene asistencia cuando el jugador no da entrada y sus compañeros corren a carriles más abiertos. Ganar sube la dificultad si el jugador no eligió una manualmente. |
| Gráficos | 5/10 | Sin cambio de contenido: los modelos todavía son de baja complejidad y carecen de animación articulada. |
| Sonido | 3/10 | Sin cambio: siguen faltando canales separados y efectos para cada acción y botón. |
| Progresión | 3/10 | El aumento de dificultad hace que la revancha escale, pero todavía faltan monedas, niveles, desafío diario, récords y logros. |

**Puntuación de ronda 1:** 24/50. La prueba móvil confirmó las dimensiones de los botones, el tutorial completo en pantalla y su botón **Omitir**. El test de IA verificó asistencia con entrada inactiva y una victoria simulada para la primera partida con el jugador quieto. La simulación de 200 partidos pasó el margen de 5–7 goles y no tuvo partidos sin remates; Vitest no expuso el promedio exacto en su resumen.

### Capturas de ronda 1

Partido a 1366 × 768:

![Tutorial y controles en escritorio](outputs/captures/round-1/match-1366x768.png)

Partido a 915 × 412:

![Tutorial y controles en móvil horizontal](outputs/captures/round-1/match-915x412.png)

Menú en ambos tamaños y capturas originales están en `outputs/captures/round-1/` y `outputs/captures/round-0/`.

## Ronda 2 · animación, audio y carrera

| Área | Nota | Cambio observado |
| --- | ---: | --- |
| Primeros 30 segundos | 7/10 | La portada suma nivel, XP y monedas ganadas. El menú no explica todavía el reto del día ni qué se puede comprar con las monedas. |
| Sensación al jugar | 7/10 | Brazos y piernas acompañan el movimiento; el arquero inclina el cuerpo al desplazarse. Pase, barrida e interfaz tienen tonos propios. No probé la mezcla con auriculares ni toqué una pantalla física. |
| Gráficos | 6/10 | Los modelos toon ganan detalles de camiseta, cara, medias y articulaciones animadas. Se mantiene la geometría procedural sin modelos CC0, texturas ni postprocesado. |
| Sonido | 5/10 | Música de menú y partido con frases diferentes, y controles separados para música, efectos e hinchada. El volumen se guarda en el dispositivo. Los instrumentos y efectos siguen sintetizados. |
| Progresión | 4/10 | Cada partido entrega monedas y XP; el nivel y la barra al siguiente umbral quedan visibles. Las monedas aún no se gastan; faltan desafío diario, récord local y logros. |

**Puntuación de ronda 2:** 29/50. La pantalla de menú y el partido se capturaron en ambos tamaños. En 915 × 412 la fila de nivel queda dentro del área visible; las cifras de monedas son pequeñas y necesitan una fila de progreso más legible en una próxima pasada.

### Capturas comparables de ronda 2

Antes: menú a 915 × 412 y partido a 1366 × 768, en [`round-1/`](outputs/captures/round-1/). Después: [menú a 915 × 412](outputs/captures/round-2-after/menu-915x412.png) y [partido a 1366 × 768](outputs/captures/round-2-after/match-1366x768.png). Las otras dos vistas están junto a estas en `round-2-after/`.

La corrida de 200 partidos a 30 Hz dio 7,995 goles de promedio y se descartó por cambiar el balance. `simulate.ts` volvió a 60 Hz. La referencia aceptada sigue siendo la simulación de 200 partidos a 60 Hz: 5,175 goles, 37,38 remates y cero partidos sin remates.

## Puntuaciones por ronda

| Ronda | Primeros 30 s | Sensación | Gráficos | Sonido | Progresión | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Base · 2026-09-25 | 5 | 4 | 5 | 3 | 3 | 20/50 |
| Ronda 1 · 2026-09-26 | 7 | 6 | 5 | 3 | 3 | 24/50 |
| Ronda 2 · 2026-09-26 | 7 | 7 | 6 | 5 | 4 | 29/50 |
