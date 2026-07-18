import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

function matches(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export const getAdminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("./admin-session.server");
  const s = await getAdminSession();
  return { admin: !!s.data.admin };
});

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("ADMIN_PASSWORD is not set");
    if (!matches(data.password, expected)) return { ok: false as const };
    const { getAdminSession } = await import("./admin-session.server");
    const s = await getAdminSession();
    await s.update({ admin: true });
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("./admin-session.server");
  const s = await getAdminSession();
  await s.clear();
  return { ok: true };
});
