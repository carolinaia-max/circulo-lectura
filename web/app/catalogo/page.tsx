import MenuLateral from "../MenuLateral";
import CatalogoInteractivo, { type Book } from "./CatalogoInteractivo";
import { fetchCatalog, getUserEmail } from "./catalogApi";

export default async function CatalogoPage() {
  // Obtener los libros y el usuario desde FastAPI
  const [response, email] = await Promise.all([
    fetchCatalog("/books"),
    getUserEmail(),
  ]);

  return (
    <div className="pagina-catalogo">
      <MenuLateral email={email} />

      {response?.ok ? (
        <CatalogoInteractivo initialBooks={(await response.json()) as Book[]} />
      ) : (
        <main className="catalogo">
          <section className="catalogo-cabecera">
            <h1>Catálogo de libros</h1>
          </section>
          <p role="alert" className="mensaje-error catalogo-aviso">
            No se pudo cargar el catálogo. Revisa que FastAPI esté funcionando y
            recarga la página.
          </p>
        </main>
      )}
    </div>
  );
}
