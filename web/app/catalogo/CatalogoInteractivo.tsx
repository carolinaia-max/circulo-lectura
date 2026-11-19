"use client";

import { useEffect, useRef, useState } from "react";

import BookForm from "./BookForm";
import {
  ErrorApi,
  MensajeError,
  enfocarCampo,
  leerErrorApi,
  useErroresDeCampos,
  useFocoInicial,
} from "../formulario";
import {
  IconoBasura,
  IconoCerrar,
  IconoLapiz,
  IconoMas,
  IlustracionNuevoLibro,
} from "../ilustraciones";
import {
  borradorDesdeLibro,
  libroDesdeBorrador,
  validateBook,
  type Book,
  type BorradorLibro,
  type CampoLibro,
} from "./validacion";

export type { Book } from "./validacion";

type Props = {
  initialBooks: Book[];
};

const currentYear = new Date().getFullYear();

// Columnas de la tabla, en orden.
const columns: {
  key: CampoLibro;
  label: string;
  numero?: boolean;
  secundario?: boolean;
}[] = [
  { key: "titulo", label: "Título" },
  { key: "autor", label: "Autor" },
  { key: "genero", label: "Género" },
  { key: "anio_publicacion", label: "Año", numero: true },
  { key: "paginas", label: "Páginas", numero: true },
  { key: "isbn", label: "ISBN", secundario: true },
];

const ID_ERROR_FILA = "fila-error";

function getErrorMessage(data: unknown, fallback: string): string {
  return leerErrorApi(data, fallback).mensaje;
}

export default function CatalogoInteractivo({ initialBooks }: Props) {
  const [books, setBooks] = useState(initialBooks);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edición en fila
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [draft, setDraft] = useState<BorradorLibro | null>(null);
  const [saving, setSaving] = useState(false);
  const filaErrores = useErroresDeCampos(ID_ERROR_FILA);

  // Modal de sinopsis
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingSynopsis, setEditingSynopsis] = useState(false);
  const [synopsisDraft, setSynopsisDraft] = useState("");
  const [savingSynopsis, setSavingSynopsis] = useState(false);
  const [modalError, setModalError] = useState("");

  // Modal de eliminar
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [error, setError] = useState("");

  const requestRef = useRef(0);
  const addDialogRef = useRef<HTMLDivElement>(null);
  const synopsisDialogRef = useRef<HTMLDivElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const synopsisTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastEditedRef = useRef<number | null>(null);

  const anyModalOpen = Boolean(modalBook || showAddModal || deleteTarget);

  useFocoInicial(addDialogRef, showAddModal);
  useFocoInicial(synopsisDialogRef, modalBook !== null);
  useFocoInicial(deleteDialogRef, deleteTarget !== null);

  // Bloquear el desplazamiento y permitir cerrar con Escape.
  useEffect(() => {
    if (!anyModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || savingSynopsis || deleting) return;

      requestRef.current += 1;

      setModalBook(null);
      setShowAddModal(false);
      setModalLoading(false);
      setEditingSynopsis(false);
      setSynopsisDraft("");
      setModalError("");
      setDeleteTarget(null);
      setDeleteError("");
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [anyModalOpen, savingSynopsis, deleting]);

  // Al editar una fila, enfocar su primer campo; al terminar, volver al lápiz.
  useEffect(() => {
    if (editingId !== null) {
      enfocarCampo(`fila-${editingId}-titulo`);
      return;
    }

    if (lastEditedRef.current !== null) {
      document
        .querySelector<HTMLElement>(`[data-editar="${lastEditedRef.current}"]`)
        ?.focus();
      lastEditedRef.current = null;
    }
  }, [editingId]);

  // Si aparece un error en la fila, desplazar la tabla para que se vea.
  useEffect(() => {
    if (filaErrores.error) {
      document.querySelector(".fila-error")?.scrollIntoView({ block: "nearest" });
    }
  }, [filaErrores.error]);

  // Al pasar a editar la sinopsis, enfocar el textarea.
  useEffect(() => {
    if (editingSynopsis) synopsisTextareaRef.current?.focus();
  }, [editingSynopsis]);

  // Consultar un libro en FastAPI.
  async function getBook(id: number): Promise<Book> {
    const response = await fetch(`/backend/books/${id}`, { cache: "no-store" });

    if (response.status === 401) {
      window.location.assign("/login");
      throw new Error("La sesión ha expirado.");
    }

    if (!response.ok) {
      throw new Error("No se pudo cargar la información del libro.");
    }

    return response.json();
  }

  // Actualizar los datos de un libro.
  async function updateBook(book: Book): Promise<Book> {
    const response = await fetch(`/backend/books/${book.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isbn: book.isbn.trim(),
        titulo: book.titulo.trim(),
        autor: book.autor.trim(),
        genero: book.genero.trim(),
        anio_publicacion: book.anio_publicacion,
        paginas: book.paginas,
        sinopsis: book.sinopsis ?? "",
      }),
    });

    if (response.status === 401) {
      window.location.assign("/login");
      throw new Error("La sesión ha expirado.");
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const resultado = leerErrorApi(data, "No se pudieron guardar los cambios.");
      if (response.status === 409) resultado.campos = ["isbn"];
      throw new ErrorApi(resultado);
    }

    return { ...book, ...(data ?? {}) };
  }

  // Actualizar el libro en la tabla sin recargar la página.
  function replaceBook(updated: Book) {
    setBooks((current) =>
      current.map((book) => (book.id === updated.id ? updated : book)),
    );
  }

  // MODAL DE SINOPSIS

  async function openSynopsis(book: Book) {
    if (editingId !== null) return;

    const requestId = ++requestRef.current;

    setModalBook(book);
    setModalLoading(true);
    setEditingSynopsis(false);
    setSynopsisDraft("");
    setModalError("");

    try {
      const fullBook = await getBook(book.id);
      if (requestId !== requestRef.current) return;

      setModalBook(fullBook);
      replaceBook(fullBook);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setModalError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      if (requestId === requestRef.current) setModalLoading(false);
    }
  }

  function closeModal() {
    if (savingSynopsis) return;

    requestRef.current += 1;

    setModalBook(null);
    setModalLoading(false);
    setEditingSynopsis(false);
    setSynopsisDraft("");
    setModalError("");
  }

  function beginSynopsisEditing() {
    if (!modalBook) return;

    // Si ya existe, cargar su texto para editarlo; si no, abrir el editor vacío.
    setSynopsisDraft(modalBook.sinopsis ?? "");
    setEditingSynopsis(true);
    setModalError("");
  }

  async function saveSynopsis() {
    if (!modalBook || savingSynopsis) return;

    const text = synopsisDraft.trim();

    if (!text) {
      setModalError("Escribe una sinopsis antes de guardar.");
      return;
    }

    if (text.length > 4000) {
      setModalError("La sinopsis no puede superar los 4000 caracteres.");
      return;
    }

    setSavingSynopsis(true);
    setModalError("");

    try {
      // Obtener los datos actuales del libro y cambiar únicamente la sinopsis.
      const latestBook = await getBook(modalBook.id);
      const updated = await updateBook({ ...latestBook, sinopsis: text });

      replaceBook(updated);
      setModalBook(updated);
      setEditingSynopsis(false);
      setSynopsisDraft("");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "No se pudo guardar la sinopsis.");
    } finally {
      setSavingSynopsis(false);
    }
  }

  // EDICIÓN EN FILA

  async function startEditing(book: Book) {
    setError("");

    try {
      const fullBook = await getBook(book.id);

      filaErrores.marcar(null);
      setEditingBook(fullBook);
      setDraft(borradorDesdeLibro(fullBook));
      setEditingId(book.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el libro.");
    }
  }

  function changeField(field: CampoLibro, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    filaErrores.limpiarCampo(field);
  }

  function finishEditing() {
    lastEditedRef.current = editingId;
    setEditingId(null);
    setEditingBook(null);
    setDraft(null);
    filaErrores.marcar(null);
  }

  function cancelEditing() {
    if (saving) return;
    finishEditing();
  }

  async function saveChanges() {
    if (!draft || !editingBook || saving) return;

    const otherIsbns = books
      .filter((book) => book.id !== editingBook.id)
      .map((book) => book.isbn);

    const validation = validateBook(draft, otherIsbns);

    if (validation) {
      filaErrores.marcar(validation);
      if (validation.campos[0]) enfocarCampo(`fila-${editingBook.id}-${validation.campos[0]}`);
      return;
    }

    setSaving(true);
    filaErrores.marcar(null);

    try {
      const updated = await updateBook({ ...editingBook, ...libroDesdeBorrador(draft) });
      replaceBook(updated);
      finishEditing();
    } catch (err) {
      const campos = err instanceof ErrorApi ? err.campos : [];
      filaErrores.marcar({
        mensaje: err instanceof Error ? err.message : "No se pudo conectar con la API.",
        campos,
      });
      if (campos[0]) enfocarCampo(`fila-${editingBook.id}-${campos[0]}`);
    } finally {
      setSaving(false);
    }
  }

  // ELIMINAR

  function askDelete(book: Book) {
    if (deleting || editingId !== null) return;
    setDeleteError("");
    setDeleteTarget(book);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;

    const book = deleteTarget;
    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(`/backend/books/${book.id}`, { method: "DELETE" });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data, "No se pudo eliminar el libro."));
      }

      setBooks((current) => current.filter((item) => item.id !== book.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo conectar con la API.");
    } finally {
      setDeleting(false);
    }
  }

  const rowLocked = editingId !== null || deleting;

  return (
    <main className="catalogo">
      {/* ENCABEZADO */}
      <section className="catalogo-cabecera">
        <h1>Catálogo</h1>

        <div className="catalogo-resumen">
          <p className="contador">
            <span className="contador-numero">{String(books.length).padStart(2, "0")}</span>
            <span className="etiqueta">
              {books.length === 1 ? "Libro registrado" : "Libros registrados"}
            </span>
          </p>

          <button type="button" className="boton boton--alto" onClick={() => setShowAddModal(true)}>
            Agregar libro
            <IconoMas />
          </button>
        </div>
      </section>

      {/* CATÁLOGO VACÍO */}
      {books.length === 0 && (
        <div className="catalogo-vacio">
          <p>Todavía no hay libros en el catálogo.</p>
          <button type="button" className="boton-texto" onClick={() => setShowAddModal(true)}>
            Agregar el primero
          </button>
        </div>
      )}

      {/* TABLA DEL CATÁLOGO */}
      {books.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={[
                      column.numero ? "derecha" : "",
                      column.secundario ? "col-isbn" : "",
                    ].join(" ")}
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="derecha col-acciones">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {books.map((book) => {
                const editing = editingId === book.id && draft !== null;

                if (editing) {
                  return [
                    <tr key={book.id} className="fila fila--edicion" data-book-id={book.id}>
                      {columns.map((column) => {
                        const id = `fila-${book.id}-${column.key}`;

                        return (
                          <td
                            key={column.key}
                            className={[
                              column.numero ? "col-numero" : "",
                              column.secundario ? "col-isbn" : "",
                            ].join(" ")}
                          >
                            <input
                              id={id}
                              aria-label={column.label}
                              className={[
                                "entrada",
                                "entrada--fila",
                                column.key === "titulo" ? "entrada--destacada" : "",
                                column.numero ? "numeros derecha" : "",
                              ].join(" ")}
                              type={column.numero ? "number" : "text"}
                              value={draft[column.key]}
                              min={column.key === "paginas" ? 1 : undefined}
                              max={column.key === "anio_publicacion" ? currentYear : undefined}
                              step={column.numero ? 1 : undefined}
                              maxLength={column.numero ? undefined : 250}
                              disabled={saving}
                              onChange={(event) => changeField(column.key, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveChanges();
                                if (event.key === "Escape") cancelEditing();
                              }}
                              {...filaErrores.aria(column.key)}
                            />
                          </td>
                        );
                      })}
                      <td>
                        <div className="fila-acciones">
                          <button type="button" className="boton boton--chico" disabled={saving} onClick={saveChanges}>
                            {saving ? "Guardando…" : "Guardar"}
                          </button>
                          <button type="button" className="boton-texto" disabled={saving} onClick={cancelEditing}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>,
                    filaErrores.error && (
                      <tr key={`${book.id}-error`} className="fila-error">
                        <td colSpan={columns.length + 1}>
                          <MensajeError id={ID_ERROR_FILA}>{filaErrores.error.mensaje}</MensajeError>
                        </td>
                      </tr>
                    ),
                  ];
                }

                return (
                  <tr key={book.id} className="fila" data-book-id={book.id}>
                    <td>
                      <button
                        type="button"
                        className="titulo-libro"
                        disabled={editingId !== null}
                        onClick={() => openSynopsis(book)}
                      >
                        {book.titulo}
                      </button>
                    </td>
                    <td>{book.autor}</td>
                    <td>{book.genero}</td>
                    <td className="derecha numeros">{book.anio_publicacion}</td>
                    <td className="derecha numeros">{book.paginas}</td>
                    <td className="col-isbn numeros">{book.isbn}</td>
                    <td>
                      <div className="fila-acciones">
                        <button
                          type="button"
                          className="boton-icono"
                          title="Editar"
                          aria-label={`Editar «${book.titulo}»`}
                          data-editar={book.id}
                          disabled={rowLocked}
                          onClick={() => startEditing(book)}
                        >
                          <IconoLapiz />
                        </button>
                        <button
                          type="button"
                          className="boton-icono boton-icono--peligro"
                          title="Eliminar"
                          aria-label={`Eliminar «${book.titulo}»`}
                          disabled={rowLocked}
                          onClick={() => askDelete(book)}
                        >
                          <IconoBasura />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ERRORES DEL CATÁLOGO */}
      {error && !modalBook && (
        <div className="catalogo-aviso">
          <MensajeError>{error}</MensajeError>
        </div>
      )}

      {/* MODAL PARA AGREGAR LIBRO */}
      {showAddModal && (
        <div
          className="modal-capa"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            ref={addDialogRef}
            className="modal modal-nuevo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nuevo-libro-titulo"
          >
            <div className="modal-nuevo-arte">
              <IlustracionNuevoLibro />
            </div>

            <div className="modal-nuevo-cuerpo">
              <div className="modal-cabecera">
                <h2 id="nuevo-libro-titulo">¡Un libro nuevo!</h2>
                <button
                  type="button"
                  className="boton-icono"
                  aria-label="Cerrar"
                  onClick={() => setShowAddModal(false)}
                >
                  <IconoCerrar />
                </button>
              </div>

              <BookForm
                idPrefix="nuevo-"
                existingIsbns={books.map((book) => book.isbn)}
                onCancel={() => setShowAddModal(false)}
                onCreated={(created) => {
                  setBooks((current) => [...current, created]);
                  setShowAddModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SINOPSIS */}
      {modalBook && (
        <div
          className="modal-capa"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            ref={synopsisDialogRef}
            className="modal modal-sinopsis"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sinopsis-titulo"
          >
            <div className="modal-cabecera">
              <div className="modal-sinopsis-encabezado">
                <span className="etiqueta etiqueta--roja">Sinopsis</span>
                <h2 id="sinopsis-titulo">{modalBook.titulo}</h2>
                <p className="modal-sinopsis-autor">{modalBook.autor}</p>
              </div>
              <button
                type="button"
                className="boton-icono"
                aria-label="Cerrar"
                disabled={savingSynopsis}
                onClick={closeModal}
              >
                <IconoCerrar />
              </button>
            </div>

            <div className="modal-sinopsis-texto">
              {modalLoading ? (
                <p className="sinopsis sinopsis--vacia">Cargando sinopsis…</p>
              ) : editingSynopsis ? (
                <div className="campo">
                  <div className="campo-cabecera">
                    <label htmlFor="sinopsis-editor" className="etiqueta">
                      Editar sinopsis
                    </label>
                    <span className="campo-nota">Máx. 4000 caracteres</span>
                  </div>
                  <textarea
                    ref={synopsisTextareaRef}
                    id="sinopsis-editor"
                    className="area area--grande"
                    value={synopsisDraft}
                    onChange={(event) => {
                      setSynopsisDraft(event.target.value);
                      setModalError("");
                    }}
                    maxLength={4000}
                    rows={6}
                    placeholder="De qué trata el libro, en pocas líneas."
                    disabled={savingSynopsis}
                  />
                </div>
              ) : modalBook.sinopsis?.trim() ? (
                <p className="sinopsis">{modalBook.sinopsis}</p>
              ) : (
                <p className="sinopsis sinopsis--vacia">Este libro todavía no tiene sinopsis.</p>
              )}

              {modalError && <MensajeError>{modalError}</MensajeError>}
            </div>

            <div className="acciones acciones--centradas">
              {editingSynopsis ? (
                <>
                  <button
                    type="button"
                    className="boton"
                    disabled={savingSynopsis || !synopsisDraft.trim()}
                    onClick={saveSynopsis}
                  >
                    {savingSynopsis ? "Guardando…" : "Guardar sinopsis"}
                  </button>
                  <button
                    type="button"
                    className="boton-texto"
                    disabled={savingSynopsis}
                    onClick={() => {
                      setEditingSynopsis(false);
                      setModalError("");
                    }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="boton"
                  disabled={modalLoading}
                  onClick={beginSynopsisEditing}
                >
                  <IconoLapiz size={20} />
                  {modalBook.sinopsis?.trim() ? "Editar sinopsis" : "Agregar sinopsis"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINAR */}
      {deleteTarget && (
        <div
          className="modal-capa modal-capa--eliminar"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDelete();
          }}
        >
          <div
            ref={deleteDialogRef}
            className="modal modal-eliminar"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="eliminar-titulo"
            aria-describedby="eliminar-descripcion"
          >
            <div className="modal-eliminar-texto">
              <h2 id="eliminar-titulo">¿Eliminar «{deleteTarget.titulo}» del catálogo?</h2>
              <p id="eliminar-descripcion">Esta acción no se puede deshacer.</p>
            </div>

            {deleteError && <MensajeError>{deleteError}</MensajeError>}

            <div className="modal-eliminar-acciones">
              <button type="button" className="boton-contorno" disabled={deleting} onClick={closeDelete}>
                Cancelar
              </button>
              <button type="button" className="boton boton--rojo" disabled={deleting} onClick={confirmDelete}>
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
