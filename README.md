# QR Reader

A smartphone-first, self-contained single-HTML QR code reader.

## Features

- Starts the rear camera on launch
- Continuous QR scanning from the camera
- QR scanning from screenshots and existing images
- Torch control when exposed by the active camera
- Optical camera zoom when available, with digital fallback
- Zoom slider, vertical swipe, and pinch gestures
- Camera switching
- Local scan history (up to 200 entries in localStorage)
- Recognizes URL, email, phone, SMS, geo, Wi-Fi, vCard, and plain text payloads
- Never auto-opens URLs; the user reviews the result first
- Japanese / English UI
- No runtime network access in the built artifact

## Build

Run `build-standalone.bat` on Windows 10/11.

The first build downloads pinned `jsqr@1.4.0` from npm and embeds it into `dist/index.html`. Later builds reuse `.cache`.

```text
build-standalone.bat
```

Outputs:

- `dist/index.html` — self-contained distributable app
- `dist/dependency-manifest.json` — embedded dependency metadata and hashes

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. Enable **Settings → Pages → Source → GitHub Actions** once before deployment.

For camera access, an HTTPS environment such as GitHub Pages is recommended because browser security rules vary. Image scanning remains available without camera permission.

## Privacy

Camera frames, selected images, and decoded values stay in the browser. The built HTML uses CSP with `connect-src 'none'` to block runtime network requests.

## License

MIT License. QR decoding uses `jsQR` under Apache-2.0. See `THIRD_PARTY_NOTICES.md`.
