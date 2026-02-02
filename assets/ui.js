import { OWNERS, STAGES, ACTIVITY_TYPES, REMINDER_RULES } from "./constants.js";
import { escapeHtml, ownerClass, formatUSDate, tsToMillis, now, addDays, parseUSDateToDate, toDateInputValue, keyChurch, moneyToNumber } from "./utils.js";

export function toast(msg, sub=""){
  const root = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div>
      <div class="toast__msg">${escapeHtml(msg)}</div>
      ${sub ? `<div class="toast__sub">${escapeHtml(sub)}</div>` : ""}
    </div>
    <button class="iconbtn" aria-label="Close">✕</button>
  `;
  el.querySelector("button").addEventListener("click", () => el.remove());
  root.appendChild(el);
  setTimeout(() => { if (el.isConnected) el.remove(); }, 4200);
}

export function fillStageFilter(selectEl){
  selectEl.innerHTML = `
    <option value="ALL">All stages</option>
    ${STAGES.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}
  `;
}

export function renderPipeline({ root, leads, onOpenLead }){
  const byStage = new Map(STAGES.map(s => [s, []]));
  for (const lead of leads){
    if (!byStage.has(lead.stage)) byStage.set(lead.stage, []);
    byStage.get(lead.stage).push(lead);
  }

  const cols = ["Lead","Contacted","Proposal Sent","Closed Won"];
  const htmlCols = cols.map(stage => {
    const items = (byStage.get(stage) || []).sort(sortByFollowupThenName);
    return `
      <div class="col">
        <div class="col__head">
          <div class="col__title">${escapeHtml(stage)}</div>
          <div class="col__count">${items.length}</div>
        </div>
        <div class="cards">
          ${items.map(lead => renderCard(lead)).join("")}
        </div>
      </div>
    `;
  }).join("");

  root.innerHTML = `<div class="board">${htmlCols}</div>`;
  root.querySelectorAll("[data-open-lead]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-open-lead");
      onOpenLead(id);
    });
  });
}

export function renderFollowups({ root, leads, currentUserOwner, onOpenLead }){
  const nowMs = Date.now();

  const mine = leads.filter(l => l.owner === currentUserOwner);
  const due = mine
    .filter(l => l.nextFollowUpAt)
    .map(l => ({...l, nextMs: l.nextFollowUpAt.getTime()}))
    .sort((a,b) => a.nextMs - b.nextMs);

  const overdue = due.filter(l => l.nextMs < nowMs);
  const today = due.filter(l => isSameDay(l.nextFollowUpAt, new Date()));

  root.innerHTML = `
    <div class="grid" style="grid-template-columns: 1fr 1fr; align-items:start;">
      <div class="panel">
        <div class="h2">Overdue (${overdue.length})</div>
        ${overdue.length ? overdue.map(l => renderCard(l, { showDue: true })).join("") : `<div style="color:var(--muted); font-size:13px;">None</div>`}
      </div>
      <div class="panel">
        <div class="h2">Due today (${today.length})</div>
        ${today.length ? today.map(l => renderCard(l, { showDue: true })).join("") : `<div style="color:var(--muted); font-size:13px;">None</div>`}
      </div>
    </div>
    <div style="height:14px;"></div>
    <div class="panel">
      <div class="h2">All upcoming (${due.length})</div>
      ${due.length ? due.map(l => renderCard(l, { showDue: true })).join("") : `<div style="color:var(--muted); font-size:13px;">No follow-ups scheduled.</div>`}
    </div>
  `;

  root.querySelectorAll("[data-open-lead]").forEach(btn => {
    btn.addEventListener("click", (e) => onOpenLead(e.currentTarget.getAttribute("data-open-lead")));
  });
}

export function renderImportExport({ root, onImportCsv, onExportCsv }){
  root.innerHTML = `
    <div class="panel">
      <div class="row">
        <div class="row__left">
          <div>
            <div class="h2" style="margin-bottom:6px;">Import / Export</div>
            <div style="color:var(--muted); font-size:13px;">
              Import a CSV to bulk-create leads. Export downloads all leads as CSV.
            </div>
          </div>
        </div>
        <div class="row__right">
          <button class="btn" id="exportBtn" type="button">Export CSV</button>
        </div>
      </div>

      <div style="height:14px;"></div>

      <div class="field">
        <label for="csvFile">Import CSV</label>
        <input id="csvFile" type="file" accept=".csv,text/csv" />
      </div>
      <div style="height:10px;"></div>
      <button class="btn btn--primary" id="importBtn" type="button">Import</button>
      <div id="importStatus" style="margin-top:10px; color:var(--muted); font-size:13px;"></div>

      <div style="height:16px;"></div>
      <div style="color:var(--muted); font-size:13px;">
        Tip: Use <code>data/sample-import.csv</code> as a template.
      </div>
    </div>
  `;

  root.querySelector("#exportBtn").addEventListener("click", onExportCsv);

  const fileEl = root.querySelector("#csvFile");
  const statusEl = root.querySelector("#importStatus");
  root.querySelector("#importBtn").addEventListener("click", async () => {
    const f = fileEl.files?.[0];
    if (!f){
      statusEl.textContent = "Choose a CSV file first.";
      return;
    }
    statusEl.textContent = "Importing…";
    try{
      const text = await f.text();
      const result = await onImportCsv(text);
      statusEl.textContent = `Imported ${result.created} lead(s). Skipped ${result.skipped} duplicate(s).`;
    }catch(err){
      console.error(err);
      statusEl.textContent = `Import failed: ${err?.message || String(err)}`;
    }
  });
}

export function renderSettings({ root, currentUserOwner, onSaveSettings, onResetLocal }){
  root.innerHTML = `
    <div class="panel">
      <div class="h2">Settings</div>
      <div class="form">
        <div class="field">
          <label for="userOwner">Default user (local browser)</label>
          <select id="userOwner">
            ${OWNERS.map(o => `<option value="${escapeHtml(o)}"${o===currentUserOwner ? " selected" : ""}>${escapeHtml(o)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Notes</label>
          <div style="color:var(--muted); font-size:13px; line-height:1.45;">
            This does not create an account. It only controls your default filters and owner for new leads on <b>this device</b>.
          </div>
        </div>
      </div>
      <div style="height:12px;"></div>
      <div class="row">
        <div class="row__left">
          <button class="btn btn--primary" id="saveSettingsBtn" type="button">Save</button>
        </div>
        <div class="row__right">
          <button class="btn" id="resetLocalBtn" type="button">Reset local settings</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#saveSettingsBtn").addEventListener("click", () => {
    const owner = root.querySelector("#userOwner").value;
    onSaveSettings({ owner });
  });

  root.querySelector("#resetLocalBtn").addEventListener("click", onResetLocal);
}

export function renderNewLeadForm({ root, defaults, onSubmit, onCancel }){
  root.innerHTML = `
    <div class="panel">
      <div class="row">
        <div class="row__left"><div class="h2" style="margin:0;">New Lead</div></div>
        <div class="row__right"><button class="btn" id="cancelNewLead" type="button">Cancel</button></div>
      </div>
      <div style="height:10px;"></div>

      <form id="newLeadForm" class="form">
        <div class="field">
          <label>Church name *</label>
          <input name="churchName" required placeholder="Grace Community Church" />
        </div>
        <div class="field">
          <label>Website</label>
          <input name="website" placeholder="https://…" />
        </div>

        <div class="field">
          <label>City *</label>
          <input name="city" required />
        </div>
        <div class="field">
          <label>State *</label>
          <input name="state" required />
        </div>

        <div class="field">
          <label>Contact name</label>
          <input name="contactName" placeholder="First Last" />
        </div>
        <div class="field">
          <label>Contact role</label>
          <input name="contactRole" placeholder="Worship Pastor / Media Director" />
        </div>

        <div class="field">
          <label>Phone</label>
          <input name="phone" placeholder="(555) 555-5555" />
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" placeholder="name@church.org" />
        </div>

        <div class="field">
          <label>Owner</label>
          <select name="owner">
            ${OWNERS.map(o => `<option value="${escapeHtml(o)}"${o===defaults.owner ? " selected" : ""}>${escapeHtml(o)}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label>Stage</label>
          <select name="stage">
            ${STAGES.map(s => `<option value="${escapeHtml(s)}"${s==="Lead" ? " selected" : ""}>${escapeHtml(s)}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label>Tier interest</label>
          <select name="tierInterest">
            <option value="">(blank)</option>
            <option value="5000">5000</option>
            <option value="10000">10000</option>
            <option value="20000">20000</option>
          </select>
        </div>

        <div class="field">
          <label>Estimated gear budget</label>
          <input name="estimatedGearBudget" inputmode="numeric" placeholder="4000" />
        </div>

        <div class="field field--span2">
          <label>Notes</label>
          <textarea name="notes" placeholder="Livestream sounds thin; volunteers need training…"></textarea>
        </div>

        <div class="field">
          <label>Next follow-up (MM/DD/YYYY)</label>
          <input name="nextFollowUp" placeholder="02/08/2026" />
        </div>

        <div class="field">
          <label>&nbsp;</label>
          <button class="btn btn--primary" type="submit">Create lead</button>
        </div>
      </form>
    </div>
  `;

  root.querySelector("#cancelNewLead").addEventListener("click", onCancel);

  root.querySelector("#newLeadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    onSubmit(payload);
  });
}

export function renderLeadModal({ lead, activities, onUpdateLead, onAddActivity, onDeleteLead }){
  const ownerBadge = lead.owner ? `<span class="badge badge--owner ${ownerClass(lead.owner)}">${escapeHtml(lead.owner)}</span>` : "";
  const stage = lead.stage || "Lead";
  const next = lead.nextFollowUpAt ? formatUSDate(lead.nextFollowUpAt) : "";
  const depositPaid = !!lead.depositPaid;

  const contactLine = [
    lead.contactName ? escapeHtml(lead.contactName) : "",
    lead.contactRole ? escapeHtml(lead.contactRole) : ""
  ].filter(Boolean).join(" • ");

  const contactDetails = [
    lead.phone ? `📞 ${escapeHtml(lead.phone)}` : "",
    lead.email ? `✉️ ${escapeHtml(lead.email)}` : "",
    lead.website ? `🌐 <a href="${escapeHtml(lead.website)}" target="_blank" rel="noreferrer">${escapeHtml(lead.website)}</a>` : ""
  ].filter(Boolean).join("<br/>");

  const activityHtml = activities.length
    ? `<div class="timeline">${activities.map(a => `
        <div class="event">
          <div class="event__top">
            <div class="event__type">${escapeHtml(a.type || "")}</div>
            <div class="event__time">${escapeHtml(formatUSDate(a.happenedAt || a.createdAt || new Date()))}</div>
          </div>
          ${a.notes ? `<div class="event__notes">${escapeHtml(a.notes)}</div>` : ""}
        </div>
      `).join("")}</div>`
    : `<div style="color:var(--muted); font-size:13px; margin-top:10px;">No activity yet.</div>`;

  return `
    <div class="panel" style="margin-bottom:12px;">
      <div class="row">
        <div class="row__left">
          ${ownerBadge}
          ${lead.stage === "Closed Won" ? `<span class="badge badge--won">Closed Won</span>` : ""}
        </div>
        <div class="row__right">
          <button class="btn btn--danger" id="deleteLeadBtn" type="button">Delete</button>
        </div>
      </div>

      <div style="height:10px;"></div>

      <div class="form">
        <div class="field">
          <label>Owner</label>
          <select id="leadOwner">
            ${OWNERS.map(o => `<option value="${escapeHtml(o)}"${o===lead.owner ? " selected" : ""}>${escapeHtml(o)}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label>Stage</label>
          <select id="leadStage">
            ${STAGES.map(s => `<option value="${escapeHtml(s)}"${s===stage ? " selected" : ""}>${escapeHtml(s)}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label>Next follow-up (MM/DD/YYYY)</label>
          <input id="leadNextFollowUp" value="${escapeHtml(next)}" placeholder="MM/DD/YYYY" />
        </div>

        <div class="field">
          <label>Tier interest</label>
          <select id="leadTierInterest">
            <option value="" ${!lead.tierInterest ? "selected" : ""}>(blank)</option>
            <option value="5000" ${String(lead.tierInterest)==="5000" ? "selected" : ""}>5000</option>
            <option value="10000" ${String(lead.tierInterest)==="10000" ? "selected" : ""}>10000</option>
            <option value="20000" ${String(lead.tierInterest)==="20000" ? "selected" : ""}>20000</option>
          </select>
        </div>

        <div class="field">
          <label>Estimated gear budget</label>
          <input id="leadGearBudget" value="${escapeHtml(lead.estimatedGearBudget ?? "")}" inputmode="numeric" placeholder="4000" />
        </div>

        <div class="field field--span2">
          <label>Notes</label>
          <textarea id="leadNotes" placeholder="Notes…">${escapeHtml(lead.notes || "")}</textarea>
        </div>

        <div class="field field--span2">
          <label>Contact</label>
          <div style="color:var(--muted); font-size:13px; line-height:1.5;">
            ${contactLine ? `<div style="color:var(--text); font-weight:800; margin-bottom:6px;">${contactLine}</div>` : ""}
            ${contactDetails || "—"}
          </div>
        </div>

        <div class="field">
          <label>Deposit paid</label>
          <select id="depositPaid">
            <option value="no" ${!depositPaid ? "selected" : ""}>No</option>
            <option value="yes" ${depositPaid ? "selected" : ""}>Yes</option>
          </select>
        </div>
        <div class="field">
          <label>Deposit amount</label>
          <input id="depositAmount" value="${escapeHtml(lead.depositAmount ?? "")}" inputmode="numeric" placeholder="5000" />
        </div>
        <div class="field">
          <label>Deposit paid date (MM/DD/YYYY)</label>
          <input id="depositDate" value="${escapeHtml(lead.depositPaidAt ? formatUSDate(lead.depositPaidAt) : "")}" placeholder="MM/DD/YYYY" />
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <button class="btn btn--primary" id="saveLeadBtn" type="button">Save changes</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="row">
        <div class="row__left"><div class="h2" style="margin:0;">Add activity</div></div>
      </div>
      <div style="height:10px;"></div>
      <div class="form">
        <div class="field">
          <label>Type</label>
          <select id="activityType">
            ${ACTIVITY_TYPES.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Date (YYYY-MM-DD)</label>
          <input id="activityDate" type="date" value="${escapeHtml(toDateInputValue(new Date()))}" />
        </div>
        <div class="field field--span2">
          <label>Notes</label>
          <textarea id="activityNotes" placeholder="What happened?"></textarea>
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <button class="btn btn--primary" id="addActivityBtn" type="button">Add activity</button>
        </div>
      </div>

      <div style="height:16px;"></div>
      <div class="h2">Activity timeline</div>
      ${activityHtml}
    </div>
  `;
}

function sortByFollowupThenName(a,b){
  const am = a.nextFollowUpAt ? a.nextFollowUpAt.getTime() : 9e15;
  const bm = b.nextFollowUpAt ? b.nextFollowUpAt.getTime() : 9e15;
  if (am !== bm) return am - bm;
  return String(a.churchName||"").localeCompare(String(b.churchName||""));
}

function isSameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

export function renderCard(lead, opts={}){
  const nowMs = Date.now();
  const nextMs = lead.nextFollowUpAt ? lead.nextFollowUpAt.getTime() : null;
  const overdue = nextMs !== null && nextMs < nowMs && !isSameDay(new Date(nextMs), new Date());
  const dueToday = nextMs !== null && isSameDay(new Date(nextMs), new Date());

  const dueBadge = opts.showDue && nextMs !== null
    ? (overdue
        ? `<span class="badge badge--overdue">Overdue</span>`
        : (dueToday ? `<span class="badge badge--due">Due today</span>` : ""))
    : "";

  const ownerBadge = lead.owner
    ? `<span class="badge badge--owner ${ownerClass(lead.owner)}">${escapeHtml(lead.owner)}</span>`
    : "";

  const last = lead.lastActivityType
    ? `${lead.lastActivityType}${lead.lastActivityAt ? ` • ${formatUSDate(lead.lastActivityAt)}` : ""}`
    : "No activity";

  return `
    <div class="card" data-open-lead="${escapeHtml(lead.id)}">
      <div class="card__top">
        <div>
          <div class="card__title">${escapeHtml(lead.churchName || "Unnamed")}</div>
          <div class="card__sub">${escapeHtml([lead.city, lead.state].filter(Boolean).join(", "))}</div>
        </div>
        <div class="badges">
          ${dueBadge}
          ${ownerBadge}
        </div>
      </div>
      <div class="card__meta">
        <div class="kv">Stage: <b>${escapeHtml(lead.stage || "Lead")}</b></div>
        <div class="kv">Next: <b>${escapeHtml(lead.nextFollowUpAt ? formatUSDate(lead.nextFollowUpAt) : "—")}</b></div>
        <div class="kv">Last: <b>${escapeHtml(last)}</b></div>
      </div>
    </div>
  `;
}
