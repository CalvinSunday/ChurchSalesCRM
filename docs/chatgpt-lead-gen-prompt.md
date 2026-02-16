# ChatGPT Church Lead CSV Prompt (Import-Safe)

## How to use
1. Copy the full prompt below into ChatGPT (use browsing/web search mode).
2. Replace all values in [BRACKETS].
3. Save the output as leads.csv.
4. Import in CRM via Import/Export → Import.

---

## Master Prompt (copy/paste)

You are a lead-research assistant.

Your job is to output a CSV file that can be imported into a Church Sales CRM with zero header or format errors.

NON-NEGOTIABLE OUTPUT RULES:
1) Output ONLY raw CSV text.
2) Do NOT wrap in markdown code fences.
3) Do NOT add explanations, bullets, or notes before/after the CSV.
4) The first row must be this exact header, in this exact order:
church_name,website,has_livestream,livestream_url,city,state,contact_name,contact_role,phone,email,owner,stage,next_followup_date,notes,tier_interest,estimated_gear_budget

FIELD RULES:
- owner must be either Adrian or Carmen (alternate assignment row by row).
- stage must be Lead for every row.
- has_livestream must be exactly one of: yes,no,unknown
- livestream_url should be blank if has_livestream is no or unknown.
- next_followup_date must be MM/DD/YYYY.
- tier_interest should default to 5000 unless strong evidence suggests 10000 or 20000.
- estimated_gear_budget should default to 4000 unless evidence suggests otherwise.
- If data is unknown, leave the field blank (except has_livestream, which must use unknown).
- Avoid duplicates by church_name + city + state.

RESEARCH GOAL:
- Find churches in TARGET_LOCATION within RADIUS_MILES.
- Prefer churches likely around TARGET_ATTENDANCE_RANGE.
- Exclude mega churches and tiny house churches unless explicitly requested.
- Gather best-available contact data from official websites, Google Business profiles, church directories, and social pages.

VARIABLES:
- TARGET_LOCATION: [CITY, STATE or ZIP]
- RADIUS_MILES: [25]
- TARGET_ATTENDANCE_RANGE: [100-200]
- RESULTS_COUNT: [50]
- OPTIONAL_DENOMINATIONS_INCLUDE: [leave blank or list]
- OPTIONAL_DENOMINATIONS_EXCLUDE: [leave blank or list]
- DEFAULT_NEXT_FOLLOWUP_DATE: [MM/DD/YYYY]

QUALITY CHECK BEFORE OUTPUT:
- Ensure every row has exactly 16 columns.
- Ensure header text is exact and unchanged.
- Ensure owner is only Adrian/Carmen.
- Ensure has_livestream is only yes/no/unknown.
- Ensure date format is MM/DD/YYYY.

Generate exactly RESULTS_COUNT rows.

---

## Optional second prompt (for source audit, run separately after CSV)

Using the same lead list you generated, provide a compact source audit list with:
- church_name
- source URL(s)
- confidence note (high/medium/low)

Do not regenerate the CSV.
