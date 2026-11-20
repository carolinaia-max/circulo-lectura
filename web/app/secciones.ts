// Secciones de la biblioteca: se usan en el menú desplegable y en el inicio.
// Viven aquí (y no en MenuSecciones.tsx) porque las páginas del servidor no
// pueden leer constantes de un módulo "use client".

export type Seccion = "inicio" | "catalogo" | "interes";

export const SECCIONES: {
  id: Exclude<Seccion, "inicio">;
  href: string;
  texto: string;
  nota: string;
}[] = [
  {
    id: "catalogo",
    href: "/catalogo",
    texto: "Catálogo del club",
    nota: "Los libros que ya están en la biblioteca",
  },
  {
    id: "interes",
    href: "/interes",
    texto: "Libros de interés",
    nota: "Los libros que te gustaría que el club compre",
  },
];
