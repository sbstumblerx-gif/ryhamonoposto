import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateClubTag } from "@/lib/club-tags.functions";

export function ClubTagSettings({ clubId, tag, emoji, enabled, onSaved }: {
  clubId: string; tag: string; emoji: string; enabled: boolean; onSaved: () => void;
}) {
  const saveFn = useServerFn(updateClubTag);
  const [value, setValue] = useState(tag);
  const [icon, setIcon] = useState(emoji);
  const [busy, setBusy] = useState(false);

  async function save(nextEnabled: boolean) {
    setBusy(true);
    try {
      await saveFn({ data: { club_id: clubId, tag: value.trim() || null, emoji: icon.trim() || null, enabled: nextEnabled } });
      toast.success(nextEnabled ? "Klubitagi käytössä" : "Klubitagi pois käytöstä");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Klubitagin tallennus epäonnistui"); }
    finally { setBusy(false); }
  }

  return (
    <section className="card-dark p-4 space-y-3">
      <h2 className="font-display uppercase tracking-widest text-sm text-primary">🏷️ Klubitagi</h2>
      <p className="text-xs text-muted-foreground">
        2–5 merkin tagi ja valinnainen emoji. Jäsenet voivat valita tagin näkyviin nimensä perään profiilistaan.
        {enabled ? " Tagi on nyt käytössä." : " Tagi ei ole käytössä."}
      </p>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value.toUpperCase().slice(0, 5))} placeholder="TAGI"
          className="w-28 bg-black/70 border border-primary/30 rounded p-2 text-sm uppercase" />
        <input value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 2))} placeholder="🏁"
          className="w-20 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
        <span className="flex items-center text-xs text-muted-foreground">
          Esikatselu: <span className="ml-1 text-primary">{icon ? `${icon} ` : ""}{value || "—"}</span>
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button disabled={busy} onClick={() => void save(true)}
          className="bg-primary text-primary-foreground rounded px-3 py-2 text-[10px] uppercase tracking-widest disabled:opacity-50">
          {enabled ? "Tallenna muutokset" : "Tallenna ja ota käyttöön"}
        </button>
        {enabled && (
          <button disabled={busy} onClick={() => void save(false)}
            className="border border-primary/40 rounded px-3 py-2 text-[10px] uppercase tracking-widest disabled:opacity-50">
            Poista käytöstä
          </button>
        )}
      </div>
    </section>
  );
}
