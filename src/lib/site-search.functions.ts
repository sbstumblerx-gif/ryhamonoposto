import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SEARCH_TYPES = ["drivers", "teams", "races", "highlights", "news", "users", "clubs", "polls"] as const;
export type SearchType = typeof SEARCH_TYPES[number];
export type SearchResult = { type: SearchType; title: string; subtitle?: string | null; href: string; score: number };

const priorities: Record<string, SearchType[]> = {
  drivers: ["drivers","teams","races","news","highlights","users","clubs","polls"],
  teams: ["teams","drivers","races","news","highlights","users","clubs","polls"],
  races: ["races","drivers","teams","highlights","news","users","clubs","polls"],
  highlights: ["highlights","races","drivers","teams","news","users","clubs","polls"],
  news: ["news","races","drivers","teams","highlights","users","clubs","polls"],
  clubs: ["clubs","users","polls","news","drivers","teams","races","highlights"],
  profile: ["users","clubs","polls","news","drivers","teams","races","highlights"],
  polls: ["polls","users","clubs","news","drivers","teams","races","highlights"],
  default: [...SEARCH_TYPES],
};

const esc = (q: string) => q.replace(/[%_]/g, m => `\\${m}`);
const orLike = (fields: string[], q: string) => fields.map(f => `${f}.ilike.%${esc(q)}%`).join(",");
const matchScore = (title: string, q: string) => { const a=title.toLocaleLowerCase("fi-FI"), b=q.toLocaleLowerCase("fi-FI"); return a===b?100:a.startsWith(b)?80:a.split(/\s+/).some(w=>w.startsWith(b))?65:40; };

export const siteSearch = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ q:z.string().trim().min(1).max(80), types:z.array(z.enum(SEARCH_TYPES)).min(1).max(8).optional(), context:z.string().max(40).optional() }).parse(d))
  .handler(async ({data}): Promise<SearchResult[]> => {
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const selected=new Set<SearchType>(data.types ?? SEARCH_TYPES); const order=priorities[data.context ?? "default"] ?? priorities.default; const rank=new Map(order.map((x,i)=>[x,i])); const out:SearchResult[]=[];
    const jobs:Promise<void>[]=[];
    if(selected.has("drivers")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("drivers").select("slug,name,number,flag").or(orLike(["name","slug"],data.q)).limit(20); for(const x of r??[]) out.push({type:"drivers",title:`${x.flag??""} ${x.name}`.trim(),subtitle:x.number!=null?`#${x.number}`:"Kuljettaja",href:`/kuljettajat/${x.slug}`,score:matchScore(x.name,data.q)});})());
    if(selected.has("teams")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("teams").select("slug,name,flag").or(orLike(["name","slug"],data.q)).limit(20); for(const x of r??[]) out.push({type:"teams",title:`${x.flag??""} ${x.name}`.trim(),subtitle:"Tiimi",href:`/tiimit/${x.slug}`,score:matchScore(x.name,data.q)});})());
    if(selected.has("races")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("races").select("slug,name,flag,round_number").or(orLike(["name","slug"],data.q)).limit(20); for(const x of r??[]) out.push({type:"races",title:`${x.flag??""} ${x.name}`.trim(),subtitle:`R${x.round_number??"—"}`,href:`/kilpailut/${x.slug}`,score:matchScore(x.name,data.q)});})());
    if(selected.has("highlights")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("highlights").select("id,race_slug,caption,media_type").or(orLike(["caption","race_slug"],data.q)).order("created_at",{ascending:false}).limit(20); for(const x of r??[]) out.push({type:"highlights",title:x.caption?.trim()||"Kohokohta",subtitle:x.media_type==="video"?"Video":"Kuva",href:`/kilpailut/${x.race_slug}`,score:matchScore(x.caption||x.race_slug,data.q)});})());
    if(selected.has("news")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("news").select("slug,title,excerpt").or(orLike(["title","excerpt","content"],data.q)).order("published_at",{ascending:false}).limit(20); for(const x of r??[]) out.push({type:"news",title:x.title,subtitle:x.excerpt,href:`/uutiset/${x.slug}`,score:matchScore(x.title,data.q)});})());
    if(selected.has("users")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("profiles").select("id,display_name").ilike("display_name",`%${esc(data.q)}%`).limit(20); for(const x of r??[]) out.push({type:"users",title:x.display_name||"Vierailija",subtitle:"Käyttäjä",href:`/kayttajat/${x.id}`,score:matchScore(x.display_name||"",data.q)});})());
    if(selected.has("clubs")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("clubs").select("id,name,description").eq("visibility","public").or(orLike(["name","description"],data.q)).limit(20); for(const x of r??[]) out.push({type:"clubs",title:x.name,subtitle:x.description||"Julkinen klubi",href:`/klubit/${x.id}`,score:matchScore(x.name,data.q)});})());
    if(selected.has("polls")) jobs.push((async()=>{const {data:r}=await supabaseAdmin.from("polls").select("id,question").ilike("question",`%${esc(data.q)}%`).order("created_at",{ascending:false}).limit(20); for(const x of r??[]) out.push({type:"polls",title:x.question,subtitle:"Äänestys",href:`/aanestykset#${x.id}`,score:matchScore(x.question,data.q)});})());
    await Promise.all(jobs); out.sort((a,b)=>(rank.get(a.type)!-rank.get(b.type)!)||(b.score-a.score)||a.title.localeCompare(b.title,"fi")); return out.slice(0,50);
  });
