import BarraSuperior from "../BarraSuperior";
import CatalogoInteractivo, { type Book } from "./CatalogoInteractivo";
import { fetchCatalog, getUser } from "./catalogApi";

export default async function CatalogoPage() {
  // Obtener los libros y el usuario desde FastAPI
  const [response, user] = await Promise.all([fetchCatalog("/books"), getUser()]);

  return (
    <div className="pagina-catalogo">
      <BarraSuperior email={user?.email ?? null} actual="catalogo" />

      {response?.ok ? (
        <CatalogoInteractivo
          initialBooks={(await response.json()) as Book[]}
          buscarEnOpenLibrary
        />
      ) : (
        <main className="catalogo">
          <section className="catalogo-cabecera">
            <h1>Catálogo</h1>
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
