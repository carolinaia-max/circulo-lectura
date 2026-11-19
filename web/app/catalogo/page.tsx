import LogoutButton from "./LogoutButton";
import CatalogoInteractivo, { type Book } from "./CatalogoInteractivo";
import { fetchCatalog } from "./catalogApi";

// Correo del usuario para la barra superior. Si no se puede obtener,
// la barra muestra solo "Cerrar sesión".
async function getUserEmail(): Promise<string | null> {
  const response = await fetchCatalog("/auth/me");
  if (!response?.ok) return null;

  const user: unknown = await response.json().catch(() => null);
  const email = (user as { email?: unknown } | null)?.email;

  return typeof email === "string" ? email : null;
}

export default async function CatalogoPage() {
  // Obtener los libros y el usuario desde FastAPI
  const [response, email] = await Promise.all([
    fetchCatalog("/books"),
    getUserEmail(),
  ]);

  return (
    <div className="pagina-catalogo">
      <header className="barra">
        <nav aria-label="Sesión" className="barra-nav">
          {email && <span className="barra-correo">{email}</span>}
          <LogoutButton />
        </nav>
      </header>

      {response?.ok ? (
        <CatalogoInteractivo initialBooks={(await response.json()) as Book[]} />
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
