
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStatus, logoutAdmin } from "@/lib/admin.functions";

type AdminStore = {
  isAdmin: boolean;
  loaded: boolean;
  set: (v: boolean) => void;
};

// tiny store without extra dep
let listeners: Array<(s: AdminStore) => void> = [];
let state: AdminStore = {
  isAdmin: false,
  loaded: false,
  set: (v) => {
    state = { ...state, isAdmin: v, loaded: true };
    listeners.forEach(l => l(state));
  },
};
function subscribe(fn: (s: AdminStore) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

import { useSyncExternalStore } from "react";
export function useAdmin() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function AdminBootstrap() {
  const check = useServerFn(getAdminStatus);
  useEffect(() => {
    check().then(r => state.set(!!r.admin)).catch(() => state.set(false));
  }, [check]);
  return null;
}

export function useAdminLogout() {
  const fn = useServerFn(logoutAdmin);
  return async () => {
    await fn();
    state.set(false);
  };
}
