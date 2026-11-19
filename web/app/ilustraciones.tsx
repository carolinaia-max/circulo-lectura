// Ilustraciones decorativas e íconos del diseño suizo.
// Todas son decorativas: llevan aria-hidden y no tienen texto.

const ROJO = "#E30613";
const TINTA = "#111111";
const BLANCO = "#FFFFFF";

// Iniciar sesión: retícula, luna y lectora en monociclo sobre el mundo.
export function IlustracionLectora() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="arte-svg"
      viewBox="170 200 600 650"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <clipPath id="globo">
          <circle cx="470" cy="880" r="170" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="1000" height="1100" fill={ROJO} />
      <line x1="266" y1="0" x2="266" y2="900" stroke={BLANCO} strokeOpacity="0.35" strokeWidth="1" />
      <line x1="533" y1="0" x2="533" y2="900" stroke={BLANCO} strokeOpacity="0.35" strokeWidth="1" />
      <line x1="0" y1="300" x2="800" y2="300" stroke={BLANCO} strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="680" cy="290" r="22" fill={BLANCO} />
      <circle cx="680" cy="290" r="40" fill="none" stroke={BLANCO} strokeWidth="2" />
      <circle cx="470" cy="880" r="170" fill={TINTA} />
      <g clipPath="url(#globo)" stroke={BLANCO} strokeWidth="2" fill="none">
        <ellipse cx="470" cy="880" rx="60" ry="170" />
        <ellipse cx="470" cy="880" rx="120" ry="170" />
        <line x1="470" y1="700" x2="470" y2="1060" />
        <line x1="280" y1="760" x2="660" y2="760" />
        <line x1="280" y1="820" x2="660" y2="820" />
        <line x1="280" y1="880" x2="660" y2="880" />
      </g>
      <circle cx="470" cy="655" r="50" fill="none" stroke={TINTA} strokeWidth="10" />
      <line x1="424.0" y1="655.0" x2="516.0" y2="655.0" stroke={TINTA} strokeWidth="2" />
      <line x1="437.5" y1="622.5" x2="502.5" y2="687.5" stroke={TINTA} strokeWidth="2" />
      <line x1="470.0" y1="609.0" x2="470.0" y2="701.0" stroke={TINTA} strokeWidth="2" />
      <line x1="502.5" y1="622.5" x2="437.5" y2="687.5" stroke={TINTA} strokeWidth="2" />
      <circle cx="470" cy="655" r="8" fill={TINTA} />
      <line x1="470" y1="655" x2="470" y2="556" stroke={TINTA} strokeWidth="8" />
      <polyline points="458,552 446,600 470,640" fill="none" stroke={BLANCO} strokeWidth="12" strokeLinejoin="miter" />
      <polyline points="482,552 500,596 482,670" fill="none" stroke={BLANCO} strokeWidth="12" strokeLinejoin="miter" />
      <rect x="438" y="544" width="64" height="12" fill={TINTA} />
      <polygon points="446,436 494,436 502,548 438,548" fill={TINTA} />
      <rect x="446" y="468" width="56" height="8" fill={BLANCO} />
      <rect x="442" y="492" width="62" height="8" fill={BLANCO} />
      <polyline points="450,448 418,392 412,318" fill="none" stroke={TINTA} strokeWidth="10" strokeLinejoin="miter" />
      <polyline points="490,446 522,392 528,318" fill="none" stroke={TINTA} strokeWidth="10" strokeLinejoin="miter" />
      <polygon points="470,318 384,296 384,236 470,258" fill={BLANCO} />
      <polygon points="470,318 556,296 556,236 470,258" fill={BLANCO} />
      <polygon points="470,326 378,302 378,296 470,320 562,296 562,302" fill={TINTA} />
      <line x1="470" y1="258" x2="470" y2="320" stroke={TINTA} strokeWidth="3" />
      <g stroke={TINTA} strokeWidth="2">
        <line x1="396" y1="252" x2="458" y2="268" />
        <line x1="396" y1="264" x2="458" y2="280" />
        <line x1="396" y1="276" x2="440" y2="287" />
        <line x1="482" y1="268" x2="544" y2="252" />
        <line x1="482" y1="280" x2="544" y2="264" />
        <line x1="482" y1="292" x2="526" y2="281" />
      </g>
      <circle cx="412" cy="314" r="8" fill={TINTA} />
      <circle cx="528" cy="314" r="8" fill={TINTA} />
      <circle cx="470" cy="408" r="26" fill={BLANCO} />
    </svg>
  );
}

const CORAZON =
  "M300 430 C300 430 120 330 120 220 C120 150 180 106 236 116 C268 122 290 148 300 176 C310 148 332 122 364 116 C420 106 480 150 480 220 C480 330 300 430 300 430 Z";

// Crear cuenta: libro abierto cuyas páginas forman un corazón.
export function IlustracionLibroCorazon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="registro-svg"
      viewBox="0 0 600 560"
      fill="none"
    >
      <path d="M300 430 L30 386 L30 446 L300 492 Z" fill={BLANCO} />
      <path d="M300 430 L570 386 L570 446 L300 492 Z" fill={BLANCO} />
      <path
        d="M30 401 L300 446 L570 401 M30 416 L300 461 L570 416 M30 431 L300 476 L570 431"
        stroke={TINTA}
        strokeWidth="2"
      />
      <path d="M300 492 L30 446 L30 470 L300 516 L570 470 L570 446 Z" fill={ROJO} />
      <path d={CORAZON} fill={ROJO} />
      <g stroke={BLANCO} strokeWidth="3">
        {[0.78, 0.56, 0.34].map((escala) => (
          <path
            key={escala}
            transform={`translate(300 430) scale(${escala}) translate(-300 -430)`}
            vectorEffect="non-scaling-stroke"
            d={CORAZON}
          />
        ))}
      </g>
      <path d="M300 176 L300 430" stroke={TINTA} strokeWidth="3" />
    </svg>
  );
}

// Modal de nuevo libro: círculo negro, luna y libros sobre un estante.
// Es la maqueta de Catalogo.dc.html (hecha con cajas) pasada a SVG.
export function IlustracionNuevoLibro() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="arte-svg"
      viewBox="0 0 400 640"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="0" y="0" width="400" height="640" fill={ROJO} />
      <line x1="200" y1="0" x2="200" y2="640" stroke={BLANCO} strokeOpacity="0.45" strokeWidth="1" />
      <line x1="0" y1="217.6" x2="400" y2="217.6" stroke={BLANCO} strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="84" cy="79.2" r="156" fill={TINTA} />
      <circle cx="324" cy="85.6" r="28" fill={BLANCO} />
      <rect x="48" y="373.2" width="50.4" height="202.8" fill={BLANCO} />
      <rect x="106.4" y="294.4" width="70.5" height="281.6" fill={TINTA} />
      <rect x="184.9" y="412.7" width="40.3" height="163.3" fill={BLANCO} />
      <rect x="233.2" y="333.8" width="50.4" height="242.2" fill={BLANCO} />
      <rect
        x="291.6"
        y="316.9"
        width="60.4"
        height="259.1"
        fill={TINTA}
        transform="rotate(14 291.6 576)"
      />
      <rect x="48" y="576" width="304" height="10" fill={TINTA} />
    </svg>
  );
}

// ÍCONOS

export function IconoFlecha() {
  return (
    <svg aria-hidden="true" focusable="false" width="28" height="16" viewBox="0 0 28 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M0 8h26M19 1l7 7-7 7" />
    </svg>
  );
}

export function IconoMas() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 0v18M0 9h18" />
    </svg>
  );
}

export function IconoCerrar() {
  return (
    <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 2l18 18M20 2L2 20" />
    </svg>
  );
}

export function IconoLapiz({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

export function IconoBasura() {
  return (
    <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter">
      <path d="M3 6h18" />
      <path d="M9 6V3h6v3" />
      <path d="M5 6l1 15h12l1-15" />
      <path d="M10 10v7M14 10v7" />
    </svg>
  );
}
