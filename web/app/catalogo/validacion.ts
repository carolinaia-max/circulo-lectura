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
    titulo: values.titulo.trim().normalize("NFC"),
    autor: values.autor.trim().normalize("NFC"),
    isbn: values.isbn.trim(),
    genero: values.genero.trim().normalize("NFC"),
    anio_publicacion: Number(values.anio_publicacion),
    paginas: Number(values.paginas),
  };
}

// Caracteres permitidos por campo. El título y la sinopsis aceptan cualquiera.
// Los textos se normalizan a NFC para que "á" escrito como "a" + acento
// combinado cuente como una sola letra.

// Nombre propio: empieza con letra; luego letras (con acentos, ñ, diéresis),
// espacios, apóstrofos, guiones y puntos. Ej.: "J. R. R. Tolkien",
// "Gabriel García Márquez", "Ngũgĩ wa Thiong'o", "Jean-Paul Sartre".
const NOMBRE_PROPIO = /^\p{L}[\p{L}\p{M} '’.-]*$/u;

// ISBN: números del 0 al 9, guion, letra X (mayúscula o minúscula) y espacios.
const ISBN = /^[0-9Xx -]+$/;

// Género: letras (con acentos y diéresis) y espacios.
const GENERO = /^[\p{L}\p{M} ]+$/u;

// Año y páginas: solo dígitos.
const DIGITOS = /^[0-9]+$/;

// Máximo que guarda la base de datos para las páginas (entero de 32 bits).
const MAX_PAGINAS = 2147483647;

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

  function marcar(campo: CampoLibro, texto: string) {
    campos.push(campo);
    mensaje ||= texto;
  }

  const autor = values.autor.trim().normalize("NFC");
  if (!NOMBRE_PROPIO.test(autor)) {
    marcar(
      "autor",
      "El autor solo puede tener letras, espacios, apóstrofos, guiones y puntos.",
    );
  }

  const isbn = values.isbn.trim();
  if (!ISBN.test(isbn)) {
    marcar("isbn", "El ISBN solo puede tener números, guiones, espacios y la letra X.");
  } else if (otrosIsbn.includes(isbn)) {
    marcar("isbn", "Ya existe un libro con ese ISBN.");
  }

  const genero = values.genero.trim().normalize("NFC");
  if (!GENERO.test(genero)) {
    marcar("genero", "El género solo puede tener letras y espacios.");
  }

  const anioTexto = values.anio_publicacion.trim();
  if (!DIGITOS.test(anioTexto)) {
    marcar("anio_publicacion", "El año solo puede tener números.");
  } else if (Number(anioTexto) > new Date().getFullYear()) {
    marcar("anio_publicacion", "El año de publicación no puede ser futuro.");
  }

  const paginasTexto = values.paginas.trim();
  const paginas = Number(paginasTexto);
  if (!DIGITOS.test(paginasTexto) || paginas < 1) {
    marcar("paginas", "El número de páginas debe ser mayor que cero.");
  } else if (paginas > MAX_PAGINAS) {
    marcar("paginas", "El número de páginas es demasiado grande.");
  }

  if (campos.length > 1) {
    mensaje = "Revisa los campos marcados en rojo.";
  }

  return campos.length ? { mensaje, campos } : null;
}
