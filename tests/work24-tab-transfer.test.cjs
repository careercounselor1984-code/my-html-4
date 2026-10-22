'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const bridge=html.match(/<script id="clg-work24-counsel-bridge-v113-script">([\s\S]*?)<\/script>/)?.[1];
assert(bridge,'Work24 bridge script exists');
new vm.Script(bridge);
const start=bridge.indexOf('  function withTargetPage('),end=bridge.indexOf('  function applyBasic(',start);
assert(start>0&&end>start,'tab-safe target page helper exists');
const helper=bridge.slice(start,end);
function testTab(initialReady){
  const events={};const messages=[];let calls=0,opened=0,intervals=0;
  const doc={readyState:initialReady?'complete':'loading',getElementById:id=>id==='sudang-form'?{}:null};
  const frame={dataset:{pageId:'p06'},contentDocument:doc,contentWindow:{},
    addEventListener(name,cb){events[name]=cb},removeEventListener(name){delete events[name]}};
  const ctx={
    window:{loadPage(id){assert.equal(id,'p06');opened++;return{frame}}},
    $:()=>frame,showMessage:message=>messages.push(message),
    setInterval(){intervals++;return 123},clearInterval(){},Event:function(){}
  };
  vm.runInNewContext(helper+';withTargetPage("p06","sudang-form",()=>{globalCall()});',{...ctx,globalCall:()=>calls++});
  assert.equal(opened,1);assert.equal(intervals,1);
  if(!initialReady){assert.equal(calls,0);doc.readyState='complete';events.load();}
  assert.equal(calls,1);
  assert.equal(events.load,undefined);
  assert.deepEqual(messages,[]);
}
testTab(true); // previously opened tab: no iframe load event
testTab(false); // fresh tab: load event follows navigation
assert(bridge.includes("withTargetPage('p06','sudang-form'"),'allowance uses reusable tab');
assert(bridge.includes("withTargetPage('p11','company'"),'termination uses reusable tab');
assert(bridge.includes("withTargetPage(pageId,'counselingDate'"),'basic info uses reusable tab');
assert(bridge.includes('if(count>0&&periodOk&&roundOk)'),'pending data cleared only after verified round and dates');
assert(bridge.includes('supportApplied!==support.rows.length||activityApplied!==activities.length'),'program row counts are verified before acknowledging');
const pages=JSON.parse(html.match(/const PAGES = (\[.*?\]);/s)[1]);
const p06=Buffer.from(pages.find(p=>p.id==='p06').b64,'base64').toString();
for(const id of ['sudang-form','round','startDate','endDate','designationDate'])assert(p06.includes('id="'+id+'"'),'p06 field '+id);
console.log('Work24 allowance tab bridge regression checks passed');
