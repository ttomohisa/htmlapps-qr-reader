# AGENTS.md

## Goal
Maintain a privacy-friendly, mobile-first QR code reader that is distributed as one self-contained HTML file.

## Read first
1. `APP_SPEC.md`
2. `README.ja.md`
3. `app.config.json`
4. `dependencies.json`

## Non-negotiable constraints
- Keep the primary release artifact at `dist/index.html`.
- Do not add runtime CDN/API/network dependencies. `connect-src 'none'` must remain in the CSP.
- Pin third-party dependencies in `dependencies.json` and embed them at build time.
- Keep camera permission use explicit and local to the browser.
- Never auto-open a scanned URL. Show the decoded result first and require a user action.
- Keep image decoding available even when camera permission is denied or unsupported.
- Feature-detect torch and hardware zoom; hide or disable controls that the device/browser cannot provide.
- Preserve Japanese and English UI.
- Treat the mobile camera screen as the primary product surface. Avoid desktop-first controls that obstruct the live preview.

## Verification
On Windows, run:

```powershell
.\scripts\check-repository.ps1
```

Then test `dist/index.html` on at least one Android Chromium browser and, when possible, iOS Safari. Verify camera startup, image import, history, URL safety, rotation, safe areas, zoom gestures, and torch availability behavior.
