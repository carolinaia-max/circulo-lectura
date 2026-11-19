"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  Campo,
  MensajeError,
  enfocarCampo,
  leerErrorApi,
  mensajeObligatorios,
  sinEspacios,
  useErroresDeCampos,
  type ErrorDeCampos,
} from "../formulario";
import { IconoFlecha, IlustracionLectora } from "../ilustraciones";

const CREDENCIALES_INCORRECTAS: ErrorDeCampos = {
  mensaje: "Correo o contraseña incorrectos.",
  campos: ["email", "password"],
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const errores = useErroresDeCampos("login-error");
  const { error, marcar, limpiarCampo, tieneError, aria } = errores;

  function mostrar(nuevo: ErrorDeCampos) {
    marcar(nuevo);
    if (nuevo.campos[0]) enfocarCampo(nuevo.campos[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    marcar(null);

    const vacios = [!email && "email", !password && "password"].filter(
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

    // Las contraseñas tienen al menos 8 caracteres: una más corta
    // nunca puede ser correcta.
    if (password.length < 8) {
      mostrar(CREDENCIALES_INCORRECTAS);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/backend/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          mostrar({
            ...CREDENCIALES_INCORRECTAS,
            mensaje: typeof data?.detail === "string" ? data.detail : CREDENCIALES_INCORRECTAS.mensaje,
          });
        } else {
          mostrar(leerErrorApi(data, "No se pudo iniciar sesión."));
        }
        return;
      }

      window.location.assign("/catalogo");
    } catch {
      mostrar({ mensaje: "No se pudo conectar con la API. Intenta de nuevo.", campos: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-arte auth-arte--rojo">
        <IlustracionLectora />
      </div>

      <main className="auth-panel auth-panel--login">
        <h1 className="auth-marca">
          Círculo
          <br />
          de Lectura
        </h1>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form-cabecera">
            <h2>Iniciar sesión</h2>
          </div>

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

          <Campo id="password" etiqueta="Contraseña" invalido={tieneError("password")}>
            <input
              id="password"
              name="password"
              type="password"
              className="entrada"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              {...sinEspacios(() => limpiarCampo("password"))}
              {...aria("password")}
            />
          </Campo>

          {error && <MensajeError id={errores.idMensaje}>{error.mensaje}</MensajeError>}

          <button type="submit" className="boton boton--ancho" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
            <IconoFlecha />
          </button>

          <p className="auth-pie">
            <span>¿Aún no tienes cuenta?</span>
            <Link href="/registro" className="enlace-fuerte">
              Crear cuenta
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
