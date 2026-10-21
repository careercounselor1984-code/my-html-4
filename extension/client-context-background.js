/* Fresh read-only scans; no participant context is persisted in extension storage. */
(()=>{'use strict';
const journal=sender=>{try{const u=new URL(sender.url);return sender.frameId===0&&u.origin==='https://careercounselor1984-code.github.io'&&/^\/my-html-4(?:\/|$)/.test(u.pathname)}catch{return false}};
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=='CLG_CLIENT_CONTEXT_REQUEST'||!journal(sender))return;
 (async()=>{try{const tabs=await chrome.tabs.query({url:'https://*.work24.go.kr/*'});if(tabs.length>10){reply({status:'conflict'});return}const all=[];for(const tab of tabs){try{const r=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},world:'MAIN',func:ClientContextCore.scanWork24Detail});all.push(...r.map(x=>x.result));}catch{all.push({status:'unavailable'})}}reply(ClientContextCore.combine(all));}catch{reply({status:'none'})}})();return true;
});
})();
