'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('journal-auth.css','utf8');
assert(html.includes('id="clgWorkAlertFloat"'), 'new work alert pill exists');
assert(html.includes('href="./journal-auth.css?'), 'last-loaded auth stylesheet remains linked');
const block=css.match(/#clgWorkAlertFloat\.clgAlertFloat\s*\{([^}]+)\}/);
assert(block, 'alert pill position override exists');
const styles=block[1];
for(const rule of ['position:fixed!important','right:16px!important','left:auto!important','bottom:auto!important','transform:none!important']){
  assert(styles.includes(rule), 'work alert pill rule: '+rule);
}
assert(/top:calc\([^;]+\)!important/.test(styles), 'pill is anchored near top, not bottom');
const mobile=css.match(/@media\(max-width:760px\)\s*\{\s*#clgWorkAlertFloat\.clgAlertFloat\s*\{([^}]+)\}/);
assert(mobile&&mobile[1].includes('bottom:auto!important')&&mobile[1].includes('right:10px!important'), 'mobile alert pill also avoids bottom tabs');
assert(html.includes('.clgAlertFloat[hidden]{display:none!important}'), 'hidden alert pill remains invisible');
console.log('Alert pill placement regression passed.');
