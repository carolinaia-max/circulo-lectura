"use client";

import type { Book } from "./validacion";

// FILTROS DEL CATÁLOGO
// Se aplican en el navegador sobre los libros ya cargados.

export type Filtros = {
  titulo: string;
  autor: string;
  anonimo: boolean;
  genero: string;
  desde: string;
  hasta: string;
  paginas: "" | "hasta150" | "151a300" | "mas300";
  isbn: string;
};

export const FILTROS_VACIOS: Filtros = {
  titulo: "",
  autor: "",
  anonimo: false,
  genero: "",
  desde: "",
  hasta: "",
  paginas: "",
  isbn: "",
};

const OPCIONES_PAGINAS: { valor: Filtros["paginas"]; texto: string }[] = [
  { valor: "", texto: "Todas" },
  { valor: "hasta150", texto: "Hasta 150" },
  { valor: "151a300", texto: "151 a 300" },
  { valor: "mas300", texto: "Más de 300" },
];

// Texto sin acentos ni mayúsculas, para comparar.
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

export function cumpleFiltros(book: Book, filtros: Filtros): boolean {
  if (filtros.titulo && !normalizar(book.titulo).includes(normalizar(filtros.titulo))) {
    return false;
  }

  if (filtros.anonimo) {
    if (normalizar(book.autor) !== "anonimo") return false;
  } else if (filtros.autor && !normalizar(book.autor).includes(normalizar(filtros.autor))) {
    return false;
  }

  if (filtros.genero && book.genero !== filtros.genero) return false;
  if (filtros.desde && book.anio_publicacion < Number(filtros.desde)) return false;
  if (filtros.hasta && book.anio_publicacion > Number(filtros.hasta)) return false;

  const paginas = book.paginas;
  if (filtros.paginas === "hasta150" && paginas > 150) return false;
  if (filtros.paginas === "151a300" && (paginas < 151 || paginas > 300)) return false;
  if (filtros.paginas === "mas300" && paginas <= 300) return false;

  const digitos = soloDigitos(filtros.isbn);
  if (digitos && !soloDigitos(book.isbn).includes(digitos)) return false;

  return true;
}

type Props = {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  onLimpiar: () => void;
  // Todos los libros: de ellos salen las opciones de género y año.
  books: Book[];
};

export default function FiltrosCatalogo({ filtros, onChange, onLimpiar, books }: Props) {
  const generos = [...new Set(books.map((book) => book.genero))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const anios = [...new Set(books.map((book) => book.anio_publicacion))].sort((a, b) => a - b);

  function cambiar<K extends keyof Filtros>(clave: K, valor: Filtros[K]) {
    onChange({ ...filtros, [clave]: valor });
  }

  return (
    <form
      role="search"
      aria-label="Filtrar libros"
      className="filtros"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="filtro filtro--titulo">
        <label htmlFor="f-titulo" className="etiqueta">Título</label>
        <input
          id="f-titulo"
          className="filtro-campo"
          type="text"
          placeholder="Escribe un título"
          value={filtros.titulo}
          onChange={(event) => cambiar("titulo", event.target.value)}
        />
      </div>

      <div className="filtro filtro--autor">
        <div className="filtro-cabecera">
          <label htmlFor="f-autor" className="etiqueta">Autor</label>
          <label className="filtro-casilla">
            <input
              type="checkbox"
              checked={filtros.anonimo}
              onChange={(event) =>
                onChange({
                  ...filtros,
                  anonimo: event.target.checked,
                  // Con Anónimo marcado, el campo se vacía y se desactiva.
                  autor: event.target.checked ? "" : filtros.autor,
                })
              }
            />
            Anónimo
          </label>
        </div>
        <input
          id="f-autor"
          className="filtro-campo"
          type="text"
          placeholder="Escribe un autor"
          value={filtros.autor}
          disabled={filtros.anonimo}
          onChange={(event) => cambiar("autor", event.target.value)}
        />
      </div>

      <FiltroLista
        id="f-genero"
        etiqueta="Género"
        clase="filtro--genero"
        valor={filtros.genero}
        opciones={[{ valor: "", texto: "Todos" }, ...generos.map((g) => ({ valor: g, texto: g }))]}
        onChange={(valor) => cambiar("genero", valor)}
      />

      <FiltroLista
        id="f-desde"
        etiqueta="Año desde"
        clase="filtro--anio"
        valor={filtros.desde}
        opciones={[{ valor: "", texto: "Cualquiera" }, ...anios.map((a) => ({ valor: String(a), texto: String(a) }))]}
        onChange={(valor) => cambiar("desde", valor)}
      />

      <FiltroLista
        id="f-hasta"
        etiqueta="Año hasta"
        clase="filtro--anio"
        valor={filtros.hasta}
        opciones={[{ valor: "", texto: "Cualquiera" }, ...anios.map((a) => ({ valor: String(a), texto: String(a) }))]}
        onChange={(valor) => cambiar("hasta", valor)}
      />

      <FiltroLista
        id="f-paginas"
        etiqueta="Páginas"
        clase="filtro--corto"
        valor={filtros.paginas}
        opciones={OPCIONES_PAGINAS}
        onChange={(valor) => cambiar("paginas", valor as Filtros["paginas"])}
      />

      <div className="filtro filtro--corto">
        <label htmlFor="f-isbn" className="etiqueta">ISBN</label>
        <input
          id="f-isbn"
          className="filtro-campo"
          type="text"
          inputMode="numeric"
          placeholder="Solo números"
          value={filtros.isbn}
          onChange={(event) => cambiar("isbn", soloDigitos(event.target.value))}
        />
      </div>

      <button type="button" className="filtros-limpiar" onClick={onLimpiar}>
        Limpiar filtros
      </button>
    </form>
  );
}

function FiltroLista({
  id,
  etiqueta,
  clase,
  valor,
  opciones,
  onChange,
}: {
  id: string;
  etiqueta: string;
  clase: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onChange: (valor: string) => void;
}) {
  return (
    <div className={`filtro ${clase}`}>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      <div className="filtro-lista">
        <select
          id={id}
          className="filtro-campo"
          value={valor}
          onChange={(event) => onChange(event.target.value)}
        >
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <svg aria-hidden="true" focusable="false" width="14" height="9" viewBox="0 0 14 9" fill="none" stroke="currentColor" strokeWidth="2.5" className="filtro-flecha">
          <path d="M1 1l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
