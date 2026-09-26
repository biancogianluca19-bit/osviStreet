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
- **Balance:** una repetición a 30 Hz promedió 7,995 goles y se descartó; distorsionaba el resultado. Restauré el simulador a 60 Hz. La prueba aceptada anterior a esta ronda completó 200 partidos a 60 Hz: 5,175 goles, 37,38 remates y cero encuentros sin remates. La repetición de 200 partidos a 60 Hz de esta ronda sigue en curso.
- **Puntuación:** 29/50 — primeros 30 s 7, sensación 7, gráficos 6, sonido 5, progresión 4.
- **Pendiente:** probar la pantalla de mezcla mediante interacción directa, confirmar sonido con auriculares y medir 60 fps en un Android de gama media. Aún faltan tienda para gastar monedas, reto diario, récord local y 15 logros.
- **Siguiente:** convertir el saldo de monedas en desbloqueos elegibles; añadir el reto diario, récords y logros; rediseñar esa fila móvil para que nivel y saldo se lean a primera vista.
