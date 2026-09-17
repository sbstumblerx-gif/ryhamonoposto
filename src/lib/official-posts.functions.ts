import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PostInput = z.object({
  entity_type: z.enum(["driver", "team"]),
  entity_slug: z.string().min(1).max(200),
  body: z.string().max(5000).default(""),
  media_url: z.string().url().nullable().optional(),
}).refine(v => v.body.trim().length > 0 || !!v.media_url, { message: "Julkaisussa pitää olla tekstiä tai mediaa" });

export const adminCreateOfficialPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data }) => (await import("./official-posts.server")).adminCreateOfficialPost(data));

export const listOfficialPosts = createServerFn({ method: "GET" })
  .handler(async () => (await import("./official-posts.server")).listOfficialPosts());

export const listEntityOfficialPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ entity_type: z.enum(["driver", "team"]), entity_slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => (await import("./official-posts.server")).listEntityOfficialPosts(data.entity_type, data.entity_slug));

export const toggleOfficialPostLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => (await import("./official-posts.server")).toggleOfficialPostLike(context.userId, data.post_id));

export const officialPostComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => (await import("./official-posts.server")).officialPostComments(data.post_id));

export const commentOfficialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => (await import("./official-posts.server")).commentOfficialPost(context.userId, data.post_id, data.body));
