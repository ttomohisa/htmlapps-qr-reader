// Source/artifact contracts only. Native wheel/touch scrolling, focus, Escape,
// camera and viewport reachability require separate real-browser verification.
// Removing either root lock, using [open], or changing dialog geometry must fail.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const target = process.env.QR_TEST_HTML || 'src/index.template.html';
const html = fs.readFileSync(path.resolve(root, target), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(css, 'Application stylesheet exists');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
  selector: match[1].trim(), body: match[2].trim()
}));
const compact = value => value.replace(/\s+/g, '');

test('both page roots lock overflow only while a native modal exists', () => {
  for (const tag of ['html', 'body']) {
    const rule = rules.find(rule => rule.selector.split(',').map(value => value.trim()).includes(`${tag}:has(dialog:modal)`));
    assert.ok(rule, `${tag} needs a native-modal-only overflow rule`);
    assert.equal(compact(rule.body).replace(/;$/, ''), 'overflow:hidden', 'The fix changes root overflow only');
  }
});

test('scanner/reception root locks remain unchanged and non-modal dialogs add no lock', () => {
  const existingLocks = [];
  for (const rule of rules) {
    for (const selector of rule.selector.split(',').map(value => value.trim())) {
      if (/^(?:html|body)(?=[:\s.#[]|$)/.test(selector) && /(?:^|;)\s*(?:overflow(?:-[xy])?\s*:\s*(?:hidden|clip)|position\s*:\s*fixed)\b/.test(rule.body) && !/^(?:html|body):has\(dialog:modal\)$/.test(selector)) {
        existingLocks.push([selector, compact(rule.body)]);
      }
    }
  }
  assert.deepEqual(existingLocks, [["html", "width:100%;height:100%;overflow:hidden;background:#0b0e0d;overscroll-behavior:none;"], ["body", "width:100%;height:100%;overflow:hidden;background:#0b0e0d;overscroll-behavior:none;"]], 'Preserve existing mobile/reception locks without adding [open] or unconditional locks');
});

test('dialog outer geometry stays fixed while Help/result/history bodies shrink to their scroll area', () => {
  const geometry = rules.filter(rule => /dialog|#helpDialog|\.(?:result-body|confirm-body|confirm-actions)\b/.test(rule.selector) && !rule.selector.includes(':has(dialog:modal)'))
    .map(rule => [compact(rule.selector), compact(rule.body)]);
  assert.deepEqual(geometry, [
  [
    "dialog",
    "padding:0;border:1pxsolidvar(--line);border-radius:17px;background:var(--surface);color:var(--text);box-shadow:var(--shadow-md);"
  ],
  [
    "dialog::backdrop",
    "background:rgba(15,17,14,.54);backdrop-filter:blur(4px);"
  ],
  [
    ".dialog-header",
    "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px18px;border-bottom:1pxsolidvar(--line);"
  ],
  [
    ".dialog-headerh2",
    "margin:0;font-size:17px;"
  ],
  [
    ".dialog-close",
    "display:grid;place-items:center;width:36px;height:36px;border:0;background:transparent;border-radius:10px;cursor:pointer;"
  ],
  [
    ".dialog-close:hover",
    "background:var(--surface-hover);"
  ],
  [
    ".dialog-closesvg",
    "width:19px;height:19px;"
  ],
  [
    ".help-dialog",
    "width:min(640px,calc(100%-28px));max-height:min(780px,calc(100dvh-28px));overflow:hidden;"
  ],
  ["#helpDialog[open]", "display:flex;flex-direction:column;"],
  ["#helpDialog.dialog-header", "flex:00auto;"],
  ["#helpDialog.dialog-body", "flex:11auto;min-height:0;max-height:none;overflow:auto;overscroll-behavior:contain;"],
  [
    ".dialog-body",
    "padding:20px20px28px;overflow:auto;max-height:calc(100dvh-100px);"
  ],
  [
    ".dialog-bodyh3",
    "margin:24px07px;padding-top:18px;border-top:1pxsolidvar(--line);font-size:14px;"
  ],
  [
    ".dialog-bodyh3:first-child",
    "margin-top:0;padding-top:0;border-top:0;"
  ],
  [
    ".dialog-bodyp,.dialog-bodyli",
    "color:var(--muted);font-size:13px;line-height:1.72;"
  ],
  [
    ".dialog-note",
    "padding:11px12px;border-radius:10px;background:var(--surface-muted);"
  ],
  [
    ".history-dialog",
    "width:min(680px,calc(100%-24px));max-height:min(760px,calc(100dvh-24px));overflow:hidden;"
  ],
  [
    ".history-dialog-body",
    "overflow:hidden;"
  ],
  [
    ".history-dialog.history-list",
    "max-height:calc(100dvh-182px);"
  ],
  [
    ".result-dialog",
    "width:min(560px,calc(100%-24px));max-height:min(720px,calc(100dvh-24px));overflow:hidden;"
  ],
  [
    ".result-body",
    "padding:19px;overflow:auto;max-height:calc(100dvh-86px);"
  ],
  ["#resultDialog.dialog-header,#historyDialog.dialog-header", "flex:00auto;"],
  ["#resultDialog.result-body,#historyDialog.history-dialog-body", "flex:11auto;min-height:0;max-height:none;overflow:auto;"],
  [
    ".confirm-dialog",
    "width:min(420px,calc(100%-24px));max-width:100%;overflow:hidden;"
  ],
  [
    ".confirm-dialog.dialog-header",
    "padding-bottom:13px;"
  ],
  [
    ".confirm-body",
    "padding:18px;"
  ],
  [
    ".confirm-actions",
    "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:18px;"
  ],
  [
    ".result-dialog,.history-dialog",
    "width:100%;max-width:none;max-height:min(78dvh,720px);margin:auto00;border-width:1px00;border-radius:22px22px00;"
  ],
  [
    ".result-dialog::backdrop,.history-dialog::backdrop,.confirm-dialog::backdrop",
    "background:rgba(0,0,0,.42);backdrop-filter:blur(2px);"
  ],
  [
    ".result-body",
    "padding:18px17pxcalc(env(safe-area-inset-bottom)+19px);"
  ],
  [
    ".history-dialog.history-list",
    "max-height:calc(78dvh-154px);"
  ],
  [
    ".history-dialog-body",
    "padding-bottom:env(safe-area-inset-bottom);"
  ],
  [
    ".confirm-dialog",
    "width:100%;max-width:none;margin:auto00;border-width:1px00;border-radius:22px22px00;"
  ],
  [
    ".confirm-dialog.dialog-header",
    "padding:14px18px12px;"
  ],
  [
    ".confirm-body",
    "padding:12px18pxcalc(env(safe-area-inset-bottom)+18px);"
  ],
  [
    ".confirm-actions",
    "grid-template-columns:1fr;gap:10px;margin-top:16px;"
  ],
  [
    ".confirm-actions.result-button",
    "min-height:48px;font-size:14px;"
  ]
]);
});

test('the existing local-processing badge uses only a decorative shield', () => {
  const badges = [...html.matchAll(/<div class="local-badge">([\s\S]*?)<\/div>/g)];
  assert.equal(badges.length, 1, 'Keep exactly the existing badge');
  const badge = badges[0][1];
  assert.match(badge, /<svg[^>]*aria-hidden="true"/);
  assert.match(badge, /d="M12 3 4 6v5c0 5 3\.4 8\.7 8 10 4\.6-1\.3 8-5 8-10V6l-8-3Z"/);
  assert.doesNotMatch(badge, /<rect\b|href="#i-lock"/, 'The old padlock is absent from this badge');
  assert.match(badge, /完全ローカル処理/);
});

test('Japanese and English Help explain close routes without layout commentary', () => {
  const help = html.match(/<dialog class="help-dialog"[\s\S]*?<\/dialog>/)?.[0];
  assert.match(help || '', /data-i18n="helpDialogScroll"/);
  const translationsText = html.match(/const translations = (\{[\s\S]*?\n      \});/)?.[1];
  assert.ok(translationsText, 'Real translation object remains');
  const translations = vm.runInNewContext(`(${translationsText})`);
  assert.doesNotMatch(translations.ja.helpDialogScroll, /背景.*スクロール/);
  assert.match(translations.ja.helpDialogScroll, /閉じる.*Esc.*外側/);
  assert.doesNotMatch(translations.en.helpDialogScroll, /background.*scroll/i);
  assert.match(translations.en.helpDialogScroll, /Close.*Esc.*outside/);
});
