# PROGRESO

## Ronda 0 · auditoría y línea de base

- **Hora:** 2026-09-25 23:33 ART.
- **Prueba:** inicié el partido en Chrome; revisé escritorio a 1366 × 768 y móvil horizontal a 915 × 412. Los botones **Pase** y **Barrida** produjeron sus confirmaciones. La pausa mostró **SALIR AL MENÚ** y volvió a la portada sin premiar al jugador. También observé un partido sin movimiento de usuario que terminó 0–5; no lo considero una medición de dificultad. Capturé menú y partido en ambos tamaños.
- **Hallazgos visuales:** el menú móvil concentra texto, dificultad y vestuario en el lado izquierdo con tipografía de 6–8 px. Durante el partido, los botones tienen áreas de unos 64–68 px; el remate es mayor. Las etiquetas caben, pero pierden legibilidad y quedan pegadas al borde inferior. Los jugadores son distinguibles por color, aunque cuerpo, pose y crowd se ven genéricos.
- **Brechas de producto:** no hay tutorial, desafío diario, monedas, niveles, récords, 15 logros ni canales de volumen separados. Solo cinco eventos de audio tienen sonidos propios. Los listados públicos de las referencias no especifican su diseño sonoro; esa comparación requiere escucha directa.
- **Assets:** no hay carpeta `assets-cc0`; conservaré el renderer procedural y mejoraré sus modelos y animaciones.
- **Puntuación:** 20/50 — primeros 30 s 5, sensación 4, gráficos 5, sonido 3, progresión 3.
- **Tests y build de base:** `pnpm test` pasó con 26 tests; la prueba incluida simuló 200 partidos, con 5,175 goles y 37,38 remates de promedio según el registro ya publicado, sin partidos sin remates. Duró 242 s. `pnpm build` pasó; Vite advierte que el bundle JS de 574 kB supera el umbral de 500 kB.
- **Siguiente:** ajustar primero legibilidad y tamaño del área táctil; luego añadir animación y respuesta audiovisual; cerrar un bucle de tutorial/progresión y reauditar en ambos tamaños.

## Ronda 1 · controles, tutorial y apoyos de IA

- **Hora:** 2026-09-26 00:22 ART.
- **Cambios:** blancos de acción más grandes; tutorial de 20 segundos con tres tareas y salida inmediata; asistencia de movimiento solo durante la primera partida rápida; dificultad Tranqui de entrada y aumento automático después de ganar; desmarques con carreras más amplias y búsqueda de espacio ante rivales y compañeros.
- **Prueba en navegador:** volví a iniciar con perfil local limpio en 915 × 412. El tutorial quedó dentro de la pantalla, **Omitir** lo cerró, y la barrida mostró su respuesta. Las dimensiones medidas fueron 78 × 78 px para pase, pase alto, barrida, truco y sprint; 87 × 124 px para remate. No se probó con pantalla táctil física.
- **Capturas:** menú y partido en 1366 × 768 y 915 × 412, antes en `outputs/captures/round-0/` y después en `outputs/captures/round-1/`. Revisé las cuatro imágenes nuevas: no hay texto ni controles recortados.
- **Tests y build:** la suite completa pasó con 30 tests en seis archivos antes de agregar el caso de primera victoria; luego los nueve tests de IA pasaron, incluido un partido completo simulado en el que el equipo local ganó con el jugador quieto. Total validado: 31 tests. La simulación de 200 partidos quedó en 5–7 goles y ningún partido sin remates. `pnpm build` pasó; el bundle JS quedó en 575,65 kB y todavía supera la alerta de 500 kB.
- **Promedio exacto:** un segundo intento aislado para imprimir la estadística no terminó. El test completo confirma el intervalo; el promedio exacto de esta ronda queda pendiente. El dato exacto anterior al cambio de IA era 5,175 goles y 37,38 remates.
- **Puntuación:** 24/50 — primeros 30 s 7, sensación 6, gráficos 5, sonido 3, progresión 3.
- **Siguiente:** animar articulaciones y pulir los modelos toon; separar volúmenes de música y efectos y dar sonido propio a cada acción; añadir monedas, niveles, récords, reto diario y logros.

## Ronda 2 · animaciones, mezcla de audio y carrera

- **Hora:** 2026-09-26, iniciada a las 02:51 ART.
- **Cambios:** agregué brazos y piernas articulados con ciclo de carrera, postura de celebración y desplazamiento lateral del arquero; sumé detalles de camiseta, cara, medias y botines. El audio ahora separa música, efectos e hinchada, cambia la frase musical entre menú y partido, agrega sonidos de pase, barrida e interfaz, y recuerda los niveles elegidos. Cada partido otorga 40 monedas y 75 XP por victoria, o 15 monedas y 35 XP por derrota; el menú muestra saldo, nivel y barra al siguiente nivel.
- **Capturas:** comparé las vistas de `outputs/captures/round-1/` con las cuatro de `outputs/captures/round-2-after/` en 1366 × 768 y 915 × 412. Revisé las imágenes nuevas. En 915 × 412 el menú y los botones del partido quedan dentro de la pantalla; los valores de la fila de progreso se ven pequeños.
- **Tests y build:** `pnpm test --exclude tests/aiBalance.test.ts --reporter=verbose` pasó 31 tests en cinco archivos; `pnpm build` pasó. El bundle JS quedó en 579,98 kB y conserva la advertencia de Vite por superar 500 kB.
- **Balance:** una repetición a 30 Hz promedió 7,995 goles y se descartó; distorsionaba el resultado. A 60 Hz, 200 partidos calcularon 5,525 goles, 39,26 remates y cero encuentros sin remates (78 victorias locales, 77 visitantes y 45 empates). La segunda corrida local se interrumpió tras más de 19 minutos; optimicé el contador de eventos para no recorrer la cola en cada frame sin eventos nuevos y volveré a medirla. El timeout del test quedó en 1.200 segundos. El workflow del commit `5aac843` terminó correctamente en tests/build, APK debug, Pages y prerelease: [ejecución 36222687147](https://github.com/biancogianluca19-bit/osviStreet/actions/runs/36222687147). Artefacto APK de 4,48 MB; prerelease [`debug-6-1`](https://github.com/biancogianluca19-bit/osviStreet/releases/tag/debug-6-1); Pages respondió HTTP 200.
- **Puntuación:** 29/50 — primeros 30 s 7, sensación 7, gráficos 6, sonido 5, progresión 4.
- **Pendiente:** probar la pantalla de mezcla mediante interacción directa, confirmar sonido con auriculares y medir 60 fps en un Android de gama media. Aún faltan tienda para gastar monedas, reto diario, récord local y 15 logros.
- **Siguiente:** convertir el saldo de monedas en desbloqueos elegibles; añadir el reto diario, récords y logros; rediseñar esa fila móvil para que nivel y saldo se lean a primera vista.

## Ronda 3 · tienda, desafío diario y logros

- **Hora:** 2026-09-26, cerrada a las 05:30 ART.
- **Cambios:** las monedas compran y equipan camisetas, botines o canchas; fijé precios de 35 a 180 monedas. El perfil guarda récord de goles en un partido, goles y trucos acumulados y mejor racha. Cada fecha local muestra uno de cuatro desafíos diarios con progreso y pago único de monedas/XP. La portada muestra saldo, XP, barra al siguiente artículo, reto, récords y acceso a quince logros desplazables.
- **Prueba de reglas:** compra insuficiente no descuenta saldo; una compra válida se conserva y permite equipar; el reto diario rota de fecha, da recompensa una sola vez y se migra desde perfiles viejos. Las pruebas cubren los quince logros.
- **Prueba de interfaz:** emulé el navegador con controles táctiles en 915 × 412. La tarjeta quedó dentro del viewport; se abrió el panel con quince logros; comprar y equipar guardó la camiseta y restó monedas; **JUGAR AHORA** inició el partido; eventos táctiles en **PASE** y **BARRIDA** activaron ambos botones. Guardé una captura extra del panel de logros.
- **Capturas revisadas:** cuatro vistas en 1366 × 768 y 915 × 412, además del panel de logros móvil: `outputs/captures/round-3-after/`. El panel se desplazó verticalmente y conservó tres columnas legibles.
- **Tests y build:** 37 tests en cinco archivos pasaron con `pnpm test --exclude tests/aiBalance.test.ts --reporter=verbose`; `pnpm build` pasó. Vite mantiene la advertencia por el bundle principal de 587,59 kB (156,98 kB gzip).
- **Balance:** la última simulación completa a 60 Hz registró 5,525 goles y 39,26 remates de promedio; no hubo partidos sin remates. No cambié reglas ni parámetros del partido esta ronda. La repetición local posterior se detuvo por el tiempo que ocupaba el equipo. Optimicé el conteo de eventos sin alterar el paso fijo de 60 Hz; el workflow del commit `fffcd99` pasó la suite completa, incluida la simulación de 200 partidos, además de APK, Pages y prerelease: [ejecución 36234266361](https://github.com/biancogianluca19-bit/osviStreet/actions/runs/36234266361).
- **Puntuación:** 34/50 — primeros 30 s 8, sensación 7, gráficos 6, sonido 5, progresión 8.
- **Siguiente:** dar más respuesta de cámara/sonido a pases, entradas y paredes; continuar la revisión de rendimiento y cerrar la verificación de 200 partidos con el nuevo límite.

## Ronda 4 · vibración y respuesta de cámara

- **Hora:** 2026-09-26, cierre de ronda.
- **Cambios:** agregué golpes de cámara de 200 ms con distinta intensidad para remate, truco, rebote, barrida, atajada y gol. Los mismos eventos piden una vibración corta si el navegador expone `navigator.vibrate`; los equipos sin esa API siguen usando cámara y audio.
- **Capturas:** guardé menú y partido a 1366 × 768 y 915 × 412 en `outputs/captures/round-4-after/`. Revisé las dos capturas de partido; el tutorial y los controles quedan dentro del cuadro en horizontal. En la captura fija no se aprecia el golpe de cámara porque requiere un evento.
- **Build:** `pnpm build` pasó; el bundle principal quedó en 588,41 kB (157,27 kB gzip) y Vite mantiene su aviso por superar 500 kB.
- **Tests:** 37 pruebas sin la simulación de 200 partidos; el workflow 36241297480 pasó la suite completa, APK, Pages y release debug-8-1.
- **Balance:** la medición reproducible anterior registró 5,525 goles y 39,26 remates por partido; cero encuentros sin remates. Esta ronda no cambia reglas ni parámetros de simulación.
- **Puntuación:** 36/50 — primeros 30 s 8, sensación 8, gráficos 7, sonido 5, progresión 8.
- **Siguiente:** confirmar tests y publicación de la ronda 4; revisar la carga del bundle, música durante partidos largos y respuesta en un teléfono Android real.

## Ronda 5 · carga inicial ligera

- **Hora:** 2026-09-26, 09:24–12:16 ART.
- **Cambios:** saqué la importación estática del renderer. El menú conserva una cancha 2D en CSS; al iniciar una partida se importa Three.js, se muestra PREPARANDO LA CANCHA y se inicia el bucle de render cuando el WebGL está listo. Al crear el renderer reinicio el contador de FPS para no interpretar el tiempo pasado en el menú como una caída de rendimiento.
- **Capturas:** guardé y revisé menú y partido a 1366 × 768 y 915 × 412 en outputs/captures/round-5-after/. La cancha 2D no recorta el menú; el partido carga los jugadores 3D y los controles quedan dentro de la pantalla móvil.
- **Medición de carga:** Chrome headless, caché fría, red 4G simulada (120 ms, 200 kB/s) y CPU 4×. El evento de carga del menú tomó 1,06 s en escritorio y 1,42 s en móvil. Desde tocar Partido hasta tener cancha 3D: 5,01 s en escritorio y 3,47 s en móvil. Chunk inicial 64,43 kB (21,85 kB gzip); renderer diferido 524,24 kB (135,51 kB gzip).
- **Tests y build:** 37 tests en cinco archivos pasaron sin aiBalance.test.ts; pnpm build pasó. La CI 36257059597 luego pasó la suite completa, APK, GitHub Pages y release `debug-9-1`.
- **Puntuación:** 37/50 — primeros 30 s 9, sensación 8, gráficos 7, sonido 5, progresión 8.
- **Siguiente:** reducir el tiempo del chunk 3D para iniciar el partido en menos de cinco segundos en escritorio lento; probar un Android real y medir el rendimiento; retomar la calidad de audio y las animaciones.

## Ronda 6 · música y efectos por capas

- **Hora:** 2026-09-26, 13:59–14:13 ART.
- **Cambios:** reemplacé el pitido melódico repetido por arreglos originales de cuatro compases: bajo, acordes, percusión y melodías separadas para el menú y el partido. El planificador mira 120 ms hacia adelante y salta al siguiente compás si la pestaña queda suspendida. Puse transitorios distintos en pase, remate, barrida, pared, truco e interfaz; el gol ahora combina una fanfarria con dos capas de hinchada. No encontré la carpeta assets-cc0 en el proyecto, así que mantuve la síntesis Web Audio.
- **Capturas y revisión:** guardé y abrí menú y partido a 1366 × 768 y 915 × 412 en `outputs/captures/round-6-after/`. El partido 3D y todos los controles entran en móvil. Una captura inicial de escritorio tomó el fallback CSS antes del primer frame 3D; ajusté la espera y volví a capturar con 2,5 s de render.
- **Audio en navegador:** con Chrome headless y entrada de mouse confiable, AudioContext quedó `running` en ambas resoluciones (0,89 s y 1,10 s de reloj de audio); cero errores de ejecución. Es una verificación de reproducción del navegador, no una escucha en teléfono.
- **Tests y build:** `pnpm build` pasó; Vite mantiene el aviso de chunk por el renderer diferido de 524,24 kB (135,51 kB gzip). Los 38 tests pasaron en seis archivos. La simulación cubrió 200 partidos: 5,525 goles, 39,26 remates por partido, 35,025 atajadas y cero partidos sin remates.
- **Puntuación:** 38/50 — primeros 30 s 9, sensación 8, gráficos 7, sonido 6, progresión 8.
- **Siguiente:** incorporar grabaciones CC0 de hinchada y pelota si se consiguen, verificar mezcla en auriculares/parlantes Android, medir FPS y entrada en un teléfono real, bajar el peso del renderer y completar animaciones de patear/atajar/festejar.

## Ronda 7 · poses de acción

- **Hora:** 2026-09-26, 14:48 ART.
- **Cambios:** remates, pases, barridas, atajadas y faltas disparan poses articuladas con duración y fuerza propias. Se reforzó el seguimiento de la pierna y el torso al patear; las barridas inclinan y bajan el cuerpo; el arquero se lanza; una falta produce una reacción. Añadí polvo para la barrida y ráfagas de equipo para pases, remates y atajadas. Las celebraciones alternan saltos y patadas.
- **Prueba en navegador:** en Chrome headless, inicié un partido 915 × 412 y pulsé Remate y Barrida. Los dos eventos aparecieron en pantalla; no hubo errores JavaScript. Los botones midieron 78 × 78 px y el remate 87 × 124 px. Revisé también el partido en 1366 × 768.
- **Capturas:** revisé antes y después. La captura de barrida deja clara la pose horizontal; en la captura del remate el aviso se lee, pero la pierna se distingue menos. El disparo se capturó cerca del inicio de la animación. No capturé un evento de atajada o falta por separado. Archivos en `outputs/captures/round-7-after/`.
- **Tests y build:** `pnpm test --reporter=verbose` pasó los 38 tests de seis archivos, incluidos 200 partidos: 5,525 goles y 39,26 remates de promedio, 35,025 atajadas y cero partidos sin remates. `pnpm build` pasó. Vite sigue advirtiendo que el chunk del renderer supera 500 kB.
- **Puntuación:** 40/50 — primeros 30 s 9, sensación 9, gráficos 8, sonido 6, progresión 8.
- **Pendiente:** verificar el toque físico, el remate y la atajada en movimiento; probar audio y rendimiento en Android. No pude verificar 60 FPS en un teléfono.
- **Siguiente:** mejorar la lectura del remate y capturar una atajada; medir FPS/carga en Android de gama media; reducir el chunk 3D; revisar las cuatro canchas y las pantallas de menú en un teléfono; comparar y corregir la mezcla musical y los efectos con escucha real.

## Ronda 8 · controles táctiles y saques

- **Hora:** 2026-09-26, 15:05–15:20 ART.
- **Hallazgo:** después de un gol el saque dura 1,45 s, pero el buffer de entrada era 1,4 s. Una acción tocada al comienzo podía vencer justo antes de reanudar el partido. El aviso también decía que faltaba recuperar la pelota aunque el saque siguiera bloqueado.
- **Cambios:** elevé el buffer a 1,8 s y reuní el tiempo del saque y el buffer en `src/game/timing.ts`; ahora el aviso diferencia **ESPERA EL SAQUE** de **RECUPERÁ LA PELOTA**. Pase, pase alto, barrida, truco, sprint y remate aumentaron a 86 × 86 px; remate a 91 × 140 px y pausa a 68 × 46 px en 915 × 412. Amplié iconos y etiquetas.
- **Prueba en navegador:** usé Chrome headless con eventos de toque emulados. Un toque de Pase durante el saque produjo **PASE**; Barrida produjo **BARRIDA**; Pausa abrió el panel y **SALIR AL MENÚ** volvió a la portada. Cero errores JavaScript. El reinicio postgol se verificó con una prueba unitaria que contrasta sus 1,45 s con el buffer de 1,8 s; el toque de navegador se hizo durante el saque inicial de 0,65 s.
- **Capturas:** comparé `outputs/captures/round-7-after/match-915x412.png` con las capturas nuevas. Los botones ahora resaltan y los rótulos se leen mejor; no recortan el límite inferior. Guardé menú y partido a 1366 × 768 y 915 × 412, además de Pase, Barrida y pausa.
- **Tests y build:** `pnpm test --reporter=verbose` pasó 41 tests en siete archivos. Los 200 partidos dieron 5,525 goles, 39,26 remates y cero partidos sin remates. `pnpm build` pasó; Vite sigue avisando que el chunk Three.js supera 500 kB.
- **Puntuación:** 40/50 — primeros 30 s 9, sensación 9, gráficos 8, sonido 6, progresión 8. La nota no sube: la respuesta táctil mejoró, pero falta comprobarla físicamente y revisar rendimiento en Android.
- **Pendiente:** probar la APK en teléfono Android; medir 60 FPS y controles físicos; probar los ocho gestos de truco sobre un panel táctil real; escuchar la mezcla con auriculares; continuar afinando animación de remate y atajada.
- **Siguiente:** instalar y probar en un Android de gama media; medir los FPS en las cuatro canchas; reducir el chunk 3D y mantener el partido bajo cinco segundos de carga; hacer más legible el remate y verificar atajadas en movimiento; escuchar y reemplazar la síntesis por audio CC0 donde mejore el resultado.
