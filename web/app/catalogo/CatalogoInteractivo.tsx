"use client";

import BookForm from "./BookFormC";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

export type Book = {
  id: number;
  isbn: string;
  titulo: string;
  autor: string;
  genero: string;
  anio_publicacion: number;
  paginas: number;
  sinopsis?: string | null;
};

type Props = {
  initialBooks: Book[];
};

type EditableField =
  | "titulo"
  | "autor"
  | "isbn"
  | "genero"
  | "anio_publicacion"
  | "paginas";

const fields: {
  key: EditableField;
  label: string;
  type: "text" | "number";
}[] = [
  { key: "titulo", label: "Título", type: "text" },
  { key: "autor", label: "Autor", type: "text" },
  { key: "isbn", label: "ISBN", type: "text" },
  { key: "genero", label: "Género", type: "text" },
  { key: "anio_publicacion", label: "Año", type: "number" },
  { key: "paginas", label: "Páginas", type: "number" },
];

function validateBook(book: Book): string | null {
  const currentYear = new Date().getFullYear();

  if (
    !book.titulo.trim() ||
    !book.autor.trim() ||
    !book.isbn.trim() ||
    !book.genero.trim()
  ) {
    return "Todos los campos del libro son obligatorios.";
  }

  if (
    !Number.isInteger(book.anio_publicacion) ||
    book.anio_publicacion < 1 ||
    book.anio_publicacion > currentYear
  ) {
    return "El año de publicación no es válido.";
  }

  if (
    !Number.isInteger(book.paginas) ||
    book.paginas < 1
  ) {
    return "El número de páginas debe ser mayor que cero.";
  }

  return null;
}

function getErrorMessage(
  data: unknown,
  fallback: string,
): string {
  if (typeof data !== "object" || data === null) {
    return fallback;
  }

  const result = data as {
    detail?: unknown;
    fields?: Array<{
      mensaje?: unknown;
    }>;
  };

  const message =
    result.fields?.[0]?.mensaje ?? result.detail;

  return typeof message === "string"
    ? message
    : fallback;
}

export default function CatalogoInteractivo({
  initialBooks,
}: Props) {
  const [books, setBooks] = useState(initialBooks);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [draft, setDraft] = useState<Book | null>(null);

  const [modalBook, setModalBook] =
    useState<Book | null>(null);

  const [modalLoading, setModalLoading] =
    useState(false);

  const [editingSynopsis, setEditingSynopsis] =
    useState(false);

  const [synopsisDraft, setSynopsisDraft] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [savingSynopsis, setSavingSynopsis] =
    useState(false);

  const [error, setError] = useState("");

  const [modalError, setModalError] =
    useState("");

  const requestRef = useRef(0);

  // Bloquear el desplazamiento y permitir cerrar con Escape.
  useEffect(() => {
    if (!modalBook && !showAddModal) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !savingSynopsis
      ) {
        requestRef.current += 1;

        setModalBook(null);
        setShowAddModal(false);
        setModalLoading(false);
        setEditingSynopsis(false);
        setSynopsisDraft("");
        setModalError("");
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [modalBook, savingSynopsis, showAddModal]);

  // Consultar un libro en FastAPI.
  async function getBook(id: number): Promise<Book> {
    const response = await fetch(
      `/backend/books/${id}`,
      {
        cache: "no-store",
      },
    );

    if (response.status === 401) {
      window.location.assign("/login");

      throw new Error(
        "La sesión ha expirado.",
      );
    }

    if (!response.ok) {
      throw new Error(
        "No se pudo cargar la información del libro.",
      );
    }

    return response.json();
  }

  // Actualizar los datos de un libro.
  async function updateBook(
    book: Book,
  ): Promise<Book> {
    const response = await fetch(
      `/backend/books/${book.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isbn: book.isbn.trim(),
          titulo: book.titulo.trim(),
          autor: book.autor.trim(),
          genero: book.genero.trim(),
          anio_publicacion:
            book.anio_publicacion,
          paginas: book.paginas,
          sinopsis: book.sinopsis ?? "",
        }),
      },
    );

    if (response.status === 401) {
      window.location.assign("/login");

      throw new Error(
        "La sesión ha expirado.",
      );
    }

    const data = await response.json().catch(
      () => null,
    );

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "No se pudieron guardar los cambios.",
        ),
      );
    }

    return {
      ...book,
      ...(data ?? {}),
    };
  }

  // Actualizar el libro en la tabla sin recargar la página.
  function replaceBook(updated: Book) {
    setBooks((current) =>
      current.map((book) =>
        book.id === updated.id
          ? updated
          : book,
      ),
    );
  }

  // Abrir el modal de sinopsis.
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

      if (requestId !== requestRef.current) {
        return;
      }

      setModalBook(fullBook);
      replaceBook(fullBook);
    } catch (err) {
      if (requestId !== requestRef.current) {
        return;
      }

      setModalError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error.",
      );
    } finally {
      if (requestId === requestRef.current) {
        setModalLoading(false);
      }
    }
  }

  // Cerrar el modal.
  function closeModal() {
    if (savingSynopsis) return;

    requestRef.current += 1;

    setModalBook(null);
    setModalLoading(false);
    setEditingSynopsis(false);
    setSynopsisDraft("");
    setModalError("");
  }

  // Activar la edición de los datos del libro.
  async function startEditing(book: Book) {
    setError("");

    try {
      const fullBook = await getBook(book.id);

      setDraft(fullBook);
      setEditingId(book.id);
      } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el libro.",
      );
    }
  }

  // Modificar un campo de la tabla.
  function changeField(
    field: EditableField,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const value = event.target.value;

    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]:
          field === "anio_publicacion" ||
          field === "paginas"
            ? value === ""
              ? 0
              : Number(value)
            : value,
      };
    });
  }

  // Cancelar la edición de un libro.
  function cancelEditing() {
    if (saving) return;

    setEditingId(null);
    setDraft(null);
    setError("");
  }

  // Guardar los cambios de la tabla.
  async function saveChanges() {
    if (!draft || saving) return;

    const validationError =
      validateBook(draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    const confirmed = window.confirm(
      `¿Seguro que quieres guardar los cambios de "${draft.titulo}"?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const updated = await updateBook(draft);

      replaceBook(updated);

      setEditingId(null);
        setDraft(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con la API.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Eliminar un libro desde el catálogo.
  async function deleteBook(book: Book) {
    if (deletingId !== null || editingId !== null) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar el libro "${book.titulo}"?\n\nEsta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeletingId(book.id);
    setError("");

    try {
      const response = await fetch(`/backend/books/${book.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(
          getErrorMessage(data, "No se pudo eliminar el libro."),
        );
      }

      setBooks((current) => current.filter((item) => item.id !== book.id));
        } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo conectar con la API.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  // Abrir el editor para agregar o modificar una sinopsis.
  function beginSynopsisEditing() {
    if (!modalBook) return;

    // Si ya existe, cargar su texto para editarlo.
    // Si no existe, abrir el editor vacío.
    setSynopsisDraft(
      modalBook.sinopsis ?? "",
    );

    setEditingSynopsis(true);
    setModalError("");
  }

  // Guardar una sinopsis nueva o modificada.
  async function saveSynopsis() {
    if (!modalBook || savingSynopsis) return;

    const text = synopsisDraft.trim();

    if (!text) {
      setModalError(
        "Escribe una sinopsis antes de guardar.",
      );
      return;
    }

    if (text.length > 4000) {
      setModalError(
        "La sinopsis no puede superar los 4000 caracteres.",
      );
      return;
    }

    // Mensaje de confirmación antes de guardar.
    const confirmed = window.confirm(
      `¿Seguro que quieres guardar la sinopsis de "${modalBook.titulo}"?`,
    );

    if (!confirmed) return;

    setSavingSynopsis(true);
    setModalError("");

    try {
      // Obtener los datos actuales del libro.
      const latestBook = await getBook(
        modalBook.id,
      );

      // Cambiar únicamente la sinopsis.
      const updated = await updateBook({
        ...latestBook,
        sinopsis: text,
      });

      // Reflejar los cambios en la interfaz.
      replaceBook(updated);

      setModalBook(updated);
      setEditingSynopsis(false);
      setSynopsisDraft("");
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la sinopsis.",
      );
    } finally {
      setSavingSynopsis(false);
    }
  }

  return (
    <>
      <div className="catalog-toolbar">
        <div>
          <h2>Catálogo de libros</h2>
          <p className="catalog-count">{books.length} {books.length === 1 ? "libro registrado" : "libros registrados"}</p>
        </div>
        <button type="button" className="catalog-add-button" onClick={() => setShowAddModal(true)}>
          + Agregar libro
        </button>
      </div>
      {books.length === 0 && <p className="catalog-empty">Todavía no hay libros en el catálogo.</p>}
      {/* TABLA DEL CATÁLOGO */}
      <div className="interactive-table">
        <div className="interactive-table-scroll">
          <table>
            <thead>
              <tr>
                {fields.map((field) => (
                  <th
                    key={field.key}
                    scope="col"
                  >
                    {field.label}
                  </th>
                ))}
                <th scope="col" className="book-actions-heading">ACCIONES</th>
              </tr>
            </thead>

            <tbody>
              {books.map((book) => {
                const editing =
                  editingId === book.id;

                return (
                  <tr
                    key={book.id}
                    data-book-id={book.id}
                    className={[
                      "interactive-row",
                      editing
                        ? "row-editing"
                        : "",
                    ].join(" ")}
                  >
                    {fields.map((field) => (
                      <td key={field.key}>
                        {editing && draft ? (
                          <input
                            aria-label={
                              field.label
                            }
                            className="table-edit-input"
                            type={field.type}
                            value={
                              draft[field.key]
                            }
                            min={
                              field.type ===
                              "number"
                                ? 1
                                : undefined
                            }
                            max={
                              field.key ===
                              "anio_publicacion"
                                ? new Date().getFullYear()
                                : undefined
                            }
                            step={
                              field.type ===
                              "number"
                                ? 1
                                : undefined
                            }
                            maxLength={
                              field.type ===
                              "text"
                                ? 250
                                : undefined
                            }
                            onChange={(event) =>
                              changeField(
                                field.key,
                                event,
                              )
                            }
                          />
                        ) : field.key ===
                          "titulo" ? (
                          <button
                            type="button"
                            className="book-title-button"
                            onClick={(event) => {
                              event.stopPropagation();

                              openSynopsis(book);
                            }}
                          >
                            {book.titulo}
                          </button>
                        ) : (
                          book[field.key]
                        )}
                      </td>
                    ))}
                    <td className="book-actions-cell">
                      {editing ? (
                        <div className="book-row-save-actions">
                          <button type="button" className="table-save-button" disabled={saving} onClick={saveChanges}>
                            {saving ? "Guardando..." : "Guardar"}
                          </button>
                          <button type="button" className="table-cancel-button" disabled={saving} onClick={cancelEditing}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="book-row-actions">
                          <button type="button" className="table-edit-button" title="Editar libro" aria-label={`Editar ${book.titulo}`} disabled={deletingId !== null || editingId !== null} onClick={() => startEditing(book)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button type="button" className="table-delete-button" title="Eliminar libro" aria-label={`Eliminar ${book.titulo}`} disabled={deletingId !== null || editingId !== null} onClick={() => deleteBook(book)}>
                            {deletingId === book.id ? (
                              <span className="sr-only">Eliminando libro...</span>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M5 6l1 14h12l1-14" />
                                <path d="M10 10v7" />
                                <path d="M14 10v7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* ERRORES DEL CATÁLOGO */}
      {error && !modalBook && (
        <p
          className="catalog-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* MODAL PARA AGREGAR LIBRO */}
      {showAddModal && (
        <div className="book-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowAddModal(false);
        }}>
          <div className="book-modal add-book-modal" role="dialog" aria-modal="true" aria-labelledby="add-book-title">
            <button type="button" className="book-modal-close" aria-label="Cerrar" onClick={() => setShowAddModal(false)}>{"\u00D7"}</button>
            <p className="book-modal-eyebrow">CÍRCULO DE LECTURA / NUEVO LIBRO</p>
            <h2 id="add-book-title">Agregar libro</h2>
            <div className="book-modal-divider" />
            <BookForm onCancel={() => setShowAddModal(false)} onCreated={(created) => {
              setBooks((current) => [...current, created]);
              setShowAddModal(false);
            }} />
          </div>
        </div>
      )}
      {/* MODAL DE SINOPSIS */}
      {modalBook && (
        <div
          className="book-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="book-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-modal-title"
          >

          <button
            type="button"
            className="book-modal-close"
            aria-label="Cerrar"
            disabled={savingSynopsis}
            onClick={closeModal}
          >
              {"\u00D7"}
          </button>


            <p className="book-modal-eyebrow">
              CÍRCULO DE LECTURA / SINOPSIS
            </p>

            <h2 id="book-modal-title">
              {modalBook.titulo}
            </h2>

            <p className="book-modal-author">
              {modalBook.autor}
            </p>

            <div className="book-modal-divider" />

            {modalLoading ? (
              <p>
                Cargando sinopsis...
              </p>
            ) : modalError &&
              !editingSynopsis ? (
              <p
                className="catalog-error"
                role="alert"
              >
                {modalError}
              </p>
            ) : editingSynopsis ? (
              /* EDITOR PARA AGREGAR O EDITAR */
              <div className="synopsis-editor">
                <label htmlFor="synopsis-editor-input">
                  Sinopsis del libro
                </label>

                <textarea
                  id="synopsis-editor-input"
                  value={synopsisDraft}
                  onChange={(event) =>
                    setSynopsisDraft(
                      event.target.value,
                    )
                  }
                  maxLength={4000}
                  rows={7}
                  placeholder="Escribe aquí la sinopsis del libro..."
                  disabled={savingSynopsis}
                />

                <p className="synopsis-character-count">
                  {synopsisDraft.length} / 4000
                  caracteres
                </p>

                {modalError && (
                  <p
                    className="catalog-error"
                    role="alert"
                  >
                    {modalError}
                  </p>
                )}

                <div className="synopsis-editor-actions">
                  <button
                    type="button"
                    className="synopsis-save-button"
                    disabled={
                      savingSynopsis ||
                      !synopsisDraft.trim()
                    }
                    onClick={saveSynopsis}
                  >
                    {savingSynopsis
                      ? "Guardando..."
                      : "Guardar sinopsis"}
                  </button>

                  <button
                    type="button"
                    className="synopsis-cancel-button"
                    disabled={
                      savingSynopsis
                    }
                    onClick={() => {
                      setEditingSynopsis(false);
                      setModalError("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : modalBook.sinopsis?.trim() ? (
              /* SINOPSIS EXISTENTE */
              <div className="synopsis-existing">
                <p className="book-modal-synopsis">
                  {modalBook.sinopsis}
                </p>

                <div className="synopsis-existing-actions">
                  <button
                    type="button"
                    className="synopsis-edit-button"
                    onClick={
                      beginSynopsisEditing
                    }
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
                    </svg>

                    Editar sinopsis
                  </button>
                </div>
              </div>
            ) : (
              /* LIBRO SIN SINOPSIS */
              <div className="synopsis-empty">
                <p className="book-modal-synopsis">
                  Este libro todavía no tiene
                  una sinopsis registrada.
                </p>

                <p className="synopsis-question">
                  ¿Quieres agregar una?
                </p>

                <button
                  type="button"
                  className="synopsis-add-button"
                  onClick={
                    beginSynopsisEditing
                  }
                >
                  + Agregar sinopsis
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
