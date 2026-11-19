import { mensajeObligatorios, type ErrorDeCampos } from "../formulario";

export type Book = {
  id: number;
  isbn: string;
  titulo: string;
  autor: string;
  genero: string;
  anio_publicacion: number;
  paginas: number;
  sinopsis?: string | null;
};

export type CampoLibro =
  | "titulo"
  | "autor"
  | "isbn"
  | "genero"
  | "anio_publicacion"
  | "paginas";

// Valores tal como se escriben en los campos (siempre texto).
export type BorradorLibro = Record<CampoLibro, string>;

const OBLIGATORIOS: CampoLibro[] = [
  "titulo",
  "autor",
  "isbn",
  "genero",
  "anio_publicacion",
  "paginas",
];

export function borradorDesdeLibro(book?: Book): BorradorLibro {
  return {
    titulo: book?.titulo ?? "",
    autor: book?.autor ?? "",
    isbn: book?.isbn ?? "",
    genero: book?.genero ?? "",
    anio_publicacion: book ? String(book.anio_publicacion) : "",
    paginas: book ? String(book.paginas) : "",
  };
}

export function libroDesdeBorrador(values: BorradorLibro) {
  return {
    titulo: values.titulo.trim(),
    autor: values.autor.trim(),
    isbn: values.isbn.trim(),
    genero: values.genero.trim(),
    anio_publicacion: Number(values.anio_publicacion),
    paginas: Number(values.paginas),
  };
}

// Devuelve el mensaje y los campos con problema, o null si todo está bien.
// `otrosIsbn` son los ISBN de los demás libros del catálogo.
export function validateBook(
  values: BorradorLibro,
  otrosIsbn: string[] = [],
): ErrorDeCampos | null {
  const vacios = OBLIGATORIOS.filter((campo) => !values[campo].trim());

  if (vacios.length) {
    return { mensaje: mensajeObligatorios(vacios), campos: vacios };
  }

  const campos: CampoLibro[] = [];
  let mensaje = "";

  const paginas = Number(values.paginas);
  if (!Number.isInteger(paginas) || paginas < 1) {
    campos.push("paginas");
    mensaje ||= "El número de páginas debe ser mayor que cero.";
  }

  const anio = Number(values.anio_publicacion);
  if (!Number.isInteger(anio) || anio > new Date().getFullYear()) {
    campos.push("anio_publicacion");
    mensaje ||= "El año de publicación no puede ser futuro.";
  }

  if (otrosIsbn.includes(values.isbn.trim())) {
    campos.push("isbn");
    mensaje ||= "Ya existe un libro con ese ISBN.";
  }

  if (campos.length > 1) {
    mensaje = "Revisa los campos marcados en rojo.";
  }

  return campos.length ? { mensaje, campos } : null;
}
