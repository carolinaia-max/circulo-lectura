"use client";

import { Selector } from "../formulario";
import {
  GENEROS,
  aniosDisponibles,
  generoDeLista,
  sinAcentos,
  type Book,
} from "./validacion";

export type Filtros = {
  titulo: string;
  autor: string;
  genero: string;
  desde: string;
  hasta: string;
  paginas: string;
  isbn: string;
};

export const FILTROS_VACIOS: Filtros = {
  titulo: "",
  autor: "",
  genero: "",
  desde: "",
  hasta: "",
  paginas: "",
  isbn: "",
};

export const RANGOS_PAGINAS = [
  { valor: "1-300", texto: "1 a 300", min: 1, max: 300 },
  { valor: "301-600", texto: "301 a 600", min: 301, max: 600 },
  { valor: "601-1000", texto: "601 a 1000", min: 601, max: 1000 },
  { valor: "1001+", texto: "Más de 1000", min: 1001, max: Infinity },
];

export function hayFiltros(filtros: Filtros): boolean {
  return Object.values(filtros).some((valor) => valor.trim() !== "");
}

// Cada palabra escrita debe aparecer en el texto, sin importar mayúsculas
// ni acentos. Ej.: "mundo sofia" encuentra "El Mundo de Sofía".
function contienePalabras(texto: string, busqueda: string): boolean {
  const palabras = sinAcentos(busqueda).split(/\s+/).filter(Boolean);
  const normal = sinAcentos(texto);
  return palabras.every((palabra) => normal.includes(palabra));
}

// Aplica todos los filtros a la vez. `siempreVisible` es el libro que se
// está editando: no desaparece aunque deje de cumplir los filtros.
export function filtrarLibros(
  books: Book[],
  filtros: Filtros,
  siempreVisible: number | null = null,
): Book[] {
  if (!hayFiltros(filtros)) return books;

  // Año: "desde" y "hasta" son opcionales; el mismo año en ambos busca
  // ese año exacto. Si se eligen al revés, se toma el rango igual.
  let min = filtros.desde ? Number(filtros.desde) : -Infinity;
  let max = filtros.hasta ? Number(filtros.hasta) : Infinity;
  if (min > max) [min, max] = [max, min];

  const rango = RANGOS_PAGINAS.find((item) => item.valor === filtros.paginas);
  const isbn = filtros.isbn.replace(/\D/g, "");

  return books.filter((book) => {
    if (book.id === siempreVisible) return true;
    if (filtros.titulo.trim() && !contienePalabras(book.titulo, filtros.titulo)) return false;
    if (filtros.autor.trim() && !contienePalabras(book.autor, filtros.autor)) return false;
    if (filtros.genero && generoDeLista(book.genero) !== filtros.genero) return false;
    if (book.anio_publicacion < min || book.anio_publicacion > max) return false;
    if (rango && (book.paginas < rango.min || book.paginas > rango.max)) return false;
    // El ISBN se compara solo por sus números (ignora guiones y espacios).
    if (isbn && !book.isbn.replace(/\D/g, "").includes(isbn)) return false;
    return true;
  });
}

export default function FiltrosCatalogo({
  filtros,
  onChange,
  total,
  visibles,
}: {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  total: number;
  visibles: number;
}) {
  const activo = hayFiltros(filtros);
  const anios = aniosDisponibles();

  function cambiar(campo: keyof Filtros, valor: string) {
    onChange({ ...filtros, [campo]: valor });
  }

  return (
    <div className="filtros" role="search" aria-label="Filtrar el catálogo">
      <div className="filtros-campos">
        <div className="campo filtro--ancho">
          <label htmlFor="filtro-titulo" className="etiqueta">
            Título
          </label>
          <input
            id="filtro-titulo"
            className="entrada entrada--filtro"
            placeholder="Escribe un título"
            autoComplete="off"
            value={filtros.titulo}
            onChange={(event) => cambiar("titulo", event.target.value)}
          />
        </div>

        <div className="campo filtro--ancho">
          <label htmlFor="filtro-autor" className="etiqueta">
            Autor
          </label>
          <input
            id="filtro-autor"
            className="entrada entrada--filtro"
            placeholder="Escribe un autor"
            autoComplete="off"
            value={filtros.autor}
            onChange={(event) => cambiar("autor", event.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="filtro-genero" className="etiqueta">
            Género
          </label>
          <Selector
            id="filtro-genero"
            className="entrada--filtro"
            placeholder="Todos"
            vacioElegible
            opciones={GENEROS}
            value={filtros.genero}
            onChange={(event) => cambiar("genero", event.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="filtro-desde" className="etiqueta">
            Año desde
          </label>
          <Selector
            id="filtro-desde"
            className="entrada--filtro numeros"
            placeholder="Cualquiera"
            vacioElegible
            opciones={anios}
            value={filtros.desde}
            onChange={(event) => cambiar("desde", event.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="filtro-hasta" className="etiqueta">
            Año hasta
          </label>
          <Selector
            id="filtro-hasta"
            className="entrada--filtro numeros"
            placeholder="Cualquiera"
            vacioElegible
            opciones={anios}
            value={filtros.hasta}
            onChange={(event) => cambiar("hasta", event.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="filtro-paginas" className="etiqueta">
            Páginas
          </label>
          <Selector
            id="filtro-paginas"
            className="entrada--filtro"
            placeholder="Todas"
            vacioElegible
            opciones={RANGOS_PAGINAS.map(({ valor, texto }) => ({ valor, texto }))}
            value={filtros.paginas}
            onChange={(event) => cambiar("paginas", event.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="filtro-isbn" className="etiqueta">
            ISBN
          </label>
          <input
            id="filtro-isbn"
            className="entrada entrada--filtro numeros"
            placeholder="Solo números"
            inputMode="numeric"
            autoComplete="off"
            maxLength={13}
            value={filtros.isbn}
            // Solo números: cualquier otro carácter no llega a escribirse.
            onChange={(event) => cambiar("isbn", event.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div className="filtros-pie">
        <p className="filtros-resultado" aria-live="polite">
          {activo
            ? `${visibles} de ${total} ${total === 1 ? "libro" : "libros"}`
            : ""}
        </p>
        <button
          type="button"
          className="boton-texto"
          disabled={!activo}
          onClick={() => onChange(FILTROS_VACIOS)}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
