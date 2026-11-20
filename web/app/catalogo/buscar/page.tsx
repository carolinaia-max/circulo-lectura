"use client";

import { useState, type FormEvent } from "react";

type Libro = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
};

export default function BuscarPage() {
  const [texto, setTexto] = useState("");
  const [libros, setLibros] = useState<Libro[]>([]);
  const [cargando, setCargando] = useState(false);

  async function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);

    const parametros = new URLSearchParams({ author: texto });
    const respuesta = await fetch(`https://openlibrary.org/search.json?${parametros}`);
    const datos = await respuesta.json();

    setLibros(datos.docs);
    setCargando(false);
  }

  return (
    <main className="catalogo">
      <h1>Buscar libros</h1>

      <form onSubmit={buscar}>
        <input
          className="entrada"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="escribe aquí"
        />
        <button type="submit" className="boton">
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <ul>
        {libros.map((libro) => (
          <li key={libro.key}>
            <strong>{libro.title}</strong> — {libro.author_name?.join(", ")} ({libro.first_publish_year})
          </li>
        ))}
      </ul>
    </main>
  );
}