// Exercise the actual validation plan and child-process failure handling without
// running nested tests. Child environments are copied, never assigned globally.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function runner() {
  const file = path.join(root, 'scripts/test-regressions.cjs');
  assert.ok(fs.existsSync(file), 'The canonical regression runner exists');
  return require(file);
}
test('canonical plan covers every source test and both release copies', () => {
  const { makePlan } = runner();
  const plan = makePlan();
  const files = fs.readdirSync(path.join(root, 'tests')).filter(file => /\.test\.(?:cjs|mjs)$/.test(file)).sort();
  assert.deepEqual(plan[0].args.slice(1), files.map(file => path.join(root, 'tests', file)));
  assert.equal(plan[0].args[0], '--test');
  assert.equal(plan[0].env.QR_TEST_HTML, 'src/index.template.html');
  for (const target of ['dist/index.html', 'qr-reader.html']) {
    const steps = plan.filter(step => step.env.QR_TEST_HTML === target);
    assert.ok(steps.length > 0, target + ': artifact gate exists');
    assert.ok(steps.some(step => step.args.some(arg => arg.endsWith('modal-scroll.test.cjs'))));
    assert.ok(steps.some(step => step.args.some(arg => arg.endsWith('qr-reader.test.cjs'))));
  }
  assert.equal(makePlan({ sourceOnly: true }).length, 1);
});
test('canonical runner preserves caller environment even on failure', () => {
  const { makePlan, runSteps } = runner();
  const before = { ...process.env };
  const caller = { SENTINEL: 'keep', QR_TEST_HTML: 'unexpected-selection.html' };
  const plan = makePlan({ env: caller });
  const calls = [];
  const spawn = (...args) => { calls.push(args); return { status: 7 }; };
  assert.equal(runSteps(plan, spawn), 7);
  assert.equal(calls.length, 1, 'Stop on the first failed validation step');
  assert.equal(calls[0][2].cwd, root);
  assert.equal(calls[0][2].env.QR_TEST_HTML, 'src/index.template.html');
  assert.equal(calls[0][2].env.SENTINEL, 'keep');
  assert.deepEqual(caller, { SENTINEL: 'keep', QR_TEST_HTML: 'unexpected-selection.html' });
  assert.deepEqual({ ...process.env }, before);
});
test('spawn errors and signal termination cannot be reported as success', () => {
  const { makePlan, runSteps } = runner();
  assert.throws(() => runSteps(makePlan(), () => ({ error: new Error('Synthetic spawn failure') })), /Synthetic spawn failure/);
  assert.equal(runSteps(makePlan(), () => ({ status: null, signal: 'SIGTERM' })), 1);
});

test('repository validation and both workflows require the canonical gate', () => {
  const check = fs.readFileSync(path.join(root, 'scripts/check-repository.ps1'), 'utf8');
  assert.match(check, /& node \(Join-Path \$Root 'scripts\/test-regressions\.cjs'\)/);
  assert.match(check, /if \(\$LASTEXITCODE -ne 0\) \{ throw/);
  for (const name of ['deploy-pages.yml', 'preview.yml']) {
    const yaml = fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8');
    assert.match(yaml, /actions\/setup-node@/);
    assert.match(yaml, /run: \.\/scripts\/check-repository\.ps1/);
  }
});

function assertPreviewArtifact(yaml) {
  const block = yaml.match(/      - name: Upload standalone build artifact\n([\s\S]*?)(?=\n      - name:|$)/)?.[0];
  assert.ok(block, 'PR validation must preserve its official build artifacts');
  assert.match(block, /uses: actions\/upload-artifact@v7/);
  assert.match(block, /name: qr-reader-\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(block, /path: \|\n            dist\/index\.html\n            dist\/dependency-manifest\.json\n            dist\/\.nojekyll\n/);
  assert.match(block, /include-hidden-files: true/, 'The explicitly listed .nojekyll must be included');
  assert.match(block, /if-no-files-found: error/);
  assert.match(block, /retention-days: 14/);
  assert.doesNotMatch(block, /^\s*(?:if|continue-on-error):/m, 'Use the default success condition without hiding failures');
  assert.ok(yaml.indexOf(block) > yaml.indexOf('run: ./scripts/check-repository.ps1'), 'Upload only after successful build and validation');
  assert.ok(yaml.indexOf(block) < yaml.indexOf('- name: Check Cloudflare preview credentials'), 'Preserve official build bytes independently of preview credentials');
}
test('PR validation preserves official build bytes under the exact PR head SHA', () => {
  assertPreviewArtifact(fs.readFileSync(path.join(root, '.github/workflows/preview.yml'), 'utf8'));
});
test('PR artifact contract rejects missing upload, wrong commit, missing file and ignored errors', () => {
  const yaml = fs.readFileSync(path.join(root, '.github/workflows/preview.yml'), 'utf8');
  assertPreviewArtifact(yaml);
  const mutations = [
    yaml.replace('name: Upload standalone build artifact', 'name: Missing artifact gate'),
    yaml.replace('name: qr-reader-${{ github.event.pull_request.head.sha }}', 'name: qr-reader-${{ github.sha }}'),
    yaml.replace('            dist/dependency-manifest.json\n', ''),
    yaml.replace('if-no-files-found: error', 'if-no-files-found: warn'),
    yaml.replace('          include-hidden-files: true\n', ''),
    yaml.replace('        uses: actions/upload-artifact@v7', '        continue-on-error: true\n        uses: actions/upload-artifact@v7')
  ];
  for (const mutation of mutations) {
    assert.notEqual(mutation, yaml, 'Each mutation changes the artifact contract');
    assert.throws(() => assertPreviewArtifact(mutation));
  }
});
