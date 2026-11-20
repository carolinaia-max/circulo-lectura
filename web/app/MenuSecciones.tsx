"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { SECCIONES, type Seccion } from "./secciones";

// Menú desplegable para moverse entre las secciones de la biblioteca.
// Se abre con clic, Enter, Espacio o las flechas; se cierra con Escape,
// con Tab o al hacer clic fuera.
export default function MenuSecciones({ actual }: { actual: Seccion }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  const actualTexto =
    SECCIONES.find((seccion) => seccion.id === actual)?.texto ?? "Elige una sección";

  useEffect(() => {
    if (!abierto) return;

    function alClicFuera(event: MouseEvent) {
      if (!contenedorRef.current?.contains(event.target as Node)) setAbierto(false);
    }

    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, [abierto]);

  function opciones(): HTMLAnchorElement[] {
    return Array.from(
      contenedorRef.current?.querySelectorAll<HTMLAnchorElement>("[role=menuitem]") ?? [],
    );
  }

  function abrirYEnfocar(indice: number) {
    setAbierto(true);
    setTimeout(() => {
      const lista = opciones();
      lista[(indice + lista.length) % lista.length]?.focus();
    });
  }

  function teclaBoton(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      abrirYEnfocar(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      abrirYEnfocar(-1);
    } else if (event.key === "Escape") {
      setAbierto(false);
    }
  }

  function teclaMenu(event: KeyboardEvent<HTMLDivElement>) {
    const lista = opciones();
    const indice = lista.indexOf(document.activeElement as HTMLAnchorElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setAbierto(false);
      botonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const paso = event.key === "ArrowDown" ? 1 : -1;
      lista[(indice + paso + lista.length) % lista.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      lista[event.key === "Home" ? 0 : lista.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setAbierto(false);
    }
  }

  return (
    <div className="menu" ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        className="menu-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onClick={() => setAbierto((valor) => !valor)}
        onKeyDown={teclaBoton}
      >
        <span className="menu-boton-etiqueta">Biblioteca</span>
        <span className="menu-boton-texto">{actualTexto}</span>
        <svg
          aria-hidden="true"
          focusable="false"
          width="14"
          height="9"
          viewBox="0 0 14 9"
          className="menu-flecha"
        >
          <path d="M1 1 L7 7 L13 1" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {abierto && (
        <div
          id={idMenu}
          role="menu"
          aria-label="Secciones de la biblioteca"
          className="menu-lista"
          onKeyDown={teclaMenu}
        >
          {SECCIONES.map((seccion) => (
            <Link
              key={seccion.id}
              href={seccion.href}
              role="menuitem"
              className="menu-opcion"
              aria-current={seccion.id === actual ? "page" : undefined}
              onClick={() => setAbierto(false)}
            >
              <span className="menu-opcion-texto">{seccion.texto}</span>
              <span className="menu-opcion-nota">{seccion.nota}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
