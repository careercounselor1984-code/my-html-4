'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script id="clg-multi-work-tabs-v1-script">([\s\S]*?)<\/script>/);
assert(script,'multi workspace tab engine exists');
new vm.Script(script[1],{filename:'workspace-tabs.js'});
assert(/id="clgScheduleTabBtn"[^>]*type="button"/.test(html),'top schedule button is a button, not new-window anchor');
assert(!/<a class="topBtn" href="https:\/\/careercounselor1984-code\.github\.io\/my-html-9\/" target="_blank"[^>]*>🗓/.test(html),'old new-window schedule button removed');
const calendarMatch=script[1].match(/PAGES\.push\(\{id:'p_calendar',title:'상담 일정표',url:'([^']+)'\}\)/);assert(calendarMatch,'schedule page registered with existing tab engine');const calendarUrl=new URL(calendarMatch[1]);assert.equal(calendarUrl.origin,'https://careercounselor1984-code.github.io');assert.equal(calendarUrl.pathname,'/my-html-9/');
assert(script[1].includes("document.getElementById('clgScheduleTabBtn')?.addEventListener('click',()=>createTab('p_calendar'))"),'button opens a tab');
assert(script[1].includes('const existing=tabs.find(t=>t.pageId===pageId)'), 'reopening reuses schedule tab');
assert(script[1].includes('if(p.url){')&&script[1].includes('fr.src=p.url'), 'external URL displayed inside tab iframe');
assert(script[1].includes("fr.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads allow-same-origin')"),'sandboxed calendar frame preserves existing security controls');

const start=script[1].indexOf('function parseSavedTabState(');
const end=script[1].indexOf('\n  function readTabLayout()',start);
assert(start>=0&&end>start,'session tab layout parser exists');
const parse=new Function('return ('+script[1].slice(start,end).trim()+')')();
const ts=Date.parse('2026-10-12T01:00:00Z');
const allowed=['p01','p05','p_calendar'];
const base={version:2,pages:['p01','p05','p_calendar'],activeIndex:2,hadUnsaved:false,savedAt:ts};
const recovered=parse(JSON.stringify(base),allowed,6,ts+5000);
assert.deepEqual(recovered,{pages:base.pages,activeIndex:2,hadUnsaved:false},'F5 restores order and active tab');
const dup=parse(JSON.stringify({...base,pages:['p01','p01','p_calendar'],activeIndex:1}),allowed,6,ts);
assert.deepEqual(dup.pages,['p01','p01','p_calendar'],'multiple instances of same tool are restored');
const filtered=parse(JSON.stringify({...base,pages:['unknown','p_calendar'],activeIndex:99,hadUnsaved:true}),allowed,6,ts);
assert.deepEqual(filtered,{pages:['p_calendar'],activeIndex:0,hadUnsaved:true},'unknown screens filtered and selection clamped');
assert.equal(parse('{"version":2,"pages":["p01"],"savedAt":1}',allowed,6,ts),null,'stale layout ignored');
assert.equal(parse('{bad json',allowed,6,ts),null,'malformed layout safely ignored');
assert.equal(parse(JSON.stringify({...base,version:1}),allowed,6,ts),null,'old schema ignored');
assert(script[1].includes('sessionStorage.setItem(TAB_LAYOUT_KEY'),'layout saved in browser-tab session');
assert(script[1].includes('pages:tabs.map(t=>t.pageId)'),'layout keeps screen IDs; drafts use their separate account-scoped store');
assert(script[1].includes('activeIndex:Math.max(0,tabs.findIndex'),'active tab index saved for duplicates');
assert(script[1].includes('previousLayout.pages.slice(1).forEach((pageId,index)=>createTab(pageId,{newInstance:true,draftId:previousLayout.draftIds?.[index+1]}))'),'additional tabs restored');
assert(script[1].includes('activateTab(target.id)'),'previously active tab selected');
assert(script[1].includes("window.addEventListener('beforeunload'"),'unsaved user edits warn before F5');
assert(script[1].includes('previousLayout.hadUnsaved'),'form-draft restoration is explicitly not promised');
console.log('OK: F5 tab layout reconstruction, duplicate tabs, invalid/stale state, unsaved-content warning.');

console.log('OK: schedule toolbar uses existing work tab, same-origin iframe, no forced new window.');

require('./client-workspace.test.cjs');

require('./experience-days.test.cjs');
