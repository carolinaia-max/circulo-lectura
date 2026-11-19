"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  Campo,
  MensajeError,
  enfocarCampo,
  leerErrorApi,
  mensajeObligatorios,
  useErroresDeCampos,
  type ErrorDeCampos,
} from "../formulario";
import { IlustracionLibroCorazon } from "../ilustraciones";

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const errores = useErroresDeCampos("registro-error");
  const { error, marcar, limpiarCampo, tieneError, aria } = errores;

  function mostrar(nuevo: ErrorDeCampos) {
    marcar(nuevo);
    if (nuevo.campos[0]) enfocarCampo(nuevo.campos[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    marcar(null);

    const vacios = [!name && "name", !email && "email", !password && "password"].filter(
      (campo): campo is string => Boolean(campo),
    );
    if (vacios.length) {
      mostrar({ mensaje: mensajeObligatorios(vacios), campos: vacios });
      return;
    }

    const emailInput = formElement.elements.namedItem("email");
    if (emailInput instanceof HTMLInputElement && emailInput.validity.typeMismatch) {
      mostrar({ mensaje: "Escribe un correo electrónico válido.", campos: ["email"] });
      return;
    }

    if (password.length < 8) {
      mostrar({
        mensaje: "La contraseña debe tener al menos 8 caracteres.",
        campos: ["password"],
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/backend/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const resultado = leerErrorApi(data, "No se pudo crear la cuenta.");

        if (response.status === 409) {
          resultado.campos = ["email"];
        }

        mostrar(resultado);
        return;
      }

      window.location.assign("/login");
    } catch {
      mostrar({ mensaje: "No se pudo conectar con la API.", campos: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-arte auth-arte--negro">
        <div className="reticula" aria-hidden="true">
          <span className="reticula-v" style={{ left: "33.333%" }} />
          <span className="reticula-v" style={{ left: "66.666%" }} />
          <span className="reticula-h" style={{ top: "40%" }} />
        </div>

        <figure className="cita">
          <blockquote>
            «El verbo leer, como el verbo amar y el verbo soñar, no soporta el
            modo imperativo».
          </blockquote>
          <figcaption>Jorge Luis Borges</figcaption>
        </figure>

        <IlustracionLibroCorazon />
      </div>

      <main className="auth-panel auth-panel--registro">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-bienvenida">
            <h1>
              ¡Bienvenido
              <br />
              al Grupo!
            </h1>
            <p>Crea tu cuenta para unirte al círculo.</p>
          </div>

          <Campo id="name" etiqueta="Nombre" invalido={tieneError("name")}>
            <input
              id="name"
              name="name"
              className="entrada"
              autoComplete="name"
              placeholder="Tu nombre"
              maxLength={100}
              required
              onChange={() => limpiarCampo("name")}
              {...aria("name")}
            />
          </Campo>

          <Campo id="email" etiqueta="Correo electrónico" invalido={tieneError("email")}>
            <input
              id="email"
              name="email"
              type="email"
              className="entrada"
              autoComplete="email"
              placeholder="nombre@correo.com"
              required
              onChange={() => limpiarCampo("email")}
              {...aria("email")}
            />
          </Campo>

          <Campo
            id="password"
            etiqueta="Contraseña"
            nota="Mínimo 8 caracteres"
            invalido={tieneError("password")}
          >
            <input
              id="password"
              name="password"
              type="password"
              className="entrada"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              maxLength={128}
              required
              onChange={() => limpiarCampo("password")}
              {...aria("password")}
            />
          </Campo>

          {error && <MensajeError id={errores.idMensaje}>{error.mensaje}</MensajeError>}

          <button type="submit" className="boton boton--centrado" disabled={loading}>
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>

          <p className="auth-pie">
            <span>¿Ya tienes una cuenta?</span>
            <Link href="/login" className="enlace-fuerte">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
