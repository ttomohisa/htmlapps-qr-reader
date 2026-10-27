const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, process.env.QR_TEST_HTML || 'src/index.template.html'), 'utf8');
test('camera header retains a separate visible current-version slot', () => {
  assert.match(html, /<div class="mobile-camera-title"><span id="mobileTitle">[^<]+<\/span><span class="version-badge" id="mobileVersionBadge"><\/span><\/div>/);
  assert.match(html, /\$\('#mobileVersionBadge'\)\.textContent = `v\$\{APP_CONFIG\.version\}`/);
  assert.match(html, /\.mobile-camera-title \.version-badge\s*\{[^}]*flex:\s*0 0 auto/);
  assert.match(html, /#mobileTitle\s*\{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/);
});
