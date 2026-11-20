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

// OPCIONES DE GÉNERO Y AÑO
// El género y el año no se escriben: se eligen de estas listas.

export const GENEROS = [
  "Fantasía",
  "Ciencia ficción",
  "Thriller",
  "Romance",
  "Terror",
  "Novela histórica",
  "Aventuras",
  "Infantil/Juvenil",
  "Divulgación científica",
  "Otro",
];

// Autor anónimo: se marca con una casilla y se guarda con este texto.
export const AUTOR_ANONIMO = "Anónimo";

export function esAnonimo(autor: string): boolean {
  return sinAcentos(autor) === "anonimo";
}

// Años disponibles: del actual hacia atrás hasta la imprenta de Gutenberg.
export const ANIO_MINIMO = 1450;

export function aniosDisponibles(): string[] {
  const actual = new Date().getFullYear();
  return Array.from({ length: actual - ANIO_MINIMO + 1 }, (_, i) => String(actual - i));
}

// Texto sin acentos ni mayúsculas, para comparar y buscar.
export function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// Si un género guardado coincide con una opción salvo por mayúsculas o
// acentos (por ejemplo "fantasia"), se usa la opción de la lista.
export function generoDeLista(genero: string): string {
  return GENEROS.find((opcion) => sinAcentos(opcion) === sinAcentos(genero)) ?? genero;
}

export function borradorDesdeLibro(book?: Book): BorradorLibro {
  return {
    titulo: book?.titulo ?? "",
    autor: book ? (esAnonimo(book.autor) ? AUTOR_ANONIMO : book.autor) : "",
    isbn: book?.isbn ?? "",
    genero: book ? generoDeLista(book.genero) : "",
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
  // Páginas: solo dígitos.
  paginas: /[0-9]/,
  // Género y año se eligen de una lista (ver validateBook).
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
  if (!conCaracteresMalos.has("isbn")) {
    if (!/[0-9]/.test(isbn)) {
      errores.push({
        campo: "isbn",
        mensaje: "El ISBN debe tener al menos un número.",
        caracteres: 0,
      });
    } else if (otrosIsbn.includes(isbn)) {
      errores.push({ campo: "isbn", mensaje: "Ya existe un libro con ese ISBN.", caracteres: 0 });
    }
  }

  // Género y año: solo valores de la lista. Un libro antiguo puede traer
  // otro valor; para guardarlo hay que elegir uno de la lista.
  if (!GENEROS.includes(values.genero)) {
    errores.push({ campo: "genero", mensaje: "Elige un género de la lista.", caracteres: 0 });
  }

  if (!aniosDisponibles().includes(values.anio_publicacion.trim())) {
    errores.push({
      campo: "anio_publicacion",
      mensaje: "Elige un año de la lista.",
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
