'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('journal-workspace.js','utf8');new vm.Script(source);
const start=html.indexOf('const PAGES = ')+'const PAGES = '.length,pages=JSON.parse(html.slice(start,html.indexOf(';\n',start)));
for(const id of ['p01','p02','p03','p04','p07','p13']){
 const raw=Buffer.from(pages.find(p=>p.id===id).b64,'base64').toString('utf8'),script=raw.match(/<script id="clg-iap-optional-link-script-[^"]+">([\s\S]*?)<\/script>/)[1];
 const map=JSON.parse(script.match(/const MAP=(\{[^;]+\});/)[1]),a=script.indexOf('function saveCommon()'),b=script.indexOf('function makeCard()',a);
 assert(a>=0&&b>a);const state={TEST:{regNo:'TEST',unrelated:'preserve'}},els={};for(const [key,field]of Object.entries(map)){state.TEST[key]='기존값';els[field]={type:'text',value:''}}
 const save=new Function('byId','db','put','reg','status','PAGE_ID','MAP',script.slice(script.indexOf('function getVal('),script.indexOf('function setVal('))+script.slice(a,b)+';return saveCommon;')(id=>els[id],()=>state,()=>{},()=> 'TEST',()=>{},id,map);
 save();for(const key of Object.keys(map))assert.equal(state.TEST[key],'','explicit blank clears old value on '+id);assert.equal(state.TEST.unrelated,'preserve');
}
const tabs=html.match(/<script id="clg-multi-work-tabs-v1-script">([\s\S]*?)<\/script>/)[1];
const a=tabs.indexOf('function parseSavedTabState('),b=tabs.indexOf('\n  function readTabLayout()',a),parse=new Function('return ('+tabs.slice(a,b).trim()+')')();
const now=Date.now(),saved={version:2,pages:['p01','p05'],draftIds:['draft-A','draft-B'],savedAt:now,activeIndex:1};const parsed=parse(JSON.stringify(saved),['p01','p05'],6,now);assert.deepEqual(parsed.draftIds,['draft-A','draft-B']);assert.equal(parsed.activeIndex,1);saved.draftIds=['<script>','draft-B'];assert.equal(parse(JSON.stringify(saved),['p01','p05'],6,now).draftIds[0],'');
assert(html.includes('window.clgWorkspaceState={collect:collectIapState,apply:applyIapState}')===false,'IAP bridge stays inside encoded page, not outer globals');
const iap=Buffer.from(pages.find(p=>p.id==='p05').b64,'base64').toString('utf8');assert(iap.includes('window.clgWorkspaceState={collect:collectWorkspaceIapDraft,apply:applyWorkspaceIapDraft,reset:clearAll}'),'IAP drafts use native row serialization');
assert(iap.includes('loadedRegNo:iapLoadedRegNo,fingerprint:iapLoadedStateFingerprint'),'draft keeps the original optimistic-lock baseline');
console.log('PASS: blank updates across six common-profile forms, unrelated fields preserved, stable draft IDs and IAP row-state adapter');
