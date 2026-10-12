'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script id="clg-multi-work-tabs-v1-script">([\s\S]*?)<\/script>/);
assert(m,'workspace tabs script must exist');
const source=m[1];
new vm.Script(source,{filename:'workspace-tabs.js'});
assert(source.includes("document.addEventListener('keydown',e=>onTabReloadShortcut(e,null),true)"),
 'top-level F5 and Ctrl+R routed to active tab');
assert(source.includes("doc.addEventListener('keydown',e=>onTabReloadShortcut(e,tab.id),true)"),
 'F5 pressed inside embedded counselor form is intercepted');
assert(source.includes("sourceTabId!==activeTabId"),'inactive tab shortcut must not reload foreground tab');
assert(source.includes("tab.dirty && !confirm"),'unsaved edits require explicit confirmation');
assert(source.includes("reloadActive();"),'intercept triggers existing selected-tab reload');
assert(source.includes("setTimeout(bind,200)")&&source.includes("setTimeout(bind,900)"),
 'delayed iframe load is handled');
assert(html.includes('title="현재 탭만 새로고침 (F5 / Ctrl+R)"'),
 'toolbar explains active-tab behavior');
assert(source.includes("window.addEventListener('beforeunload'"),
 'native hard refresh still warns about unsaved work');
assert(source.includes("sessionStorage.setItem(TAB_LAYOUT_KEY"),
 'browser-level refresh fallback preserves workspace tab list');

const start=source.indexOf('function isTabReloadShortcut(');
const end=source.indexOf('  function wireDirty(tab){',start);
assert(start>=0&&end>start,'keyboard handler section exists');
let count=0;
const handler=new Function('activeTabId','reloadActive',
  source.slice(start,end)+';return {isTabReloadShortcut,onTabReloadShortcut};')('tab-2',()=>{count++});

function fire(key,opts={},origin=null){
 const e={key,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,defaultPrevented:false,
   cancelled:false,stopped:false,
   preventDefault(){this.cancelled=true},
   stopPropagation(){this.stopped=true},...opts};
 handler.onTabReloadShortcut(e,origin);
 return e;
}
let e=fire('F5');assert(e.cancelled&&e.stopped);assert.equal(count,1,'F5 reloads one active tab');
e=fire('F5',{},'tab-2');assert(e.cancelled);assert.equal(count,2,'focused iframe F5 handled');
e=fire('r',{ctrlKey:true},'tab-2');assert(e.cancelled);assert.equal(count,3,'Ctrl+R inside frame handled');
e=fire('r',{metaKey:true});assert(e.cancelled);assert.equal(count,4,'Command+R supported where available');
e=fire('F5',{},'tab-1');assert(!e.cancelled);assert.equal(count,4,'inactive tab cannot refresh selected tab');
e=fire('r',{ctrlKey:true,shiftKey:true});assert(!e.cancelled);assert.equal(count,4,'Ctrl+Shift+R remains browser hard refresh');
e=fire('F5',{shiftKey:true});assert(!e.cancelled);assert.equal(count,4,'Shift+F5 is not hijacked');
e=fire('s',{ctrlKey:true});assert(!e.cancelled);assert.equal(count,4,'other shortcuts unaffected');
e=fire('F5',{defaultPrevented:true});assert(!e.cancelled);assert.equal(count,4,'respects existing keyboard handler');
console.log('OK: F5 / Ctrl+R reload selected iframe only; keyboard focus, dirty guard, hard refresh fallback.');
