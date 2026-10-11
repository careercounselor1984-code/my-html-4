'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const src=fs.readFileSync('index.html','utf8');
const candidates=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/opt/google/chrome/chrome'];
const chrome=candidates.find(p=>fs.existsSync(p));
if(!chrome){console.log('No Chrome/Chromium available');process.exit(2)}
const sentinel='data-clg-auth-smoke';
const probeCode="<script>(()=>{const el=document.createElement('div');el.className='cc-auth-gate';document.body.appendChild(el);const st=getComputedStyle(el);const checks={css:st.position==='fixed'&&st.display==='flex'&&parseInt(st.zIndex,10)>1000,sdk:!!(window.supabase&&typeof window.supabase.createClient==='function'),link:!!document.querySelector('link[href*=journal-auth.css]'),gate:!!document.getElementById('ccAuthGate')};el.remove();document.documentElement.setAttribute('data-clg-auth-smoke',Object.entries(checks).map(([k,v])=>k+':'+v).join(','));})();</script>";
const end=src.lastIndexOf('</body>');
if(end<0)throw Error('Missing body end');
const modified=src.slice(0,end)+probeCode+'\n'+src.slice(end);
const file=path.resolve('.login-render-smoke.html');
fs.writeFileSync(file,modified,'utf8');
try {
 const result=cp.spawnSync(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-extensions','--allow-file-access-from-files','--virtual-time-budget=4500','--dump-dom','file://'+file],{encoding:'utf8',timeout:45000,maxBuffer:24*1024*1024});
 const match=(result.stdout||'').match(new RegExp(sentinel+'="([^"]+)"'));
 console.log('CHROME',chrome,'EXIT',result.status,'OUTLEN',String(result.stdout||'').length,'PROBE',match?.[1]||'missing');
 if(!match||!['css:true','sdk:true','link:true','gate:true'].every(v=>match[1].includes(v))){ console.log('CHROME_ERROR',String(result.stderr||'').slice(-1200));process.exitCode=1; }
 else console.log('PASS: actual Chrome auth CSS and local Supabase SDK');
}finally{fs.unlinkSync(file)}
