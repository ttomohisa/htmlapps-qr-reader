const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const html = fs.readFileSync(path.resolve(__dirname, '..', process.env.QR_TEST_HTML || 'src/index.template.html'), 'utf8');
for (const id of ['helpButton', 'mobileHelpButton']) {
  test(`${id} keeps the question-mark dot visible with a round line cap`, () => {
    const button = html.match(new RegExp(`<button\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/button>`));
    assert.ok(button, `${id} exists`);
    assert.match(button[1], /M12 17h\.01/, 'retain the question-mark dot geometry');
    assert.match(button[1], /<svg\b[^>]*stroke-linecap="round"/, 'the short dot stroke must have round caps');
  });
}
