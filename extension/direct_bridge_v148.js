// v1.4.9: receive requests from the actual work-tab iframe, regardless of
// whether the older parent-page relay is present or points to an inactive tab.
(() => {
  'use strict';
  if (window.__CLG_DIRECT_TAB_BRIDGE_V148__) return;
  window.__CLG_DIRECT_TAB_BRIDGE_V148__ = true;

  const RULES = {
    CLG_IAP_PAGE_V120: {
      pageId: 'p05', type: 'SAVE_IAP_PENDING', storageKey: 'clgIapTransferPendingV120',
      ok: 'IAP_SAVED', error: 'IAP_SAVE_ERROR'
    },
    CLG_READINESS_PAGE_V150: {
      pageId: 'p07', type: 'SAVE_READINESS_PENDING', storageKey: 'clgReadinessPendingV150',
      ok: 'READINESS_SAVED', error: 'READINESS_SAVE_ERROR'
    }
  };
  const safeCount = p => ['q1','q2','q3','q4','q5','q6','q7','q8'].filter(k=>typeof p[k]==='string' && p[k].trim()).length;
  const localFile = location.protocol === 'file:';
  if (localFile && !/상담일지\s*통합본/.test(document.title || '')) return;

  function ownerFrame(source, pageId) {
    const id=pageId==='p05'?'iapSendWork24Btn':'readinessSendBtn';
    const seen=new Set();const queue=[{doc:document,depth:0}];
    while(queue.length){
      const {doc,depth}=queue.shift();if(seen.has(doc))continue;seen.add(doc);
      for(const frame of doc.querySelectorAll('iframe')){
        try{
          const child=frame.contentDocument;
          if(frame.contentWindow===source){
            if(child?.getElementById(id))return frame;
            if(child&&frame.matches('iframe.clgWorkFrame,iframe#frame')&&frame.dataset.pageId===pageId)return frame;
            return null;
          }
          if(child&&depth<3)queue.push({doc:child,depth:depth+1});
        }catch{ /* External frames cannot supply a local work form. */ }
      }
    }
    return null;
  }

  function reply(source, marker, type, payload) {
    try { source.postMessage({marker, type, payload}, location.protocol==='file:'?'*':location.origin); } catch (e) {
      console.warn('[국취 전산도우미] 전송 결과 통지 실패', e);
    }
  }

  async function save(source, marker, rule, payload) {
    if (!ClgBridgeSecurity.validTransfer(payload,rule.pageId==='p05'?'iap':'readiness')) {
      reply(source, marker, rule.error, {message:'전달할 데이터 형식이 올바르지 않습니다.'});
      return;
    }
    if (rule.pageId === 'p05' && (!Array.isArray(payload.jobRows) || !Array.isArray(payload.actRows))) {
      reply(source, marker, rule.error, {message:'IAP 표 자료 형식을 확인해 주세요.'});
      return;
    }
    if (rule.pageId === 'p07' && safeCount(payload) === 0) {
      reply(source, marker, rule.error, {message:'참여자가 실제 응답한 설문 결과가 없습니다. 빈 문항을 자동으로 채우지 않습니다.'});
      return;
    }
    try {
      await chrome.storage.local.set({[rule.storageKey]:payload});
      const saved = (await chrome.storage.local.get(rule.storageKey))?.[rule.storageKey];
      if (!saved || saved.sentAt !== payload.sentAt) throw new Error('확장프로그램 저장값 재확인 실패');
      if (rule.pageId === 'p05') {
        reply(source, marker, rule.ok, {
          sentAt:saved.sentAt, jobCount:saved.jobRows.length, actCount:saved.actRows.length, verified:true, method:'direct-tab'
        });
      } else {
        reply(source, marker, rule.ok, {
          sentAt:saved.sentAt, answers:safeCount(saved), verified:true, method:'direct-tab'
        });
      }
    } catch (err) {
      reply(source, marker, rule.error, {message:'확장프로그램 저장 실패: ' + (err?.message || String(err))});
    }
  }

  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if(location.protocol==='file:'?e.origin!=='null':e.origin!==location.origin)return;
    const rule = Object.prototype.hasOwnProperty.call(RULES,d.marker)?RULES[d.marker]:null;
    if (!rule || d.type !== rule.type || e.source === window) return;
    const ownedFrame=ownerFrame(e.source, rule.pageId);
    if (!ownedFrame) return;
    if(rule.pageId==='p07')d.payload={...d.payload,iapNo:ownedFrame.contentDocument?.querySelector('#clgIapRegNo')?.value||''};
    // A current journal already relays this request through its own parent.
    // Use the direct fallback only when that relay is absent.
    const parentRelay=rule.pageId==='p07'?'clg-readiness-parent-bridge-v148-script':'clg-iap-reverse-bridge-v148-script';
    if(ownedFrame.ownerDocument===document&&ownedFrame.matches('iframe.clgWorkFrame,iframe#frame')&&document.getElementById(parentRelay))return;
    void save(e.source, d.marker, rule, d.payload);
  }, true);
})();
