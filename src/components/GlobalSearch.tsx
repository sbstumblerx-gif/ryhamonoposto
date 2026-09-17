import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SEARCH_TYPES, siteSearch, type SearchType } from "@/lib/site-search.functions";

const labels: Record<SearchType,string>={drivers:"Kuljettajat",teams:"Tiimit",races:"Kilpailut",highlights:"Kohokohdat",news:"Uutiset",users:"Käyttäjät",clubs:"Klubit",polls:"Äänestykset"};
const contextFor=(path:string)=>path.startsWith("/kuljettajat")?"drivers":path.startsWith("/tiimit")?"teams":path.startsWith("/kilpailut")?"races":path.startsWith("/uutiset")?"news":path.startsWith("/klubit")?"clubs":path.startsWith("/aanestykset")?"polls":path.startsWith("/profiili")||path.startsWith("/kayttajat")?"profile":path.startsWith("/kohokohdat")?"highlights":"default";

export function GlobalSearch(){
  const pathname=useRouterState({select:r=>r.location.pathname}); const searchFn=useServerFn(siteSearch);
  const [q,setQ]=useState(""); const [debounced,setDebounced]=useState(""); const [open,setOpen]=useState(false); const [filtersOpen,setFiltersOpen]=useState(false); const [types,setTypes]=useState<SearchType[]>([...SEARCH_TYPES]);
  useEffect(()=>{const t=setTimeout(()=>setDebounced(q.trim()),250); return()=>clearTimeout(t);},[q]);
  const context=contextFor(pathname);
  const query=useQuery({queryKey:["site-search",debounced,types,context],queryFn:()=>searchFn({data:{q:debounced,types,context}}),enabled:debounced.length>0&&types.length>0,staleTime:15000});
  const grouped=useMemo(()=>{const m=new Map<SearchType,typeof query.data>(); for(const r of query.data??[]){const a=m.get(r.type)??[];a.push(r);m.set(r.type,a);} return m;},[query.data]);
  const toggle=(type:SearchType)=>setTypes(v=>v.includes(type)?v.filter(x=>x!==type):[...v,type]);
  return <div className="relative flex-1 max-w-xl mx-1 md:mx-4">
    <div className="flex items-center gap-1 rounded-lg border border-primary/50 bg-black/80 px-2 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-primary"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>q&&setOpen(true)} placeholder="Hae RyhäMonopostosta…" className="min-w-0 flex-1 bg-transparent outline-none text-sm text-white placeholder:text-muted-foreground" />
      <button type="button" aria-label="Suodata hakutuloksia" onClick={()=>setFiltersOpen(v=>!v)} className={`shrink-0 rounded px-2 py-1 text-[10px] uppercase tracking-widest border ${filtersOpen?"border-primary bg-primary/20 text-primary":"border-primary/30 text-muted-foreground hover:text-primary"}`}>Suodata</button>
    </div>
    {(open&&debounced||filtersOpen)&&<div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-primary/40 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden" onMouseDown={e=>e.stopPropagation()}>
      {filtersOpen&&<div className="p-3 border-b border-primary/20"><div className="text-[10px] uppercase tracking-widest text-primary mb-2">Näytä hakutuloksissa</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-1">{SEARCH_TYPES.map(type=><label key={type} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-primary/10 cursor-pointer"><input type="checkbox" checked={types.includes(type)} onChange={()=>toggle(type)} className="accent-primary"/><span>{labels[type]}</span></label>)}</div><button type="button" onClick={()=>setTypes([...SEARCH_TYPES])} className="mt-2 text-[10px] text-muted-foreground underline">Valitse kaikki</button></div>}
      {open&&debounced&&<div className="max-h-[65vh] overflow-y-auto">{query.isLoading?<div className="p-4 text-sm text-muted-foreground">Haetaan…</div>:query.isError?<div className="p-4 text-sm text-muted-foreground">Haku epäonnistui.</div>:query.data?.length?Array.from(grouped.entries()).map(([type,rows])=><div key={type}><div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-primary/80">{labels[type]}</div>{rows?.map(r=><a key={`${r.type}-${r.href}-${r.title}`} href={r.href} onClick={()=>setOpen(false)} className="block px-3 py-2 hover:bg-primary/10 border-t border-white/5"><div className="text-sm text-white truncate">{r.title}</div>{r.subtitle&&<div className="text-[11px] text-muted-foreground truncate">{r.subtitle}</div>}</a>)}</div>):<div className="p-4 text-sm text-muted-foreground">Ei hakutuloksia.</div>}</div>}
    </div>}
  </div>;
}
