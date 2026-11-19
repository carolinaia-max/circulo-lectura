import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
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
  invalido,
  className,
  children,
}: {
  id: string;
  etiqueta: ReactNode;
  nota?: string;
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
      {nota ? (
        <div className="campo-cabecera">
          {label}
          <span className="campo-nota">{nota}</span>
        </div>
      ) : (
        label
      )}
      {children}
    </div>
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
