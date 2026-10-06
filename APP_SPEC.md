# QR Reader — App Specification

## Goal
A single-HTML QR code reader optimized for smartphones. It starts the rear camera at launch, decodes QR codes locally, can also decode existing images, and keeps scan history on-device.

## Core requirements
- Camera starts automatically when the page opens and permission is available.
- Prefer the rear camera and support switching among available cameras.
- Decode QR codes continuously without sending camera frames outside the browser.
- Read QR codes from local image files/screenshots, including one image explicitly supplied by a paste event.
- Leave text-field, editable-content, and modal-dialog paste untouched; do not read the clipboard asynchronously or fetch pasted URLs.
- Process one manual image at a time and always show repeated manual results, while retaining the camera duplicate cooldown.
- Torch control when the active camera exposes it.
- Zoom control with both a visible slider and vertical swipe gesture; also support pinch zoom.
- Use optical/hardware camera zoom when available; otherwise use centered digital zoom.
- Keep scan history in localStorage, searchable and removable.
- Never auto-open decoded URLs. Show a result sheet first with Open / Copy / Share actions.
- Japanese and English UI, auto-detected with manual switching.
- Build to one `dist/index.html` with all third-party code embedded and runtime network blocked by CSP.

## Mobile UX requirements
- At <= 760px, the camera preview occupies the entire dynamic viewport (`100dvh`).
- Respect safe-area insets at the top and bottom.
- Keep the primary controls in a thumb-reachable bottom dock.
- Put zoom immediately above the dock and keep a large scan frame centered slightly above the visual midpoint.
- Top controls are minimal and transparent over the camera.
- Results and history open as bottom sheets rather than navigating away from the scanner.
- Camera gestures must not trigger page scrolling while the scanner is active.
- Camera permission failures must leave image scanning available.

## Data and privacy
- History is limited to 200 entries and stored only in localStorage.
- No analytics, telemetry, external fonts, or runtime API calls.
- The QR decoder is pinned and embedded at build time.

## Decoder
- Primary portable fallback: `jsqr@1.4.0` (Apache-2.0), embedded by the build.
- If the browser exposes `BarcodeDetector` with `qr_code`, it may be used first for efficiency.

## Acceptance checks
1. App opens directly to the scanner on Android/iOS-class mobile browsers.
2. Rear camera is requested by default.
3. A QR code in the camera view produces a result sheet and a history item.
4. Scanning pauses while the result sheet is open and resumes after closing it.
5. A QR code in a selected image can be decoded.
6. Pasting an image on the scanner displays its result; unsupported clipboard data remains untouched.
7. Torch button is enabled only when supported.
8. Zoom slider works; vertical swipe changes the same zoom value; pinch also works.
9. Camera switch button is enabled when multiple video inputs are available.
10. History persists across reloads and can be searched, deleted individually, or cleared.
11. `scripts/verify-standalone.ps1` passes and `dist/index.html` contains no external script/style URLs.
