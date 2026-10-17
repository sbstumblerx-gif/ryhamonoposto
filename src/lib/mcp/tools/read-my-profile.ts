import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "read_my_profile", title: "Oma profiili",
  description: "Read only the connected user's RyhäMonoposto display name and avatar.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Sign in to read your profile.");
    const { data, error } = await supabaseForUser(ctx).from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle();
    if (error) throw new ToolError("Could not read your profile.");
    const profile = data ? { display_name: data.display_name, avatar_url: data.avatar_url } : null;
    return { content: [{ type: "text", text: profile ? JSON.stringify(profile) : "No profile created yet." }], structuredContent: { profile } };
  },
});