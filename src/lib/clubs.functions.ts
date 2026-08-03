import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Id = z.object({ club_id: z.string().uuid() });

export const createClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(1).max(60),
    description: z.string().max(500).default(""),
    visibility: z.enum(["public", "code"]),
    require_approval: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).createClub(context.userId, data));

export const listMyClubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./clubs.server")).listMyClubs(context.userId));

export const searchClubs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().max(60).default("") }).parse(d))
  .handler(async ({ data }) => (await import("./clubs.server")).searchPublicClubs(data.q));

export const joinByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).joinByCode(context.userId, data.code));

export const joinPublicClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).joinPublic(context.userId, data.club_id));

export const getClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).getClub(context.userId, data.club_id));

export const updateClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.extend({
    name: z.string().min(1).max(60).optional(),
    description: z.string().max(500).optional(),
    visibility: z.enum(["public", "code"]).optional(),
    require_approval: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { club_id, ...patch } = data;
    return (await import("./clubs.server")).updateClub(context.userId, club_id, patch);
  });

export const listClubMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).listMessages(context.userId, data.club_id));

export const postClubMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.extend({
    body: z.string().max(2000).default(""),
    media: z.object({
      url: z.string().url(),
      type: z.enum(["image", "audio", "video"]),
      duration: z.number().int().min(0).max(3600).nullable().optional(),
    }).nullable().optional(),
  }).refine((v) => v.body.trim().length > 0 || !!v.media, { message: "Tyhjää viestiä ei voi lähettää" }).parse(d))
  .handler(async ({ data, context }) =>
    (await import("./clubs.server")).postMessage(context.userId, data.club_id, data.body, data.media ?? undefined));

export const deleteClubMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).deleteMessage(context.userId, data.message_id));

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message_id: z.string().uuid(), emoji: z.string().min(1).max(8) }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).toggleReaction(context.userId, data.message_id, data.emoji));

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.extend({ user_id: z.string().uuid(), role: z.enum(["moderator", "member"]) }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).setMemberRole(context.userId, data.club_id, data.user_id, data.role));

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.extend({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).removeMember(context.userId, data.club_id, data.user_id));

export const leaveClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).leaveClub(context.userId, data.club_id));

export const handleJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.extend({ user_id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).handleJoinRequest(context.userId, data.club_id, data.user_id, data.approve));

export const clubLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).clubLeaderboard(context.userId, data.club_id));

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./clubs.server")).listNotifications(context.userId));

export const unreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./clubs.server")).unreadCount(context.userId));

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./clubs.server")).markAllRead(context.userId));

export const previewClubByCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => (await import("./clubs.server")).previewClubByCode(data.code));

export const myClubMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => (await import("./clubs.server")).myMembership(context.userId, data.club_id));
