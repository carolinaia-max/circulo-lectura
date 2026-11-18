
import Link from "next/link";

import LogoutButton from "./LogoutButton";
import { fetchCatalog } from "./catalogApi";

type Book = {
  id: number;
  isbn: string;
  titulo: string;
  autor: string;
  genero: string;
  anio_publicacion: number;
  paginas: number;
};

export default async function CatalogoPage() {
  const response = await fetchCatalog("/books");

  if (!response?.ok) {
    return (
      <main>
        <h1>Mi biblioteca</h1>
        <p role="alert">
          No se pudo cargar el catálogo. Revisa que FastAPI
          esté corriendo y recarga la página.
        </p>
      </main>
    );
  }

  const books: Book[] = await response.json();

  return (
    <main>
      {/* ENCABEZADO PRINCIPAL */}
      <header className="catalog-header">
        <div>
          <p className="catalog-eyebrow">
            CÍRCULO DE LECTURA
          </p>

          <h1>Mi biblioteca</h1>

          <p className="catalog-description">
            Un espacio para descubrir, organizar y
            explorar tus lecturas.
          </p>
        </div>

        <div className="catalog-actions">
          <LogoutButton />
        </div>
      </header>

      {/* SECCIÓN DEL CATÁLOGO */}
      <section className="catalog-section">
        <div className="catalog-toolbar">
          <div>
            <h2>Catálogo de libros</h2>

            <p className="catalog-count">
              {books.length}{" "}
              {books.length === 1
                ? "libro registrado"
                : "libros registrados"}
            </p>
          </div>

          <Link
            href="/catalogo/nuevo"
            className="catalog-add-button"
          >
            + Agregar libro
          </Link>
        </div>

        {/* TABLA DE LIBROS */}
        {books.length === 0 ? (
          <p className="catalog-empty">
            Todavía no hay libros en el catálogo.
          </p>
        ) : (
          <div className="catalog-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Autor</th>
                  <th scope="col">ISBN</th>
                  <th scope="col">Género</th>
                  <th scope="col">Año</th>
                  <th scope="col">Páginas</th>
                </tr>
              </thead>

              <tbody>
                {books.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <Link href={`/catalogo/${book.id}`}>
                        {book.titulo}
                      </Link>
                    </td>

                    <td>{book.autor}</td>
                    <td>{book.isbn}</td>
                    <td>{book.genero}</td>
                    <td>{book.anio_publicacion}</td>
                    <td>{book.paginas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
