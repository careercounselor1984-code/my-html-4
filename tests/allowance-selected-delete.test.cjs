'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),pages=JSON.parse(html.match(/const PAGES = (\[.*?\]);/s)[1]);
const page=Buffer.from(pages.find(p=>p.id==='p06').b64,'base64').toString();
function setup(){const dom=new JSDOM(page,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window,d=w.document,alerts=[];
 w.alert=s=>alerts.push(s);w.confirm=()=>true;w.scrollTo=()=>{};
 for(const s of d.querySelectorAll('script:not([src])'))w.eval(s.textContent);
 return {w,d,alerts,close:()=>w.close()};}
test('delete first and noncontiguous activities, retain remaining values/order and other list',()=>{
 const h=setup();for(const id of ['prog1_list','prog2_list'])h.d.getElementById(id).replaceChildren();
 for(let i=0;i<4;i++){h.w.addActivityRow('prog2_list');const row=h.d.querySelector('#prog2_list').lastElementChild;row.querySelector('.act-detail').value='활동 '+i;row.querySelector('.act-start').value='2026-10-20';}
 h.w.addActivityRow('prog1_list');const other=h.d.querySelector('#prog1_list').firstElementChild;
 const rows=[...h.d.querySelectorAll('#prog2_list .activity-row')];rows[0].querySelector('.act-selected').checked=true;rows[2].querySelector('.act-selected').checked=true;
 let changes=0;h.d.querySelector('#prog2_list').addEventListener('change',()=>changes++);
 h.w.deleteSelectedRows('prog2_list');assert.deepEqual([...h.d.querySelectorAll('#prog2_list .act-detail')].map(x=>x.value),['활동 1','활동 3']);assert.equal(h.d.querySelector('#prog2_list').firstElementChild,rows[1]);assert.equal(rows[1].querySelector('.act-start').value,'2026-10-20');assert.equal(h.d.querySelector('#prog1_list').firstElementChild,other);assert.equal(changes,1);
 h.w.deleteSelectedRows('prog2_list');assert.equal(h.d.querySelector('#prog2_list').children.length,2);assert.equal(h.alerts.length,1);
 h.d.querySelectorAll('#prog2_list .act-selected').forEach(x=>x.checked=true);h.w.deleteSelectedRows('prog2_list');assert.equal(h.d.querySelector('#prog2_list').children.length,0);h.w.addActivityRow('prog2_list');assert.equal(h.d.querySelector('#prog2_list .act-selected').checked,false);h.close();
});
test('selection controls do not alter draft field indices',()=>{const h=setup();const source=fs.readFileSync('journal-workspace.js','utf8');h.w.eval(source.match(/ function fields\(doc\)\{[^\n]+/)[0]+'\nwindow.fields=fields;');assert(!h.w.fields(h.d).some(x=>x.matches('.act-selected')));h.close();});
