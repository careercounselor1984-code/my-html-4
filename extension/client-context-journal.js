(()=>{'use strict';if(window.__CLG_CLIENT_CONTEXT__)return;window.__CLG_CLIENT_CONTEXT__=true;let busy=false,queued=null;
chrome.runtime.onMessage.addListener(msg=>{if(msg?.type==='CLG_CLIENT_CONTEXT_CHANGED')window.postMessage({marker:'CLG_CLIENT_LINK_V1',type:'INVALIDATE'},ClgBridgeSecurity.targetOrigin())});
function send(d){if(busy){queued=d;return}busy=true;chrome.runtime.sendMessage({type:'CLG_CLIENT_CONTEXT_REQUEST'},payload=>{busy=false;const error=chrome.runtime.lastError;if(!error)window.postMessage({marker:'CLG_CLIENT_LINK_V1',type:'CONTEXT',requestId:d.requestId,payload},ClgBridgeSecurity.targetOrigin());if(queued){const next=queued;queued=null;send(next)}});}
window.addEventListener('message',e=>{if(!ClgBridgeSecurity.validOrigin(e))return;const d=e.data;if(d?.marker!=='CLG_CLIENT_LINK_V1'||d.type!=='REQUEST_CONTEXT'||typeof d.requestId!=='string'||d.requestId.length>100)return;send(d);});
window.postMessage({marker:'CLG_CLIENT_LINK_V1',type:'INVALIDATE'},ClgBridgeSecurity.targetOrigin());
})();
