"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

import {
  MINIMO,
  buscarSugerencias,
  textoDeBusqueda,
  type CampoBusqueda,
  type Sugerencia,
} from "./openLibrary";

const ESPERA_MS = 300;

type Estado = {
  campo: CampoBusqueda | null;
  sugerencias: Sugerencia[];
  cargando: boolean;
  error: boolean;
  // true cuando hay suficientes caracteres para buscar.
  suficiente: boolean;
};

// Sugerencias de Open Library para los campos Título, Autor e ISBN de un
// modal. Busca en el campo donde se está escribiendo, espera a que se deje
// de teclear un momento y cancela la búsqueda anterior si llega otra letra.
//
// Uso en un formulario:
//   const auto = useAutocompletado(valores, elegir);
//   onChange: auto.alEscribir("titulo")
//   en el <input>: {...auto.propsEntrada("titulo", idDelCampo)}
//   debajo del <input>: {auto.lista("titulo", idDelCampo)}
export function useAutocompletado(
  valores: Partial<Record<CampoBusqueda, string>>,
  onElegir: (sugerencia: Sugerencia) => void,
) {
  // Campo en el que se está escribiendo; la lista se muestra debajo de él.
  const [buscando, setBuscando] = useState<CampoBusqueda | null>(null);
  const [resaltada, setResaltada] = useState(-1);
  const [estado, setEstado] = useState<Estado>({
    campo: null,
    sugerencias: [],
    cargando: false,
    error: false,
    suficiente: false,
  });

  const texto = buscando ? valores[buscando] ?? "" : "";

  useEffect(() => {
    if (!buscando) return;

    const consulta = textoDeBusqueda(buscando, texto);
    if (consulta.length < MINIMO[buscando]) {
      setEstado({ campo: buscando, sugerencias: [], cargando: false, error: false, suficiente: false });
      return;
    }

    // Mientras llega la respuesta se conservan las sugerencias anteriores
    // del mismo campo, para que la lista no parpadee.
    setEstado((actual) => ({
      campo: buscando,
      sugerencias: actual.campo === buscando ? actual.sugerencias : [],
      cargando: true,
      error: false,
      suficiente: true,
    }));

    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const sugerencias = await buscarSugerencias(buscando, consulta, control.signal);
        setEstado({ campo: buscando, sugerencias, cargando: false, error: false, suficiente: true });
      } catch {
        if (control.signal.aborted) return;
        setEstado({ campo: buscando, sugerencias: [], cargando: false, error: true, suficiente: true });
      }
    }, ESPERA_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [buscando, texto]);

  const opciones = estado.campo === buscando ? estado.sugerencias : [];

  function cerrar() {
    setBuscando(null);
    setResaltada(-1);
  }

  function elegir(sugerencia: Sugerencia) {
    cerrar();
    onElegir(sugerencia);
  }

  // Escribir en el campo abre (o actualiza) sus sugerencias.
  function alEscribir(campo: CampoBusqueda) {
    setBuscando(campo);
    setResaltada(-1);
  }

  function alPresionar(campo: CampoBusqueda, event: KeyboardEvent<HTMLInputElement>) {
    const abierta = buscando === campo && opciones.length > 0;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (buscando !== campo) {
        // Las flechas vuelven a abrir la lista.
        alEscribir(campo);
        return;
      }
      if (!abierta) return;
      // Recorre -1 (ninguna: se ve lo escrito), 0, 1… y vuelve a empezar.
      const total = opciones.length + 1;
      const paso = event.key === "ArrowDown" ? 1 : -1;
      setResaltada((actual) => ((actual + 1 + paso + total) % total) - 1);
    } else if (event.key === "Enter" && abierta && resaltada >= 0) {
      // Elegir la opción resaltada en lugar de enviar el formulario.
      event.preventDefault();
      elegir(opciones[resaltada]);
    } else if (event.key === "Escape" && buscando === campo) {
      // Cerrar solo la lista, no el modal.
      event.preventDefault();
      event.stopPropagation();
      cerrar();
    }
  }

  function abierta(campo: CampoBusqueda) {
    return buscando === campo && estado.suficiente;
  }

  // Atributos de combobox para el <input> del campo.
  function propsEntrada(campo: CampoBusqueda, idCampo: string) {
    const idLista = `${idCampo}-sugerencias`;
    const visible = abierta(campo) && opciones.length > 0;
    return {
      role: "combobox",
      autoComplete: "off",
      "aria-autocomplete": "list" as const,
      "aria-expanded": visible,
      "aria-controls": idLista,
      "aria-activedescendant": visible && resaltada >= 0 ? `${idLista}-${resaltada}` : undefined,
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => alPresionar(campo, event),
      onBlur: cerrar,
    };
  }

  // Lista de coincidencias que va debajo del campo.
  function lista(campo: CampoBusqueda, idCampo: string): ReactNode {
    if (!abierta(campo)) return null;

    const idLista = `${idCampo}-sugerencias`;
    const nombreCampo = { titulo: "el título", autor: "el autor", isbn: "el ISBN" }[campo];

    return (
      <div className="sugerencias">
        {opciones.length > 0 && (
          <ul id={idLista} role="listbox" aria-label={`Libros que coinciden con ${nombreCampo}`} className="sugerencias-lista">
            {opciones.map((opcion, indice) => (
              <li
                key={`${opcion.clave}-${indice}`}
                id={`${idLista}-${indice}`}
                role="option"
                aria-selected={indice === resaltada}
                className="sugerencia"
                // Que el campo no pierda el foco (y cierre la lista) antes del clic.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setResaltada(indice)}
                onClick={() => elegir(opcion)}
              >
                <span className="sugerencia-titulo">{opcion.titulo}</span>
                <span className="sugerencia-detalle">
                  {[opcion.autor || "Autor desconocido", opcion.anio].filter(Boolean).join(" · ")}
                </span>
                {opcion.isbnBuscado && (
                  <span className="sugerencia-detalle numeros">ISBN {opcion.isbnBuscado}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="sugerencias-estado" aria-live="polite">
          {estado.cargando
            ? "Buscando en Open Library…"
            : estado.error
              ? "No se pudo consultar Open Library. Puedes escribir los datos a mano."
              : opciones.length === 0
                ? "Sin coincidencias en Open Library."
                : `${opciones.length} ${opciones.length === 1 ? "coincidencia" : "coincidencias"} en Open Library`}
        </p>
      </div>
    );
  }

  return { alEscribir, propsEntrada, lista, cerrar };
}
