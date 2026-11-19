import BookForm from "../BookForm";
import { fetchCatalog } from "../catalogApi";

export default async function NuevoLibroPage() {
  const response = await fetchCatalog("/auth/me");

  if (!response?.ok) {
    return (
      <main className="pagina-simple">
        <h1>Agregar libro</h1>
        <p role="alert">No se pudo verificar la sesión. Intenta de nuevo.</p>
      </main>
    );
  }

  return (
    <main className="pagina-simple">
      <h1>Agregar libro</h1>
      <BookForm />
    </main>
  );
}