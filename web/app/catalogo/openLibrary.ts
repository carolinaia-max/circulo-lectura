// BÚSQUEDA DE LIBROS EN OPEN LIBRARY
// https://openlibrary.org/dev/docs/api/search
//
// Al agregar un libro al catálogo, los campos Título, Autor e ISBN sugieren
// coincidencias de Open Library mientras se escribe. Cada campo busca solo
// por lo suyo (title:, author: o isbn:). Al elegir una sugerencia se rellenan
// los demás campos con los datos de esa obra.

import { GENEROS, aniosDisponibles, sinAcentos, type BorradorLibro } from "./validacion";

export type CampoBusqueda = "titulo" | "autor" | "isbn";

export type Sugerencia = {
  // Identificador de la obra en Open Library, por ejemplo "/works/OL45804W".
  clave: string;
  // Texto principal de la opción: el título, el autor o el ISBN buscado.
  principal: string;
  // Texto secundario para distinguir opciones parecidas.
  detalle: string;
  // Valores para rellenar el formulario (solo los que se conocen).
  valores: Partial<BorradorLibro>;
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

// Texto tal como lo escribe la persona → texto que se envía a la API.
export function textoDeBusqueda(campo: CampoBusqueda, texto: string): string {
  if (campo === "isbn") return texto.replace(/[\s-]/g, "").toUpperCase();
  return texto.trim().replace(/\s+/g, " ");
}

// Consulta de Solr: todas las palabras deben aparecer y la última puede
// estar a medio escribir ("cien años de sol" → title:(cien AND años AND de AND sol*)).
function consulta(campo: CampoBusqueda, texto: string): string {
  if (campo === "isbn") return `isbn:${texto.replace(/[^0-9X]/g, "")}*`;

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
  const isbn =
    campo === "isbn" ? elegirIsbn(doc.isbn ?? [], texto) : elegirIsbn(doc.isbn ?? [], "");

  // Buscando por ISBN, la obra debe tener un ISBN que empiece con lo escrito.
  if (campo === "isbn" && !isbn) return null;

  const anio = doc.first_publish_year ? String(doc.first_publish_year) : "";
  const valores: Partial<BorradorLibro> = { titulo };
  if (autor) valores.autor = autor;
  if (isbn) valores.isbn = isbn;
  if (anio && aniosDisponibles().includes(anio)) valores.anio_publicacion = anio;
  if (doc.number_of_pages_median && doc.number_of_pages_median > 0) {
    valores.paginas = String(doc.number_of_pages_median);
  }
  const genero = generoDesdeTemas(doc.subject ?? []);
  if (genero) valores.genero = genero;

  const partes = (...textos: string[]) => textos.filter(Boolean).join(" · ");

  const opcion =
    campo === "titulo"
      ? { principal: titulo, detalle: partes(autor, anio) }
      : campo === "autor"
        ? { principal: autor || "Autor desconocido", detalle: partes(titulo, anio) }
        : { principal: isbn, detalle: partes(titulo, autor) };

  return { clave: doc.key, ...opcion, valores };
}

// Open Library a veces guarda los acentos como caracteres sueltos
// ("García"); se unen para que el texto quede como se escribe.
function limpiar(texto: string): string {
  return texto.normalize("NFC").replace(/\s+/g, " ").trim();
}

// Al buscar por autor, se muestra el autor que coincide con lo escrito
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

function elegirIsbn(isbns: string[], prefijo: string): string {
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
// Open Library no tiene un género único: tiene "temas" (en varios idiomas).
// Se cuenta cuántos temas apuntan a cada género de la lista y se elige el
// que más tenga. Si ninguno coincide, el género queda sin elegir.
const PALABRAS_GENERO: Record<string, string[]> = {
  "Fantasía": ["fantasy", "fantasia", "fantastic", "fantastico", "magic", "magia", "dragons", "wizards"],
  "Ciencia ficción": ["science fiction", "ciencia ficcion", "dystopia", "distopia", "space opera", "robots"],
  "Thriller": ["thriller", "suspense", "mystery", "misterio", "detective", "crime", "policiaca", "policial", "espionage"],
  "Romance": ["romance", "love stories", "romantic", "romantica", "novela rosa"],
  "Terror": ["horror", "terror", "ghost stories", "vampires", "supernatural"],
  "Novela histórica": ["historical fiction", "novela historica", "ficcion historica"],
  "Aventuras": ["adventure", "aventura"],
  "Infantil/Juvenil": ["juvenile", "children", "young adult", "infantil", "juvenil", "picture books"],
  "Divulgación científica": ["popular works", "popular science", "divulgacion"],
};

export function generoDesdeTemas(temas: string[]): string {
  const normalizados = temas.map(sinAcentos);
  let mejor = "";
  let mejorCuenta = 0;

  for (const genero of GENEROS) {
    const palabras = PALABRAS_GENERO[genero] ?? [];
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
