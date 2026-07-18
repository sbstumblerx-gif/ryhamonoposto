import { useSession } from "@tanstack/react-start/server";

export type AdminSession = { admin?: boolean };

export function adminSessionConfig() {
  const pw = process.env.SESSION_SECRET;
  if (!pw) throw new Error("SESSION_SECRET is not set");
  return {
    password: pw,
    name: "rmp-admin",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return useSession<AdminSession>(adminSessionConfig());
}

export async function requireAdmin() {
  const s = await getAdminSession();
  if (!s.data.admin) throw new Error("Forbidden: admin required");
  return s;
}
