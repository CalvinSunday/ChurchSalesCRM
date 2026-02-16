import { db, f } from "./firebase.js";
import { STAGES, REMINDER_RULES, CSV_HEADER } from "./constants.js";
import { fillStageFilter, renderPipeline, renderFollowups, renderCalendar, renderImportExport, renderSettings, renderNewLeadForm, renderLeadModal, toast } from "./ui.js";
import { parseCsv, validateHeader, leadsToCsv, downloadText } from "./csv.js";
import { parseUSDateToDate, addDays, now, keyChurch, moneyToNumber } from "./utils.js";

const LS = {
  userOwner: "crm:userOwner",
  quickOwner: "crm:quickOwner",
  view: "crm:view",
  stageFilter: "crm:stageFilter",
  search: "crm:search",
  calendarMonth: "crm:calendarMonth"
};

function getLocal(key, fallback=null){
  try{
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  }catch{ return fallback; }
}
function setLocal(key, value){
  try{ localStorage.setItem(key, value); }catch{}
}

const state = {
  view: getLocal(LS.view, "pipeline"),
  userOwner: getLocal(LS.userOwner, "Adrian"),
  quickOwner: getLocal(LS.quickOwner, "ALL"),
  stageFilter: getLocal(LS.stageFilter, "ALL"),
  search: getLocal(LS.search, ""),
  calendarMonth: getLocal(LS.calendarMonth, new Date().toISOString().slice(0,7)),
  leads: [],
  leadsById: new Map(),
  calendarEntries: [],
  calendarById: new Map(),
  unsubscribe: null,
  unsubscribeCalendar: null
};

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Church Sales CRM",
    view: "pipeline",
    bullets: [
      "This quick walkthrough covers every main workflow in the app.",
      "Use the tabs to switch between Pipeline, Follow-ups, Calendar, Import/Export, and Settings.",
      "Use the Tutorial button in the top bar any time to replay this guide."
    ]
  },
  {
    title: "Pipeline and Filters",
    view: "pipeline",
    bullets: [
      "Pipeline shows leads grouped by sales stage.",
      "Use owner quick filters, search, and stage filter to narrow your list instantly.",
      "Click any lead card to open full details and activity history."
    ]
  },
  {
    title: "Creating and Updating Leads",
    view: "pipeline",
    bullets: [
      "Use + New Lead to create a lead with church, contact, owner, and stage details.",
      "Inside a lead modal you can update stage, next follow-up, notes, tier interest, and budget.",
      "Marking a deposit as paid automatically moves the lead to Closed Won."
    ]
  },
  {
    title: "Activity Logging and Follow-up Rules",
    view: "pipeline",
    bullets: [
      "Log calls, emails, meetings, and other activities from each lead modal.",
      "Recent activity appears in the lead timeline for quick context.",
      "Some activity types automatically schedule a next follow-up date."
    ]
  },
  {
    title: "Follow-ups View",
    view: "followups",
    bullets: [
      "Follow-ups focuses on your current owner profile.",
      "See overdue and due-today leads at the top, plus all upcoming follow-ups below.",
      "Click any card to jump into the lead and take action."
    ]
  },
  {
    title: "Master Calendar",
    view: "calendar",
    bullets: [
      "Calendar is a shared live view across all users.",
      "Add availability only for Closed Won clients so the whole team sees scheduling status.",
      "Use month navigation to plan upcoming client availability and booking load."
    ]
  },
  {
    title: "Import / Export",
    view: "importexport",
    bullets: [
      "Import CSV creates leads in bulk using the expected header format.",
      "Duplicate church/city/state combinations are skipped to avoid double entries.",
      "Export CSV downloads your full lead list for backup or sharing."
    ]
  },
  {
    title: "Settings and Local Preferences",
    view: "settings",
    bullets: [
      "Set your default owner profile for this browser.",
      "Reset local settings if filters or defaults need a clean start.",
      "These settings are local to your device and do not create user accounts."
    ]
  },
  {
    title: "You’re Ready",
    view: "pipeline",
    bullets: [
      "Core workflow: add leads, log activity, schedule follow-ups, and move deals to Closed Won.",
      "Use the top-bar filters daily to keep your list focused.",
      "Replay this tutorial any time from the Tutorial button."
    ]
  }
];

let tutorialStepIndex = 0;
let tutorialStartingView = null;

const els = {
  tabs: Array.from(document.querySelectorAll(".tabs__tab")),
  ownerQuickFilter: document.getElementById("ownerQuickFilter"),
  tutorialBtn: document.getElementById("tutorialBtn"),
  newLeadBtn: document.getElementById("newLeadBtn"),
  searchInput: document.getElementById("searchInput"),
  stageFilter: document.getElementById("stageFilter"),
  viewRoot: document.getElementById("viewRoot"),
  modal: document.getElementById("leadModal"),
  modalClose: document.getElementById("leadModalClose"),
  modalBody: document.getElementById("leadModalBody"),
  modalTitle: document.getElementById("leadModalTitle"),
  modalMeta: document.getElementById("leadModalMeta"),
  tutorialModal: document.getElementById("tutorialModal"),
  tutorialClose: document.getElementById("tutorialClose"),
  tutorialStepMeta: document.getElementById("tutorialStepMeta"),
  tutorialStepTitle: document.getElementById("tutorialStepTitle"),
  tutorialStepBody: document.getElementById("tutorialStepBody"),
  tutorialPrev: document.getElementById("tutorialPrev"),
  tutorialSkip: document.getElementById("tutorialSkip"),
  tutorialNext: document.getElementById("tutorialNext")
};

function hasTutorialUi(){
  return !!(
    els.tutorialModal &&
    els.tutorialClose &&
    els.tutorialStepMeta &&
    els.tutorialStepTitle &&
    els.tutorialStepBody &&
    els.tutorialPrev &&
    els.tutorialSkip &&
    els.tutorialNext
  );
}

function applyTopControls(){
  // Tabs
  els.tabs.forEach(t => t.classList.toggle("is-active", t.dataset.view === state.view));
  // Owner segmented
  els.ownerQuickFilter.querySelectorAll(".segmented__btn").forEach(b => {
    b.classList.toggle("is-active", b.dataset.owner === state.quickOwner);
  });
  // Inputs
  els.searchInput.value = state.search;
  els.stageFilter.value = state.stageFilter;
}

function setView(view, { persist=true } = {}){
  state.view = view;
  if (persist) setLocal(LS.view, view);
  render();
}

function setQuickOwner(owner){
  state.quickOwner = owner;
  setLocal(LS.quickOwner, owner);
  render();
}

function setStageFilter(stage){
  state.stageFilter = stage;
  setLocal(LS.stageFilter, stage);
  render();
}

function setSearch(s){
  state.search = s;
  setLocal(LS.search, s);
  render();
}

function leadMatchesFilters(lead){
  if (state.quickOwner !== "ALL" && lead.owner !== state.quickOwner) return false;
  if (state.stageFilter !== "ALL" && lead.stage !== state.stageFilter) return false;

  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    lead.churchName, lead.city, lead.state, lead.notes, lead.website, lead.email, lead.phone, lead.contactName, lead.contactRole
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function parseLeadDoc(docSnap){
  const data = docSnap.data() || {};
  const toDate = (ts) => ts && typeof ts.toDate === "function" ? ts.toDate() : null;
  const lead = {
    id: docSnap.id,
    churchName: data.churchName || "",
    website: data.website || "",
    city: data.city || "",
    state: data.state || "",
    contactName: data.contactName || "",
    contactRole: data.contactRole || "",
    phone: data.phone || "",
    email: data.email || "",
    owner: data.owner || "",
    stage: data.stage || "Lead",
    tierInterest: data.tierInterest ?? "",
    estimatedGearBudget: data.estimatedGearBudget ?? "",
    notes: data.notes || "",
    nextFollowUpAt: toDate(data.nextFollowUpAt),
    lastActivityType: data.lastActivityType || "",
    lastActivityAt: toDate(data.lastActivityAt),
    depositPaid: !!data.depositPaid,
    depositAmount: data.depositAmount ?? "",
    depositPaidAt: toDate(data.depositPaidAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    closedAt: toDate(data.closedAt)
  };
  return lead;
}

function subscribeLeads(){
  if (state.unsubscribe) state.unsubscribe();

  const col = f.collection(db, "leads");
  const q = f.query(col, f.orderBy("updatedAt", "desc"));
  state.unsubscribe = f.onSnapshot(q, (snap) => {
    const leads = [];
    for (const d of snap.docs){
      leads.push(parseLeadDoc(d));
    }
    state.leads = leads;
    state.leadsById = new Map(leads.map(l => [l.id, l]));
    render();
  }, (err) => {
    console.error(err);
    toast("Firestore error", err?.message || String(err));
  });
}

function parseCalendarDoc(docSnap){
  const data = docSnap.data() || {};
  const toDate = (ts) => ts && typeof ts.toDate === "function" ? ts.toDate() : null;
  return {
    id: docSnap.id,
    leadId: data.leadId || "",
    churchName: data.churchName || "",
    owner: data.owner || "",
    availabilityType: data.availabilityType || "Available",
    notes: data.notes || "",
    startsOn: toDate(data.startsOn),
    createdBy: data.createdBy || "",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
  };
}

function subscribeCalendar(){
  if (state.unsubscribeCalendar) state.unsubscribeCalendar();

  const col = f.collection(db, "calendarAvailability");
  const q = f.query(col, f.orderBy("startsOn", "asc"));
  state.unsubscribeCalendar = f.onSnapshot(q, (snap) => {
    const entries = [];
    for (const d of snap.docs){
      entries.push(parseCalendarDoc(d));
    }
    state.calendarEntries = entries;
    state.calendarById = new Map(entries.map(e => [e.id, e]));
    if (state.view === "calendar") render();
  }, (err) => {
    console.error(err);
    toast("Calendar error", err?.message || String(err));
  });
}

function render(){
  applyTopControls();
  const filtered = state.leads.filter(leadMatchesFilters);

  if (state.view === "pipeline"){
    renderPipeline({
      root: els.viewRoot,
      leads: filtered,
      onOpenLead: openLeadModal
    });
    return;
  }

  if (state.view === "followups"){
    renderFollowups({
      root: els.viewRoot,
      leads: filtered,
      currentUserOwner: state.userOwner,
      onOpenLead: openLeadModal
    });
    return;
  }

  if (state.view === "calendar"){
    const closedWonLeads = state.leads
      .filter(l => l.stage === "Closed Won")
      .sort((a, b) => String(a.churchName || "").localeCompare(String(b.churchName || "")));

    renderCalendar({
      root: els.viewRoot,
      monthKey: state.calendarMonth,
      entries: state.calendarEntries,
      closedWonLeads,
      onPrevMonth: () => shiftCalendarMonth(-1),
      onNextMonth: () => shiftCalendarMonth(1),
      onJumpToCurrentMonth: () => setCalendarMonth(new Date().toISOString().slice(0,7)),
      onCreateEntry: createCalendarEntry,
      onDeleteEntry: deleteCalendarEntry,
      onOpenLead: openLeadModal
    });
    return;
  }

  if (state.view === "importexport"){
    renderImportExport({
      root: els.viewRoot,
      onImportCsv: importCsvText,
      onExportCsv: exportCsv
    });
    return;
  }

  if (state.view === "settings"){
    renderSettings({
      root: els.viewRoot,
      currentUserOwner: state.userOwner,
      onSaveSettings: ({ owner }) => {
        state.userOwner = owner;
        setLocal(LS.userOwner, owner);
        toast("Saved", `Default user: ${owner}`);
        render();
      },
      onResetLocal: () => {
        Object.values(LS).forEach(k => localStorage.removeItem(k));
        toast("Reset", "Local settings cleared. Reloading…");
        setTimeout(() => location.reload(), 600);
      }
    });
    return;
  }

  if (state.view === "newlead"){
    renderNewLeadForm({
      root: els.viewRoot,
      defaults: { owner: state.userOwner },
      onSubmit: createLeadFromForm,
      onCancel: () => setView("pipeline")
    });
    return;
  }

  els.viewRoot.innerHTML = `<div class="panel">Unknown view.</div>`;
}

function shiftCalendarMonth(delta){
  const [y, m] = String(state.calendarMonth || "").split("-").map(Number);
  const d = Number.isFinite(y) && Number.isFinite(m) ? new Date(y, m - 1, 1) : new Date();
  d.setMonth(d.getMonth() + delta);
  setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
}

function setCalendarMonth(monthKey){
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ""))) return;
  state.calendarMonth = monthKey;
  setLocal(LS.calendarMonth, monthKey);
  render();
}

async function createCalendarEntry(form){
  try{
    const leadId = String(form.leadId || "").trim();
    const date = String(form.date || "").trim();
    const availabilityType = String(form.availabilityType || "Available").trim() || "Available";
    const notes = String(form.notes || "").trim();

    if (!leadId || !date){
      toast("Missing fields", "Choose a closed client and a date.");
      return;
    }

    const lead = state.leadsById.get(leadId);
    if (!lead || lead.stage !== "Closed Won"){
      toast("Invalid client", "Availability can only be added for Closed Won clients.");
      return;
    }

    const startsOn = new Date(`${date}T12:00:00`);
    if (Number.isNaN(startsOn.getTime())){
      toast("Invalid date", "Please choose a valid date.");
      return;
    }

    await f.addDoc(f.collection(db, "calendarAvailability"), {
      leadId,
      churchName: lead.churchName || "",
      owner: lead.owner || "",
      availabilityType,
      notes,
      startsOn: f.Timestamp.fromDate(startsOn),
      createdBy: state.userOwner,
      createdAt: f.serverTimestamp(),
      updatedAt: f.serverTimestamp()
    });

    setCalendarMonth(date.slice(0, 7));
    toast("Saved", "Availability added to master calendar.");
  }catch(err){
    console.error(err);
    toast("Save failed", err?.message || String(err));
  }
}

async function deleteCalendarEntry(entryId){
  const entry = state.calendarById.get(entryId);
  if (!entry) return;

  const ok = confirm(`Delete availability for ${entry.churchName || "this client"}?`);
  if (!ok) return;

  try{
    await f.deleteDoc(f.doc(db, "calendarAvailability", entryId));
    toast("Deleted", "Availability removed.");
  }catch(err){
    console.error(err);
    toast("Delete failed", err?.message || String(err));
  }
}

function openModal(){
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
}
function closeModal(){
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  els.modalBody.innerHTML = "";
}
els.modalClose.addEventListener("click", closeModal);
els.modal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") closeModal();
});

function renderTutorialStep(){
  if (!hasTutorialUi()) return;
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  if (!step) return;

  if (step.view && state.view !== step.view){
    setView(step.view, { persist: false });
  }

  els.tutorialStepTitle.textContent = step.title;
  els.tutorialStepMeta.textContent = `Step ${tutorialStepIndex + 1} of ${TUTORIAL_STEPS.length}`;

  els.tutorialStepBody.innerHTML = "";
  const list = document.createElement("ul");
  step.bullets.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  });
  els.tutorialStepBody.appendChild(list);

  els.tutorialPrev.disabled = tutorialStepIndex === 0;
  els.tutorialNext.textContent = tutorialStepIndex === TUTORIAL_STEPS.length - 1 ? "Finish" : "Next";
}

function openTutorial(startAt=0){
  if (!hasTutorialUi()){
    toast("Tutorial unavailable", "Reload the page to load the latest tutorial UI.");
    return;
  }
  tutorialStartingView = state.view;
  tutorialStepIndex = Math.max(0, Math.min(startAt, TUTORIAL_STEPS.length - 1));
  els.tutorialModal.classList.add("is-open");
  els.tutorialModal.setAttribute("aria-hidden", "false");
  renderTutorialStep();
}

function closeTutorial(){
  if (!hasTutorialUi()) return;
  els.tutorialModal.classList.remove("is-open");
  els.tutorialModal.setAttribute("aria-hidden", "true");

  if (tutorialStartingView && state.view !== tutorialStartingView){
    setView(tutorialStartingView, { persist: false });
  }
  tutorialStartingView = null;
}

if (hasTutorialUi()){
  els.tutorialClose.addEventListener("click", closeTutorial);
  els.tutorialSkip.addEventListener("click", closeTutorial);
  els.tutorialModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeTutorial();
  });

  els.tutorialPrev.addEventListener("click", () => {
    if (tutorialStepIndex <= 0) return;
    tutorialStepIndex--;
    renderTutorialStep();
  });

  els.tutorialNext.addEventListener("click", () => {
    const isLast = tutorialStepIndex >= TUTORIAL_STEPS.length - 1;
    if (isLast){
      closeTutorial();
      toast("Tutorial complete", "You can replay it from the Tutorial button.");
      return;
    }
    tutorialStepIndex++;
    renderTutorialStep();
  });
}

async function openLeadModal(leadId){
  const lead = state.leadsById.get(leadId);
  if (!lead) return;

  els.modalTitle.textContent = lead.churchName || "Lead";
  els.modalMeta.textContent = [lead.city, lead.state].filter(Boolean).join(", ");

  openModal();
  els.modalBody.innerHTML = `<div class="panel" style="color:var(--muted);">Loading…</div>`;

  const activities = await fetchActivities(leadId);
  els.modalBody.innerHTML = renderLeadModal({
    lead,
    activities,
    onUpdateLead: () => {},
    onAddActivity: () => {},
    onDeleteLead: () => {}
  });

  // wire handlers
  els.modalBody.querySelector("#saveLeadBtn").addEventListener("click", async () => {
    try{
      const owner = els.modalBody.querySelector("#leadOwner").value;
      const stage = els.modalBody.querySelector("#leadStage").value;
      const nextText = els.modalBody.querySelector("#leadNextFollowUp").value.trim();
      const nextD = nextText ? parseUSDateToDate(nextText) : null;

      const tierInterest = els.modalBody.querySelector("#leadTierInterest").value;
      const gearBudget = els.modalBody.querySelector("#leadGearBudget").value;
      const notes = els.modalBody.querySelector("#leadNotes").value;

      const depositPaid = els.modalBody.querySelector("#depositPaid").value === "yes";
      const depositAmount = moneyToNumber(els.modalBody.querySelector("#depositAmount").value);
      const depositDateText = els.modalBody.querySelector("#depositDate").value.trim();
      const depositD = depositDateText ? parseUSDateToDate(depositDateText) : null;

      const patch = {
        owner,
        stage,
        tierInterest: tierInterest || "",
        estimatedGearBudget: gearBudget || "",
        notes: notes || "",
        nextFollowUpAt: nextD ? f.Timestamp.fromDate(nextD) : null,
        depositPaid,
        depositAmount: depositAmount ?? "",
        depositPaidAt: depositD ? f.Timestamp.fromDate(depositD) : null,
        updatedAt: f.serverTimestamp()
      };

      // If deposit paid, force closed won
      if (depositPaid){
        patch.stage = "Closed Won";
        patch.closedAt = f.serverTimestamp();
      } else if (stage === "Closed Won"){
        // prevent accidental closed won without deposit paid
        patch.stage = "Verbal Yes";
      }

      await f.updateDoc(f.doc(db, "leads", leadId), patch);
      toast("Saved", "Lead updated.");
    }catch(err){
      console.error(err);
      toast("Save failed", err?.message || String(err));
    }
  });

  els.modalBody.querySelector("#addActivityBtn").addEventListener("click", async () => {
    const type = els.modalBody.querySelector("#activityType").value;
    const date = els.modalBody.querySelector("#activityDate").value; // YYYY-MM-DD
    const notes = els.modalBody.querySelector("#activityNotes").value;

    const happenedAt = date ? new Date(date + "T12:00:00") : new Date();
    try{
      await addActivity(leadId, { type, notes, happenedAt });
      els.modalBody.querySelector("#activityNotes").value = "";
      toast("Logged", type);

      // refresh modal
      const freshLead = state.leadsById.get(leadId);
      const activities2 = await fetchActivities(leadId);
      els.modalBody.innerHTML = renderLeadModal({ lead: freshLead, activities: activities2 });
      // reopen with new handlers
      await openLeadModal(leadId);
    }catch(err){
      console.error(err);
      toast("Activity failed", err?.message || String(err));
    }
  });

  els.modalBody.querySelector("#deleteLeadBtn").addEventListener("click", async () => {
    const ok = confirm("Delete this lead? This cannot be undone.");
    if (!ok) return;
    try{
      await f.deleteDoc(f.doc(db, "leads", leadId));
      toast("Deleted", "Lead removed.");
      closeModal();
    }catch(err){
      console.error(err);
      toast("Delete failed", err?.message || String(err));
    }
  });
}

async function fetchActivities(leadId){
  const col = f.collection(db, "leads", leadId, "activities");
  const q = f.query(col, f.orderBy("happenedAt", "desc"), f.limit(50));
  const snap = await f.getDocs(q);
  const out = [];
  for (const d of snap.docs){
    const data = d.data() || {};
    const toDate = (ts) => ts && typeof ts.toDate === "function" ? ts.toDate() : null;
    out.push({
      id: d.id,
      type: data.type || "",
      notes: data.notes || "",
      happenedAt: toDate(data.happenedAt),
      createdAt: toDate(data.createdAt)
    });
  }
  return out;
}

async function addActivity(leadId, { type, notes, happenedAt }){
  const actCol = f.collection(db, "leads", leadId, "activities");
  const happened = happenedAt ? f.Timestamp.fromDate(happenedAt) : f.serverTimestamp();

  await f.addDoc(actCol, {
    type,
    notes: notes || "",
    happenedAt: happened,
    createdAt: f.serverTimestamp()
  });

  // Update lead summary fields + follow-up rules
  const patch = {
    lastActivityType: type,
    lastActivityAt: happened,
    updatedAt: f.serverTimestamp()
  };

  const rule = REMINDER_RULES[type];
  if (rule && typeof rule.days === "number" && rule.days > 0){
    const n = addDays(new Date(), rule.days);
    patch.nextFollowUpAt = f.Timestamp.fromDate(n);
  }

  // Deposit paid auto-close
  if (type === "Deposit Paid"){
    patch.depositPaid = true;
    patch.stage = "Closed Won";
    patch.closedAt = f.serverTimestamp();
    patch.depositPaidAt = happened;
  }

  if (type === "Closed Lost"){
    patch.stage = "Closed Lost";
    patch.closedAt = f.serverTimestamp();
  }

  await f.updateDoc(f.doc(db, "leads", leadId), patch);
}

async function createLeadFromForm(form){
  try{
    const churchName = String(form.churchName || "").trim();
    const city = String(form.city || "").trim();
    const stateUS = String(form.state || "").trim();
    if (!churchName || !city || !stateUS){
      toast("Missing required fields", "Church name, city, and state are required.");
      return;
    }

    const next = String(form.nextFollowUp || "").trim();
    const nextD = next ? parseUSDateToDate(next) : null;

    const payload = {
      churchName,
      website: String(form.website || "").trim(),
      city,
      state: stateUS,
      contactName: String(form.contactName || "").trim(),
      contactRole: String(form.contactRole || "").trim(),
      phone: String(form.phone || "").trim(),
      email: String(form.email || "").trim(),
      owner: String(form.owner || "").trim(),
      stage: String(form.stage || "Lead").trim(),
      tierInterest: String(form.tierInterest || "").trim(),
      estimatedGearBudget: String(form.estimatedGearBudget || "").trim(),
      notes: String(form.notes || "").trim(),
      nextFollowUpAt: nextD ? f.Timestamp.fromDate(nextD) : null,
      depositPaid: false,
      depositAmount: "",
      depositPaidAt: null,
      createdAt: f.serverTimestamp(),
      updatedAt: f.serverTimestamp()
    };

    await f.addDoc(f.collection(db, "leads"), payload);
    toast("Created", churchName);
    setView("pipeline");
  }catch(err){
    console.error(err);
    toast("Create failed", err?.message || String(err));
  }
}

async function importCsvText(text){
  const { header, rows } = parseCsv(text);
  if (!validateHeader(header)){
    throw new Error(`CSV header must be exactly: ${CSV_HEADER.join(",")}`);
  }

  // Build existing keys for dedupe
  const existingKeys = new Set();
  for (const l of state.leads){
    existingKeys.add(keyChurch(l.churchName, l.city, l.state));
  }

  let created = 0;
  let skipped = 0;

  for (const cols of rows){
    const row = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""]));

    const churchName = String(row.church_name || "").trim();
    const city = String(row.city || "").trim();
    const stateUS = String(row.state || "").trim();

    if (!churchName || !city || !stateUS) continue;

    const k = keyChurch(churchName, city, stateUS);
    if (existingKeys.has(k)){
      skipped++;
      continue;
    }
    existingKeys.add(k);

    const next = String(row.next_followup_date || "").trim();
    const nextD = next ? parseUSDateToDate(next) : null;

    const payload = {
      churchName,
      website: String(row.website || "").trim(),
      city,
      state: stateUS,
      contactName: String(row.contact_name || "").trim(),
      contactRole: String(row.contact_role || "").trim(),
      phone: String(row.phone || "").trim(),
      email: String(row.email || "").trim(),
      owner: String(row.owner || "").trim() || state.userOwner,
      stage: String(row.stage || "Lead").trim() || "Lead",
      notes: String(row.notes || "").trim(),
      tierInterest: String(row.tier_interest || "").trim(),
      estimatedGearBudget: String(row.estimated_gear_budget || "").trim(),
      nextFollowUpAt: nextD ? f.Timestamp.fromDate(nextD) : null,
      depositPaid: false,
      depositAmount: "",
      depositPaidAt: null,
      createdAt: f.serverTimestamp(),
      updatedAt: f.serverTimestamp()
    };

    await f.addDoc(f.collection(db, "leads"), payload);
    created++;
  }

  toast("Import complete", `Created ${created}, skipped ${skipped}`);
  return { created, skipped };
}

function exportCsv(){
  const leads = [...state.leads].map(l => ({
    ...l
  }));
  const csv = leadsToCsv(leads);
  downloadText(`church-sales-crm-export-${new Date().toISOString().slice(0,10)}.csv`, csv);
}

function initControls(){
  fillStageFilter(els.stageFilter);

  // Tabs
  els.tabs.forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));

  // Owner quick filter
  els.ownerQuickFilter.querySelectorAll(".segmented__btn").forEach(b => {
    b.addEventListener("click", () => setQuickOwner(b.dataset.owner));
  });

  // Search
  els.searchInput.addEventListener("input", (e) => setSearch(e.target.value));

  // Stage filter
  els.stageFilter.addEventListener("change", (e) => setStageFilter(e.target.value));

  // New lead
  els.newLeadBtn.addEventListener("click", () => setView("newlead"));

  // Tutorial
  els.tutorialBtn.addEventListener("click", () => openTutorial(0));
}

initControls();
subscribeLeads();
subscribeCalendar();
render();
setTimeout(() => openTutorial(0), 250);
