import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
} from "@/lib/database-backup.functions";
import { getAdminStatus } from "@/lib/admin.functions";
import { toast } from "sonner";

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const Route = createFileRoute("/admin-varmuuskopio")({
  head: () => ({ meta: [{ title: "Admin — Varmuuskopio — RyhäMonoposto" }] }),
  component: AdminBackup,
});

function AdminBackup() {
  const status = useServerFn(getAdminStatus);
  const createBackup = useServerFn(createDatabaseBackup);
  const listBackups = useServerFn(listDatabaseBackups);
  const restoreBackup = useServerFn(restoreDatabaseBackup);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backups, setBackups] = useState<Array<{ name: string; url: string; size: number | null }>>([]);

  async function refresh() {
    try {
      const result = await listBackups();
      setBackups(result);
    } catch {
      setBackups([]);
    }
  }

  useEffect(() => {
    status().then((result) => {
      setIsAdmin(result.admin);
      if (result.admin) void refresh();
    });
  }, []);

  async function backupNow() {
    setBusy(true);
    try {
      const result = await createBackup();
      toast.success(`Varmuuskopio valmis: ${result.filename}`);
      await refresh();
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message ?? "Varmuuskopiointi epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  async function restoreFile(file?: File) {
    if (!file) return;
    if (!file.name.endsWith(".json.gz")) {
      toast.error("Valitse RyhäMonoposton .json.gz-varmuuskopio.");
      return;
    }

    const confirmed = window.confirm(
      "Palautetaan varmuuskopion sisältämät tiedot nykyiseen tietokantaan upsertaamalla ne. Nykyisiä rivejä ei poisteta. Jatketaanko?",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const base64Gzip = toBase64(await file.arrayBuffer());
      const result = await restoreBackup({
        data: { filename: file.name, base64Gzip },
      });
      toast.success(`Palautus valmis. ${Object.values(result.restored).reduce((a, b) => a + b, 0)} riviä käsiteltiin.`);
    } catch (error: any) {
      toast.error(error?.message ?? "Palautus epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="card-dark p-6">
          <h1 className="font-display uppercase tracking-widest text-primary">
            Admin-varmuuskopio
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            Kirjaudu ensin admin-tilaan Asetuksista.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      <header>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">
          Tietokannan pelastus
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Luo pakattu tietokantavarmuuskopio nykyisestä Preview/Supabase-datasta.
          Kopio tallennetaan myös pilveen media-bucketiin ja ladataan laitteelle.
        </p>
        <div className="hairline-red mt-3" />
      </header>

      <section className="card-dark p-5 space-y-4">
        <button
          type="button"
          onClick={backupNow}
          disabled={busy}
          className="w-full rounded bg-primary text-primary-foreground py-3 font-display uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? "Käsitellään…" : "💾 Tee täydellinen tietokantavarmuuskopio"}
        </button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>✓ Sovelluksen julkiset tietokantataulut</p>
          <p>✓ Käyttäjien perustiedot (ei salasanoja)</p>
          <p>✓ Storage-tiedostojen metadata</p>
          <p>✓ Pakattu gzip-muotoon</p>
        </div>
      </section>

      <section className="card-dark p-5 space-y-4">
        <h2 className="font-display uppercase tracking-widest text-primary">
          Palauta varmuuskopiosta
        </h2>
        <p className="text-xs text-muted-foreground">
          Palautus tekee turvallisen upsertin. Se ei poista nykyisiä rivejä.
          Uuteen tyhjään tietokantaan tämä palauttaa varmuuskopion datan.
        </p>
        <label className="block rounded border border-primary/40 px-3 py-3 text-center text-xs font-display uppercase tracking-widest cursor-pointer">
          📦 Valitse .json.gz-varmuuskopio
          <input
            type="file"
            accept=".json.gz,application/gzip"
            className="hidden"
            onChange={(event) => restoreFile(event.target.files?.[0])}
            disabled={busy}
          />
        </label>
      </section>

      <section className="card-dark p-5 space-y-3">
        <h2 className="font-display uppercase tracking-widest text-primary">
          Pilveen tallennetut varmuuskopiot
        </h2>
        {backups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ei vielä varmuuskopioita.</p>
        ) : (
          backups.map((backup) => (
            <a
              key={backup.name}
              href={backup.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded border border-primary/20 p-3 text-sm hover:border-primary/50"
            >
              <div className="font-medium">{backup.name}</div>
              {backup.size != null && (
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(backup.size / 1024)} KB
                </div>
              )}
            </a>
          ))
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Huom: Supabase Storage -mediatiedostojen varsinaiset binäärit eivät ole
        tässä tietokanta-arkistossa. Niiden metadata tallennetaan mukaan, ja
        alkuperäiset mediat jäävät nykyiseen media-bucketiin.
      </p>
    </main>
  );
}
