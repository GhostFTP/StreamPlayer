export const APP_VERSION = '1.4.0';

// Most recent first.
export const CHANGELOG = [
  {
    version: '1.4.0',
    date: '2026-08-10',
    changes: [
      'Rate limiting en el login: bloquea una IP por 15 minutos tras 5 intentos fallidos.',
      'Cabeceras de seguridad HTTP (Helmet.js).',
      'Nuevo orden de biblioteca por "Recién agregado", además del alfabético.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-10',
    changes: [
      'Atajos de teclado en el reproductor: espacio (play/pause), flechas (seek y volumen), F (pantalla completa), M (mute).',
      'Auto-reproducción del siguiente episodio en series, con aviso y cuenta regresiva cancelable.',
      'Integración con Media Session API: título, carátula y controles nativos en la pantalla de bloqueo y auriculares.',
      'Control de velocidad de reproducción (0.5x a 2x).',
      'Picture-in-Picture nativo del navegador.',
      'Selector de pista de audio (disponible en navegadores compatibles, como Safari).',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-10',
    changes: [
      'Soporte de Chromecast y AirPlay desde el reproductor.',
      'Selector de calidad con transcodificación en vivo (ffmpeg), de 360p a 1080p.',
      'Reproducción automática al abrir una película o episodio.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-21',
    changes: [
      'Integración con TMDB: pósters automáticos como respaldo cuando no hay uno local.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-21',
    changes: [
      'Lanzamiento inicial: exploración de archivos, streaming con range requests, login con JWT, favoritos, continuar viendo, búsqueda y administración de usuarios.',
    ],
  },
];
