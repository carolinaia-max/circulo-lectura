// BÚSQUEDA DE LIBROS EN OPEN LIBRARY
// https://openlibrary.org/dev/docs/api/search
//
// En los modales para agregar libros (catálogo y libros de interés), los
// campos Título, Autor e ISBN sugieren coincidencias mientras se escribe.
// Cada campo busca solo por lo suyo (title:, author: o isbn:). Al elegir una
// sugerencia se rellenan los demás campos del modal.

export type CampoBusqueda = "titulo" | "autor" | "isbn";

// Campos que una sugerencia puede rellenar. Cada modal usa los que tiene.
export type DatosLibro = {
  titulo: string;
  autor: string;
  anio_publicacion: string;
  isbn?: string;
  paginas?: string;
  genero?: string;
};

export type Sugerencia = {
  // Identificador de la obra en Open Library, por ejemplo "/works/OL45804W".
  clave: string;
  titulo: string;
  autor: string;
  anio: string;
  // ISBN que se muestra en la opción (solo al buscar por ISBN).
  isbnBuscado: string;
  datos: DatosLibro;
};

const API = "https://openlibrary.org";
const CAMPOS_API = "key,title,author_name,first_publish_year,number_of_pages_median,isbn,subject";
const LIMITE = 8;

// Mínimo de caracteres antes de buscar, para no lanzar búsquedas demasiado amplias.
export const MINIMO: Record<CampoBusqueda, number> = { titulo: 3, autor: 3, isbn: 4 };

type DocumentoOL = {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  subject?: string[];
};

function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// Texto tal como se escribe → texto que se envía a la API.
export function textoDeBusqueda(campo: CampoBusqueda, texto: string): string {
  if (campo === "isbn") return texto.replace(/[^0-9Xx]/g, "").toUpperCase();
  return texto.trim().replace(/\s+/g, " ");
}

// Consulta de Solr: todas las palabras deben aparecer y la última puede
// estar a medio escribir ("cien años de sol" → title:(cien AND años AND de AND sol*)).
function consulta(campo: CampoBusqueda, texto: string): string {
  if (campo === "isbn") return `isbn:${texto}*`;

  const palabras = texto
    .toLowerCase()
    // Quitar los caracteres con significado especial en Solr.
    .replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const ultima = palabras.length - 1;
  const terminos = palabras.map((palabra, i) =>
    i === ultima && palabra.length >= 2 ? `${palabra}*` : palabra,
  );

  return `${campo === "titulo" ? "title" : "author"}:(${terminos.join(" AND ")})`;
}

const cache = new Map<string, Sugerencia[]>();

export async function buscarSugerencias(
  campo: CampoBusqueda,
  texto: string,
  signal?: AbortSignal,
): Promise<Sugerencia[]> {
  const clave = `${campo}:${sinAcentos(texto)}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;

  const parametros = new URLSearchParams({
    q: consulta(campo, texto),
    fields: CAMPOS_API,
    limit: String(LIMITE),
  });

  const response = await fetch(`${API}/search.json?${parametros}`, { signal });
  if (!response.ok) throw new Error("Open Library no respondió.");

  const data = (await response.json()) as { docs?: DocumentoOL[] };
  const sugerencias = (data.docs ?? [])
    .filter((doc) => doc.title)
    .map((doc) => aSugerencia(campo, texto, doc))
    .filter((sugerencia): sugerencia is Sugerencia => sugerencia !== null);

  cache.set(clave, sugerencias);
  return sugerencias;
}

function aSugerencia(campo: CampoBusqueda, texto: string, doc: DocumentoOL): Sugerencia | null {
  const titulo = limpiar(doc.title ?? "");
  const autor = elegirAutor(doc.author_name ?? [], campo === "autor" ? texto : "");
  const isbn = elegirIsbn(doc.isbn ?? [], campo === "isbn" ? texto : "");

  // Buscando por ISBN, la obra debe tener un ISBN que empiece con lo escrito.
  if (campo === "isbn" && !isbn) return null;

  const anioNumero = doc.first_publish_year ?? 0;
  const anio =
    anioNumero >= 1 && anioNumero <= new Date().getFullYear() ? String(anioNumero) : "";

  const datos: DatosLibro = { titulo, autor, anio_publicacion: anio };
  if (isbn) datos.isbn = isbn;
  if (doc.number_of_pages_median && doc.number_of_pages_median > 0) {
    datos.paginas = String(doc.number_of_pages_median);
  }
  const genero = generoDesdeTemas(doc.subject ?? []);
  if (genero) datos.genero = genero;

  return {
    clave: doc.key,
    titulo,
    autor,
    anio,
    isbnBuscado: campo === "isbn" ? isbn : "",
    datos,
  };
}

// Open Library a veces guarda los acentos como caracteres sueltos
// ("García"); se unen para que el texto quede como se escribe.
function limpiar(texto: string): string {
  return texto.normalize("NFC").replace(/\s+/g, " ").trim();
}

// Al buscar por autor se muestra el autor que coincide con lo escrito
// (una obra puede tener varios); si no, el primero.
function elegirAutor(autores: string[], texto: string): string {
  const buscado = sinAcentos(texto).split(" ").filter(Boolean);
  const coincide = autores.find((autor) => {
    const nombre = sinAcentos(autor);
    return buscado.every((palabra) => nombre.includes(palabra));
  });
  return limpiar(coincide ?? autores[0] ?? "");
}

// Prefijos de ISBN de países de habla hispana: si la obra tiene una edición
// en español, se prefiere su ISBN.
const PREFIJOS_ESPANOL = [
  "97884", "978950", "978987", "978607", "978968", "978970", "978958",
  "978956", "978980", "9789972", "9789942", "9789974", "9789977", "9789929",
];

function elegirIsbn(isbns: string[], escrito: string): string {
  const prefijo = textoDeBusqueda("isbn", escrito);
  const candidatos = isbns
    .map((isbn) => isbn.replace(/[\s-]/g, "").toUpperCase())
    .filter((isbn) => isbn.startsWith(prefijo));

  const isbn13 = candidatos.filter((isbn) => isbn.length === 13);
  return (
    isbn13.find((isbn) => PREFIJOS_ESPANOL.some((p) => isbn.startsWith(p))) ??
    isbn13[0] ??
    candidatos[0] ??
    ""
  );
}

// GÉNERO
// Open Library no tiene un género único: tiene "temas" en varios idiomas.
// Se cuenta cuántos temas apuntan a cada género y se elige el que más tenga.
// Si ninguno coincide, el género queda vacío para escribirlo a mano.
// Los nombres solo llevan letras y espacios, como pide la validación.
const PALABRAS_GENERO: [string, string[]][] = [
  ["Fantasía", ["fantasy", "fantasia", "fantastic", "fantastico", "magic", "magia", "dragons", "wizards"]],
  ["Ciencia ficción", ["science fiction", "ciencia ficcion", "dystopia", "distopia", "space opera", "robots"]],
  ["Misterio", ["mystery", "misterio", "detective", "crime", "policiaca", "policial", "thriller", "suspense"]],
  ["Romance", ["romance", "love stories", "romantic", "romantica"]],
  ["Terror", ["horror", "terror", "ghost stories", "vampires", "supernatural"]],
  ["Novela histórica", ["historical fiction", "novela historica", "ficcion historica"]],
  ["Aventura", ["adventure", "aventura"]],
  ["Infantil y juvenil", ["juvenile", "children", "young adult", "infantil", "juvenil", "picture books"]],
  ["Poesía", ["poetry", "poesia", "poems", "poemas"]],
  ["Divulgación científica", ["popular works", "popular science", "divulgacion"]],
];

export function generoDesdeTemas(temas: string[]): string {
  const normalizados = temas.map(sinAcentos);
  let mejor = "";
  let mejorCuenta = 0;

  for (const [genero, palabras] of PALABRAS_GENERO) {
    const cuenta = normalizados.filter((tema) =>
      palabras.some((palabra) => tema.includes(palabra)),
    ).length;
    if (cuenta > mejorCuenta) {
      mejor = genero;
      mejorCuenta = cuenta;
    }
  }

  return mejor;
}

// SINOPSIS
// La búsqueda no trae la descripción; se pide a la ficha de la obra.
// Devuelve "" si no hay descripción o no se pudo obtener.
export async function buscarSinopsis(clave: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await fetch(`${API}${clave}.json`, { signal });
    if (!response.ok) return "";

    const obra = (await response.json()) as { description?: string | { value?: string } };
    const texto =
      typeof obra.description === "string" ? obra.description : obra.description?.value ?? "";

    return limpiarSinopsis(texto);
  } catch {
    return "";
  }
}

const MAX_SINOPSIS = 4000;

function limpiarSinopsis(texto: string): string {
  let limpio = texto
    .normalize("NFC")
    // Las descripciones suelen terminar con una sección de enlaces o fuentes.
    .split(/\n\s*-{3,}/)[0]
    // Enlaces en formato Markdown: [texto](url) o [texto][1] → texto.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[\d+\]/g, "$1")
    .replace(/^\s*\[\d+\]:.*$/gm, "")
    // Cursivas y negritas de Markdown: *texto* o **texto** → texto.
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (limpio.length > MAX_SINOPSIS) {
    // Cortar en el último punto antes del límite.
    const corte = limpio.lastIndexOf(".", MAX_SINOPSIS - 1);
    limpio = limpio.slice(0, corte > 0 ? corte + 1 : MAX_SINOPSIS);
  }

  return limpio;
}
