/* Signal possible detail changes only; the background decides when to read. */
(()=>{'use strict';if(window.__CLG_DETAIL_EVENTS__)return;window.__CLG_DETAIL_EVENTS__=true;let timer;
const signal=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{chrome.runtime.sendMessage({type:'CLG_CLIENT_CONTEXT_INVALIDATE'},()=>void chrome.runtime.lastError)}catch{}},300)};
document.addEventListener('change',signal,true);document.addEventListener('input',e=>{if(/iap|reg/i.test((e.target.id||'')+' '+(e.target.name||'')))signal()},true);
new MutationObserver(records=>{if(records.some(r=>r.type==='characterData'?r.target.parentElement?.closest('td,th,dd'):Array.from(r.addedNodes).some(n=>n.nodeType===1&&(n.matches('iframe,input,td,th,dd,table')||n.querySelector?.('iframe,input,th,dd')))))signal()}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
signal();
})();
