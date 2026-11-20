'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('journal-workspace.js','utf8');
const start=source.indexOf(' // A saved journal is not a confirmed server change. Keep confirmation and history separate.');
const end=source.indexOf(' function installRequiredFlow(s)',start);
assert(start>=0&&end>start,'bridge must be installed');
assert(source.includes('syncSavedIapToCalendar(s,reg,after,show);'),'verified IAP save triggers bridge');
const listeners=new Map(),frames=[],notes=[],sent=[];
const win={
 __CLG_JOURNAL_EMPLOYEE:{email:'staff@example.com'},
 addEventListener:(type,fn)=>listeners.set(type,fn),
 removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type)}
};
const doc={
 createElement:tag=>{assert.equal(tag,'iframe');const contentWindow={postMessage:(data,origin)=>sent.push({data,origin})};
  const frame={contentWindow,remove(){this.removed=true},setAttribute(){}};frames.push(frame);return frame},
 body:{append:()=>{}}
};
const context={window:win,document:doc,crypto:{randomUUID:()=>String(frames.length)},URL,setTimeout:()=>12,clearTimeout:()=>{}};
const bridge=new vm.Script('(function(){let owner="staff@example.com";const nameSelector="#clientName";'+source.slice(start,end)+';return syncSavedIapToCalendar})()').runInNewContext(context);
const sample=(name='테스트 내담자',iapDate='2026-11-21')=>({
 flow:{reg:'A12345678901'},closed:false,
 doc:{querySelector:()=>({value:name}),getElementById:id=>({value:id==='iapDate'?iapDate:id==='svcEnd'?'2027-11-20':''})}
});
const saved={updatedAt:'2026-11-21T07:55:00Z',state:{fields:{'name:userType:2':true}}};
bridge(sample('', ''),'A12345678901',saved,(...args)=>notes.push(args));
assert.equal(frames.length,0,'incomplete profile is not sent');
const s=sample();bridge(s,'A12345678901',saved,(...args)=>notes.push(args));
assert.equal(frames.length,1,'verified and complete profile creates a request');
frames[0].onload();
assert.equal(sent.length,1);
assert.equal(sent[0].data.profile.regNo,'A12345678901');
assert.equal(sent[0].data.expectedEmail,'staff@example.com');
assert.equal(sent[0].data.profile.values.name,'테스트 내담자');
assert.equal(sent[0].data.profile.values.iapDate,'2026-11-21');
assert.equal(sent[0].data.profile.values.type,'2');
assert.equal(sent[0].origin,'https://careercounselor1984-code.github.io');
listeners.get('message')({source:frames[0].contentWindow,origin:sent[0].origin,data:{type:'goodjob:client-link-result:v1',requestId:sent[0].data.requestId,ok:true}});
assert(frames[0].removed,'frame removed after acknowledgement');
bridge(s,'A12345678901',saved,()=>{});
assert.equal(frames.length,1,'confirmed version not sent twice');
win.__CLG_JOURNAL_EMPLOYEE.email='other@example.com';
bridge(s,'A12345678901',{...saved,updatedAt:'2026-11-22'},()=>{});
assert.equal(frames.length,1,'account mismatch blocks linkage');
console.log('PASS IAP auto-calendar bridge: verified save, validation, owner, dedup, acknowledgment');