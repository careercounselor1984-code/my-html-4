'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),m=html.match(/"id":"p13","title":"[^"]+","b64":"([^"]+)"/);
const chrome=['google-chrome','chromium','chromium-browser'].find(cmd=>cp.spawnSync('which',[cmd],{encoding:'utf8'}).status===0);assert.ok(chrome);
const scenario=`<script>window.addEventListener('DOMContentLoaded',()=>{try{
 const by=id=>document.getElementById(id),must=(x,m)=>{if(!x)throw Error(m)},set=(id,v,kind='input')=>{by(id).value=v;by(id).dispatchEvent(new Event(kind,{bubbles:true}));};
 must(by('planWhyPreset').value==='general','default');set('desiredJob','굴착기운전원');must(by('planWhy').value.includes('굴착기운전원'),'job');
 const texts=new Set();for(const opt of [...by('planWhyPreset').options].filter(o=>o.value!=='custom')){set('planWhyPreset',opt.value,'change');must(by('allOut').value.includes(by('planWhy').value),'output');texts.add(by('planWhy').value);const before=by('planWhy').value;generate(true);must(by('planWhy').value===before,'force preserves choice');}must(texts.size===10,'10 choices');
 set('planWhy','상담사가 직접 확인한 선택 이유');set('desiredJob','회계사무원');generate(true);must(by('planWhy').value==='상담사가 직접 확인한 선택 이유','preserve manual');must(by('allOut').value.includes('상담사가 직접 확인한 선택 이유'),'manual output');
 document.body.dataset.cardReasonTest='passed';}catch(e){document.body.dataset.cardReasonTest='failed';document.body.dataset.cardReasonError=e.message;}});</script>`;
const file=path.join(root,'.card-reason-smoke.html');fs.writeFileSync(file,Buffer.from(m[1],'base64').toString('utf8').replace('</body>',scenario+'</body>'));
try{const run=cp.spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=4000','--dump-dom','file://'+file],{cwd:root,encoding:'utf8',timeout:40000,maxBuffer:12*1024*1024});assert.equal(run.status,0);assert.ok(run.stdout.includes('data-card-reason-test="passed"'),'Chrome reason interaction: '+(run.stdout.match(/data-card-reason-error="([^"]*)/)?.[1]||'missing marker'));console.log('Card reason dropdown and editable output verified in Chrome');}finally{fs.rmSync(file,{force:true});}
