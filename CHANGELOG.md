# Changelog

Todas las versiones notables de Nyx se documentan en este archivo.

## [1.5.0] - 2026-08-10

### Added
- Soporte de PWA (manifest, íconos, favicon, service worker): instalable con ícono propio y
  pantalla completa; la interfaz sigue funcionando offline (el streaming en sí no).
- Menú "⋮ Más opciones" en el reproductor para pantallas ≤600px, que agrupa Audio, Velocidad,
  Calidad, Cast y Picture-in-Picture para que la fila de controles no desborde en celular.

### Fixed
- Llave `}` de más al final de `index.css` (arrastrada desde el commit inicial).

## [1.4.0] - 2026-08-10

### Added
- Rate limiting en el login: bloquea una IP por 15 minutos tras 5 intentos fallidos.
- Cabeceras de seguridad HTTP (Helmet.js).
- Orden de biblioteca por "Recién agregado", además del alfabético.
- Apartado de Novedades dentro de la app (menú → Novedades).

## [1.3.0] - 2026-08-10

### Added
- Atajos de teclado en el reproductor (espacio, flechas, F, M).
- Auto-reproducción del siguiente episodio en series, con aviso y cuenta regresiva cancelable.
- Integración con Media Session API (controles nativos del SO / pantalla de bloqueo).
- Control de velocidad de reproducción (0.5x–2x).
- Picture-in-Picture nativo del navegador.
- Selector de pista de audio (Safari; no soportado en Chrome/Firefox).

## [1.2.0] - 2026-08-10

### Added
- Soporte de Chromecast y AirPlay desde el reproductor.
- Selector de calidad con transcodificación en vivo (ffmpeg), de 360p a 1080p.
- Reproducción automática al abrir una película o episodio.

## [1.1.0] - 2026-07-21

### Added
- Integración con TMDB: pósters automáticos como respaldo cuando no hay uno local.

## [1.0.0] - 2026-07-21

### Added
- Lanzamiento inicial: exploración de archivos, streaming con range requests, login con JWT,
  favoritos, continuar viendo, búsqueda y administración de usuarios.
