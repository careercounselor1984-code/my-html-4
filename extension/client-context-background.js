/* Fresh read-only scans; no participant context is persisted in extension storage. */
(()=>{'use strict';
const journal=sender=>{try{const u=new URL(sender.url);return sender.frameId===0&&u.origin==='https://careercounselor1984-code.github.io'&&/^\/my-html-4(?:\/|$)/.test(u.pathname)}catch{return false}};
let notifyTimer=null;
function notify(){clearTimeout(notifyTimer);notifyTimer=setTimeout(async()=>{try{const tabs=await chrome.tabs.query({url:'https://careercounselor1984-code.github.io/my-html-4/*'});for(const tab of tabs)chrome.tabs.sendMessage(tab.id,{type:'CLG_CLIENT_CONTEXT_CHANGED'},()=>void chrome.runtime.lastError);}catch{}},600);}
chrome.tabs.onActivated?.addListener(notify);
chrome.tabs.onUpdated?.addListener((id,change,tab)=>{if(change.status==='complete'&&/\.work24\.go\.kr\//.test(tab.url||''))notify()});
chrome.webNavigation?.onHistoryStateUpdated?.addListener(notify,{url:[{hostSuffix:'work24.go.kr'}]});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type==='CLG_CLIENT_CONTEXT_INVALIDATE'){try{const u=new URL(sender.url);if(u.protocol==='https:'&&(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr')))notify()}catch{}return;}
 if(message?.type!=='CLG_CLIENT_CONTEXT_REQUEST'||!journal(sender))return;
 (async()=>{try{const tabs=await chrome.tabs.query({url:'https://*.work24.go.kr/*'});if(tabs.length>10){reply({status:'conflict'});return}const all=[];for(const tab of tabs){try{const r=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},world:'MAIN',func:ClientContextCore.scanWork24Detail});all.push(...r.map(x=>x.result));}catch{all.push({status:'unavailable'})}}reply(ClientContextCore.combine(all));}catch{reply({status:'none'})}})();return true;
});
})();
