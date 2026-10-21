<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Keep remote agent tools in src/lib/mcp with OAuth client-claim verification and caller-scoped database access; this preserves existing RLS without privileged credentials.
- Keep WebMCP tools in their owning page and share validated actions with its controls; this preserves visible-page boundaries and normal browser behavior.
- Use the dedicated /login route for MCP consent sign-in and canonical local return paths; this preserves authorization IDs through social authentication.
- Keep raw profiles, predictions and poll votes owner-readable and fan point events server-only; expose public profile fields and gated aggregate results through allowlisted database functions so private rows cannot be enumerated.
