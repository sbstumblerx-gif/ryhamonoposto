import { useEffect, useState } from "react";

export type AiMsg = { role: "user" | "assistant"; content: string };
export type AiConvo = {
  id: string;
  title: string;
  updatedAt: number;
  messages: AiMsg[];
};

const KEY = "rmp-ai-conversations";
const EVENT = "rmp-convos-changed";

export function loadConvos(): AiConvo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list: AiConvo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export function upsertConvo(convo: AiConvo) {
  const list = loadConvos().filter((c) => c.id !== convo.id);
  list.unshift({ ...convo, updatedAt: Date.now() });
  persist(list);
}

export function deleteConvo(id: string) {
  persist(loadConvos().filter((c) => c.id !== id));
}

export function renameConvo(id: string, title: string) {
  persist(loadConvos().map((c) => (c.id === id ? { ...c, title } : c)));
}

export function getConvo(id: string): AiConvo | undefined {
  return loadConvos().find((c) => c.id === id);
}

export function newConvoId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function autoTitle(messages: AiMsg[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Uusi keskustelu";
  const t = first.content.trim().replace(/\s+/g, " ").slice(0, 50);
  return t.length > 0 ? t : "Uusi keskustelu";
}

export function useConvos(): AiConvo[] {
  const [list, setList] = useState<AiConvo[]>([]);
  useEffect(() => {
    const refresh = () => setList(loadConvos().sort((a, b) => b.updatedAt - a.updatedAt));
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return list;
}
