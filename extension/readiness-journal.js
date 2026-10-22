/* Remove obsolete injected banners. The journal owns the one connection panel. */
(()=>{'use strict';
if(location.protocol==='file:'&&!/상담일지\s*통합본/.test(document.title||''))return;
 if(window.__CLG_READINESS_BANNER_CLEANUP__)return;window.__CLG_READINESS_BANNER_CLEANUP__=true;
 const watched=new WeakSet();
 function clean(doc){doc.querySelectorAll('[id="clgReadinessContext"]').forEach(el=>el.remove());}
 function scan(){for(const frame of document.querySelectorAll('iframe.clgWorkFrame,iframe#frame'))try{
  const doc=frame.contentDocument;if(!doc?.body)continue;clean(doc);
  if(!watched.has(doc)){watched.add(doc);new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='clgReadinessContext'||n.querySelector?.('[id="clgReadinessContext"]')))))clean(doc);}).observe(doc.body,{childList:true,subtree:true});}
  if(!frame.dataset.clgReadinessCleanup){frame.dataset.clgReadinessCleanup='1';frame.addEventListener('load',scan);}
 }catch{}}
 for(const event of ['clg-tab-switch','clg-tab-frame-load'])window.addEventListener(event,scan);
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('iframe')||n.querySelector?.('iframe')))))scan();}).observe(document.documentElement,{childList:true,subtree:true});
 scan();
})();
