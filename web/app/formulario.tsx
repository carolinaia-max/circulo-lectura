import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type RefObject,
} from "react";

// Un error que se muestra en un formulario y los campos que debe marcar en rojo.
export type ErrorDeCampos = {
  mensaje: string;
  campos: string[];
};

// Error lanzado por las llamadas a la API que conserva los campos afectados.
export class ErrorApi extends Error {
  campos: string[];

  constructor(error: ErrorDeCampos) {
    super(error.mensaje);
    this.name = "ErrorApi";
    this.campos = error.campos;
  }
}

export function mensajeObligatorios(vacios: string[]): string {
  return vacios.length === 1
    ? "Este campo es obligatorio."
    : "Completa los campos obligatorios marcados en rojo.";
}

// Lee una respuesta de error de FastAPI. Los errores 400 traen
// `fields: [{ campo: "body.paginas", mensaje }]`; el último tramo de
// `campo` es el nombre del campo del formulario.
export function leerErrorApi(data: unknown, respaldo: string): ErrorDeCampos {
  if (typeof data !== "object" || data === null) {
    return { mensaje: respaldo, campos: [] };
  }

  const result = data as {
    detail?: unknown;
    fields?: Array<{ campo?: unknown; mensaje?: unknown }>;
  };

  const fields = Array.isArray(result.fields) ? result.fields : [];
  const campos = fields
    .map((field) =>
      typeof field.campo === "string" ? field.campo.split(".").pop() ?? "" : "",
    )
    .filter(Boolean);

  const primerMensaje = fields[0]?.mensaje;
  const detail = typeof result.detail === "string" ? result.detail : respaldo;

  let mensaje = detail;
  if (campos.length > 1) {
    mensaje = "Revisa los campos marcados en rojo.";
  } else if (typeof primerMensaje === "string") {
    mensaje = primerMensaje.replace(/^Value error,\s*/, "");
  }

  return { mensaje, campos };
}

// Estado de error de un formulario: el mensaje y los campos marcados.
// Al modificar un campo se quita su marca; cuando ya no queda ningún
// campo marcado, el mensaje desaparece.
export function useErroresDeCampos(idMensaje: string) {
  const [error, setError] = useState<ErrorDeCampos | null>(null);

  const marcar = useCallback((nuevo: ErrorDeCampos | null) => {
    setError(nuevo);
  }, []);

  const limpiarCampo = useCallback((campo: string) => {
    setError((actual) => {
      if (!actual || !actual.campos.includes(campo)) return actual;

      const campos = actual.campos.filter((item) => item !== campo);
      return campos.length ? { ...actual, campos } : null;
    });
  }, []);

  function tieneError(campo: string) {
    return Boolean(error?.campos.includes(campo));
  }

  function aria(campo: string) {
    return tieneError(campo)
      ? { "aria-invalid": true as const, "aria-describedby": idMensaje }
      : {};
  }

  return { error, marcar, limpiarCampo, tieneError, aria, idMensaje };
}

export function MensajeError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} role="alert" className="mensaje-error">
      {children}
    </p>
  );
}

export function Campo({
  id,
  etiqueta,
  nota,
  accesorio,
  invalido,
  className,
  children,
}: {
  id: string;
  etiqueta: ReactNode;
  nota?: string;
  // Control que va a la derecha de la etiqueta (por ejemplo, "Anónimo").
  accesorio?: ReactNode;
  invalido?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const clases = ["campo", invalido ? "campo--error" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  const label = (
    <label htmlFor={id} className="etiqueta">
      {etiqueta}
    </label>
  );

  return (
    <div className={clases}>
      {nota || accesorio ? (
        <div className="campo-cabecera">
          {label}
          {nota && <span className="campo-nota">{nota}</span>}
          {accesorio}
        </div>
      ) : (
        label
      )}
      {children}
    </div>
  );
}

// Casilla de verificación con el estilo del proyecto (cuadro negro, sin
// esquinas redondeadas). El área clickeable mide al menos 44 px de alto.
export function Casilla({
  checked,
  onChange,
  disabled,
  children,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={["casilla", className ?? ""].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="casilla-cuadro" aria-hidden="true" />
      {children}
    </label>
  );
}

// Propiedades del campo que el espejo copia para que su texto quede
// exactamente encima del texto del campo.
const ESTILOS_COPIADOS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "fontVariantNumeric",
  "textAlign",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
] as const;

// Campo de texto que puede resaltar en rojo caracteres sueltos.
// Un <input> no puede pintar partes de su texto, así que, mientras hay
// caracteres que resaltar, el texto del campo se vuelve transparente y una
// capa "espejo" encima (sin eventos de puntero) dibuja el mismo texto con los
// caracteres inválidos marcados. El cursor, la selección y el foco siguen
// siendo los del campo real.
export function EntradaResaltada({
  resaltar,
  value,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value"> & {
  value: string;
  resaltar: number[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const espejoRef = useRef<HTMLDivElement>(null);
  const activo = resaltar.length > 0;

  useLayoutEffect(() => {
    const input = inputRef.current;
    const espejo = espejoRef.current;
    if (!activo || !input || !espejo) return;

    const estilos = getComputedStyle(input);
    for (const propiedad of ESTILOS_COPIADOS) {
      espejo.style[propiedad] = estilos[propiedad];
    }
    const alturaTexto =
      input.clientHeight -
      parseFloat(estilos.paddingTop) -
      parseFloat(estilos.paddingBottom);
    espejo.style.lineHeight = `${alturaTexto}px`;

    // Mantener el espejo desplazado igual que el campo cuando el texto
    // es más largo que la caja.
    const sincronizar = () => {
      espejo.scrollLeft = input.scrollLeft;
    };
    sincronizar();

    const eventos = ["scroll", "input", "keyup", "click", "select", "focus"];
    eventos.forEach((evento) => input.addEventListener(evento, sincronizar));
    return () =>
      eventos.forEach((evento) => input.removeEventListener(evento, sincronizar));
  }, [activo, value, className]);

  const marcados = new Set(resaltar);
  const partes: ReactNode[] = [];
  let index = 0;
  for (const char of value) {
    partes.push(
      marcados.has(index) ? (
        <span key={index} className="caracter-invalido">
          {char}
        </span>
      ) : (
        char
      ),
    );
    index += char.length;
  }

  return (
    <span className="entrada-resaltable">
      <input
        ref={inputRef}
        value={value}
        className={[className, activo ? "entrada--resaltada" : ""].filter(Boolean).join(" ")}
        {...props}
      />
      {activo && (
        <span ref={espejoRef} className="entrada-espejo" aria-hidden="true">
          {partes}
        </span>
      )}
    </span>
  );
}

// MENÚ DESPLEGABLE
// Un <select> con el estilo de los campos. Si el valor actual no está en
// la lista (un libro antiguo con otro género o año), se muestra como opción
// deshabilitada para que se vea qué tenía y haya que elegir uno válido.
// Una opción puede ser un texto (valor y texto iguales) o un par valor/texto.
export type OpcionSelector = string | { valor: string; texto: string };

// Texto sin acentos ni mayúsculas, para la búsqueda por teclado.
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function Selector({
  opciones,
  placeholder,
  vacioElegible = false,
  value,
  className,
  onChange,
  onKeyDown,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value"> & {
  opciones: OpcionSelector[];
  // Texto de la opción vacía ("Elige un género", "Todos"…).
  placeholder: string;
  // true en los filtros: la opción vacía se puede volver a elegir.
  vacioElegible?: boolean;
  value: string;
}) {
  const lista = opciones.map((opcion) =>
    typeof opcion === "string" ? { valor: opcion, texto: opcion } : opcion,
  );
  const fueraDeLista = value !== "" && !lista.some((opcion) => opcion.valor === value);
  const clases = ["entrada", "selector-campo", value === "" ? "selector-vacio" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  // BÚSQUEDA POR TECLADO
  // Con el menú enfocado, escribir salta a la primera opción que empieza
  // con lo tecleado (sin acentos ni mayúsculas). No se escribe nada: solo
  // cambia la opción elegida. Las letras tecleadas en menos de 1 segundo se
  // juntan ("18" → 1899, "186" → 1869); repetir la misma letra pasa a la
  // siguiente opción que empieza con ella ("t", "t" → Thriller, Terror).
  const tecleado = useRef({ texto: "", hasta: 0 });

  function buscarPorTeclado(event: KeyboardEvent<HTMLSelectElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return; // solo teclas que escriben un carácter

    const ahora = Date.now();
    const buffer = tecleado.current;
    if (ahora > buffer.hasta) buffer.texto = "";
    // Un espacio al principio abre el menú, como siempre.
    if (event.key === " " && buffer.texto === "") return;

    event.preventDefault();
    buffer.texto += normalizar(event.key);
    buffer.hasta = ahora + 1000;

    const elegibles = [
      ...(vacioElegible ? [{ valor: "", texto: placeholder }] : []),
      ...lista,
    ];
    const misma = [...buffer.texto].every((letra) => letra === buffer.texto[0]);
    const busqueda = misma ? buffer.texto[0] : buffer.texto;
    const coincidencias = elegibles.filter((opcion) =>
      normalizar(opcion.texto).startsWith(busqueda),
    );
    if (!coincidencias.length) return;

    let elegida = coincidencias[0];
    if (misma && buffer.texto.length > 1) {
      // Misma letra repetida: avanzar a la siguiente con esa letra.
      const actual = coincidencias.findIndex((opcion) => opcion.valor === value);
      elegida = coincidencias[(actual + 1) % coincidencias.length];
    }
    if (elegida.valor === value) return;

    const select = event.currentTarget;
    select.value = elegida.valor;
    onChange?.({ ...event, target: select, currentTarget: select } as unknown as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <span className="selector">
      <select
        value={value}
        className={clases}
        onChange={onChange}
        onKeyDown={buscarPorTeclado}
        {...props}
      >
        <option value="" disabled={!vacioElegible}>
          {placeholder}
        </option>
        {fueraDeLista && (
          <option value={value} disabled>
            {value} (no está en la lista)
          </option>
        )}
        {lista.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        focusable="false"
        className="selector-flecha"
        width="14"
        height="9"
        viewBox="0 0 14 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M1 1l6 6 6-6" />
      </svg>
    </span>
  );
}

// CAMPOS SIN ESPACIOS (contraseñas)

const ESPACIOS = /\s/g;

// Quita los espacios (y tabulaciones, saltos de línea o espacios duros) del
// campo y deja el cursor donde estaba, descontando los espacios quitados.
function quitarEspacios(input: HTMLInputElement) {
  const { value } = input;
  if (!/\s/.test(value)) return;

  const cursor = input.selectionStart ?? value.length;
  const nuevoCursor = value.slice(0, cursor).replace(ESPACIOS, "").length;

  input.value = value.replace(ESPACIOS, "");
  input.setSelectionRange(nuevoCursor, nuevoCursor);
}

// Propiedades para un <input> no controlado que no admite espacios:
// la barra espaciadora no escribe nada y, si un espacio llega por otra vía
// (pegar, arrastrar, autocompletar, teclado del celular), se quita al instante.
export function sinEspacios(alCambiar?: () => void) {
  return {
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === " " || event.key === "Spacebar") event.preventDefault();
    },
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      quitarEspacios(event.currentTarget);
      alCambiar?.();
    },
  };
}

// Lleva el foco a un campo por su id (por ejemplo, el primero con error).
export function enfocarCampo(id: string) {
  document.getElementById(id)?.focus();
}

// Al abrir un diálogo enfoca su primer campo (o su primer botón) y, al
// cerrarlo, devuelve el foco al control que lo abrió.
export function useFocoInicial(
  ref: RefObject<HTMLElement | null>,
  activo: boolean,
) {
  useEffect(() => {
    if (!activo) return;

    const previo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const contenedor = ref.current;
    const destino =
      contenedor?.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled])",
      ) ??
      contenedor?.querySelector<HTMLElement>(
        "button:not([disabled]), [href]",
      );

    destino?.focus();

    return () => {
      if (previo && document.contains(previo)) previo.focus();
    };
  }, [activo, ref]);
}
