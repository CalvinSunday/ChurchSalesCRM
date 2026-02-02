# ChatGPT Church Lead CSV Prompt (Copy/Paste)

## How to use
1. Copy the prompt below into ChatGPT **with browsing enabled**.
2. Edit the variables in the **[BRACKETS]**.
3. When ChatGPT returns the CSV (inside a code block), copy it into a new file named `leads.csv`.
4. Import it in the CRM via **Import/Export → Import CSV**.

---

## Prompt (editable variables)

You are a lead-research assistant for a company that improves church AV/livestream audio and trains volunteers.

**Goal:** Produce a CSV of churches that likely have **small congregations** (target: **~100–200 regular attendance**, not tiny house churches, not megachurches) located within a given radius.

### Variables (edit these)
- TARGET_LOCATION: [City, State OR ZIP]
- RADIUS_MILES: [25]
- TARGET_ATTENDANCE_RANGE: [100-200]
- RESULTS_COUNT: [40]
- OPTIONAL_DENOMINATIONS_INCLUDE: [leave blank OR list]
- OPTIONAL_DENOMINATIONS_EXCLUDE: [leave blank OR list]
- SPLIT_OWNERS: Assign owners alternating between **Adrian** and **Carmen**.
- DEFAULT_STAGE: `Lead`
- DEFAULT_TIER_INTEREST: `5000`
- DEFAULT_GEAR_BUDGET_ESTIMATE: `4000`
- DEFAULT_NEXT_FOLLOWUP_DATE: [MM/DD/YYYY] (use **one week from today**)

### Requirements
- Use web browsing to find churches within the radius.
- For each church, collect (when available):
  - church_name
  - website
  - city
  - state
  - phone
  - email (prefer direct staff email; otherwise general info email)
  - contact_name + contact_role (if visible; otherwise leave blank)
- Estimate whether the church fits the attendance range:
  - If an exact number isn't published, infer based on “about us”, membership, seating capacity, multiple services, or local directories.
  - If uncertain, still include it but put `notes` like `attendance estimate; low confidence`.
- Avoid duplicates (same name + same city/state).
- Output **ONLY ONE CSV** inside a single fenced code block labeled `csv`.
- The CSV must use this header exactly (comma-separated):
  church_name,website,city,state,contact_name,contact_role,phone,email,owner,stage,next_followup_date,notes,tier_interest,estimated_gear_budget

### CSV formatting rules
- Do not include commas inside fields unless wrapped in double quotes.
- Use US date format: MM/DD/YYYY.
- Phone can be any readable format.

### After the CSV
After the CSV code block, provide a brief bullet list of **sources used** (URLs or domain names) for auditing, but do NOT put sources inside the CSV.

---

Now generate the CSV.

TARGET_LOCATION: [PASTE HERE]
RADIUS_MILES: [PASTE HERE]
TARGET_ATTENDANCE_RANGE: [PASTE HERE]
RESULTS_COUNT: [PASTE HERE]
OPTIONAL_DENOMINATIONS_INCLUDE: [PASTE HERE]
OPTIONAL_DENOMINATIONS_EXCLUDE: [PASTE HERE]
DEFAULT_NEXT_FOLLOWUP_DATE: [PASTE HERE]
