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

export function renderCalendar({
  root,
  monthKey,
  entries,
  closedWonLeads,
  onPrevMonth,
  onNextMonth,
  onJumpToCurrentMonth,
  onCreateEntry,
  onDeleteEntry,
  onOpenLead
}){
  const [yearRaw, monthRaw] = String(monthKey || "").split("-").map(Number);
  const monthDate = Number.isFinite(yearRaw) && Number.isFinite(monthRaw)
    ? new Date(yearRaw, monthRaw - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = monthDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  const entriesInMonth = entries
    .filter(e => e.startsOn && e.startsOn.getFullYear() === year && e.startsOn.getMonth() === month)
    .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime() || String(a.churchName || "").localeCompare(String(b.churchName || "")));

  const byDay = new Map();
  for (const e of entriesInMonth){
    const day = e.startsOn.getDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  }

  const dayHeaders = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    .map(d => `<div class="calendar__dow">${d}</div>`).join("");

  const cells = [];
  for (let i = 0; i < firstDow; i++){
    cells.push(`<div class="calendar__cell calendar__cell--empty"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day++){
    const dayEntries = byDay.get(day) || [];
    const chips = dayEntries.slice(0, 3).map(e => `
      <button class="calendar__chip" type="button" data-open-lead="${escapeHtml(e.leadId || "")}" title="${escapeHtml(`${e.churchName || "Client"} • ${e.availabilityType || "Available"}`)}">
        ${escapeHtml(e.churchName || "Client")}
      </button>
    `).join("");
    const overflow = dayEntries.length > 3 ? `<div class="calendar__more">+${dayEntries.length - 3} more</div>` : "";
    cells.push(`
      <div class="calendar__cell">
        <div class="calendar__day">${day}</div>
        <div class="calendar__events">
          ${chips || `<div class="calendar__none">No entries</div>`}
          ${overflow}
        </div>
      </div>
    `);
  }

  while (cells.length % 7 !== 0){
    cells.push(`<div class="calendar__cell calendar__cell--empty"></div>`);
  }

  const defaultDate = monthDate.getTime() === new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    ? toDateInputValue(new Date())
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  root.innerHTML = `
    <div class="grid calendar-layout" style="align-items:start;">
      <div class="panel">
        <div class="row" style="margin-bottom:10px;">
          <div class="row__left">
            <div class="h2" style="margin:0;">Master Availability Calendar</div>
            <div style="color:var(--muted); font-size:13px;">Shared live across all users</div>
          </div>
          <div class="row__right">
            <button class="btn" id="calendarPrevBtn" type="button">←</button>
            <div class="calendar__month">${escapeHtml(monthLabel)}</div>
            <button class="btn" id="calendarNextBtn" type="button">→</button>
            <button class="btn" id="calendarTodayBtn" type="button">Today</button>
          </div>
        </div>

        <div class="calendar">
          <div class="calendar__head">${dayHeaders}</div>
          <div class="calendar__grid">${cells.join("")}</div>
        </div>
      </div>

      <div class="panel">
        <div class="h2">Add Availability (Closed Clients)</div>
        <form id="calendarForm" class="form" style="grid-template-columns: 1fr;">
          <div class="field">
            <label>Client (Closed Won) *</label>
            <select name="leadId" required ${closedWonLeads.length ? "" : "disabled"}>
              ${closedWonLeads.length
                ? closedWonLeads.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.churchName || "Unnamed")} (${escapeHtml(l.city || "")}${l.city && l.state ? ", " : ""}${escapeHtml(l.state || "")})</option>`).join("")
                : `<option value="">No Closed Won clients available</option>`}
            </select>
          </div>
          <div class="field">
            <label>Date *</label>
            <input name="date" type="date" value="${escapeHtml(defaultDate)}" required />
          </div>
          <div class="field">
            <label>Availability</label>
            <select name="availabilityType">
              <option value="Available">Available</option>
              <option value="Booked">Booked</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
          <div class="field">
            <label>Notes</label>
            <textarea name="notes" placeholder="Install date confirmed, team unavailable, etc."></textarea>
          </div>
          <div class="field">
            <button class="btn btn--primary" type="submit" ${closedWonLeads.length ? "" : "disabled"}>Save availability</button>
          </div>
        </form>

        <div style="height:12px;"></div>
        <div class="h2">Entries This Month (${entriesInMonth.length})</div>
        <div class="calendar-list">
          ${entriesInMonth.length
            ? entriesInMonth.map(e => `
              <div class="calendar-item">
                <div>
                  <div class="calendar-item__title">${escapeHtml(e.churchName || "Client")}</div>
                  <div class="calendar-item__meta">
                    ${escapeHtml(formatUSDate(e.startsOn))} • <span class="calendar-badge ${calendarTypeClass(e.availabilityType)}">${escapeHtml(e.availabilityType || "Available")}</span>
                  </div>
                  ${e.notes ? `<div class="calendar-item__notes">${escapeHtml(e.notes)}</div>` : ""}
                </div>
                <div class="row__right">
                  <button class="btn" type="button" data-open-lead="${escapeHtml(e.leadId || "")}">Lead</button>
                  <button class="btn btn--danger" type="button" data-delete-calendar="${escapeHtml(e.id)}">Delete</button>
                </div>
              </div>
            `).join("")
            : `<div style="color:var(--muted); font-size:13px;">No availability entries for this month.</div>`}
        </div>
      </div>
    </div>
  `;

  root.querySelector("#calendarPrevBtn").addEventListener("click", onPrevMonth);
  root.querySelector("#calendarNextBtn").addEventListener("click", onNextMonth);
  root.querySelector("#calendarTodayBtn").addEventListener("click", onJumpToCurrentMonth);

  root.querySelector("#calendarForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    await onCreateEntry(payload);
    const notesEl = e.currentTarget.querySelector("textarea[name='notes']");
    if (notesEl) notesEl.value = "";
  });

  root.querySelectorAll("[data-open-lead]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const leadId = e.currentTarget.getAttribute("data-open-lead");
      if (!leadId) return;
      onOpenLead(leadId);
    });
  });

  root.querySelectorAll("[data-delete-calendar]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-delete-calendar");
      if (!id) return;
      onDeleteEntry(id);
    });
  });
}

export function renderKpis({
  root,
  owners,
  targets,
  totals,
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onSaveTarget
}){
  const startText = formatUSDate(weekStart);
  const endText = formatUSDate(weekEnd);

  root.innerHTML = `
    <div class="panel" style="margin-bottom:12px;">
      <div class="row">
        <div class="row__left">
          <div>
            <div class="h2" style="margin-bottom:6px;">Weekly KPI Tracking</div>
            <div style="color:var(--muted); font-size:13px;">Live shared counters from logged activities (${escapeHtml(startText)} – ${escapeHtml(endText)})</div>
          </div>
        </div>
        <div class="row__right">
          <button class="btn" id="kpiPrevWeek" type="button">← Prev week</button>
          <button class="btn" id="kpiCurrentWeek" type="button">Current week</button>
          <button class="btn" id="kpiNextWeek" type="button">Next week →</button>
        </div>
      </div>
    </div>

    <div class="grid kpi-grid">
      ${owners.map(owner => renderKpiOwnerCard(owner, targets?.[owner] || {}, totals?.[owner] || {})).join("")}
    </div>
  `;

  root.querySelector("#kpiPrevWeek").addEventListener("click", onPrevWeek);
  root.querySelector("#kpiNextWeek").addEventListener("click", onNextWeek);
  root.querySelector("#kpiCurrentWeek").addEventListener("click", onCurrentWeek);

  owners.forEach((owner) => {
    const form = root.querySelector(`[data-kpi-form='${cssEscape(owner)}']`);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await onSaveTarget({
        owner,
        calls: fd.get("calls"),
        emails: fd.get("emails"),
        messages: fd.get("messages")
      });
    });
  });
}

function renderKpiOwnerCard(owner, target, total){
  const callsDone = Number(total.calls || 0);
  const emailsDone = Number(total.emails || 0);
  const messagesDone = Number(total.messages || 0);

  const callsTarget = Number(target.calls || 0);
  const emailsTarget = Number(target.emails || 0);
  const messagesTarget = Number(target.messages || 0);

  return `
    <div class="panel">
      <div class="row" style="margin-bottom:10px;">
        <div class="row__left">
          <div class="h2" style="margin:0;">${escapeHtml(owner)}</div>
        </div>
      </div>

      <div class="kpi-metrics">
        ${renderKpiMetricRow("Calls", callsDone, callsTarget)}
        ${renderKpiMetricRow("Emails", emailsDone, emailsTarget)}
        ${renderKpiMetricRow("DMs / Texts", messagesDone, messagesTarget)}
      </div>

      <div style="height:12px;"></div>

      <form class="form" style="grid-template-columns: repeat(3, minmax(0,1fr));" data-kpi-form="${escapeHtml(owner)}">
        <div class="field">
          <label>Calls target</label>
          <input name="calls" inputmode="numeric" value="${escapeHtml(String(callsTarget))}" />
        </div>
        <div class="field">
          <label>Emails target</label>
          <input name="emails" inputmode="numeric" value="${escapeHtml(String(emailsTarget))}" />
        </div>
        <div class="field">
          <label>DM/Text target</label>
          <input name="messages" inputmode="numeric" value="${escapeHtml(String(messagesTarget))}" />
        </div>
        <div class="field field--span2">
          <button class="btn btn--primary" type="submit">Save ${escapeHtml(owner)} targets</button>
        </div>
      </form>
    </div>
  `;
}

function renderKpiMetricRow(label, done, target){
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const doneText = `${done} / ${target}`;
  return `
    <div class="kpi-row">
      <div class="kpi-row__top">
        <div class="kpi-row__label">${escapeHtml(label)}</div>
        <div class="kpi-row__value">${escapeHtml(doneText)} (${pct}%)</div>
      </div>
      <div class="kpi-bar">
        <div class="kpi-bar__fill" style="width:${pct}%;"></div>
      </div>
    </div>
  `;
}

function cssEscape(s){
  return String(s).replaceAll("'", "\\'");
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
          <label>Has livestream?</label>
          <select name="livestreamStatus">
            <option value="unknown" selected>Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div class="field">
          <label>Livestream link</label>
          <input name="livestreamUrl" placeholder="https://youtube.com/..." />
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
    lead.website ? `🌐 <a href="${escapeHtml(lead.website)}" target="_blank" rel="noreferrer">${escapeHtml(lead.website)}</a>` : "",
    lead.livestreamUrl ? `📺 <a href="${escapeHtml(lead.livestreamUrl)}" target="_blank" rel="noreferrer">${escapeHtml(lead.livestreamUrl)}</a>` : ""
  ].filter(Boolean).join("<br/>");

  const livestreamStatusLabel =
    lead.livestreamStatus === "yes" ? "Yes"
      : lead.livestreamStatus === "no" ? "No"
        : "Unknown";

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

        <div class="field">
          <label>Has livestream?</label>
          <select id="leadLivestreamStatus">
            <option value="unknown" ${lead.livestreamStatus !== "yes" && lead.livestreamStatus !== "no" ? "selected" : ""}>Unknown</option>
            <option value="yes" ${lead.livestreamStatus === "yes" ? "selected" : ""}>Yes</option>
            <option value="no" ${lead.livestreamStatus === "no" ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="field">
          <label>Livestream link</label>
          <input id="leadLivestreamUrl" value="${escapeHtml(lead.livestreamUrl || "")}" placeholder="https://youtube.com/..." />
        </div>

        <div class="field field--span2">
          <label>Notes</label>
          <textarea id="leadNotes" placeholder="Notes…">${escapeHtml(lead.notes || "")}</textarea>
        </div>

        <div class="field field--span2">
          <label>Contact</label>
          <div style="color:var(--muted); font-size:13px; line-height:1.5;">
            ${contactLine ? `<div style="color:var(--text); font-weight:800; margin-bottom:6px;">${contactLine}</div>` : ""}
            <div style="margin-bottom:6px;">Livestream: <b style="color:var(--text);">${escapeHtml(livestreamStatusLabel)}</b></div>
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

function calendarTypeClass(type){
  const t = String(type || "").toLowerCase();
  if (t === "booked") return "calendar-badge--booked";
  if (t === "unavailable") return "calendar-badge--unavailable";
  return "calendar-badge--available";
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

  const livestreamLabel =
    lead.livestreamStatus === "yes" ? "Yes"
      : lead.livestreamStatus === "no" ? "No"
        : "Unknown";

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
        <div class="kv">Live: <b>${escapeHtml(livestreamLabel)}</b></div>
        <div class="kv">Last: <b>${escapeHtml(last)}</b></div>
      </div>
    </div>
  `;
}
