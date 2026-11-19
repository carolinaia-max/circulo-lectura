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

// CARACTERES PERMITIDOS POR CAMPO
// El título y la sinopsis aceptan cualquier carácter.
const PERMITIDOS: Partial<Record<CampoLibro, RegExp>> = {
  // Nombre propio: letras (con acentos, ñ, diéresis), espacios, apóstrofos,
  // guiones y puntos. Además debe empezar con letra (ver abajo).
  autor: /[\p{L}\p{M} '’.-]/u,
  // ISBN: números del 0 al 9, guion, X o x y espacios.
  isbn: /[0-9Xx -]/,
  // Género: letras (con acentos y diéresis) y espacios.
  genero: /[\p{L}\p{M} ]/u,
  // Año y páginas: solo dígitos.
  anio_publicacion: /[0-9]/,
  paginas: /[0-9]/,
};

const LETRA = /\p{L}/u;
const ESPACIO = /\s/;

// Posiciones (índices del texto tal como está escrito) de los caracteres
// inválidos de un campo. Los espacios del principio y del final no cuentan,
// porque se recortan al guardar.
export function caracteresInvalidos(campo: CampoLibro, valor: string): number[] {
  const permitido = PERMITIDOS[campo];
  if (!permitido) return [];

  const chars: { char: string; index: number }[] = [];
  let index = 0;
  for (const char of valor) {
    chars.push({ char, index });
    index += char.length;
  }

  let inicio = 0;
  let fin = chars.length;
  while (inicio < fin && ESPACIO.test(chars[inicio].char)) inicio++;
  while (fin > inicio && ESPACIO.test(chars[fin - 1].char)) fin--;

  const invalidos = new Set<number>();

  for (let i = inicio; i < fin; i++) {
    if (!permitido.test(chars[i].char)) invalidos.add(chars[i].index);
  }

  // El autor debe empezar con letra: lo que haya antes de la primera letra
  // (apóstrofos, guiones o puntos) también es inválido.
  if (campo === "autor") {
    for (let i = inicio; i < fin && !LETRA.test(chars[i].char); i++) {
      if (!ESPACIO.test(chars[i].char)) invalidos.add(chars[i].index);
    }
  }

  return [...invalidos].sort((a, b) => a - b);
}

export function mensajeCaracteres(cantidad: number): string {
  return cantidad === 1 ? "Carácter inválido." : "Caracteres inválidos.";
}

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

  const errores: { campo: CampoLibro; mensaje: string; caracteres: number }[] = [];

  // 1) Caracteres inválidos
  for (const campo of OBLIGATORIOS) {
    const invalidos = caracteresInvalidos(campo, values[campo]).length;
    if (invalidos) {
      errores.push({ campo, mensaje: mensajeCaracteres(invalidos), caracteres: invalidos });
    }
  }

  const conCaracteresMalos = new Set(errores.map((error) => error.campo));

  // 2) Reglas de valor, solo en campos con caracteres válidos
  const isbn = values.isbn.trim();
  if (!conCaracteresMalos.has("isbn") && otrosIsbn.includes(isbn)) {
    errores.push({ campo: "isbn", mensaje: "Ya existe un libro con ese ISBN.", caracteres: 0 });
  }

  if (
    !conCaracteresMalos.has("anio_publicacion") &&
    Number(values.anio_publicacion) > new Date().getFullYear()
  ) {
    errores.push({
      campo: "anio_publicacion",
      mensaje: "El año de publicación no puede ser futuro.",
      caracteres: 0,
    });
  }

  if (!conCaracteresMalos.has("paginas")) {
    const paginas = Number(values.paginas);
    if (paginas < 1) {
      errores.push({
        campo: "paginas",
        mensaje: "El número de páginas debe ser mayor que cero.",
        caracteres: 0,
      });
    } else if (paginas > MAX_PAGINAS) {
      errores.push({
        campo: "paginas",
        mensaje: "El número de páginas es demasiado grande.",
        caracteres: 0,
      });
    }
  }

  if (!errores.length) return null;

  const campos = errores.map((error) => error.campo);

  // Un solo campo: su mensaje. Varios campos y todos por caracteres
  // inválidos: "Caracteres inválidos.". Errores distintos: mensaje general.
  let mensaje = errores[0].mensaje;
  if (errores.length > 1) {
    mensaje = errores.every((error) => error.caracteres > 0)
      ? mensajeCaracteres(2)
      : "Revisa los campos marcados en rojo.";
  }

  return { mensaje, campos };
}
