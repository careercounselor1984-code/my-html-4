'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const base=path.join(__dirname,'../counselor-management');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const preset=fs.readFileSync(path.join(base,'period-presets.js'),'utf8');
const auditor=fs.readFileSync(path.join(base,'formula-audit.js'),'utf8');
const digest=content=>crypto.createHash('sha256').update(content,'utf8').digest('base64');

test('strict Content-Security-Policy and external preset SRI match the actual files',()=>{
  const inline=html.match(/<script>([\s\S]*?)<\/script>/);
  const external=html.match(/<script src="\.\/period-presets\.js" integrity="sha256-([^"]+)" crossorigin="anonymous"><\/script>/);
  const csp=html.match(/Content-Security-Policy" content="([^"]+)"/);
  assert.ok(inline&&external&&csp);
  assert.equal(external[1],digest(preset));
  assert.ok(csp[1].includes("'sha256-"+digest(inline[1])+"'"));
  assert.ok(csp[1].includes("'sha256-"+digest(preset)+"'"));
  const marker='src="./formula-audit.js" integrity="sha256-';
  const position=html.indexOf(marker);
  assert.ok(position>=0,'formula auditor script must be pinned');
  const auditHash=html.slice(position+marker.length).split('"',1)[0];
  assert.equal(auditHash,digest(auditor));
  assert.ok(csp[1].includes("'sha256-"+digest(auditor)+"'"));

  assert.ok(!csp[1].includes("'unsafe-inline'"));
  assert.ok(!csp[1].includes("'unsafe-eval'"));
});
