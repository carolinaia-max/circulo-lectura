"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import {
  Campo,
  EntradaResaltada,
  MensajeError,
  enfocarCampo,
  leerErrorApi,
  useErroresDeCampos,
  type ErrorDeCampos,
} from "../formulario";
import { buscarSinopsis, type CampoBusqueda, type Sugerencia } from "../openLibrary/openLibrary";
import { useAutocompletado } from "../openLibrary/useAutocompletado";
import {
  borradorDesdeLibro,
  caracteresInvalidos,
  libroDesdeBorrador,
  validateBook,
  type Book,
  type BorradorLibro,
  type CampoLibro,
} from "./validacion";

export type { Book } from "./validacion";

const currentYear = new Date().getFullYear();

const campos: {
  key: CampoLibro;
  label: string;
  span: 1 | 2 | 4;
  placeholder: string;
  numero?: boolean;
  destacado?: boolean;
}[] = [
  { key: "titulo", label: "Título", span: 4, placeholder: "Título del libro", destacado: true },
  { key: "autor", label: "Autor", span: 2, placeholder: "Nombre del autor" },
  { key: "isbn", label: "ISBN", span: 2, placeholder: "978-84-376-0494-7" },
  { key: "genero", label: "Género", span: 2, placeholder: "Novela, ensayo…" },
  { key: "anio_publicacion", label: "Año", span: 1, placeholder: String(currentYear), numero: true },
  { key: "paginas", label: "Páginas", span: 1, placeholder: "0", numero: true },
];

type Props = {
  book?: Book;
  onCreated?: (created: Book) => void;
  onCancel?: () => void;
  // ISBN de los demás libros, para avisar antes de llamar a la API.
  existingIsbns?: string[];
  idPrefix?: string;
  // Sugerir libros de Open Library al escribir el título, el autor o el ISBN
  // (solo en el modal para agregar un libro).
  buscarEnOpenLibrary?: boolean;
};

const CAMPOS_BUSQUEDA: CampoLibro[] = ["titulo", "autor", "isbn"];

function esCampoBusqueda(campo: CampoLibro): campo is CampoBusqueda {
  return CAMPOS_BUSQUEDA.includes(campo);
}

export default function BookForm({
  book,
  onCreated,
  onCancel,
  existingIsbns = [],
  idPrefix = "libro-",
  buscarEnOpenLibrary = false,
}: Props) {
  const [values, setValues] = useState<BorradorLibro>(() => borradorDesdeLibro(book));
  const [sinopsis, setSinopsis] = useState(book?.sinopsis ?? "");
  const [loading, setLoading] = useState(false);
  const errores = useErroresDeCampos(`${idPrefix}error`);
  const { error, marcar, limpiarCampo, tieneError, aria } = errores;

  // SUGERENCIAS DE OPEN LIBRARY
  // Campos y sinopsis que rellenó la última sugerencia elegida. Si se elige
  // otra, se reemplazan; lo que se edita a mano deja de contarse.
  const autoRellenados = useRef(new Set<CampoLibro>());
  const sinopsisAuto = useRef("");
  const pedidoSinopsis = useRef<AbortController | null>(null);
  const [cargandoSinopsis, setCargandoSinopsis] = useState(false);
  const auto = useAutocompletado(values, elegirSugerencia);

  function elegirSugerencia(sugerencia: Sugerencia) {
    const nuevos: Partial<BorradorLibro> = {};
    for (const [campo, valor] of Object.entries(sugerencia.datos) as [CampoLibro, string][]) {
      if (valor) nuevos[campo] = valor;
    }

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

    // La sinopsis se pide aparte. Solo se reemplaza si estaba vacía o la
    // había puesto otra sugerencia: no se pisa lo que se escribió a mano.
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    auto.cerrar();

    const validation = validateBook(values, existingIsbns);
    if (validation) {
      mostrar(validation);
      return;
    }

    setLoading(true);
    marcar(null);

    try {
      const response = await fetch(
        book ? `/backend/books/${book.id}` : "/backend/books",
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
          para completar el resto de los datos.
        </p>
      )}

      <div className="libro-campos">
        {campos.map((campo) => {
          const id = `${idPrefix}${campo.key}`;
          const conSugerencias = buscarEnOpenLibrary && esCampoBusqueda(campo.key);

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
              onChange={(event) => {
                change(campo.key, event.target.value);
                if (conSugerencias) auto.alEscribir(campo.key as CampoBusqueda);
              }}
              {...(conSugerencias ? auto.propsEntrada(campo.key as CampoBusqueda, id) : {})}
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
            >
              {conSugerencias ? (
                <div className="con-sugerencias">
                  {entrada}
                  {auto.lista(campo.key as CampoBusqueda, id)}
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
              // Escrita a mano: ya no se reemplaza ni llega la que se pidió.
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
