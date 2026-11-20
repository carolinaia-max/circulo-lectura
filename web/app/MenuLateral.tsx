"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import LogoutButton from "./catalogo/LogoutButton";
import { IconoCasa, IconoEstante, IconoMarcador, IconoMenu } from "./ilustraciones";

const OPCIONES: { href: string; texto: string; icono: ReactNode }[] = [
  { href: "/inicio", texto: "Inicio", icono: <IconoCasa /> },
  { href: "/catalogo", texto: "Catálogo", icono: <IconoEstante /> },
  { href: "/interes", texto: "Libros de interés", icono: <IconoMarcador /> },
];

// La ficha y la edición de un libro (/catalogo/3) siguen siendo "Catálogo".
function esActual(href: string, ruta: string) {
  return ruta === href || ruta.startsWith(`${href}/`);
}

// Encabezado de las páginas con sesión: correo, "Cerrar sesión" y el botón
// del círculo que abre el menú lateral. El menú se cierra con el mismo
// botón, con un clic en la capa oscura o con Escape (el foco vuelve al botón).
export default function MenuLateral({ email }: { email: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const ruta = usePathname();

  // Al cambiar de página, el menú queda cerrado.
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPresionar(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setAbierto(false);
      botonRef.current?.focus();
    }

    document.addEventListener("keydown", alPresionar);
    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  return (
    <header className="barra">
      <div className="barra-nav">
        {email && <span className="barra-correo">{email}</span>}
        <LogoutButton />
        <button
          ref={botonRef}
          type="button"
          className="menu-boton"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          aria-controls="menu-lateral"
          onClick={() => setAbierto((valor) => !valor)}
        >
          <IconoMenu abierto={abierto} />
        </button>
      </div>

      {abierto && (
        <>
          {/* La capa no es un control aparte: el botón del círculo y Escape
              ya cierran el menú para teclado y lectores de pantalla. */}
          <div className="menu-capa" aria-hidden="true" onClick={() => setAbierto(false)} />

          <nav id="menu-lateral" aria-label="Menú principal" className="menu-panel">
            <div className="menu-titulo">Menú</div>

            <ul className="menu-opciones">
              {OPCIONES.map((opcion) => {
                const actual = esActual(opcion.href, ruta);
                return (
                  <li key={opcion.href}>
                    <Link
                      href={opcion.href}
                      className="menu-opcion"
                      aria-current={actual ? "page" : undefined}
                      onClick={() => setAbierto(false)}
                    >
                      <span className="menu-opcion-icono">{opcion.icono}</span>
                      <span className="menu-opcion-texto">{opcion.texto}</span>
                      <span className="menu-opcion-marca" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="menu-decoracion" aria-hidden="true">
              <span className="menu-decoracion-roja" />
              <span className="menu-decoracion-negra" />
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
