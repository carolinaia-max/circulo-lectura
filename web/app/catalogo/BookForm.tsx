"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  Campo,
  Casilla,
  EntradaResaltada,
  MensajeError,
  Selector,
  enfocarCampo,
  leerErrorApi,
  useErroresDeCampos,
  type ErrorDeCampos,
} from "../formulario";
import { buscarSinopsis, type CampoBusqueda, type Sugerencia } from "./openLibrary";
import { useSugerencias } from "./useSugerencias";
import {
  AUTOR_ANONIMO,
  GENEROS,
  aniosDisponibles,
  esAnonimo,
  borradorDesdeLibro,
  caracteresInvalidos,
  libroDesdeBorrador,
  validateBook,
  type Book,
  type BorradorLibro,
  type CampoLibro,
} from "./validacion";

export type { Book } from "./validacion";

const campos: {
  key: CampoLibro;
  label: string;
  span: 1 | 2 | 4;
  placeholder: string;
  numero?: boolean;
  destacado?: boolean;
  // Si tiene opciones, el campo es un menú desplegable.
  opciones?: () => string[];
}[] = [
  { key: "titulo", label: "Título", span: 4, placeholder: "Título del libro", destacado: true },
  { key: "autor", label: "Autor", span: 2, placeholder: "Nombre del autor" },
  { key: "isbn", label: "ISBN", span: 2, placeholder: "978-84-376-0494-7" },
  { key: "genero", label: "Género", span: 2, placeholder: "Elige un género", opciones: () => GENEROS },
  { key: "anio_publicacion", label: "Año", span: 1, placeholder: "Año", numero: true, opciones: aniosDisponibles },
  { key: "paginas", label: "Páginas", span: 1, placeholder: "0", numero: true },
];

const CAMPOS_BUSQUEDA: CampoBusqueda[] = ["titulo", "autor", "isbn"];

function esCampoBusqueda(campo: CampoLibro): campo is CampoBusqueda {
  return (CAMPOS_BUSQUEDA as string[]).includes(campo);
}

type Props = {
  book?: Book;
  onCreated?: (created: Book) => void;
  onCancel?: () => void;
  // ISBN de los demás libros, para avisar antes de llamar a la API.
  existingIsbns?: string[];
  idPrefix?: string;
  // Ruta de la API donde se guarda: "/books" o "/interes".
  apiBase?: string;
  // Sugerir libros de Open Library al escribir el título, el autor o el ISBN.
  buscarEnOpenLibrary?: boolean;
};

export default function BookForm({
  book,
  onCreated,
  onCancel,
  existingIsbns = [],
  idPrefix = "libro-",
  apiBase = "/books",
  buscarEnOpenLibrary = false,
}: Props) {
  const [values, setValues] = useState<BorradorLibro>(() => borradorDesdeLibro(book));
  const [sinopsis, setSinopsis] = useState(book?.sinopsis ?? "");
  const [loading, setLoading] = useState(false);
  const errores = useErroresDeCampos(`${idPrefix}error`);
  const { error, marcar, limpiarCampo, tieneError, aria } = errores;

  // Autor anónimo: con la casilla marcada, el autor es "Anónimo" y el campo
  // se bloquea. Al desmarcarla vuelve lo que se había escrito.
  const [anonimo, setAnonimo] = useState(() => esAnonimo(book?.autor ?? ""));
  const autorEscrito = useRef(book && !esAnonimo(book.autor) ? book.autor : "");

  // SUGERENCIAS DE OPEN LIBRARY
  // `buscando` es el campo en el que se está escribiendo; la lista se
  // muestra debajo de él. Se cierra al elegir, con Escape o al salir del campo.
  const [buscando, setBuscando] = useState<CampoBusqueda | null>(null);
  const [resaltada, setResaltada] = useState(-1);
  const sugerencias = useSugerencias(buscando, buscando ? values[buscando] : "");
  const opciones = sugerencias.campo === buscando ? sugerencias.sugerencias : [];
  // Campos y sinopsis que rellenó la última sugerencia elegida. Si se elige
  // otra, se reemplazan; si se editan a mano, dejan de contarse como rellenados.
  const autoRellenados = useRef(new Set<CampoLibro>());
  const sinopsisAuto = useRef("");
  const pedidoSinopsis = useRef<AbortController | null>(null);
  const [cargandoSinopsis, setCargandoSinopsis] = useState(false);

  function cambiarAnonimo(marcado: boolean) {
    setAnonimo(marcado);
    if (marcado) {
      autorEscrito.current = values.autor;
      change("autor", AUTOR_ANONIMO);
      setBuscando(null);
    } else {
      change("autor", autorEscrito.current);
      setTimeout(() => enfocarCampo(`${idPrefix}autor`));
    }
  }

  function mostrar(nuevo: ErrorDeCampos) {
    marcar(nuevo);
    if (nuevo.campos[0]) enfocarCampo(`${idPrefix}${nuevo.campos[0]}`);
  }

  function change(field: CampoLibro, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    autoRellenados.current.delete(field);
    // Si al editar quedan caracteres inválidos, el campo sigue marcado y
    // el resaltado se actualiza; si ya no quedan, se quita la marca.
    if (!(tieneError(field) && caracteresInvalidos(field, value).length)) {
      limpiarCampo(field);
    }
  }

  // Escribir en Título, Autor o ISBN abre las sugerencias de ese campo.
  function escribir(field: CampoLibro, value: string) {
    change(field, value);
    if (buscarEnOpenLibrary && esCampoBusqueda(field)) {
      setBuscando(field);
      setResaltada(-1);
    }
  }

  function cerrarSugerencias() {
    setBuscando(null);
    setResaltada(-1);
  }

  function elegir(sugerencia: Sugerencia) {
    const nuevos = sugerencia.valores;

    setValues((current) => {
      const siguiente = { ...current };
      // Lo que rellenó la sugerencia anterior y esta no trae, se vacía.
      for (const campo of autoRellenados.current) {
        if (!(campo in nuevos)) siguiente[campo] = "";
      }
      return { ...siguiente, ...nuevos };
    });

    const rellenados = Object.keys(nuevos) as CampoLibro[];
    autoRellenados.current = new Set(rellenados);
    rellenados.forEach((campo) => limpiarCampo(campo));
    if (nuevos.autor) setAnonimo(false);
    cerrarSugerencias();

    // La sinopsis se pide aparte. Solo se reemplaza si estaba vacía o la
    // había puesto otra sugerencia (no se pisa lo que se escribió a mano).
    if (sinopsis.trim() === "" || sinopsis === sinopsisAuto.current) {
      pedidoSinopsis.current?.abort();
      const control = new AbortController();
      pedidoSinopsis.current = control;
      setSinopsis("");
      sinopsisAuto.current = "";
      setCargandoSinopsis(true);

      buscarSinopsis(sugerencia.clave, control.signal).then((texto) => {
        if (control.signal.aborted) return;
        setCargandoSinopsis(false);
        // Si mientras tanto se empezó a escribir una sinopsis, no se toca.
        setSinopsis((actual) => (actual === "" ? texto : actual));
        sinopsisAuto.current = texto;
      });
    }
  }

  function teclaSugerencias(field: CampoBusqueda, event: KeyboardEvent<HTMLInputElement>) {
    const abierta = buscando === field && opciones.length > 0;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (buscando !== field) {
        // Volver a abrir la lista con las flechas.
        setBuscando(field);
        setResaltada(-1);
        event.preventDefault();
        return;
      }
      if (!abierta) return;
      event.preventDefault();
      const paso = event.key === "ArrowDown" ? 1 : -1;
      // Recorre -1 (ninguna, se ve lo escrito), 0, 1… y vuelve a empezar.
      const total = opciones.length + 1;
      setResaltada((actual) => ((actual + 1 + paso + total) % total) - 1);
    } else if (event.key === "Enter" && abierta && resaltada >= 0) {
      event.preventDefault();
      elegir(opciones[resaltada]);
    } else if (event.key === "Escape" && buscando === field) {
      // Cerrar solo la lista, no el modal.
      event.preventDefault();
      event.stopPropagation();
      cerrarSugerencias();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    cerrarSugerencias();

    const validation = validateBook(values, existingIsbns);
    if (validation) {
      mostrar(validation);
      return;
    }

    setLoading(true);
    marcar(null);

    try {
      const response = await fetch(
        book ? `/backend${apiBase}/${book.id}` : `/backend${apiBase}`,
        {
          method: book ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...libroDesdeBorrador(values), sinopsis: sinopsis.trim() }),
        },
      );

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const resultado = leerErrorApi(data, "No se pudo guardar el libro.");
        if (response.status === 409) resultado.campos = ["isbn"];
        mostrar(resultado);
        return;
      }

      if (!book && onCreated) {
        onCreated(data as Book);
      } else {
        window.location.assign(`/catalogo/${data.id}`);
      }
    } catch {
      mostrar({ mensaje: "No se pudo conectar con la API. Intenta de nuevo.", campos: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="libro-form" onSubmit={handleSubmit} noValidate>
      {buscarEnOpenLibrary && (
        <p className="libro-form-ayuda">
          Escribe el título, el autor o el ISBN y elige un libro de Open Library
          para rellenar el resto de los datos.
        </p>
      )}

      <div className="libro-campos">
        {campos.map((campo) => {
          const id = `${idPrefix}${campo.key}`;
          const conSugerencias = buscarEnOpenLibrary && esCampoBusqueda(campo.key);
          const idLista = `${id}-sugerencias`;
          const listaAbierta =
            conSugerencias && buscando === campo.key && sugerencias.suficiente;

          const entrada = (
            <EntradaResaltada
              resaltar={
                tieneError(campo.key) ? caracteresInvalidos(campo.key, values[campo.key]) : []
              }
              id={id}
              name={campo.key}
              className={["entrada", "entrada--caja", campo.destacado ? "entrada--destacada" : "", campo.numero ? "numeros" : ""]
                .filter(Boolean)
                .join(" ")}
              type="text"
              inputMode={campo.numero ? "numeric" : undefined}
              maxLength={campo.numero ? 10 : 250}
              placeholder={campo.placeholder}
              value={values[campo.key]}
              required
              disabled={campo.key === "autor" && anonimo}
              onChange={(event) => escribir(campo.key, event.target.value)}
              {...(conSugerencias && esCampoBusqueda(campo.key)
                ? {
                    role: "combobox",
                    autoComplete: "off",
                    "aria-autocomplete": "list" as const,
                    "aria-expanded": listaAbierta && opciones.length > 0,
                    "aria-controls": idLista,
                    "aria-activedescendant":
                      listaAbierta && resaltada >= 0 ? `${idLista}-${resaltada}` : undefined,
                    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) =>
                      teclaSugerencias(campo.key as CampoBusqueda, event),
                    onBlur: cerrarSugerencias,
                  }
                : {})}
              {...aria(campo.key)}
            />
          );

          return (
            <Campo
              key={campo.key}
              id={id}
              etiqueta={campo.label}
              invalido={tieneError(campo.key)}
              className={`span-${campo.span}`}
              accesorio={
                campo.key === "autor" ? (
                  <Casilla checked={anonimo} onChange={cambiarAnonimo} disabled={loading}>
                    Anónimo
                  </Casilla>
                ) : undefined
              }
            >
              {campo.opciones ? (
                <Selector
                  id={id}
                  name={campo.key}
                  className={["entrada--caja", campo.numero ? "numeros" : ""].join(" ")}
                  opciones={campo.opciones()}
                  placeholder={campo.placeholder}
                  value={values[campo.key]}
                  required
                  onChange={(event) => change(campo.key, event.target.value)}
                  {...aria(campo.key)}
                />
              ) : conSugerencias ? (
                <div className="con-sugerencias">
                  {entrada}
                  {listaAbierta && (
                    <div className="sugerencias">
                      {opciones.length > 0 && (
                        <ul id={idLista} role="listbox" aria-label={`Libros que coinciden con el ${campo.label.toLowerCase()}`} className="sugerencias-lista">
                          {opciones.map((opcion, indice) => (
                            <li
                              key={`${opcion.clave}-${indice}`}
                              id={`${idLista}-${indice}`}
                              role="option"
                              aria-selected={indice === resaltada}
                              className="sugerencia"
                              // Evitar que el campo pierda el foco (y cierre la lista) antes del clic.
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setResaltada(indice)}
                              onClick={() => elegir(opcion)}
                            >
                              <span className="sugerencia-principal">{opcion.principal}</span>
                              {opcion.detalle && (
                                <span className="sugerencia-detalle">{opcion.detalle}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="sugerencias-estado" aria-live="polite">
                        {sugerencias.cargando
                          ? "Buscando en Open Library…"
                          : sugerencias.error
                            ? "No se pudo consultar Open Library. Puedes escribir los datos a mano."
                            : opciones.length === 0
                              ? "Sin coincidencias en Open Library."
                              : `${opciones.length} ${opciones.length === 1 ? "coincidencia" : "coincidencias"} en Open Library`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                entrada
              )}
            </Campo>
          );
        })}

        <Campo
          id={`${idPrefix}sinopsis`}
          etiqueta={
            <>
              Sinopsis <span className="etiqueta-opcional">(opcional)</span>
            </>
          }
          nota={cargandoSinopsis ? "Buscando sinopsis…" : "Máx. 4000 caracteres"}
          className="span-6"
        >
          <textarea
            id={`${idPrefix}sinopsis`}
            name="sinopsis"
            className="area"
            maxLength={4000}
            rows={4}
            placeholder="De qué trata el libro, en pocas líneas."
            value={sinopsis}
            onChange={(event) => {
              setSinopsis(event.target.value);
              sinopsisAuto.current = "";
              pedidoSinopsis.current?.abort();
              setCargandoSinopsis(false);
            }}
          />
        </Campo>
      </div>

      {error && <MensajeError id={errores.idMensaje}>{error.mensaje}</MensajeError>}

      <div className="acciones">
        <button type="submit" className="boton" disabled={loading}>
          {loading ? "Guardando…" : "Guardar libro"}
        </button>
        {onCancel ? (
          <button type="button" className="boton-texto" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        ) : (
          <Link href={book ? `/catalogo/${book.id}` : "/catalogo"} className="boton-texto">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
