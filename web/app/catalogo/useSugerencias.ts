"use client";

import { useEffect, useState } from "react";

import {
  MINIMO,
  buscarSugerencias,
  textoDeBusqueda,
  type CampoBusqueda,
  type Sugerencia,
} from "./openLibrary";

export type EstadoSugerencias = {
  // Campo al que pertenecen las sugerencias (null: no hay búsqueda activa).
  campo: CampoBusqueda | null;
  sugerencias: Sugerencia[];
  cargando: boolean;
  error: boolean;
  // true cuando hay suficientes caracteres para buscar.
  suficiente: boolean;
};

const ESPERA_MS = 300;

// Busca en Open Library lo que se escribe en `campo`. Espera a que se deje
// de teclear un momento y cancela la búsqueda anterior si llega otra letra.
export function useSugerencias(campo: CampoBusqueda | null, texto: string): EstadoSugerencias {
  const [estado, setEstado] = useState<EstadoSugerencias>({
    campo: null,
    sugerencias: [],
    cargando: false,
    error: false,
    suficiente: false,
  });

  useEffect(() => {
    if (!campo) {
      setEstado((actual) => ({ ...actual, campo: null, cargando: false }));
      return;
    }

    const consulta = textoDeBusqueda(campo, texto);
    if (consulta.length < MINIMO[campo]) {
      setEstado({ campo, sugerencias: [], cargando: false, error: false, suficiente: false });
      return;
    }

    // Mientras llega la respuesta se conservan las sugerencias anteriores
    // del mismo campo, para que la lista no parpadee.
    setEstado((actual) => ({
      campo,
      sugerencias: actual.campo === campo ? actual.sugerencias : [],
      cargando: true,
      error: false,
      suficiente: true,
    }));

    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const sugerencias = await buscarSugerencias(campo, consulta, control.signal);
        setEstado({ campo, sugerencias, cargando: false, error: false, suficiente: true });
      } catch {
        if (control.signal.aborted) return;
        setEstado({ campo, sugerencias: [], cargando: false, error: true, suficiente: true });
      }
    }, ESPERA_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [campo, texto]);

  return estado;
}
