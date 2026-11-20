import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function fetchCatalog(path: string) {
  const session = (await cookies()).get("session");

  if (!session) {
    redirect("/login");
  }

  const apiUrl = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { Cookie: `session=${session.value}` },
    cache: "no-store",
  }).catch(() => null);

  if (response?.status === 401) {
    redirect("/login");
  }

  return response;
}

// Correo del usuario de la sesión, para el encabezado. Si no se puede
// obtener, devuelve null y el encabezado muestra solo "Cerrar sesión".
// Sin sesión válida, fetchCatalog redirige a /login.
export async function getUserEmail(): Promise<string | null> {
  const response = await fetchCatalog("/auth/me");
  if (!response?.ok) return null;

  const user: unknown = await response.json().catch(() => null);
  const email = (user as { email?: unknown } | null)?.email;

  return typeof email === "string" ? email : null;
}
