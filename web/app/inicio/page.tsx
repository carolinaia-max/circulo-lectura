import Link from "next/link";

import BarraSuperior from "../BarraSuperior";
import { SECCIONES } from "../secciones";
import { fetchCatalog, getUser } from "../catalogo/catalogApi";
import { IconoFlecha } from "../ilustraciones";

// Cantidad de libros de una lista; null si no se pudo consultar.
async function contar(path: string): Promise<number | null> {
  const response = await fetchCatalog(path);
  if (!response?.ok) return null;

  const data: unknown = await response.json().catch(() => null);
  return Array.isArray(data) ? data.length : null;
}

// Dashboard al que se llega después de iniciar sesión.
export default async function InicioPage() {
  const [user, enCatalogo, deInteres] = await Promise.all([
    getUser(),
    contar("/books"),
    contar("/interes"),
  ]);

  const cantidades = { catalogo: enCatalogo, interes: deInteres };
  const nombre = user?.name.trim().split(/\s+/)[0];

  return (
    <div className="pagina-catalogo">
      <BarraSuperior email={user?.email ?? null} actual="inicio" />

      <main className="catalogo inicio">
        <section className="catalogo-cabecera">
          <h1>{nombre ? `Hola, ${nombre}` : "Hola"}</h1>
          <p className="inicio-lema">
            Consulta los libros que el club ya tiene en su biblioteca o arma tu
            lista de libros que te gustaría que se compren.
          </p>
        </section>

        <ul className="inicio-secciones">
          {SECCIONES.map((seccion, indice) => {
            const cantidad = cantidades[seccion.id];

            return (
              <li key={seccion.id}>
                <Link
                  href={seccion.href}
                  className={`inicio-tarjeta${indice === 0 ? " inicio-tarjeta--roja" : ""}`}
                >
                  <span className="inicio-tarjeta-numero">
                    {cantidad === null ? "—" : String(cantidad).padStart(2, "0")}
                  </span>
                  <span className="inicio-tarjeta-titulo">{seccion.texto}</span>
                  <span className="inicio-tarjeta-nota">{seccion.nota}</span>
                  <IconoFlecha />
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
