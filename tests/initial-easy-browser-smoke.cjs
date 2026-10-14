'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const chrome=['google-chrome','chromium','chromium-browser'].find(cmd=>cp.spawnSync('which',[cmd],{encoding:'utf8'}).status===0);
assert.ok(chrome,'Chrome not available on runner');
for(const id of ['p01','p02']){
 const m=html.match(new RegExp('"id":"'+id+'","title":"[^"]+","b64":"([^"]+)"'));
 assert.ok(m,'missing '+id);
 const file=path.join(root,'.initial-easy-smoke-'+id+'.html');
 fs.writeFileSync(file,Buffer.from(m[1],'base64').toString('utf8'));
 try{
  const run=cp.spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=4000','--dump-dom','file://'+file],{cwd:root,encoding:'utf8',timeout:40000,maxBuffer:12*1024*1024});
  assert.equal(run.status,0,id+' chrome failed: '+(run.stderr||'').slice(0,400));
  assert.ok(/<body[^>]*class="[^"]*clg-initial-easy/.test(run.stdout),id+' easy mode not default');
  assert.ok(run.stdout.includes('id="initialEasyPanel"'),id+' easy panel did not mount');
  assert.ok(run.stdout.includes('id="easyMemo"'),id+' memo missing');
  assert.ok(run.stdout.includes('id="easyCopy"'),id+' copy button missing');
  assert.ok(run.stdout.includes('id="easyDetail"'),id+' detail toggle missing');
 }finally{fs.rmSync(file,{force:true})}
}
console.log('Initial counseling I/II headless Chrome easy-mode smoke passed.');
