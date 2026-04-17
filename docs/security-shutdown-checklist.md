# Security Shutdown Checklist

Use this checklist when taking the old public CRM offline.

## Completed in Repo
- [x] Public app shell replaced with disabled page in [index.html](../index.html)
- [x] Crawler block added in [robots.txt](../robots.txt)
- [x] Ignore hardening added in [.gitignore](../.gitignore)
- [x] Example env file added in [.env.example](../.env.example)

## Manual Actions Required
- [ ] Disable GitHub Pages source in repo settings
- [ ] Delete backend CRM data (Firebase/Supabase) from production project(s)
- [ ] Rotate any keys that were ever public in client-side code
- [ ] Confirm old public URL no longer serves CRM functionality

## Verification
- [ ] Opening site URL shows disabled page only
- [ ] No JS app bundle is loaded from [assets/app.js](../assets/app.js)
- [ ] Search engines are disallowed via [robots.txt](../robots.txt)
- [ ] Netlify target repo has clean migration docs and no old records

## Optional Hardening
- [ ] Remove old repo from public visibility (set private)
- [ ] Rewrite git history if sensitive records were committed
- [ ] Add branch protection + required reviews for future deploy branches
