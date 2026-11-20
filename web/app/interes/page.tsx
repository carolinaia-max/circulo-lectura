import BarraSuperior from "../BarraSuperior";
import CatalogoInteractivo, {
  type Book,
  type TextosLista,
} from "../catalogo/CatalogoInteractivo";
import { fetchCatalog, getUser } from "../catalogo/catalogApi";

const TEXTOS: TextosLista = {
  titulo: "De interés",
  singular: "Libro en tu lista",
  plural: "Libros en tu lista",
  vacio: "Aún no tienes libros de interés. Agrega los que te gustaría que el club compre.",
  eliminarDe: "de tu lista",
};

// Libros que el usuario quiere que el club compre. Usa la misma tabla que
// el catálogo, pero guarda en /interes (una lista propia de cada usuario).
export default async function InteresPage() {
  const [response, user] = await Promise.all([fetchCatalog("/interes"), getUser()]);

  return (
    <div className="pagina-catalogo">
      <BarraSuperior email={user?.email ?? null} actual="interes" />

      {response?.ok ? (
        <CatalogoInteractivo
          initialBooks={(await response.json()) as Book[]}
          apiBase="/interes"
          textos={TEXTOS}
        />
      ) : (
        <main className="catalogo">
          <section className="catalogo-cabecera">
            <h1>{TEXTOS.titulo}</h1>
          </section>
          <p role="alert" className="mensaje-error catalogo-aviso">
            No se pudo cargar tu lista de libros de interés. Revisa que FastAPI
            esté funcionando y recarga la página.
          </p>
        </main>
      )}
    </div>
  );
}
