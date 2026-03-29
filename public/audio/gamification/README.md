# Sonidos de gamificación

## Dónde se usan en la app

- **Motor:** `src/shared/lib/gamificationAudio.ts` — función `play(effectId)`. La lista de archivos que realmente se cargan está en el objeto **`SAMPLE_FILES`** (si cambias un nombre de archivo, actualiza ahí también).
- **Pantalla que dispara sonidos hoy:** `/dashboard/gamification-lab` — `src/app/(dashboard)/dashboard/gamification-lab/page.tsx` (botones de prueba, slider de XP, ranking simulado, insignia, fin de temporada, etc.).
- **Resto del dashboard:** de momento no llama a `play()`; cuando lo hagas (por ejemplo al cerrar temporada o al desbloquear medalla), usarás el mismo `effectId` y se reproducirá el archivo **EN-USO** correspondiente a la variante A/B/C guardada en preferencias.

## Convención de nombres (archivos en uso)

Solo los que empiezan por **`EN-USO_`** están referenciados por el motor. Formato:

`EN-USO_effect-{effectId}_variant-{a|b|c}_{descripcion-corta}.{mp3|wav}`

- **`effectId`:** coincide con el tipo en TypeScript: `click`, `xp_gain`, `rank_shift`, `badge_unlock`, `season_finale`.
- **`variant-*`:** la variante que el usuario elige en ajustes de audio del lab (`a` / `b` / `c`). Si no hay archivo para esa pareja efecto+variante → **síntesis** (Web Audio).

## Catálogo EN-USO (referencia cruzada)

| Archivo en disco | `effectId` | Variante | Rol del sonido |
|------------------|------------|----------|----------------|
| `EN-USO_effect-click_variant-a_mixkit-select-click.wav` | `click` | a | Clic de UI (lab y botones que llamen `play("click")`) |
| `EN-USO_effect-xp_gain_variant-a_level-up-5.mp3` | `xp_gain` | a | Ganancia de XP / micro-recompensa |
| `EN-USO_effect-xp_gain_variant-b_level-up-1.mp3` | `xp_gain` | b | Variante XP |
| `EN-USO_effect-xp_gain_variant-c_mixkit-quick-win.wav` | `xp_gain` | c | “Quick win” |
| `EN-USO_effect-rank_shift_variant-a_mixkit-arcade-score.wav` | `rank_shift` | a | Cambio de puesto / tabla tipo score |
| `EN-USO_effect-rank_shift_variant-b_whoosh-coin-ding.mp3` | `rank_shift` | b | Whoosh + moneda |
| `EN-USO_effect-rank_shift_variant-c_mixkit-wind-swoosh.wav` | `rank_shift` | c | Transición / swoosh |
| `EN-USO_effect-badge_unlock_variant-a_mixkit-ethereal-win.wav` | `badge_unlock` | a | Logro / insignia |
| `EN-USO_effect-badge_unlock_variant-b_freesound-tadaa.mp3` | `badge_unlock` | b | Revelación tipo “ta-da” |
| `EN-USO_effect-badge_unlock_variant-c_freesound-trumpet-fanfare.mp3` | `badge_unlock` | c | Fanfarria corta de logro |
| `EN-USO_effect-season_finale_variant-a_jimscott-super-fanfare.mp3` | `season_finale` | a | Cierre de temporada (épico) |
| `EN-USO_effect-season_finale_variant-b_mufp2-fanfare.mp3` | `season_finale` | b | Fanfarria media |
| `EN-USO_effect-season_finale_variant-c_freesound-fasching-fanfare.mp3` | `season_finale` | c | Fanfarria festiva |

## Archivos extra (no EN-USO)

No están en `SAMPLE_FILES`; sirven como reserva para sustituir o ampliar variantes.

- `freesound_community-medieval-fanfare-6826.mp3`
- `video-game-bonus-retro-sparkle-gamemaster-audio-lower-tone-1-00-00.mp3`
- `mixkit-cheering-crowd-loud-whistle-610.wav`

Para activar uno: renómbralo al patrón `EN-USO_...`, añade la entrada en `SAMPLE_FILES` y documenta la fila aquí.

## Atribución y licencias

Revisa licencias de Mixkit, Freesound y demás fuentes según tu despliegue. Los slugs finales del nombre (`mixkit-…`, `freesound-…`, etc.) ayudan a rastrear el pack.

## Nota técnica

Cada URL es un solo archivo (extensión fija). El buffer se cachea en memoria por URL tras el primer `fetch` + `decodeAudioData`.
