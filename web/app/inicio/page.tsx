import MenuLateral from "../MenuLateral";
import { getUserEmail } from "../catalogo/catalogApi";
import { LogoClub } from "../ilustraciones";

// Página a la que se llega después de iniciar sesión. Sin sesión válida,
// getUserEmail redirige a /login.
export default async function InicioPage() {
  const email = await getUserEmail();

  return (
    <div className="pagina-inicio">
      <MenuLateral email={email} />

      <main className="inicio">
        <div className="inicio-contenido">
          <LogoClub />
          <div className="inicio-texto">
            <h1>Círculo de Lectura</h1>
            <div className="inicio-regla" aria-hidden="true" />
            <p>Un club para leer juntos y una biblioteca para compartir.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
