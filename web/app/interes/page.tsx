import MenuLateral from "../MenuLateral";
import { fetchCatalog, getUserEmail } from "../catalogo/catalogApi";
import ListaInteres from "./ListaInteres";
import type { LibroInteres } from "./validacionInteres";

// Libros que el usuario quiere que el club compre. Sin sesión válida,
// fetchCatalog redirige a /login.
export default async function InteresPage() {
  const [response, email] = await Promise.all([fetchCatalog("/interes"), getUserEmail()]);

  return (
    <div className="pagina-interes">
      <MenuLateral email={email} />

      {response?.ok ? (
        <ListaInteres inicial={(await response.json()) as LibroInteres[]} />
      ) : (
        <main className="interes">
          <section className="interes-cabecera">
            <h1>
              Libros
              <br />
              de interés
            </h1>
          </section>
          <p role="alert" className="mensaje-error">
            No se pudo cargar tu lista de libros de interés. Revisa que FastAPI
            esté funcionando y recarga la página.
          </p>
        </main>
      )}
    </div>
  );
}
