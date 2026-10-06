const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fixture, images, fixtures, decoderCode, bundle, root } = require('./qr-test-harness.cjs');
const variants = process.env.QR_TEST_HTML ? [process.env.QR_TEST_HTML] : ['src/index.template.html', 'qr-reader.html', 'dist/index.html'];
const blank = {type:'image/png',width:264,height:264,data:new Uint8ClampedArray(264*264*4).fill(255)};
const tick = () => new Promise(resolve => setImmediate(resolve));
function paste(h, {items, files, target=h.document.body, defaultPrevented=false, ...extra}={}) {
  const event={target,defaultPrevented,clipboardData:{items:items ?? [],files:files ?? [],getData(){throw Error('Text must not be consumed');}},preventDefault(){this.defaultPrevented=true;},...extra};
  return {event,done:h.document.emit('paste',event)};
}
const imageItem = file => ({kind:'file',type:'image/png',getAsFile:()=>file});
function deferred() {let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
for (const html of variants) {
  test(`${html}: pinned decoder and network-blocking CSP remain intact`, () => {
    assert.equal(bundle.dependencies.jsqr.version,'1.4.0');
    assert.equal(crypto.createHash('sha256').update(decoderCode).digest('hex'),'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859');
    const source=fs.readFileSync(path.join(root,html),'utf8');
    if (html !== 'src/index.template.html') {
      const encoded=source.match(/const EMBEDDED_ASSET_BUNDLE_BASE64 = '([^']+)'/)[1];
      const embedded=JSON.parse(Buffer.from(encoded,'base64'));
      const bytes=Buffer.from(embedded.dependencies.jsqr.assets.main.base64,'base64');
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859');
      const normalize=value=>value.replace(/const (APP_CONFIG|BUILD_MANIFEST|EMBEDDED_ASSET_BUNDLE_BASE64) = [^\n]+/g,'const $1 = metadata;');
      assert.equal(normalize(source),normalize(fs.readFileSync(path.join(root,'src/index.template.html'),'utf8')));
    }
    assert.match(source,/connect-src 'none'/);assert.doesNotMatch(source,/navigator\.clipboard\.(?:read|readText)\s*\(/);
  });
  for (const elapsed of [0,500,1799,1800]) test(`${html}: same manual image reopens after ${elapsed} ms`, async () => {
    const h=fixture(html);await h.api.scanImageFile(images[0]);h.api.closeResult();h.time(100000+elapsed);
    await h.api.scanImageFile(images[0]);
    assert.equal(h.node('#resultDialog').open,true);assert.equal(h.node('#resultValue').textContent,fixtures[0].payload);
    assert.equal(h.api.state.history.length,1);h.api.closeResult();assert.equal(h.api.state.scanningPaused,false);
    assert.equal(h.metrics.bitmapCloses,2);
  });
  test(`${html}: camera cooldown keeps its exact 1800 ms boundary`, () => {
    const h=fixture(html);h.api.showResult('camera value','camera');h.api.closeResult();h.time(101799);
    h.api.showResult('camera value','camera');assert.equal(h.node('#resultDialog').open,false);assert.equal(h.api.state.scanningPaused,false);
    h.time(101800);h.api.showResult('camera value','camera');assert.equal(h.node('#resultDialog').open,true);
  });
  test(`${html}: history deduplication keeps 4000 ms boundary and 200-entry cap`, () => {
    const h=fixture(html);h.api.addHistory('same','image');h.time(103999);h.api.addHistory('same','image');assert.equal(h.api.state.history.length,1);
    h.time(107999);h.api.addHistory('same','image');assert.equal(h.api.state.history.length,2);
    for(let i=0;i<210;i++)h.api.addHistory(`value ${i}`,'image');assert.equal(h.api.state.history.length,200);assert.equal(h.api.state.history[0].data,'value 209');
  });
  test(`${html}: explicit image paste decodes locally and keeps manual rescan usable`, async () => {
    const h=fixture(html);const p=paste(h,{items:[imageItem(images[0])]});assert.equal(p.event.defaultPrevented,true);await p.done;
    assert.equal(h.node('#resultValue').textContent,fixtures[0].payload);assert.equal(h.api.state.currentResult.source,'image');h.api.closeResult();
    const again=paste(h,{items:[imageItem(images[0])]});await again.done;assert.equal(h.node('#resultDialog').open,true);
    h.api.closeResult();assert.equal(h.api.state.scanningPaused,false);assert.equal(h.metrics.cameraCalls,0);assert.equal(h.metrics.openCalls,0);
  });
  test(`${html}: accepts first usable image only and supports files-only clipboard`, async () => {
    const h=fixture(html);const p=paste(h,{items:[imageItem(null),imageItem(images[0]),imageItem(images[1])],files:[images[1]]});await p.done;
    assert.equal(p.event.defaultPrevented,true);assert.equal(h.node('#resultValue').textContent,fixtures[0].payload);assert.equal(h.metrics.decoderCalls,1);h.api.closeResult();
    const fallback=paste(h,{files:[images[1]]});await fallback.done;assert.equal(h.node('#resultValue').textContent,fixtures[1].payload);
  });
  test(`${html}: text, unsupported, null and consumed paste remain untouched`, async () => {
    const h=fixture(html);
    for(const args of [{items:[{kind:'string',type:'text/plain',getAsString(){throw Error('must not consume text');}}]}, {files:[{type:'application/pdf'}]}, {items:[imageItem(null)]}, {clipboardData:null}, {items:[imageItem(images[0])],defaultPrevented:true}]) {
      const p=paste(h,args);await p.done;assert.equal(p.event.defaultPrevented,!!args.defaultPrevented);
    }
    assert.equal(h.metrics.decoderCalls,0);assert.equal(h.api.state.scanningPaused,false);
  });
  test(`${html}: editable targets, active controls and open dialogs keep their paste`, async () => {
    const h=fixture(html);
    const editable=new h.Element();editable.isContentEditable=true;
    for(const target of [new h.Element('input'),new h.Element('textarea'),new h.Element('select'),editable]) {
      const p=paste(h,{items:[imageItem(images[0])],target});await p.done;assert.equal(p.event.defaultPrevented,false);
    }
    h.document.activeElement=new h.Element('input');let p=paste(h,{items:[imageItem(images[0])]});await p.done;assert.equal(p.event.defaultPrevented,false);h.document.activeElement=null;
    p=paste(h,{items:[imageItem(images[0])],composedPath:()=>[editable,h.document.body]});await p.done;assert.equal(p.event.defaultPrevented,false);
    for(const id of ['#resultDialog','#helpDialog','#historyDialog','#confirmDialog']) {h.node(id).open=true;p=paste(h,{items:[imageItem(images[0])]});await p.done;assert.equal(p.event.defaultPrevented,false);h.node(id).open=false;}
    assert.equal(h.metrics.decoderCalls,0);
  });
  test(`${html}: concurrent manual inputs leave first image in control`, async () => {
    const gate=deferred(),h=fixture(html,{bitmapGate:gate.promise});const first=paste(h,{items:[imageItem(images[0])]});
    const second=paste(h,{items:[imageItem(images[1])]});assert.equal(second.event.defaultPrevented,false);
    const picker=h.api.scanImageFile(images[1]);gate.resolve();await picker;await first.done;await second.done;
    assert.equal(h.node('#resultValue').textContent,fixtures[0].payload);assert.equal(h.metrics.bitmapCloses,1);assert.equal(h.metrics.decoderCalls,1);
  });
  test(`${html}: blank, corrupt and canceled manual images recover`, async () => {
    const h=fixture(html);await h.api.scanImageFile(undefined);assert.equal(h.metrics.decoderCalls,0);assert.equal(h.api.state.scanningPaused,false);
    for(const file of [blank,{type:'image/png',invalid:true}]) {const p=paste(h,{items:[imageItem(file)]});await p.done;assert.equal(p.event.defaultPrevented,true);assert.equal(h.node('#resultDialog').open,false);assert.equal(h.api.state.scanningPaused,false);}
    assert.equal(h.metrics.bitmapCloses,1);assert.equal(h.node('#toast').textContent,'Could not read the image');
    await h.api.scanImageFile(images[0]);assert.equal(h.node('#resultDialog').open,true);
  });
  test(`${html}: safe and unsafe QR payloads display without navigation`, async () => {
    const h=fixture(html);for(const index of [2,3]) {const p=paste(h,{items:[imageItem(images[index])]});await p.done;assert.equal(h.node('#resultValue').textContent,fixtures[index].payload);assert.equal(h.node('#openResultButton').classList.contains('hidden'),index===3);h.api.closeResult();}
    assert.equal(h.metrics.openCalls,0);assert.equal(h.metrics.cameraCalls,0);
  });
  for (const manual of [images[0],blank]) test(`${html}: in-flight camera decoding cannot supersede a manual image (${manual===blank?'blank':'QR'})`, async () => {
    const gate=deferred(),h=fixture(html);let calls=0;
    h.api.setNativeDetector({detect:()=>++calls===1?gate.promise:Promise.resolve([])});h.api.enableCamera();
    const camera=h.api.scanLoop(1000);await tick();
    const p=paste(h,{items:[imageItem(manual)]});await p.done;
    if(manual!==blank)h.api.closeResult();
    gate.resolve([{rawValue:'stale camera frame'}]);await camera;
    assert.equal(h.node('#resultDialog').open,false);
    assert.equal(h.api.state.history.some(item=>item.data==='stale camera frame'),false);
    assert.equal(h.api.state.scanningPaused,false);
  });
  test(`${html}: result dismissal cannot unpause an active image job`, async () => {
    const gate=deferred(),h=fixture(html,{bitmapGate:gate.promise});const scan=h.api.scanImageFile(images[0]);
    h.api.closeResult();assert.equal(h.api.state.scanningPaused,true);gate.resolve();await scan;
    assert.equal(h.node('#resultDialog').open,true);h.api.closeResult();assert.equal(h.api.state.scanningPaused,false);
  });
  test(`${html}: failed image keeps an already open result paused`, async () => {
    const h=fixture(html);h.api.showResult('existing result','camera');await h.api.scanImageFile(blank);
    assert.equal(h.node('#resultDialog').open,true);assert.equal(h.api.state.scanningPaused,true);
    h.api.closeResult();assert.equal(h.api.state.scanningPaused,false);
  });
  test(`${html}: fallback image decoder revokes every local object URL`, async () => {
    const h=fixture(html,{imageFallback:true});for(const file of [images[0],blank,{invalid:true,type:'image/png'}]) {
      const p=paste(h,{items:[imageItem(file)]});await p.done;h.api.closeResult();
    }
    assert.equal(h.metrics.objectUrlCreates,3);assert.equal(h.metrics.objectUrlRevokes,3);assert.equal(h.metrics.bitmapCloses,0);
    assert.equal(h.api.state.scanningPaused,false);
  });
  for(const pendingImage of [false,true]) test(`${html}: camera startup preserves ${pendingImage?'pending image':'open image result'} pause`, async () => {
    const cameraGate=deferred(),imageGate=deferred(),h=fixture(html,pendingImage?{bitmapGate:imageGate.promise}:{});
    h.context.navigator.mediaDevices.getUserMedia=()=>cameraGate.promise;
    h.context.navigator.mediaDevices.enumerateDevices=async()=>[];
    const startup=h.api.startCamera();await tick();
    const p=paste(h,{items:[imageItem(images[0])]});
    if(!pendingImage)await p.done;
    cameraGate.resolve({getTracks:()=>[],getVideoTracks:()=>[]});await startup;
    assert.equal(h.api.state.scanningPaused,true);
    if(pendingImage){imageGate.resolve();await p.done;}
    h.node('#video').readyState=2;
    h.api.setNativeDetector({detect:async()=>[{rawValue:'camera must not replace result'}]});
    await h.api.scanLoop(1000);
    assert.equal(h.node('#resultValue').textContent,fixtures[0].payload);
    assert.equal(h.node('#resultDialog').open,true);assert.equal(h.api.state.history.length,1);
    h.api.closeResult();assert.equal(h.api.state.scanningPaused,false);
  });
  test(`${html}: paste help is available in Japanese and English`, () => {
    assert.match(fixture(html).api.t('helpStep2'),/paste/i);assert.match(fixture(html,{language:'ja'}).api.t('helpStep2'),/貼り付け/);
  });
}
