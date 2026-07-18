import { useEffect, useState } from "react";

export function EditableText({
  value,
  onSave,
  multiline = false,
  placeholder,
  className,
}: {
  value: string;
  onSave: (v: string) => Promise<void> | void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [v, setV] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setV(value); setDirty(false); }, [value]);

  async function save() {
    setSaving(true);
    try { await onSave(v); setDirty(false); } finally { setSaving(false); }
  }

  const Tag = multiline ? "textarea" : "input";
  return (
    <div className={className}>
      <Tag
        value={v}
        placeholder={placeholder}
        onChange={(e: any) => { setV(e.target.value); setDirty(true); }}
        className={`w-full bg-black/60 border border-primary/40 rounded p-2 text-sm ${multiline ? "min-h-40" : ""}`}
        rows={multiline ? 10 : undefined}
      />
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-2 rounded bg-primary text-primary-foreground text-xs px-3 py-1 font-display uppercase tracking-widest"
        >
          {saving ? "Tallennetaan…" : "Tallenna"}
        </button>
      )}
    </div>
  );
}
