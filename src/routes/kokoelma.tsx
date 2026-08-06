
function AdminCards() {
  const qc = useQueryClient();
  const upsertFn = useServerFn(adminUpsertCard);
  const delFn = useServerFn(adminDeleteCard);
  const catalogFn = useServerFn(listCards);
  const driversFn = useServerFn(listDrivers);
  const teamsFn = useServerFn(listTeams);
  const seasonsFn = useServerFn(listSeasons);
  const racesFn = useServerFn(listRaces);

  const catalogQ = useQuery({ queryKey: ["cards-catalog-admin"], queryFn: () => catalogFn() });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: () => driversFn() });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });
  const seasonsQ = useQuery({ queryKey: ["seasons"], queryFn: () => seasonsFn() });
  const racesQ = useQuery({ queryKey: ["races"], queryFn: () => racesFn() });

  const [f, setF] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const isBooster = f.driver_slug === "";
  const needsRace = f.card_type === "PODIUM" || f.card_type === "WIN";
  const total = (Number(f.attack) || 0) + (Number(f.defense) || 0);

  function set<K extends keyof typeof EMPTY>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!f.image_url) { toast.error("Lisää kortin kuva"); return; }
    if (!f.serial_number.trim()) { toast.error("Lisää sarjanumero"); return; }
    setBusy(true);
    try {
      await upsertFn({
        data: {
          id: f.id,
          image_url: f.image_url,
          serial_number: f.serial_number.trim().startsWith("#") ? f.serial_number.trim() : `#${f.serial_number.trim()}`,
          team_slug: f.team_slug || null,
          driver_slug: f.driver_slug || null,
          is_booster: isBooster,
          card_type: f.card_type as any,
          driver_number: isBooster || f.driver_number === "" ? null : Number(f.driver_number),
          race_name: needsRace && f.race_name ? f.race_name : null,
          race_flag: needsRace && f.race_flag ? f.race_flag : null,
          race_position: needsRace && f.race_position ? (f.race_position as any) : null,
          season_slug: f.season_slug || null,
          attack: isBooster || f.attack === "" ? null : Number(f.attack),
          defense: isBooster || f.defense === "" ? null : Number(f.defense),
          boost: isBooster && f.boost !== "" ? Number(f.boost) : null,
        },
      });
      toast.success(f.id ? "Kortti päivitetty" : "Kortti lisätty");
      setF({ ...EMPTY });
      await qc.invalidateQueries({ queryKey: ["cards-catalog-admin"] });
      await qc.invalidateQueries({ queryKey: ["cards-catalog"] });
      await qc.invalidateQueries({ queryKey: ["my-collection"] });
    } catch (e: any) { toast.error(e?.message ?? "Tallennus epäonnistui"); }
    finally { setBusy(false); }
  }

  const input = "w-full bg-black/70 border border-primary/40 rounded p-2 text-sm";
  const lbl = "text-[10px] uppercase tracking-widest text-muted-foreground font-display";

  return (
    <section className="card-dark p-4 space-y-4">
      <h2 className="font-display uppercase tracking-widest text-sm text-primary">Admin: {f.id ? "muokkaa korttia" : "lisää kortti"}</h2>

      <MediaUpload currentUrl={f.image_url} onUploaded={(url) => set("image_url", url)} label="Kortin kuva" />

      <div className="grid md:grid-cols-3 gap-3">
        <label className="block">
          <span className={lbl}>Sarjanumero (#x)</span>
          <input className={input} value={f.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="#12" />
        </label>
        <label className="block">
          <span className={lbl}>Tiimi</span>
          <select className={input} value={f.team_slug} onChange={(e) => set("team_slug", e.target.value)}>
            <option value="">—</option>
            {((teamsQ.data as any[]) ?? []).map((t: any) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Kuljettaja (tyhjä = tiimi-booster)</span>
          <select className={input} value={f.driver_slug} onChange={(e) => set("driver_slug", e.target.value)}>
            <option value="">Ei kuljettajaa — tiimi-booster</option>
            {((driversQ.data as any[]) ?? []).map((d: any) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Tyyppi</span>
          <select className={input} value={f.card_type} onChange={(e) => set("card_type", e.target.value)}>
            {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        
        {!isBooster && (
          <label className="block">
            <span className={lbl}>Kuljettajan numero</span>
            <input type="number" className={input} value={f.driver_number} onChange={(e) => set("driver_number", e.target.value)} />
          </label>
        )}

        <label className="block">
          <span className={lbl}>Kausi</span>
          <select className={input} value={f.season_slug} onChange={(e) => set("season_slug", e.target.value)}>
            <option value="">—</option>
            {((seasonsQ.data as any[]) ?? []).map((s: any) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
      </div>

            {needsRace && (
        <div className="grid md:grid-cols-3 gap-3 border-t border-primary/20 pt-3">
          <label className="block">
            <span className={lbl}>Kilpailu</span>
            <select className={input} value={f.race_name}
              onChange={(e) => {
                const race = ((racesQ.data as any[]) ?? []).find((r: any) => r.name === e.target.value);
                set("race_name", e.target.value);
                set("race_flag", race?.flag ?? "");
              }}>
              <option value="">—</option>
              {((racesQ.data as any[]) ?? []).map((r: any) => <option key={r.slug} value={r.name}>{r.flag} {r.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Lippu</span>
            <input className={input} value={f.race_flag} onChange={(e) => set("race_flag", e.target.value)} placeholder="🇨🇳" />
          </label>
          <label className="block">
            <span className={lbl}>Sijoitus</span>
            <select className={input} value={f.race_position} onChange={(e) => set("race_position", e.target.value)}>
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
      )}

      {isBooster ? (
        <label className="block max-w-xs">
          <span className={lbl}>Boost-arvo</span>
          <input type="number" className={input} value={f.boost} onChange={(e) => set("boost", e.target.value)} />
        </label>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <span className={lbl}>Hyökkäys</span>
            <input type="number" className={input} value={f.attack} onChange={(e) => set("attack", e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Puolustus</span>
            <input type="number" className={input} value={f.defense} onChange={(e) => set("defense", e.target.value)} />
          </label>
          <div>
            <span className={lbl}>Yhteensä</span>
            <div className="font-display text-2xl text-primary">{total}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2 disabled:opacity-50">
          {f.id ? "Tallenna muutokset" : "+ Lisää kortti"}
        </button>
        {f.id && <button onClick={() => setF({ ...EMPTY })} className="text-xs border border-primary/50 rounded px-3 py-1">Peruuta</button>}
      </div>

      <div className="border-t border-primary/20 pt-3">
        <h3 className={lbl}>Kaikki kortit ({((catalogQ.data as any[]) ?? []).length})</h3>
        <div className="grid md:grid-cols-2 gap-2 mt-2 max-h-72 overflow-y-auto">
          {((catalogQ.data as any[]) ?? []).map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 border border-primary/20 rounded p-2">
              <img src={c.image_url} alt={c.serial_number} className="h-12 w-9 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-display truncate">{c.serial_number} · {c.card_type}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.driver_slug ?? "Tiimi-booster"} · {c.team_slug ?? "—"}</div>
              </div>
              <button className="text-[10px] border border-primary/40 rounded px-2 py-1"
                onClick={() => setF({
                  id: c.id, image_url: c.image_url, serial_number: c.serial_number,
                  team_slug: c.team_slug ?? "", driver_slug: c.driver_slug ?? "", card_type: c.card_type,
                  driver_number: c.driver_number ?? "", race_name: c.race_name ?? "", race_flag: c.race_flag ?? "",
                  race_position: c.race_position ?? "", season_slug: c.season_slug ?? "",
                  attack: c.attack ?? "", defense: c.defense ?? "", boost: c.boost ?? "",
                })}>Muokkaa</button>
              <button className="text-[10px] border border-primary/40 rounded px-2 py-1"
                onClick={async () => {
                  if (!confirm("Poistetaanko kortti?")) return;
                  await delFn({ data: { id: c.id } });
                  await qc.invalidateQueries({ queryKey: ["cards-catalog-admin"] });
                  await qc.invalidateQueries({ queryKey: ["cards-catalog"] });
                }}>Poista</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

      
                                              
