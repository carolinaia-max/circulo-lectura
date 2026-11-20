import Link from "next/link";

import LogoutButton from "./catalogo/LogoutButton";
import MenuSecciones from "./MenuSecciones";
import type { Seccion } from "./secciones";

type Props = {
  email: string | null;
  actual: Seccion;
};

// Barra común a las páginas con sesión: marca (vuelve al inicio), menú de
// secciones, correo del usuario y botón para cerrar sesión.
export default function BarraSuperior({ email, actual }: Props) {
  return (
    <header className="barra">
      <nav aria-label="Principal" className="barra-principal">
        <Link
          href="/inicio"
          className="barra-marca"
          aria-current={actual === "inicio" ? "page" : undefined}
        >
          Círculo de Lectura
        </Link>
        <MenuSecciones actual={actual} />
      </nav>

      <nav aria-label="Sesión" className="barra-nav">
        {email && <span className="barra-correo">{email}</span>}
        <LogoutButton />
      </nav>
    </header>
  );
}
