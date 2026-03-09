# Catálogo de sonidos gamificados

El motor de audio usa **sonidos sintéticos** (Web Audio API) como placeholders por defecto, con 3 variantes (A/B/C) por efecto:

- `click` – interacciones UI
- `xp_gain` – ganancia de XP
- `rank_shift` – cambio de ranking
- `badge_unlock` – desbloqueo de insignia
- `season_finale` – fin de temporada

Para usar archivos MP3 reales, coloca aquí:

- `click-a.mp3`, `click-b.mp3`, `click-c.mp3`
- `xp-a.mp3`, `xp-b.mp3`, `xp-c.mp3`
- `rank-a.mp3`, `rank-b.mp3`, `rank-c.mp3`
- `badge-a.mp3`, `badge-b.mp3`, `badge-c.mp3`
- `finale-a.mp3`, `finale-b.mp3`, `finale-c.mp3`

El motor actual usa síntesis; futuras versiones pueden cargar desde estas rutas si existen.
