'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const main=fs.readFileSync('index.html','utf8');
const pages=JSON.parse(main.match(/const PAGES = (\[.*?\]);/s)[1]);
const source=fs.readFileSync('journal-workspace.js','utf8');
const ids=['p01','p02','p03','p04','p06','p07','p10','p11','p12','p13','p16','p17','p21','p23','p30','p34'];
const A='A12345678901',B='A98765432109';
const dom=new JSDOM('<body><div id="tabs"></div></body>',{url:'https://journal.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window,d=w.document,tabs=[];
w.__CLG_JOURNAL_EMPLOYEE={email:'audit@example.test'};
w.clgGetWorkTabs=()=>tabs;
w.clgSetWorkTabClient=(id,client)=>{const tab=tabs.find(x=>x.id===id);if(tab)tab.client=client};
w.alert=()=>{};w.confirm=()=>true;
function init(id,regNo,AorB){
 const page=pages.find(p=>p.id===id);assert(page,'page '+id+' exists');
 const html=Buffer.from(page.b64,'base64').toString('utf8');
 const frame=d.createElement('iframe');frame.dataset.pageId=id;frame.dataset.external='0';frame.className='clgWorkFrame is-active';d.body.appendChild(frame);
 const sub=frame.contentDocument;sub.open();sub.write(html);sub.close();
 const win=frame.contentWindow;
 // Native shared-profile toolbar is installed by the embedded optional-link script.
 const link=html.match(/<script id="clg-iap-optional-link-script-[^"]+">([\s\S]*?)<\/script>/);
 if(link){win.eval(link[1]);}
 const tab={id:'tab-'+tabs.length,pageId:id,frame,draftId:'draft-'+tabs.length,client:null,dirty:false};
 tabs.push(tab);
 return {frame,doc:sub,win,tab,page,html};
}
function emit(doc,win,el,value){
 el.value=value;
 el.dispatchEvent(new win.Event('input',{bubbles:true}));
}
function search(ctx,number=A){
 const input=ctx.doc.getElementById('clgFlowRegister'),btn=ctx.doc.getElementById('clgFlowLookup');
 assert(input&&btn,ctx.page.id+' search UI present');
 emit(ctx.doc,ctx.win,input,number);btn.click();
 assert.equal(ctx.doc.getElementById('clgRequiredFlowGate'),null,ctx.page.id+' unlocked');
}
function addField(ctx){
 const real=[...ctx.doc.querySelectorAll('textarea,input[type=text],select')].filter(x=>!x.closest('#clgRequiredFlowBar')&&!x.closest('#clgRequiredFlowGate')&&x.id!=='clgIapRegNo'&&!x.id.startsWith('clgFlow'));
 assert(real.length>0,ctx.page.id+' has real form inputs');
 const field=ctx.doc.createElement('textarea');field.id='clgAuditPatientSpecificNote';ctx.doc.body.appendChild(field);
 return field;
}
const made=ids.map(id=>{const ctx=init(id);const realCount=ctx.doc.querySelectorAll('input,select,textarea').length;
 assert(realCount>=(id==='p21'?1:4),id+' expected real inputs; found '+realCount);
 addField(ctx);return {...ctx,realCount}});
w.eval(source);
const dbKey='clg_required_consult_records_v1:'+encodeURIComponent('audit@example.test');
for(const ctx of made){
 const {doc,win,page}=ctx;
 assert(doc.getElementById('clgRequiredFlowGate'),page.id+' mandatory gate');
 assert(doc.getElementById('clgAuditPatientSpecificNote').inert,page.id+' blocked before searching');
 doc.getElementById('clgFlowRegister').value='BAD';
 doc.getElementById('clgFlowLookup').click();
 assert(doc.getElementById('clgRequiredFlowGate'),page.id+' invalid number remains blocked');
 search(ctx);
 const memo=doc.getElementById('clgAuditPatientSpecificNote'),value='검증-'+page.id+'-해당내담자';
 emit(doc,win,memo,value);
 doc.getElementById('clgFlowSave').click();
 const status=doc.getElementById('clgFlowStatus').textContent;
 assert.match(status,/저장 완료/,page.id+': '+status);
 const stored=JSON.parse(w.localStorage.getItem(dbKey));
 assert(stored[page.id+'|'+A],page.id+' persisted');
 assert(stored[page.id+'|'+A].fields.some(f=>f.key==='id:clgAuditPatientSpecificNote'&&f.value===value),page.id+' full fields persisted');
 // Reopen the actual embedded screen and search; saved data must return.
 const again=init(page.id);addField(again);
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:again.tab.id,pageId:page.id,frame:again.frame}}));
 search(again);
 assert.equal(again.doc.getElementById('clgAuditPatientSpecificNote').value,value,page.id+' restored');
 const different=init(page.id);addField(different);
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:different.tab.id,pageId:page.id,frame:different.frame}}));
 search(different,B);
 assert.equal(different.doc.getElementById('clgAuditPatientSpecificNote').value,'',page.id+' other participant isolated');
}

// School forms contain a second iframe layer. Real notes inside that child must be
// captured, dirty-tracked, and restored even if the child frame loads after search.
for(const [id,childId] of [['p21','frameType1'],['p23','frameL'],['p23','frameIap']]){
 const first=init(id);
 const embedded=first.doc.getElementById(childId);
 assert(embedded,id+' has child iframe '+childId);
 const childDoc=embedded.contentDocument;
 childDoc.body.innerHTML='<input id="studentCaseText" type="text">';
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:first.tab.id,pageId:id,frame:first.frame}}));
 embedded.dispatchEvent(new first.win.Event('load'));
 search(first);
 const value='내부상담 '+id+'/'+childId;
 emit(childDoc,embedded.contentWindow,childDoc.getElementById('studentCaseText'),value);
 assert.match(first.doc.getElementById('clgFlowStatus').textContent,/저장되지/,'nested edit tracked');
 first.doc.getElementById('clgFlowSave').click();
 assert.match(first.doc.getElementById('clgFlowStatus').textContent,/저장 완료/,'nested record saved');
 const stored=JSON.parse(w.localStorage.getItem(dbKey))[(id+'|'+A)];
 assert(stored.fields.some(x=>x.key.includes(childId)&&x.value===value),'nested field persisted');
 const reopen=init(id);
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:reopen.tab.id,pageId:id,frame:reopen.frame}}));
 search(reopen);
 const nestedFrame=reopen.doc.getElementById(childId);
 nestedFrame.contentDocument.body.innerHTML='<input id="studentCaseText" type="text">';
 nestedFrame.dispatchEvent(new reopen.win.Event('load'));
 assert.equal(nestedFrame.contentDocument.getElementById('studentCaseText').value,value,'late nested content restored');
}
// The school hybrid's native embedded IAP rows have a separate collector.
{
 const first=init('p23'),embedded=first.doc.getElementById('frameIap');
 embedded.contentDocument.body.innerHTML='<input id="studentCaseText" type="text">';
 let savedState={rows:[{kind:'상담',detail:'현장실습'}]};
 embedded.contentWindow.clgWorkspaceState={collect:()=>savedState,apply:v=>{savedState=v}};
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:first.tab.id,pageId:'p23',frame:first.frame}}));
 embedded.dispatchEvent(new first.win.Event('load'));
 search(first,B);
 emit(embedded.contentDocument,embedded.contentWindow,embedded.contentDocument.getElementById('studentCaseText'),'학생IAP');
 first.doc.getElementById('clgFlowSave').click();
 assert.match(first.doc.getElementById('clgFlowStatus').textContent,/저장 완료/);
 const stored=JSON.parse(w.localStorage.getItem(dbKey))['p23|'+B];
 assert(stored.embedded['frame:frameIap|'],'native embedded IAP rows stored');
 const reopen=init('p23'),fr=reopen.doc.getElementById('frameIap');
 fr.contentDocument.body.innerHTML='<input id="studentCaseText" type="text">';
 let restoredNative=null;
 fr.contentWindow.clgWorkspaceState={collect:()=>({rows:[]}),apply:v=>{restoredNative=v}};
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:reopen.tab.id,pageId:'p23',frame:reopen.frame}}));
 search(reopen,B);
 fr.dispatchEvent(new reopen.win.Event('load'));
 assert.equal(JSON.stringify(restoredNative),JSON.stringify(savedState),'native IAP rows restored after late frame load');
}

console.log('PASS: mandatory input/search/edit/full save/reopen/isolate on '+ids.length+' actual embedded counseling screens: '+ids.join(', '));
w.close();
