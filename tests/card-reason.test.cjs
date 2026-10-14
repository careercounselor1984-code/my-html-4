'use strict';
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),m=html.match(/"id":"p13","title":"[^"]+","b64":"([^"]+)"/);
const dom=new JSDOM(Buffer.from(m[1],'base64').toString('utf8'),{runScripts:'outside-only',url:'https://example.test/',pretendToBeVisual:true}),w=dom.window,d=w.document;
try{
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const script of d.querySelectorAll('script:not([src])'))w.eval(script.textContent);
 d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
 const by=id=>d.getElementById(id),presets=['general','certificate','practical','firstjob','careerchange','return','gap','recruitment','advanced','coursechange'];
 assert.equal(by('planWhyPreset').value,'general');assert.ok(by('planWhy').value.includes('직무 지식과 실무역량을 보완'));
 assert.ok(!by('planWhy').value.includes('시급'));assert.ok(!by('planWhy').value.includes('비전공자'));
 by('desiredJob').value='굴착기운전원';w.generate(false);assert.ok(by('planWhy').value.includes('굴착기운전원'));
 const all=new Set();
 for(const mode of ['issue','add','change']){
  by('mode').value=mode;w.onModeChange();
  for(const key of presets){
   by('planWhyPreset').value=key;w.onPlanWhyPresetChange();const text=by('planWhy').value;
   assert.ok(text.includes('굴착기운전원'),key+' job');assert.ok(by('allOut').value.includes(text),key+' output');
   if(mode==='issue')all.add(text);
   w.generate(true);assert.equal(by('planWhy').value,text,key+' selected reason preserved on force');
  }
 }
 assert.equal(all.size,10);
 by('planWhyPreset').value='certificate';w.onPlanWhyPresetChange();by('desiredJob').value='회계사무원';w.generate(false);assert.ok(by('planWhy').value.includes('회계사무원'));assert.ok(!by('planWhy').value.includes('굴착기운전원'));
 const manual='회계 실무와 ERP 활용능력 보완을 위한 실제 확인한 이유';by('planWhy').value=manual;w.onPlanWhyInput();assert.equal(by('planWhyPreset').value,'custom');assert.ok(by('allOut').value.includes(manual));
 by('desiredJob').value='생산직';by('mode').value='add';w.onModeChange();w.generate(true);assert.equal(by('planWhy').value,manual);
 by('planWhy').value='';w.onPlanWhyInput();w.generate(true);assert.equal(by('planWhy').value,'');
 // Also preserve restored text even if a saved preset is stale.
 by('planWhyPreset').value='general';by('planWhy').value='저장된 상담사 수정문구';w.generate(true);assert.equal(by('planWhy').value,'저장된 상담사 수정문구');assert.equal(by('planWhyPreset').value,'custom');
 by('planWhyPreset').value='general';w.onPlanWhyPresetChange();assert.ok(by('planWhy').value.includes('생산직 분야 취업에 필요한'));assert.ok(by('allOut').value.includes(by('planWhy').value));
 console.log('Card reason: deterministic default, 10 choices across issue/add/change, job sync, immediate output and manual/restored text preservation passed');
}finally{dom.window.close();}
