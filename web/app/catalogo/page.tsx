import LogoutButton from "./LogoutButton";
import CatalogoInteractivo, {
  type Book,
} from "./CatalogoInteractivo";
import { fetchCatalog } from "./catalogApi";

export default async function CatalogoPage() {
  // Obtener los libros desde FastAPI
  const response = await fetchCatalog("/books");

  // Mostrar un mensaje si no se puede cargar el catálogo
  if (!response?.ok) {
    return (
      <main>
        <h1>Mi biblioteca</h1>

        <p role="alert">
          No se pudo cargar el catálogo.
          Revisa que FastAPI esté funcionando
          y recarga la página.
        </p>
      </main>
    );
  }

  // Convertir la respuesta en una lista de libros
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
            Un espacio para descubrir, organizar
            y explorar tus lecturas.
          </p>
        </div>

        <div className="catalog-actions">
          <LogoutButton />
        </div>
      </header>

      {/* SECCIÓN DEL CATÁLOGO */}
      <section className="catalog-section">
        <CatalogoInteractivo initialBooks={books} />
      </section>
    </main>
  );
}
