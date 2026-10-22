(() => {
  'use strict';
  if (location.protocol==='file:' && !/상담일지\s*통합본/.test(document.title||'')) return;
  if (window.__CLG_COUNSEL_BRIDGE_V113__) return;
  window.__CLG_COUNSEL_BRIDGE_V113__ = true;

  const MARKER = 'CLG_COUNSEL_BRIDGE_V113';
  const BASIC_KEY = 'clgBasicToCounselPendingV111';
  const ALLOWANCE_KEY = 'clgAllowanceToCounselPendingV112';
  const TERMINATION_KEY = 'clgTerminationToCounselPendingV113';

  function post(type, payload=null){
    window.postMessage({marker:MARKER, type, payload}, ClgBridgeSecurity.targetOrigin());
  }

  function sendPending(){
    chrome.storage.local.get([BASIC_KEY, ALLOWANCE_KEY, TERMINATION_KEY], (r) => {
      post('PENDING_STATE', {
        basic: r && r[BASIC_KEY] ? r[BASIC_KEY] : null,
        allowance: r && r[ALLOWANCE_KEY] ? r[ALLOWANCE_KEY] : null,
        termination: r && r[TERMINATION_KEY] ? r[TERMINATION_KEY] : null
      });
    });
  }

  window.addEventListener('message', (e) => {
    if (!ClgBridgeSecurity.validOrigin(e)) return;
    const d = e.data || {};
    if (d.marker !== MARKER) return;
    if (d.type === 'PING_BRIDGE') {
      post('BRIDGE_READY', {version:chrome.runtime.getManifest().version, href:location.href});
      sendPending();
    }
    if (d.type === 'REQUEST_PENDING') sendPending();
    if (d.type === 'CLEAR_PENDING_BASIC') chrome.storage.local.remove(BASIC_KEY, sendPending);
    if (d.type === 'CLEAR_PENDING_ALLOWANCE') chrome.storage.local.remove(ALLOWANCE_KEY, sendPending);
    if (d.type === 'CLEAR_PENDING_TERMINATION') chrome.storage.local.remove(TERMINATION_KEY, sendPending);
  });

  // Work24 팝업에서 storage에 새 자료를 저장하면, 이미 열려 있는 통합본에도 즉시 반영한다.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes[BASIC_KEY] || changes[ALLOWANCE_KEY] || changes[TERMINATION_KEY]) {
      sendPending();
    }
  });

  // 필요 시 확장프로그램 내부에서 강제로 새로고침 신호를 보낼 수 있도록 지원.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'CLG_COUNSEL_REFRESH_PENDING') sendPending();
  });

  post('BRIDGE_READY', {version:chrome.runtime.getManifest().version, href:location.href});
  sendPending();
})();


(() => {
  'use strict';
  if (window.__CLG_IAP_BRIDGE_V120__) return;
  window.__CLG_IAP_BRIDGE_V120__ = true;
  const MARKER='CLG_IAP_BRIDGE_V120';
  const KEY='clgIapTransferPendingV120';
  function post(type,payload=null){window.postMessage({marker:MARKER,type,payload},ClgBridgeSecurity.targetOrigin());}
  window.addEventListener('message',(e)=>{
    if(!ClgBridgeSecurity.validOrigin(e))return;
    const d=e.data||{};if(d.marker!==MARKER)return;
    if(d.type==='SAVE_IAP_PENDING'){
      const p=d.payload||{};
      if(!ClgBridgeSecurity.validTransfer(p,'iap')){post('IAP_PENDING_ERROR',{message:'보안 점검: IAP 자료 형식·시간·크기 확인 필요'});return;}
      chrome.storage.local.set({[KEY]:p},()=>{
        if(chrome.runtime.lastError)post('IAP_PENDING_ERROR',{message:chrome.runtime.lastError.message});
        else post('IAP_PENDING_SAVED',{sentAt:p.sentAt||'',jobCount:(p.jobRows||[]).length,actCount:(p.actRows||[]).length});
      });
    }
    if(d.type==='REQUEST_IAP_PENDING')chrome.storage.local.get(KEY,r=>post('IAP_PENDING_STATE',r?.[KEY]||null));
    if(d.type==='CLEAR_IAP_PENDING')chrome.storage.local.remove(KEY,()=>post('IAP_PENDING_STATE',null));
  });
})();


(() => {
  'use strict';
  if (window.__CLG_READINESS_BRIDGE_V150__) return;
  window.__CLG_READINESS_BRIDGE_V150__ = true;
  const MARKER='CLG_READINESS_BRIDGE_V150';
  const KEY='clgReadinessPendingV150';
  function post(type,payload=null){window.postMessage({marker:MARKER,type,payload},ClgBridgeSecurity.targetOrigin());}
  window.addEventListener('message',(e)=>{
    if(!ClgBridgeSecurity.validOrigin(e))return;
    const d=e.data||{}; if(d.marker!==MARKER)return;
    if(d.type==='SAVE_READINESS_PENDING'){
      const payload=d.payload||{};
      if(!ClgBridgeSecurity.validTransfer(payload,'readiness')){post('READINESS_PENDING_ERROR',{message:'보안 점검: 설문 자료 형식·시간·크기 확인 필요'});return;}
      chrome.storage.local.set({[KEY]:payload},()=>{
        if(chrome.runtime.lastError) post('READINESS_PENDING_ERROR',{message:chrome.runtime.lastError.message});
        else post('READINESS_PENDING_SAVED',{sentAt:payload.sentAt||'',answers:[payload.q1,payload.q2,payload.q3,payload.q4,payload.q5,payload.q6,payload.q7,payload.q8].filter(Boolean).length});
      });
    }
    if(d.type==='REQUEST_READINESS_PENDING')chrome.storage.local.get(KEY,r=>post('READINESS_PENDING_STATE',r?.[KEY]||null));
    if(d.type==='CLEAR_READINESS_PENDING')chrome.storage.local.remove(KEY,()=>post('READINESS_PENDING_STATE',null));
  });
})();
