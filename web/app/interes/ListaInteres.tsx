"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  Campo,
  EntradaResaltada,
  MensajeError,
  enfocarCampo,
  leerErrorApi,
  useErroresDeCampos,
  useFocoInicial,
  type ErrorDeCampos,
} from "../formulario";
import {
  IconoBasura,
  IconoCerrar,
  IconoMasGrande,
  IlustracionNuevoLibro,
} from "../ilustraciones";
import { caracteresInvalidos } from "../catalogo/validacion";
import type { CampoBusqueda, Sugerencia } from "../openLibrary/openLibrary";
import { useAutocompletado } from "../openLibrary/useAutocompletado";
import {
  BORRADOR_VACIO,
  MENSAJE_REPETIDO,
  interesDesdeBorrador,
  validarInteres,
  type BorradorInteres,
  type CampoInteres,
  type LibroInteres,
} from "./validacionInteres";

const ID_PREFIJO = "interes-";
const ID_ERROR = "interes-error";

// Campos del modal: Título (fila completa), Autor (4 de 6) y Año (2 de 6).
const CAMPOS: {
  key: CampoInteres;
  label: string;
  span: 2 | 4 | 6;
  placeholder: string;
  numero?: boolean;
  destacado?: boolean;
}[] = [
  { key: "titulo", label: "Título", span: 6, placeholder: "Título del libro", destacado: true },
  { key: "autor", label: "Autor", span: 4, placeholder: "Nombre del autor" },
  { key: "anio_publicacion", label: "Año", span: 2, placeholder: String(new Date().getFullYear()), numero: true },
];

// Las tarjetas alternan rojo, blanco con borde y negro.
const TEMAS = ["tarjeta--roja", "tarjeta--blanca", "tarjeta--negra"];

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, "0");
}

export default function ListaInteres({ inicial }: { inicial: LibroInteres[] }) {
  const [libros, setLibros] = useState(inicial);

  // Modal para agregar
  const [agregando, setAgregando] = useState(false);
  const [valores, setValores] = useState<BorradorInteres>(BORRADOR_VACIO);
  const [guardando, setGuardando] = useState(false);
  const errores = useErroresDeCampos(ID_ERROR);
  const { error, marcar, limpiarCampo, tieneError, aria } = errores;

  // Modal para quitar
  const [aQuitar, setAQuitar] = useState<LibroInteres | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [errorQuitar, setErrorQuitar] = useState("");

  const dialogoAgregarRef = useRef<HTMLDivElement>(null);
  const dialogoQuitarRef = useRef<HTMLDivElement>(null);
  useFocoInicial(dialogoAgregarRef, agregando);
  useFocoInicial(dialogoQuitarRef, aQuitar !== null);

  // SUGERENCIAS DE OPEN LIBRARY: Título y Autor buscan coincidencias (este
  // modal no tiene ISBN). Al elegir una se completan título, autor y año.
  const auto = useAutocompletado(valores, elegirSugerencia);

  function elegirSugerencia(sugerencia: Sugerencia) {
    const { titulo, autor, anio_publicacion } = sugerencia.datos;
    setValores((actual) => ({
      titulo: titulo || actual.titulo,
      autor: autor || actual.autor,
      // Si la obra no trae año, el campo queda vacío para escribirlo.
      anio_publicacion,
    }));
    for (const campo of ["titulo", "autor", "anio_publicacion"] as CampoInteres[]) {
      limpiarCampo(campo);
    }
  }

  const ocupado = guardando || quitando;
  const algunModal = agregando || aQuitar !== null;

  // Con un modal abierto: bloquear el desplazamiento y cerrar con Escape.
  useEffect(() => {
    if (!algunModal) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPresionar(event: KeyboardEvent) {
      // Un Escape que ya atendió otro control (la lista de sugerencias) no cierra el modal.
      if (event.key !== "Escape" || event.defaultPrevented || ocupado) return;
      setAgregando(false);
      setAQuitar(null);
    }

    document.addEventListener("keydown", alPresionar);
    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alPresionar);
    };
  }, [algunModal, ocupado]);

  // AGREGAR

  function abrirAgregar() {
    setValores(BORRADOR_VACIO);
    marcar(null);
    setAgregando(true);
  }

  function cerrarAgregar() {
    if (guardando) return;
    setAgregando(false);
    marcar(null);
  }

  function mostrar(nuevo: ErrorDeCampos) {
    marcar(nuevo);
    if (nuevo.campos[0]) enfocarCampo(`${ID_PREFIJO}${nuevo.campos[0]}`);
  }

  function cambiar(campo: CampoInteres, valor: string) {
    setValores((actual) => ({ ...actual, [campo]: valor }));
    // Si quedan caracteres inválidos, el campo sigue marcado y resaltado.
    if (!(tieneError(campo) && caracteresInvalidos(campo, valor).length)) {
      limpiarCampo(campo);
    }
  }

  async function agregar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guardando) return;
    auto.cerrar();

    const validacion = validarInteres(valores, libros);
    if (validacion) {
      mostrar(validacion);
      return;
    }

    setGuardando(true);
    marcar(null);

    try {
      const response = await fetch("/backend/interes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interesDesdeBorrador(valores)),
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const resultado = leerErrorApi(data, "No se pudo agregar el libro.");
        if (response.status === 409) {
          resultado.mensaje = MENSAJE_REPETIDO;
          resultado.campos = ["titulo"];
        }
        mostrar(resultado);
        return;
      }

      setLibros((actual) => [...actual, data as LibroInteres]);
      setAgregando(false);
    } catch {
      mostrar({ mensaje: "No se pudo conectar con la API. Intenta de nuevo.", campos: [] });
    } finally {
      setGuardando(false);
    }
  }

  // QUITAR

  function pedirQuitar(libro: LibroInteres) {
    setErrorQuitar("");
    setAQuitar(libro);
  }

  function cerrarQuitar() {
    if (quitando) return;
    setAQuitar(null);
    setErrorQuitar("");
  }

  async function confirmarQuitar() {
    if (!aQuitar || quitando) return;

    const libro = aQuitar;
    setQuitando(true);
    setErrorQuitar("");

    try {
      const response = await fetch(`/backend/interes/${libro.id}`, { method: "DELETE" });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      // 404: ya no estaba en la lista (por ejemplo, se quitó en otra pestaña).
      if (!response.ok && response.status !== 404) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(leerErrorApi(data, "No se pudo quitar el libro.").mensaje);
      }

      setLibros((actual) => actual.filter((item) => item.id !== libro.id));
      setAQuitar(null);
    } catch (err) {
      setErrorQuitar(err instanceof Error ? err.message : "No se pudo conectar con la API.");
    } finally {
      setQuitando(false);
    }
  }

  return (
    <main className="interes">
      {/* BLOQUE SUPERIOR */}
      <section className="interes-cabecera">
        <h1>
          Libros
          <br />
          de interés
        </h1>

        <div className="interes-resumen">
          <p className="interes-lema">Los libros que nos gustaría sumar a la biblioteca del club.</p>
          <div className="interes-acciones">
            <p className="interes-contador">
              <span className="interes-contador-numero">{dosDigitos(libros.length)}</span>
              <span className="etiqueta">En la lista</span>
            </p>
          </div>
        </div>
      </section>

      <div className="interes-franja" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      {libros.length === 0 && (
        <p className="interes-vacia">
          Tu lista de interés está vacía. Agrega el primer libro que te gustaría leer con el club.
        </p>
      )}

      {/* TARJETAS */}
      <ul className="tarjetas">
        {libros.map((libro, indice) => (
          <li key={libro.id} className={`tarjeta ${TEMAS[indice % TEMAS.length]}`}>
            <div className="tarjeta-arriba">
              <span className="tarjeta-numero">{dosDigitos(indice + 1)}</span>
              <button
                type="button"
                className="tarjeta-quitar"
                title="Quitar de la lista"
                aria-label={`Quitar «${libro.titulo}» de la lista`}
                disabled={quitando}
                onClick={() => pedirQuitar(libro)}
              >
                <IconoBasura />
              </button>
            </div>

            <div className="tarjeta-abajo">
              <h2 className="tarjeta-titulo">{libro.titulo}</h2>
              <p className="tarjeta-autor">{libro.autor}</p>
              <div className="tarjeta-regla" aria-hidden="true" />
              <span className="tarjeta-anio">{libro.anio_publicacion}</span>
            </div>
          </li>
        ))}

        <li className="tarjeta-celda">
          <button type="button" className="tarjeta-nueva" onClick={abrirAgregar}>
            <IconoMasGrande />
            <span>
              Sumar un libro
              <br />
              a la lista
            </span>
          </button>
        </li>
      </ul>

      {/* MODAL PARA AGREGAR */}
      {agregando && (
        <div
          className="modal-capa"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrarAgregar();
          }}
        >
          <div
            ref={dialogoAgregarRef}
            className="modal modal-nuevo modal-nuevo--interes"
            role="dialog"
            aria-modal="true"
            aria-labelledby="interes-modal-titulo"
          >
            <div className="modal-nuevo-arte">
              <IlustracionNuevoLibro />
            </div>

            <form className="modal-nuevo-cuerpo" onSubmit={agregar} noValidate>
              <div className="modal-cabecera">
                <h2 id="interes-modal-titulo">
                  ¡Un libro que
                  <br />
                  nos interesa!
                </h2>
                <button
                  type="button"
                  className="boton-icono"
                  aria-label="Cerrar"
                  disabled={guardando}
                  onClick={cerrarAgregar}
                >
                  <IconoCerrar />
                </button>
              </div>

              <p className="libro-form-ayuda">
                Escribe el título o el autor y elige un libro de Open Library
                para completar el resto de los datos.
              </p>

              <div className="libro-campos">
                {CAMPOS.map((campo) => {
                  const id = `${ID_PREFIJO}${campo.key}`;
                  const busqueda: CampoBusqueda | null =
                    campo.key === "titulo" || campo.key === "autor" ? campo.key : null;

                  const entrada = (
                    <EntradaResaltada
                      resaltar={
                        tieneError(campo.key)
                          ? caracteresInvalidos(campo.key, valores[campo.key])
                          : []
                      }
                      id={id}
                      name={campo.key}
                      className={[
                        "entrada",
                        "entrada--caja",
                        campo.destacado ? "entrada--destacada" : "",
                        campo.numero ? "numeros" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="text"
                      inputMode={campo.numero ? "numeric" : undefined}
                      maxLength={campo.numero ? 4 : 250}
                      placeholder={campo.placeholder}
                      value={valores[campo.key]}
                      required
                      disabled={guardando}
                      onChange={(event) => {
                        cambiar(campo.key, event.target.value);
                        if (busqueda) auto.alEscribir(busqueda);
                      }}
                      {...(busqueda ? auto.propsEntrada(busqueda, id) : {})}
                      {...aria(campo.key)}
                    />
                  );

                  return (
                    <Campo
                      key={campo.key}
                      id={id}
                      etiqueta={campo.label}
                      invalido={tieneError(campo.key)}
                      className={`span-${campo.span}`}
                    >
                      {busqueda ? (
                        <div className="con-sugerencias">
                          {entrada}
                          {auto.lista(busqueda, id)}
                        </div>
                      ) : (
                        entrada
                      )}
                    </Campo>
                  );
                })}
              </div>

              {error && <MensajeError id={ID_ERROR}>{error.mensaje}</MensajeError>}

              <div className="acciones">
                <button type="submit" className="boton" disabled={guardando}>
                  {guardando ? "Agregando…" : "Agregar a la lista"}
                </button>
                <button type="button" className="boton-texto" disabled={guardando} onClick={cerrarAgregar}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA QUITAR */}
      {aQuitar && (
        <div
          className="modal-capa modal-capa--eliminar"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrarQuitar();
          }}
        >
          <div
            ref={dialogoQuitarRef}
            className="modal modal-eliminar"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="quitar-titulo"
            aria-describedby="quitar-descripcion"
          >
            <div className="modal-eliminar-texto">
              <h2 id="quitar-titulo">¿Eliminar «{aQuitar.titulo}» de la lista?</h2>
              <p id="quitar-descripcion">Esta acción no se puede deshacer.</p>
            </div>

            {errorQuitar && <MensajeError>{errorQuitar}</MensajeError>}

            <div className="modal-eliminar-acciones">
              <button type="button" className="boton-contorno" disabled={quitando} onClick={cerrarQuitar}>
                Cancelar
              </button>
              <button type="button" className="boton boton--rojo" disabled={quitando} onClick={confirmarQuitar}>
                {quitando ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
