'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),workspace=fs.readFileSync('journal-workspace.js','utf8');
const reset=html.match(/window\.clgResetWorkTab=\(tabId\)=>\{[\s\S]*?\n  \};/)[0];
(async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const pages=['p00','p01','p02','p03','p04','p05','p06','p07','p10','p11','p13','p16','p17','p20','p21','p23','p30','p34'];
 const tabs=pages.map((pageId,i)=>{const frame=d.createElement('iframe');d.body.appendChild(frame);frame.contentDocument.body.innerHTML='<input id="clgIapRegNo"><input id="wishJob"><textarea id="result"></textarea>';return {id:'tab'+i,pageId,draftId:'draft'+i,dirty:true,client:{reg:'A'},frame};});
 await new Promise(r=>setTimeout(r,10));
 w.__CLG_JOURNAL_EMPLOYEE={email:'tester@example.test'};w.clgGetWorkTabs=()=>tabs;w.clgSetWorkTabClient=(id,client)=>{tabs.find(t=>t.id===id).client=client};
 let reloads=0,rendered=0,persisted=0;w.tabById=id=>tabs.find(t=>t.id===id);w.pageOf=()=>({});w.renderTabs=()=>rendered++;w.persistTabLayout=()=>persisted++;w.loadFrame=()=>reloads++;w.confirm=()=>true;
 w.eval(workspace);w.eval(reset);
 for(const tab of tabs){const button=tab.frame.contentDocument.getElementById('clgConsultResetBtn');assert(button,tab.pageId+' top reset');assert.equal(button.type,'button');}
 const key='clg_work_drafts_v1:tester@example.test';const a=tabs[0],b=tabs[1];
 const oldDraft=a.draftId;w.sessionStorage.setItem(key,JSON.stringify({[oldDraft]:{client:{reg:'A'},fields:[{value:'미저장'}]},[b.draftId]:{keep:'다른 상담'}}));w.localStorage.setItem('iap_participant_records_v1','saved records');
 w.confirm=()=>false;a.frame.contentDocument.getElementById('clgConsultResetBtn').click();assert.equal(a.draftId,oldDraft);assert.equal(reloads,0);assert(JSON.parse(w.sessionStorage.getItem(key))[oldDraft]);
 w.confirm=()=>true;a.frame.contentDocument.getElementById('clgConsultResetBtn').click();assert.equal(reloads,1);assert.equal(rendered,1);assert.equal(persisted,1);assert.notEqual(a.draftId,oldDraft);assert.equal(a.client,null);assert.equal(a.dirty,false);assert(!JSON.parse(w.sessionStorage.getItem(key))[oldDraft]);assert.equal(JSON.parse(w.sessionStorage.getItem(key))[b.draftId].keep,'다른 상담');assert.equal(w.localStorage.getItem('iap_participant_records_v1'),'saved records');
 w.clgFlushWorkDrafts();assert(!JSON.parse(w.sessionStorage.getItem(key))[oldDraft],'a closed old document cannot restore its discarded draft');assert(!JSON.parse(w.sessionStorage.getItem(key))[a.draftId],'old document cannot save old fields under new ID');
 w.close();console.log('PASS: visible reset across 18 counseling pages, cancel, isolated reset, fresh draft identity, retained saved records and no stale draft resurrection.');
})().catch(e=>{console.error(e);process.exit(1)});
