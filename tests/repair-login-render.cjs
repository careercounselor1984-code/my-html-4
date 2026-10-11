'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const path='index.html';
let html=fs.readFileSync(path,'utf8');
const before=html.length;
const marker="\n<script>\n(function(){\n  'use strict';\n\n  var SUPABASE_URL=";
assert.equal(html.split(marker).length-1,1,'exactly one auth script before repair');
assert(html.includes('<div id="ccAuthGate" class="cc-auth-gate cc-hidden">'),'auth overlay is present');
assert(!html.includes('href="./journal-auth.css?v=20261011"'),'auth style not yet linked');
assert(!html.includes('src="./vendor/supabase.min.js"'),'local vendor bundle not yet linked');
assert(fs.existsSync('journal-auth.css'),'auth css file present');
assert(fs.statSync('vendor/supabase.min.js').size>10000,'vendor Supabase UMD bundle present');
html=html.replace('</head>','<link rel="stylesheet" href="./journal-auth.css?v=20261011">\n</head>');
html=html.replace(marker,'\n<!-- Local Supabase UMD, pinned to v2.74.0; required by counselor authentication. -->\n<script src="./vendor/supabase.min.js"></script>'+marker);
assert(html.length>before);
const css=fs.readFileSync('journal-auth.css','utf8');
for(const rule of ['.cc-auth-gate','.cc-auth-card','.cc-hidden','.cc-lock-overlay','.cc-user-dock','.cc-user-dock.show']){
 assert(css.includes(rule),'required auth styling: '+rule);
}
const auth=html.indexOf("var SUPABASE_URL=");
const dependency=html.lastIndexOf('src="./vendor/supabase.min.js"',auth);
assert(auth>0&&dependency>0&&dependency<auth,'Supabase is loaded before counselor authentication init');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
 .filter(s=>!/\bsrc\s*=/.test(s[1])&&s[2].trim()&&!/type=['"](?:application\/json|importmap)/.test(s[1]));
scripts.forEach((s,i)=>new vm.Script(s[2],{filename:'journal-outer-'+i}));
fs.writeFileSync(path,html,'utf8');
console.log('REPAIRED','previous_bytes='+before,'new_bytes='+html.length,'validated_scripts='+scripts.length,'supabase_local_bytes='+fs.statSync('vendor/supabase.min.js').size);
