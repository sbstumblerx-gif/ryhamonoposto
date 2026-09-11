import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const ClubId = z.object({ club_id: z.string().uuid() });
export const updateClubTag = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => ClubId.extend({ tag: z.string().max(5).nullable().optional(), emoji: z.string().max(16).nullable().optional(), enabled: z.boolean().optional() }).parse(d)).handler(async ({ data, context }) => (await import("./club-tags.server")).updateClubTag(context.userId, data.club_id, data));
export const listMyClubTags = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => (await import("./club-tags.server")).listMyClubTags(context.userId));
export const setMyClubTag = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ club_id: z.string().uuid().nullable() }).parse(d)).handler(async ({ data, context }) => (await import("./club-tags.server")).setMyClubTag(context.userId, data.club_id));
export const getClubByTag = createServerFn({ method: "POST" }).inputValidator((d: unknown) => z.object({ tag: z.string().min(2).max(5) }).parse(d)).handler(async ({ data }) => (await import("./club-tags.server")).getClubByTag(data.tag));
export const joinClubByTag = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ tag: z.string().min(2).max(5) }).parse(d)).handler(async ({ data, context }) => (await import("./club-tags.server")).joinClubByTag(context.userId, data.tag));
