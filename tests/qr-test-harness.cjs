// Execute real app functions and its pinned embedded decoder; browser boundaries are local substitutes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const released = fs.readFileSync(path.join(root, 'qr-reader.html'), 'utf8');
const bundle64 = released.match(/const EMBEDDED_ASSET_BUNDLE_BASE64 = '([^']+)'/)[1];
const bundle = JSON.parse(Buffer.from(bundle64, 'base64'));
const decoderCode = Buffer.from(bundle.dependencies.jsqr.assets.main.base64, 'base64').toString('utf8');
const decoderContext = {module:{exports:{}},exports:{},Uint8ClampedArray,Uint8Array,Int32Array,Uint32Array,Float64Array};
vm.createContext(decoderContext); vm.runInContext(decoderCode, decoderContext);
const decoder = decoderContext.module.exports;
assert.equal(typeof decoder, 'function');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/qr-images.json'), 'utf8')).fixtures;
function pixels(fixture) {
  const scale = 8, quiet = 4, width = (fixture.matrix.length + quiet*2)*scale;
  const data = new Uint8ClampedArray(width*width*4).fill(255);
  fixture.matrix.forEach((row,y)=>row.forEach((dark,x)=>{
    if (!dark) return;
    for(let sy=0;sy<scale;sy++) for(let sx=0;sx<scale;sx++) {
      const offset = (((y+quiet)*scale+sy)*width+(x+quiet)*scale+sx)*4;
      data[offset]=data[offset+1]=data[offset+2]=0;
    }
  }));
  return {width,height:width,data,type:'image/png',name:'synthetic.png'};
}
const images = fixtures.map(pixels);
for(let i=0;i<images.length;i++) {
  const img=images[i]; assert.equal(decoder(img.data,img.width,img.height,{inversionAttempts:'attemptBoth'}).data,fixtures[i].payload);
}
function fixture(htmlPath, options = {}) {
  const html = fs.readFileSync(path.join(root,htmlPath),'utf8');
  const nodes = new Map(), storage = new Map(), logs = [], timers = new Map();
  let currentTime = 100000, id=0, bitmapCloses=0, decoderCalls=0, cameraCalls=0, openCalls=0, objectUrlCreates=0, objectUrlRevokes=0;
  const objectFiles = new Map();
  class Element {
    constructor(tag='div',attrs={}) {
      this.tagName=tag.toUpperCase();this.attrs=attrs;this.listeners={};this.children=[];this.style={setProperty(){}};
      this.isContentEditable=false;this.value='';this.textContent='';this.open=false;this.disabled=false;this.width=300;this.height=150;
      this.dataset=Object.fromEntries(Object.entries(attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]));
      this.classes=new Set((attrs.class||'').split(/\s+/));
      this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),contains:v=>this.classes.has(v),toggle:(v,on)=>{if(on??!this.classes.has(v))this.classes.add(v);else this.classes.delete(v);}};
    }
    addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}
    emit(k,event={}){return Promise.all((this.listeners[k]||[]).map(fn=>fn({target:this,preventDefault(){},stopPropagation(){},...event})));}
    append(...children){this.children.push(...children);children.forEach(c=>c.parentElement=this);}
    replaceChildren(...children){this.children=[];this.append(...children);}
    setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]??null;}
    play(){return Promise.resolve();} focus(){document.activeElement=this;} select(){} remove(){} click(){return this.emit('click');}
    showModal(){this.open=true;} close(){this.open=false;this.emit('close');}
    getBoundingClientRect(){return {left:0,top:0,right:400,bottom:800};}
    getContext(){const canvas=this;return {drawImage(bitmap){canvas.pixels=bitmap.data;},getImageData(){return {data:canvas.pixels,width:canvas.width,height:canvas.height};}};}
  }
  for(const match of html.slice(0,html.indexOf('<script>')).matchAll(/<([\w-]+)\b([^>]*)>/g)) {
    const attrs={};for(const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[a[1]]=a[2]||'';
    if(attrs.id) nodes.set('#'+attrs.id,new Element(match[1],attrs));
  }
  const document={body:new Element('body'),head:new Element('head'),documentElement:new Element('html'),hidden:false,activeElement:null,listeners:{},querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),createTextNode:text=>({textContent:text}),addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);},emit(k,event){return Promise.all((this.listeners[k]||[]).map(fn=>fn(event)));},execCommand:()=>false};
  class FakeDate extends Date {constructor(...args){super(...(args.length?args:[currentTime]));}static now(){return currentTime;}}
  const context={document,Date:FakeDate,Intl,TextDecoder,TextEncoder,Uint8Array,Uint8ClampedArray,Blob,URL:{createObjectURL(file){const url=`blob:synthetic-${++objectUrlCreates}`;objectFiles.set(url,file);return url;},revokeObjectURL(url){objectFiles.delete(url);objectUrlRevokes++;}},atob:s=>Buffer.from(s,'base64').toString('binary'),console:{error:e=>logs.push(String(e)),warn:e=>logs.push(String(e))},crypto:{randomUUID:()=>String(++id)},setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:i=>timers.delete(i),requestAnimationFrame:()=>1,cancelAnimationFrame(){},matchMedia:()=>({matches:true}),HTMLMediaElement:{HAVE_CURRENT_DATA:2},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},navigator:{language:options.language||'en',mediaDevices:{getUserMedia(){cameraCalls++;throw Error('FORBIDDEN: real camera');}},clipboard:{writeText:async()=>{},read(){throw Error('FORBIDDEN clipboard read');},readText(){throw Error('FORBIDDEN clipboard readText');}}},testDecoder:(...args)=>{decoderCalls++;return decoder(...args);}};
  context.createImageBitmap=async file=>{if(options.bitmapGate)await options.bitmapGate;if(file.invalid)throw Error('Synthetic image decode failure');return {...file,close(){bitmapCloses++;}};};
  context.window={createImageBitmap:context.createImageBitmap,addEventListener(){},open(){openCalls++;throw Error('FORBIDDEN: URL opening');},location:{set href(v){throw Error('FORBIDDEN: navigation');}}};
  if (options.imageFallback) {
    delete context.window.createImageBitmap;
    context.Image = class {
      async decode() {
        const file = objectFiles.get(this.src);
        if (file.invalid) throw Error('Synthetic image decode failure');
        this.naturalWidth = file.width; this.naturalHeight = file.height; this.data = file.data;
      }
    };
  }
  let code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  code=code.replace('__APP_CONFIG_JSON__',fs.readFileSync(path.join(root,'app.config.json'),'utf8')).replace('__BUILD_MANIFEST_JSON__','{}').replace('__EMBEDDED_ASSET_BUNDLE_BASE64__',bundle64);
  assert.equal((code.match(/      boot\(\);/g)||[]).length,1);
  code=code.replace('      boot();',`jsQrDecoder = globalThis.testDecoder; globalThis.api = {scanImageFile, showResult, closeResult, classifyPayload, renderHistory, addHistory, t, scanLoop, startCamera, setNativeDetector(value){nativeDetector=value;}, enableCamera(){stream={};video.readyState=2;video.data=globalThis.cameraPixels;}, get state(){return {scanningPaused, currentResult, history, lastDetection};}};`);
  context.cameraPixels=images[1].data; vm.createContext(context);vm.runInContext(code,context);
  return {api:context.api,Element,context,node:s=>nodes.get(s),document,storage,logs,time(value){currentTime=value;},flushTimers(){for(const [key,fn] of timers){timers.delete(key);fn();}},get metrics(){return {bitmapCloses,decoderCalls,cameraCalls,openCalls,objectUrlCreates,objectUrlRevokes};}};
}

module.exports = { fixture, images, fixtures, decoderCode, bundle, root };
