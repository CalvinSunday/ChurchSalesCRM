import { CSV_HEADER } from "./constants.js";
import { parseUSDateToDate, formatUSDate } from "./utils.js";

function splitCsvLine(line){
  // Minimal RFC4180-ish parser for one line
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i=0; i<line.length; i++){
    const ch = line[i];
    if (inQuotes){
      if (ch === '"' && line[i+1] === '"'){
        cur += '"';
        i++;
      } else if (ch === '"'){
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"'){
        inQuotes = true;
      } else if (ch === ','){
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map(v => v.trim());
}

export function parseCsv(text){
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(l => l.trim().length > 0);

  if (!lines.length) return { header: [], rows: [] };

  const header = splitCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i=1; i<lines.length; i++){
    rows.push(splitCsvLine(lines[i]));
  }
  return { header, rows };
}

export function validateHeader(header){
  const expected = CSV_HEADER.join(",");
  const got = header.join(",");
  return expected === got;
}

function csvEscape(v){
  const s = (v === null || v === undefined) ? "" : String(v);
  if (/[",\n]/.test(s)){
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export function leadsToCsv(leads){
  const lines = [];
  lines.push(CSV_HEADER.join(","));

  for (const lead of leads){
    const row = [
      lead.churchName || "",
      lead.website || "",
      lead.city || "",
      lead.state || "",
      lead.contactName || "",
      lead.contactRole || "",
      lead.phone || "",
      lead.email || "",
      lead.owner || "",
      lead.stage || "",
      lead.nextFollowUpAt ? formatUSDate(lead.nextFollowUpAt) : "",
      lead.notes || "",
      lead.tierInterest || "",
      lead.estimatedGearBudget || ""
    ].map(csvEscape);
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

export function downloadText(filename, text){
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
