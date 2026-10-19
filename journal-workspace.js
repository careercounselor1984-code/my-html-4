/* Per-tab session drafts. Use the journal's existing identity fields and menus. */
(()=>{'use strict';
 if(window.__CLG_CLIENT_WORKSPACE__)return;window.__CLG_CLIENT_WORKSPACE__=true;
 const supported=new Set(['p00','p01','p02','p03','p04','p05','p06','p07','p10','p11','p13','p16','p17','p30','p34']);
 const resetPages=new Set(['p00','p01','p02','p03','p04','p05','p06','p07','p10','p11','p13','p16','p17','p20','p21','p23','p30','p34']);
 const regSelector='#iapRegNo,#clgIapRegNo,#clgSudangIapRegNo';
 const nameSelector='#clientName,#participantName,#participant_name,#counseleeName,#client_name,#personName';
 const prefix='clg_work_drafts_v1:';let owner=window.__CLG_JOURNAL_EMPLOYEE?.email||'';
 const installed=new WeakMap(),states=new Set();
 const tabs=()=>window.clgGetWorkTabs?.()||[];
 function read(){try{return JSON.parse(sessionStorage.getItem(prefix+owner)||'{}')}catch{return {}}}
 function write(all){sessionStorage.setItem(prefix+owner,JSON.stringify(all))}
 function fields(doc){return [...doc.querySelectorAll('input,select,textarea')].filter(el=>!el.closest('.clg-client-workspace')&&!el.closest('#iapLoadConfirmDialog')&&!(el.tagName==='INPUT'&&['file','password','button','submit','reset','hidden'].includes(el.type)))}
 function take(doc){const counts={};return fields(doc).map((el,index)=>{const key=el.id?'id:'+el.id:el.name?'name:'+el.name:'index:'+index;const n=counts[key]||0;counts[key]=n+1;return {key,n,value:el.type==='checkbox'||el.type==='radio'?el.checked:el.value}})}
 function restoreFields(doc,values){const counts={},map=new Map();fields(doc).forEach((el,index)=>{const key=el.id?'id:'+el.id:el.name?'name:'+el.name:'index:'+index;const n=counts[key]||0;counts[key]=n+1;map.set(key+':'+n,el)});
  const apply=dispatch=>{for(const item of values||[]){const el=map.get(item.key+':'+item.n);if(!el)continue;if(el.type==='checkbox'||el.type==='radio')el.checked=!!item.value;else{if(el.tagName==='SELECT'&&item.value&&!Array.from(el.options).some(o=>o.value===item.value))el.add(new doc.defaultView.Option(item.value,item.value));el.value=String(item.value??'')}if(dispatch){el.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));el.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}))}}};apply(true);apply(false);
 }
 function syncClient(s){const reg=s.doc.querySelector(regSelector)?.value?.trim()||'',name=s.doc.querySelector(nameSelector)?.value?.trim()||'';const client={reg,name,key:reg||s.tab.draftId};if(JSON.stringify(client)!==JSON.stringify(s.client)){s.client=client;window.clgSetWorkTabClient?.(s.tab.id,client)}}
 function save(s){if(!owner||s.closed||s.restoring)return;try{syncClient(s);const snapshot={version:1,page:s.tab.pageId,at:Date.now(),client:s.client,fields:take(s.doc),native:s.win.clgWorkspaceState?.collect?.()||null};if(JSON.stringify(snapshot).length>500000)throw Error('초안 용량 초과');const all=read();all[s.tab.draftId]=snapshot;write(all);s.draftStatus='saved'}catch{s.draftStatus='error'}}
 function schedule(s){if(s.restoring||s.closed)return;clearTimeout(s.timer);s.timer=setTimeout(()=>save(s),500)}
 function hydrate(s){if(!owner||s.hydrated===owner||s.closed)return;s.hydrated=owner;const saved=read()[s.tab.draftId];
  if(!saved||saved.version!==1||saved.page!==s.tab.pageId||Date.now()-saved.at>24*3600000||saved.at>Date.now()+60000||s.edited)return;
  try{s.restoring=true;if(saved.native&&s.win.clgWorkspaceState?.apply)s.win.clgWorkspaceState.apply(saved.native);restoreFields(s.doc,saved.fields);syncClient(s);s.draftStatus='restored'}catch{s.draftStatus='error'}finally{s.restoring=false}
 }
 function attach(tab){if(tab.frame.dataset.external==='1')return;let doc,win;try{doc=tab.frame.contentDocument;win=tab.frame.contentWindow}catch{return}if(!doc?.body||doc.readyState==='loading')return;
  if(resetPages.has(tab.pageId)&&!doc.getElementById('clgConsultResetBar')){
    const bar=doc.createElement('div');bar.id='clgConsultResetBar';bar.className='clg-consult-controls';
    bar.style.cssText='display:flex;justify-content:flex-end;padding:5px 10px;max-width:1200px;margin:0 auto';
    const button=doc.createElement('button');button.type='button';button.id='clgConsultResetBtn';button.textContent='↺ 현재 상담 초기화';
    button.title='현재 탭의 입력과 결과만 초기화합니다. 저장된 상담자료는 유지됩니다.';
    button.style.cssText='width:auto;margin:0;padding:6px 11px;border:1px solid #e6a4a4;border-radius:7px;background:#fff;color:#a32929;font-size:12px;cursor:pointer';
    button.onclick=()=>window.clgResetWorkTab?.(tab.id);bar.appendChild(button);doc.body.prepend(bar);
    const style=doc.createElement('style');style.textContent='@media print{#clgConsultResetBar{display:none!important}}';doc.head.appendChild(style);
  }
  if(!supported.has(tab.pageId))return;if(installed.has(doc)){hydrate(installed.get(doc));return}for(const old of states){if(old.tab.id===tab.id&&old.doc!==doc){old.closed=true;clearTimeout(old.timer);states.delete(old)}}
  // Keep the optional common-profile lookup as compact as the native IAP lookup.
  if(doc.getElementById('clgIapLinkCard')){
   const style=doc.createElement('style');style.id='clg-compact-registration';
   style.textContent=`
    #clgIapLinkCard{padding:10px 12px;margin:8px 0 12px;border-radius:9px}
    #clgIapLinkCard .clg-iap-link-head{margin-bottom:6px;flex-wrap:wrap;gap:4px 7px}
    #clgIapLinkCard .clg-iap-link-row{display:grid;grid-template-columns:minmax(0,260px) auto auto;justify-content:start;gap:6px;max-width:100%}
    #clgIapLinkCard .clg-iap-link-row input{grid-column:auto;width:100%;min-width:0;height:32px;min-height:32px;padding:5px 8px;font-size:12px;border-radius:7px}
    #clgIapLinkCard .clg-iap-link-row button{width:auto;height:32px;min-height:32px;padding:5px 10px;font-size:11px;border-radius:7px}
    #clgIapLinkCard .clg-iap-link-status{margin-top:5px;font-size:10px;line-height:1.4}
    @media(max-width:480px){#clgIapLinkCard .clg-iap-link-row{grid-template-columns:minmax(0,1fr) auto auto}}
   `;doc.head.appendChild(style);
  }
  doc.querySelectorAll('.clg-client-workspace').forEach(el=>el.remove());
  const s={tab,doc,win,client:{reg:'',name:'',key:tab.draftId},restoring:false,edited:false,closed:false,timer:null,hydrated:''};installed.set(doc,s);states.add(s);syncClient(s);
  const changed=()=>{if(s.restoring)return;s.edited=true;syncClient(s);schedule(s)};
  doc.addEventListener('input',changed);doc.addEventListener('change',changed);
  doc.addEventListener('click',event=>{if(event.target.closest?.('button'))setTimeout(()=>schedule(s),0)});
  hydrate(s);
 }
 function scan(){for(const tab of tabs())attach(tab)}
 window.addEventListener('clg-tab-frame-load',scan);window.addEventListener('clg-tab-switch',scan);document.addEventListener('load',e=>{if(e.target?.tagName==='IFRAME')setTimeout(scan,60)},true);
 window.addEventListener('clg-auth-ready',()=>{owner=window.__CLG_JOURNAL_EMPLOYEE?.email||'';scan()});
 window.addEventListener('clg-auth-logout',()=>{for(const s of states){clearTimeout(s.timer);s.hydrated=''}if(owner)sessionStorage.removeItem(prefix+owner);owner=''});
 window.addEventListener('clg-work-tab-close',e=>{for(const s of states)if(s.tab.id===e.detail.tabId){s.closed=true;clearTimeout(s.timer);states.delete(s)}if(owner){const all=read();delete all[e.detail.draftId];try{write(all)}catch{}}});
 window.addEventListener('clg-work-tab-reset',e=>{
  for(const s of states)if(s.tab.id===e.detail.tabId){s.closed=true;clearTimeout(s.timer);states.delete(s)}
  if(owner){const all=read();delete all[e.detail.draftId];try{write(all)}catch{}}
 });
 window.addEventListener('pagehide',()=>{for(const s of states)save(s)});
 window.clgFlushWorkDrafts=()=>{for(const s of states)save(s)};
 scan();setTimeout(scan,250);setTimeout(scan,1000);
})();
