# action/

Operational record for the recon workflow. **All recon files live here** — both
existing and future:

- `RECON_LOG_YYYY-MM-DD.md` — daily recon logs (what was checked, fixed, shipped).
  The daily email workflow (`.github/workflows/email-recon-log.yml`) sends the
  most recent of these to Contact@jura-technology.com.
- `8D_REPORT_YYYY-MM-DD_<slug>.md` — 8D problem reports for defects/escapes.

Convention: anything that documents what the recon unit did or why something
went wrong belongs in this folder, not the repo root.
