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

export type Usuario = { name: string; email: string };

// Usuario de la sesión, para la barra superior y el saludo del inicio.
// Si no se puede obtener, devuelve null y la página sigue funcionando.
export async function getUser(): Promise<Usuario | null> {
  const response = await fetchCatalog("/auth/me");
  if (!response?.ok) return null;

  const user = (await response.json().catch(() => null)) as Partial<Usuario> | null;
  if (typeof user?.email !== "string") return null;

  return { name: typeof user.name === "string" ? user.name : "", email: user.email };
}
