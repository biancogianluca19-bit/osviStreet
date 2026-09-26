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
