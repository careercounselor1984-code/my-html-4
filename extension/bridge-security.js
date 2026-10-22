// Shared defensive validators for journal-page bridges (ISOLATED world).
(function(root){'use strict';
 function validOrigin(e){
  if(e.source!==window)return false;
  return location.protocol==='file:'?e.origin==='null':e.origin===location.origin;
 }
 function targetOrigin(){return location.protocol==='file:'?'*':location.origin;}
 function validTransfer(payload,kind){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return false;
  const stamp=Date.parse(String(payload.sentAt||''));
  if(!Number.isFinite(stamp)||Math.abs(Date.now()-stamp)>24*3600000)return false;
  try{if(JSON.stringify(payload).length>512*1024)return false;}catch{return false;}
  if(kind==='iap')return /^A\d{10,}$/.test(String(payload.iapNo||''))&&Array.isArray(payload.jobRows)&&Array.isArray(payload.actRows)&&payload.jobRows.length<=100&&payload.actRows.length<=100;
  if(kind==='readiness')return /^A\d{10,30}$/.test(String(payload.iapNo||''))&&['q1','q2','q3','q4','q5','q6','q7','q8'].some(k=>typeof payload[k]==='string'&&payload[k].trim());
  return true;
 }
 root.ClgBridgeSecurity={validOrigin,targetOrigin,validTransfer};
})(typeof globalThis!=='undefined'?globalThis:this);
