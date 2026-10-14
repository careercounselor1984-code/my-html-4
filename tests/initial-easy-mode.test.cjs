'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new vm.Script(fs.readFileSync(path.join(root,'initial-easy-mode.js'),'utf8'));
for(const id of ['p01','p02']){
 const m=html.match(new RegExp('"id":"'+id+'","title":"[^"]+","b64":"([^"]+)"'));assert.ok(m);
 const page=Buffer.from(m[1],'base64').toString('utf8');
 for(const x of page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(x[1]);
 assert.ok(page.includes('initial-easy-mode.js?v=20261014d'));
 assert.ok(/id="checkUnifiedGuidance" checked/.test(page));
 assert.ok(/<input[^>]*name="healthPhysical"[^>]*value="없음"[^>]*checked/.test(page));
 assert.ok(page.includes("checkedValue('jobSupportHistory','미확인')"));
 assert.ok(page.includes("상담사 의견을 작성한 뒤 복사해 주세요."));
}
console.log('Initial I/II syntax, requested defaults and explicit opinion copy guards passed.');
