import { mensajeObligatorios, type ErrorDeCampos } from "../formulario";
import { caracteresInvalidos, mensajeCaracteres } from "../catalogo/validacion";

export type LibroInteres = {
  id: number;
  titulo: string;
  autor: string;
  anio_publicacion: number;
};

// Los nombres de los campos coinciden con los de la API, para que los
// errores 400 de FastAPI marquen el campo correcto.
export type CampoInteres = "titulo" | "autor" | "anio_publicacion";
export type BorradorInteres = Record<CampoInteres, string>;

export const BORRADOR_VACIO: BorradorInteres = { titulo: "", autor: "", anio_publicacion: "" };

const CAMPOS: CampoInteres[] = ["titulo", "autor", "anio_publicacion"];

export const MENSAJE_ANIO = "El año de publicación no es válido.";
export const MENSAJE_REPETIDO = "Ese libro ya está en la lista.";

function clave(texto: string): string {
  return texto.trim().normalize("NFC").toLowerCase();
}

export function interesDesdeBorrador(valores: BorradorInteres) {
  return {
    titulo: valores.titulo.trim().normalize("NFC"),
    autor: valores.autor.trim().normalize("NFC"),
    anio_publicacion: Number(valores.anio_publicacion.trim()),
  };
}

// Devuelve el mensaje y los campos con problema, o null si todo está bien.
// `lista` son los libros que ya están en la lista, para avisar de un
// repetido antes de llamar a la API (la API también lo comprueba).
export function validarInteres(
  valores: BorradorInteres,
  lista: LibroInteres[],
): ErrorDeCampos | null {
  const vacios = CAMPOS.filter((campo) => !valores[campo].trim());
  if (vacios.length) {
    return { mensaje: mensajeObligatorios(vacios), campos: vacios };
  }

  const errores: { campo: CampoInteres; mensaje: string; caracteres: boolean }[] = [];

  // Mismas reglas de caracteres que el catálogo: el título acepta cualquier
  // carácter, el autor solo letras y signos de nombre, y el año solo dígitos.
  for (const campo of CAMPOS) {
    const invalidos = caracteresInvalidos(campo, valores[campo]).length;
    if (invalidos) {
      errores.push({ campo, mensaje: mensajeCaracteres(invalidos), caracteres: true });
    }
  }

  const conCaracteresMalos = new Set(errores.map((error) => error.campo));

  if (!conCaracteresMalos.has("anio_publicacion")) {
    const anio = Number(valores.anio_publicacion.trim());
    if (!Number.isInteger(anio) || anio < 1 || anio > new Date().getFullYear()) {
      errores.push({ campo: "anio_publicacion", mensaje: MENSAJE_ANIO, caracteres: false });
    }
  }

  const repetido = lista.some(
    (libro) =>
      clave(libro.titulo) === clave(valores.titulo) && clave(libro.autor) === clave(valores.autor),
  );
  if (repetido && !conCaracteresMalos.has("titulo")) {
    errores.unshift({ campo: "titulo", mensaje: MENSAJE_REPETIDO, caracteres: false });
  }

  if (!errores.length) return null;

  const campos = errores.map((error) => error.campo);

  // Un solo error: su mensaje. Varios, todos por caracteres: "Caracteres
  // inválidos.". Varios distintos: mensaje general.
  let mensaje = errores[0].mensaje;
  if (errores.length > 1) {
    mensaje = errores.every((error) => error.caracteres)
      ? mensajeCaracteres(2)
      : "Revisa los campos marcados en rojo.";
  }

  return { mensaje, campos };
}
