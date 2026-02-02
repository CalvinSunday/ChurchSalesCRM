import { Timestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export function ownerClass(owner){
  if (!owner) return "";
  return owner.toLowerCase() === "adrian" ? "adrian" : "carmen";
}

export function escapeHtml(s=""){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function toDateInputValue(date){
  // date -> YYYY-MM-DD
  const d = new Date(date);
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function formatUSDate(date){
  if (!date) return "";
  const d = new Date(date);
  const pad = (n)=> String(n).padStart(2,"0");
  return `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export function parseUSDateToDate(s){
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = Number(m[1]), dd = Number(m[2]), yyyy = Number(m[3]);
  const d = new Date(yyyy, mm-1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm-1 || d.getDate() !== dd) return null;
  d.setHours(12,0,0,0);
  return d;
}

export function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function tsToMillis(ts){
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === "object" && typeof ts.toMillis === "function") return ts.toMillis();
  return null;
}

export function now(){
  const d = new Date();
  d.setSeconds(0,0);
  return d;
}

export function keyChurch(churchName, city, state){
  const norm = (v)=> String(v||"").trim().toLowerCase().replace(/\s+/g," ");
  return `${norm(churchName)}|${norm(city)}|${norm(state)}`;
}

export function moneyToNumber(v){
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.]/g,"");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function numberToMoney(n){
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return String(Math.round(v));
}
