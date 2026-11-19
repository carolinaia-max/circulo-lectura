"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  Campo,
  MensajeError,
  enfocarCampo,
  leerErrorApi,
  useErroresDeCampos,
  type ErrorDeCampos,
} from "../formulario";
import {
  borradorDesdeLibro,
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
  { key: "isbn", label: "ISBN", span: 2, placeholder: "CLUB-007" },
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
};

export default function BookForm({
  book,
  onCreated,
  onCancel,
  existingIsbns = [],
  idPrefix = "libro-",
}: Props) {
  const [values, setValues] = useState<BorradorLibro>(() => borradorDesdeLibro(book));
  const [sinopsis, setSinopsis] = useState(book?.sinopsis ?? "");
  const [loading, setLoading] = useState(false);
  const errores = useErroresDeCampos(`${idPrefix}error`);
  const { error, marcar, limpiarCampo, tieneError, aria } = errores;

  function mostrar(nuevo: ErrorDeCampos) {
    marcar(nuevo);
    if (nuevo.campos[0]) enfocarCampo(`${idPrefix}${nuevo.campos[0]}`);
  }

  function change(field: CampoLibro, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    limpiarCampo(field);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

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
      <div className="libro-campos">
        {campos.map((campo) => {
          const id = `${idPrefix}${campo.key}`;

          return (
            <Campo
              key={campo.key}
              id={id}
              etiqueta={campo.label}
              invalido={tieneError(campo.key)}
              className={`span-${campo.span}`}
            >
              <input
                id={id}
                name={campo.key}
                className={["entrada", "entrada--caja", campo.destacado ? "entrada--destacada" : "", campo.numero ? "numeros" : ""]
                  .filter(Boolean)
                  .join(" ")}
                type={campo.numero ? "number" : "text"}
                min={campo.key === "paginas" ? 1 : undefined}
                max={campo.key === "anio_publicacion" ? currentYear : undefined}
                step={campo.numero ? 1 : undefined}
                maxLength={campo.numero ? undefined : 250}
                placeholder={campo.placeholder}
                value={values[campo.key]}
                required
                onChange={(event) => change(campo.key, event.target.value)}
                {...aria(campo.key)}
              />
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
          nota="Máx. 4000 caracteres"
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
            onChange={(event) => setSinopsis(event.target.value)}
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
