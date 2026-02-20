# Church Sales CRM (GitHub Pages + Firestore)

A simple, clean CRM for church AV/livestream outreach.
- Hosted on **GitHub Pages**
- Data stored in **Firebase Cloud Firestore**
- Two sales-owner views: **Adrian** + **Carmen** (color-coded)
- Pipeline stages + follow-up queue (due/overdue)
- Activity log per church (email/call/etc.)
- CSV import/export with dedupe (church name + city + state; skips duplicates)
- Closed Won = **Deposit Paid** (tracks amount + date)

## ⚠️ CRITICAL Security Warning

**This application has OPEN database access with NO authentication.**

### What this means:
- ❌ **Anyone who discovers your application URL can read ALL your CRM data**
- ❌ **Anyone can modify or delete your data without permission**
- ❌ **There is no access control or user authentication**

### Immediate Actions Required:
1. 🔒 **Keep your application URL secret** - Do not share publicly
2. 📊 **Monitor your Firestore usage** in Firebase Console for suspicious activity
3. 💾 **Set up regular backups** of your Firestore data
4. 🔐 **Plan to implement authentication** - See `SECURITY.md` for detailed recommendations

### For Production Use:
This setup is **NOT RECOMMENDED for production** with sensitive data. See `SECURITY.md` for:
- How to implement Firebase Authentication
- How to secure Firestore rules
- Additional security best practices
- Complete security audit findings

---

## Important security note
You requested **no logins** and **open rules**. This means:
- Anyone who can access the site can read/write your Firestore data.
- Anyone who can view the JS can see the project config.

If you want real access control later, add Firebase Auth and tighten rules.

## Setup

### 1) Create a GitHub repo and clone locally
1. Create a new repo on GitHub (e.g. `church-sales-crm`).
2. Open **GitHub Desktop** → **File → Clone Repository** → select the repo.
3. Copy these project files into the cloned folder (or unzip directly into it).

### 2) Firestore rules (required)
By default, Firestore often blocks reads/writes unless authenticated. Since you want no logins:
1. Firebase Console → **Firestore Database** → **Rules**
2. Replace rules with the contents of `firebase/firestore.rules`
3. Click **Publish**

### 3) Run locally (recommended for fast iteration)
GitHub Pages updates only after you commit + push. For instant preview:
- VS Code: install **Live Server** extension and click **Go Live**
  - Default: http://127.0.0.1:5500
Or:
- Python: `python3 -m http.server 5500` and open http://127.0.0.1:5500

### 4) Deploy to GitHub Pages
1. Push to GitHub (GitHub Desktop → Commit → Push)
2. GitHub repo → **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** (or master) and **/(root)**
5. Save, then wait for the Pages URL to appear

## Using the CRM
- First load: go to **Settings** and choose your default **User** (Adrian/Carmen). This is stored in your browser.
- Add a church lead with **+ New Lead**
- Log an activity (Email/Call/etc.)
  - Email activity auto-sets next follow-up to **+7 days**
  - Call activity auto-sets next follow-up to **+5 days**
  - You can override manually
- Mark **Deposit Paid** to set stage = Closed Won

## CSV import/export
Go to **Import/Export**.
- Import expects the header shown in `data/sample-import.csv`.
- Dedupe rule: **church name + city + state** (case-insensitive). Duplicates are skipped.
- Export downloads your leads as CSV.

## Files
- `index.html` – app shell
- `assets/app.js` – app bootstrap + routing
- `assets/firebase.js` – Firestore helpers
- `assets/ui.js` – rendering + interactions
- `assets/csv.js` – import/export parsing
- `docs/chatgpt-lead-gen-prompt.md` – prompt to generate CSV leads via ChatGPT
