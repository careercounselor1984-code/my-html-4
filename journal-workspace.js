/* Per-tab session drafts. Use the journal's existing identity fields and menus. */
(()=>{'use strict';
 if(window.__CLG_CLIENT_WORKSPACE__)return;window.__CLG_CLIENT_WORKSPACE__=true;

 // The schedule tab is a workspace-first surface. Keep its controls, but do not spend
 // the first viewport on duplicate shell chrome or the optional bulletin feed.
 const compactScheduleStyle=document.createElement('style');
 compactScheduleStyle.id='clg-calendar-focus-style';
 compactScheduleStyle.textContent=`
 @media screen and (min-width:901px){
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .topbar{
   height:56px!important;min-height:56px!important;padding:5px 12px!important;gap:10px!important;
  }
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .breadcrumbs,
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .pageSubtitle,
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .center-board-bar{display:none!important}
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .titleLine h1{font-size:17px!important}
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .topActions>.topBtn{height:34px!important}
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .workspace{
   padding:5px 9px 6px!important;
  }
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .frameToolbar{
   height:30px!important;flex:0 0 30px!important;padding:0 10px!important;
  }
  body.clg-tabs-enabled:has(iframe.clgWorkFrame.is-active[data-page-id="p_calendar"]) .workspaceCard{
   border-radius:12px!important;
  }
 }
 @media print{#clg-calendar-focus-style{display:none}}
 `;
 document.head.appendChild(compactScheduleStyle);

 const supported=new Set(['p00','p01','p02','p03','p04','p05','p06','p07','p10','p11','p12','p13','p16','p17','p21','p23','p30','p34']);
 const resetPages=new Set(['p00','p01','p02','p03','p04','p05','p06','p07','p10','p11','p13','p16','p17','p20','p21','p23','p30','p34']);
 const regSelector='#iapRegNo,#clgIapRegNo,#clgSudangIapRegNo';
 const nameSelector='#clientName,#participantName,#participant_name,#counseleeName,#client_name,#personName';
 const prefix='clg_work_drafts_v1:';let owner=window.__CLG_JOURNAL_EMPLOYEE?.email||'';
 const installed=new WeakMap(),states=new Set();
 const tabs=()=>window.clgGetWorkTabs?.()||[];
 function read(){try{const all=JSON.parse(sessionStorage.getItem(prefix+owner)||'{}');let changed=false;for(const [key,row] of Object.entries(all)){if(row&&Number.isFinite(row.at)&&(Date.now()-row.at>24*3600000||row.at>Date.now()+60000)){delete all[key];changed=true}}if(changed)write(all);return all}catch{return {}}}
 function write(all){sessionStorage.setItem(prefix+owner,JSON.stringify(all))}
 function fields(doc){return [...doc.querySelectorAll('input,select,textarea')].filter(el=>!el.matches('[data-transient]')&&!el.closest('.clg-client-workspace')&&!el.closest('.clg-required-flow')&&!el.closest('#iapLoadConfirmDialog')&&!(el.tagName==='INPUT'&&['file','password','button','submit','reset','hidden'].includes(el.type)))}

 // Nested high-school counseling screens are srcdoc iframes. Include their real
 // consultation fields in snapshots rather than saving only the wrapper selector.
 function childFrameKey(fr,index){return 'frame:'+String(fr.id||'index-'+index)+'|'}
 function scopedFields(doc){
  const all=[],seen=new Set();
  function visit(d,scope,depth){
   if(!d||seen.has(d)||depth>3)return;seen.add(d);
   fields(d).forEach((el,index)=>all.push({el,key:scope+(el.id?'id:'+el.id:el.name?'name:'+el.name:'index:'+index)}));
   [...d.querySelectorAll('iframe')].forEach((fr,index)=>{
    try{if(fr.contentDocument?.body)visit(fr.contentDocument,scope+childFrameKey(fr,index),depth+1)}catch{}
   });
  }
  visit(doc,'',0);return all;
 }
 function collectEmbeddedNative(doc){
  const result={},seen=new Set();
  function visit(d,scope,depth){
   if(!d||seen.has(d)||depth>3)return;seen.add(d);
   [...d.querySelectorAll('iframe')].forEach((fr,index)=>{
    const key=scope+childFrameKey(fr,index);
    try{
     if(!fr.contentDocument?.body)return;
     const data=fr.contentWindow?.clgWorkspaceState?.collect?.();
     if(data)result[key]=data;
     visit(fr.contentDocument,key,depth+1);
    }catch{}
   });
  }
  visit(doc,'',0);return result;
 }
 function restoreEmbeddedNative(doc,values,onlyPrefix=''){
  if(!values||typeof values!=='object')return;
  const seen=new Set();
  function visit(d,scope,depth){
   if(!d||seen.has(d)||depth>3)return;seen.add(d);
   [...d.querySelectorAll('iframe')].forEach((fr,index)=>{
    const key=scope+childFrameKey(fr,index);
    try{
     if(!fr.contentDocument?.body)return;
     if((!onlyPrefix||key.startsWith(onlyPrefix))&&values[key]&&fr.contentWindow?.clgWorkspaceState?.apply){
      fr.contentWindow.clgWorkspaceState.apply(values[key]);
     }
     visit(fr.contentDocument,key,depth+1);
    }catch{}
   });
  }
  visit(doc,'',0);
 }
 function take(doc){
  const counts={};
  return scopedFields(doc).map(({el,key})=>{
   const n=counts[key]||0;counts[key]=n+1;
   return {key,n,value:el.type==='checkbox'||el.type==='radio'?el.checked:el.value};
  });
 }
 function restoreFields(doc,values,onlyPrefix=''){
  const counts={},map=new Map();
  scopedFields(doc).forEach(({el,key})=>{const n=counts[key]||0;counts[key]=n+1;map.set(key+':'+n,el)});
  const apply=dispatch=>{
   for(const item of values||[]){
    if(onlyPrefix&&!String(item.key||'').startsWith(onlyPrefix))continue;
    const el=map.get(item.key+':'+item.n);if(!el)continue;
    if(el.type==='checkbox'||el.type==='radio')el.checked=!!item.value;
    else{
     if(el.tagName==='SELECT'&&item.value&&!Array.from(el.options).some(o=>o.value===item.value))el.add(new el.ownerDocument.defaultView.Option(item.value,item.value));
     el.value=String(item.value??'');
    }
    if(dispatch){const W=el.ownerDocument.defaultView;el.dispatchEvent(new W.Event('input',{bubbles:true}));el.dispatchEvent(new W.Event('change',{bubbles:true}));}
   }
  };
  apply(true);apply(false);
 }
 function syncClient(s){const reg=s.flow?.reg||s.doc.querySelector(regSelector)?.value?.trim()||'',name=s.doc.querySelector(nameSelector)?.value?.trim()||'';const client={reg,name,key:reg||s.tab.draftId};if(JSON.stringify(client)!==JSON.stringify(s.client)){s.client=client;window.clgSetWorkTabClient?.(s.tab.id,client)}}
 function save(s){if(!owner||s.closed||s.restoring)return;try{syncClient(s);const snapshot={version:1,page:s.tab.pageId,at:Date.now(),client:s.client,fields:take(s.doc),native:s.win.clgWorkspaceState?.collect?.()||null,embedded:collectEmbeddedNative(s.doc)};if(JSON.stringify(snapshot).length>500000)throw Error('초안 용량 초과');const all=read();all[s.tab.draftId]=snapshot;write(all);s.draftStatus='saved'}catch{s.draftStatus='error'}}
 function schedule(s){if(s.restoring||s.closed)return;clearTimeout(s.timer);s.timer=setTimeout(()=>save(s),500)}
 function hydrate(s){if(!owner||s.hydrated===owner||s.closed)return;s.hydrated=owner;const saved=read()[s.tab.draftId];
  if(!saved||saved.version!==1||saved.page!==s.tab.pageId||Date.now()-saved.at>24*3600000||saved.at>Date.now()+60000||s.edited)return;
  try{s.restoring=true;if(saved.native&&s.win.clgWorkspaceState?.apply)s.win.clgWorkspaceState.apply(saved.native);restoreEmbeddedNative(s.doc,saved.embedded);restoreFields(s.doc,saved.fields);syncClient(s);s.draftStatus='restored'}catch{s.draftStatus='error'}finally{s.restoring=false}
 }

 // Mandatory registration -> local lookup -> edit -> confirmed save workflow.
 // The parent owns the guard so the legacy embedded forms keep their own logic.
 const requiredPages=new Set(['p01','p02','p03','p04','p05','p06','p07','p10','p11','p12','p13','p16','p17','p21','p23','p30','p34']);
 const requiredStoragePrefix='clg_required_consult_records_v1:';
 function requiredDbKey(){return requiredStoragePrefix+encodeURIComponent(owner)}
 function requiredStorage(){return window.GoodJobPrivacy?.storage||window.localStorage}
 function readRequiredDb(){
  try{const row=JSON.parse(requiredStorage().getItem(requiredDbKey())||'{}');return row&&typeof row==='object'&&!Array.isArray(row)?row:{}}catch{return {}}
 }
 function nativeIapRecord(reg){
  try{const db=JSON.parse(requiredStorage().getItem('iap_participant_records_v1')||'{}');return db?.records?.[reg]||null}catch{return null}
 }
 function installRequiredFlow(s){
  if(!requiredPages.has(s.tab.pageId)||s.closed||s.flow||!s.doc?.body)return;
  const doc=s.doc,win=s.win,originalReg=doc.querySelector(regSelector);
  const style=doc.createElement('style');style.id='clg-required-flow-style';
  style.textContent=[
   '.clg-required-flow{font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-sizing:border-box!important;color:#1c3455!important}',
   '.clg-required-flow *{box-sizing:border-box!important}',
   '.clg-required-flow button{cursor:pointer!important;border:0!important;border-radius:8px!important;padding:9px 15px!important;font-size:13px!important;font-weight:800!important;line-height:1.3!important}',
   '.clg-required-flow .clg-flow-primary{background:#1d4ed8!important;color:white!important}',
   '.clg-required-flow .clg-flow-input{height:42px!important;border:1px solid #a9bbd2!important;background:white!important;color:#14223a!important;border-radius:8px!important;padding:8px 12px!important;font-size:15px!important;letter-spacing:.4px!important;min-width:0!important;width:100%!important}',
   '.clg-required-flow .clg-flow-hint{font-size:12px!important;line-height:1.55!important;color:#48617c!important;margin:8px 0 0!important}',
   '#clgRequiredFlowGate{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(232,239,248,.97)!important;padding:18px!important;overflow:auto!important}',
   '#clgRequiredFlowGate .clg-flow-dialog{background:white!important;max-width:480px!important;width:100%!important;border:1px solid #c9d6e8!important;border-radius:18px!important;padding:25px!important;box-shadow:0 16px 42px #18365c25!important}',
   '#clgRequiredFlowGate .clg-flow-title{font-size:20px!important;font-weight:900!important;margin:9px 0 7px!important;color:#153252!important}',
   '#clgRequiredFlowGate .clg-flow-steps{font-size:12px!important;color:#244e86!important;font-weight:800!important}',
   '#clgRequiredFlowGate .clg-flow-grid{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;margin-top:17px!important}',
   '#clgRequiredFlowGate .clg-flow-error{color:#b42318!important;min-height:19px!important}',
   '#clgRequiredFlowBar[hidden]{display:none!important}#clgRequiredFlowBar{position:sticky!important;top:0!important;z-index:214748100!important;display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;min-height:55px!important;padding:10px 14px!important;margin:0 0 12px!important;background:#f1f7ff!important;border:1px solid #bfd5f3!important;border-radius:11px!important;box-shadow:0 5px 15px #19375c10!important}',
   '#clgRequiredFlowBar .clg-flow-number{font-size:13px!important;font-weight:850!important;color:#163c70!important;word-break:break-all!important}',
   '#clgRequiredFlowBar .clg-flow-status{font-size:12px!important;color:#9f2c22!important;font-weight:800!important}',
   '#clgRequiredFlowBar .clg-flow-status.saved{color:#11633e!important}',
   '#clgRequiredFlowBar button{margin-left:auto!important}',
   '@media(max-width:540px){#clgRequiredFlowGate .clg-flow-dialog{padding:17px!important}#clgRequiredFlowGate .clg-flow-grid{grid-template-columns:1fr!important}#clgRequiredFlowBar button{margin-left:0!important;width:100%!important}}',
   '@media print{#clgRequiredFlowBar,#clgRequiredFlowGate{display:none!important}}'
  ].join('');
  doc.head.appendChild(style);
  // These six native cards only store selected shared fields; the unified save also stores the complete form.
  const nativeCommon=doc.getElementById('clgIapLinkCard');
  if(nativeCommon)nativeCommon.style.setProperty('display','none','important');
  const gate=doc.createElement('div');gate.id='clgRequiredFlowGate';gate.className='clg-required-flow';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');
  gate.innerHTML='<div class="clg-flow-dialog"><div class="clg-flow-steps">필수 절차 ① 등록번호 → ② 검색 → ③ 상담작성 → ④ 저장</div><div class="clg-flow-title">상담 전 IAP 등록번호 검색</div><p class="clg-flow-hint">등록번호를 입력하고 반드시 [검색]을 눌러야 상담 화면을 작성할 수 있습니다. 저장하지 않은 작성내용은 상담 완료로 표시되지 않습니다.</p><div class="clg-flow-grid"><input id="clgFlowRegister" class="clg-flow-input" type="text" autocomplete="off" placeholder="예: A12345678901" aria-label="IAP 등록번호"><button type="button" id="clgFlowLookup" class="clg-flow-primary">등록번호 검색</button></div><p id="clgFlowError" class="clg-flow-hint clg-flow-error" role="alert"></p><p class="clg-flow-hint">※ 이 검색은 통합본에 저장된 자료를 확인합니다. 고용24 서버의 실시간 조회가 아닙니다.</p></div>';
  const bar=doc.createElement('div');bar.id='clgRequiredFlowBar';bar.className='clg-required-flow';bar.hidden=true;
  bar.innerHTML='<div class="clg-flow-number" id="clgFlowNumber"></div><div class="clg-flow-status" id="clgFlowStatus" role="status">③ 상담내용 작성 후 저장하세요.</div><button type="button" id="clgFlowSave" class="clg-flow-primary">④ 상담내용 저장</button>';
  doc.body.prepend(bar);doc.body.appendChild(gate);
  const covered=[...doc.body.children].filter(el=>el!==bar&&el!==gate).map(el=>({el,wasInert:el.inert}));
  const lockEditor=()=>covered.forEach(({el})=>{el.inert=true});
  const unlockEditor=()=>covered.forEach(({el,wasInert})=>{el.inert=wasInert});
  lockEditor();
  const id=x=>doc.getElementById(x);
  const noInput=id('clgFlowRegister'),lookupBtn=id('clgFlowLookup'),saveBtn=id('clgFlowSave');
  const flow={reg:'',searched:false,dirty:false,revision:null,savedFingerprint:null,stored:false,needsSave:null};
  s.flow=flow;
  const fingerprint=()=>JSON.stringify(take(doc));
  const show=(message,saved=false)=>{const label=id('clgFlowStatus');if(!label)return;label.textContent=message;label.classList.toggle('saved',saved)};
  const alertGate=msg=>{id('clgFlowError').textContent=msg;noInput.focus()};
  const storageKey=reg=>s.tab.pageId+'|'+reg;
  flow.needsSave=()=>flow.searched&&(flow.savedFingerprint!==null?fingerprint()!==flow.savedFingerprint:flow.dirty);
  function markEdited(){
   if(!flow.searched||s.restoring||s.closed)return;
   flow.dirty=true;show('● 저장되지 않은 변경사항이 있습니다. [상담내용 저장]을 눌러주세요.');
  }
  // Embedded school forms load asynchronously after the parent page. Re-apply only
  // that child's saved fields at its load event, never overwrite the outer form.
  const watchedFrames=new WeakSet(),watchedChildDocs=new WeakSet();
  function watchNested(d,scope='',depth=0){
   if(!d||depth>3)return;
   if(d!==doc&&!watchedChildDocs.has(d)){
    watchedChildDocs.add(d);
    d.addEventListener('input',()=>{markEdited();schedule(s)});
    d.addEventListener('change',()=>{markEdited();schedule(s)});
   }
   [...d.querySelectorAll('iframe')].forEach((fr,index)=>{
    const path=scope+childFrameKey(fr,index);
    if(!watchedFrames.has(fr)){
     watchedFrames.add(fr);
     fr.addEventListener('load',()=>{
      try{
       if(!fr.contentDocument?.body)return;
       watchNested(fr.contentDocument,path,depth+1);
       if(flow.searched&&flow.pendingPrevious){
        const wasDirty=flow.dirty;
        s.restoring=true;
        try{
         restoreEmbeddedNative(doc,flow.pendingPrevious.embedded,path);
         restoreFields(doc,flow.pendingPrevious.fields||[],path);
        }finally{s.restoring=false}
        if(!wasDirty){
         flow.savedFingerprint=fingerprint();flow.dirty=false;
         show('✓ 이전 상담자료를 내부 화면까지 불러왔습니다.',true);
        }else{
         show('● 다른 입력내용에 미저장 변경사항이 남아 있습니다. 저장을 확인하세요.');
        }
       }else if(flow.searched&&!flow.dirty&&!flow.stored){
        flow.initialFingerprint=fingerprint();
       }
      }catch{}
     });
    }
    try{if(fr.contentDocument?.body)watchNested(fr.contentDocument,path,depth+1)}catch{}
   });
  }
  watchNested(doc);
  function lookup(){
   const reg=(noInput.value||'').replace(/\s+/g,'').toUpperCase();
   if(!/^A\d{10,}$/.test(reg))return alertGate('A로 시작하는 IAP 등록번호(숫자 10자리 이상)를 확인해 주세요.');
   if(!owner)return alertGate('상담사 계정으로 로그인한 후 검색해 주세요.');
   const prior=(originalReg?.value||'').trim().toUpperCase();
   if(prior&&prior!==reg)return alertGate('현재 탭에 다른 등록번호의 작성내용이 있습니다. 해당 번호로 검색하거나 새 작업 탭을 사용해 주세요.');
   // Check the saved record before native lookup. Never mix records from different people.
   const previous=s.tab.pageId==='p05'?nativeIapRecord(reg):readRequiredDb()[storageKey(reg)];
   const nativeLoad=doc.getElementById(s.tab.pageId==='p05'?'iapParticipantLoadBtn':'clgIapCommonLoadBtn');
   try{
    unlockEditor();
    if(originalReg){originalReg.value=reg;originalReg.dispatchEvent(new win.Event('input',{bubbles:true}));}
    // Native IAP snapshots every input when checking whether the form changed.
    // Remove our temporary registration field BEFORE that asynchronous lookup
    // begins, otherwise the form fingerprint changes while its modal is open.
    gate.remove();
    if(nativeLoad)nativeLoad.click();
    if(previous&&s.tab.pageId!=='p05'){
     s.restoring=true;
     try{
      if(previous.native&&win.clgWorkspaceState?.apply)win.clgWorkspaceState.apply(previous.native);
      restoreEmbeddedNative(doc,previous.embedded);
      restoreFields(doc,previous.fields||[]);
     }finally{s.restoring=false}
     if(originalReg)originalReg.value=reg;
    }
   }catch(e){if(!gate.isConnected)doc.body.appendChild(gate);lockEditor();return alertGate('기존 기록을 불러오지 못했습니다. 검색을 다시 실행해 주세요.')}
   flow.reg=reg;flow.searched=true;flow.stored=!!previous;flow.pendingPrevious=previous||null;
   flow.revision=previous?.revision||null;
   flow.dirty=false;flow.savedFingerprint=previous?fingerprint():null;flow.initialFingerprint=fingerprint();
   id('clgFlowNumber').textContent='IAP '+reg+' · ① 번호 확인 ② 검색 완료';
   bar.hidden=false;gate.remove();
   syncClient(s);
   show(previous?'✓ 검색 완료 · 기존 저장자료 확인. 수정 후 다시 저장하세요.':'✓ 검색 완료 · 이 화면에 저장된 자료가 없습니다. 신규 작성 후 저장하세요.',!!previous);
   // IAP has its own async confirmation/optimistic lock: never overwrite with a parallel snapshot.
   if(s.tab.pageId==='p05'&&previous){
    const nativeStatus=id('iapParticipantStatus');
    const observer=new win.MutationObserver(()=>{
     const msg=nativeStatus?.textContent||'';
     if(msg.includes('검색 완료')){
      flow.savedFingerprint=fingerprint();flow.dirty=false;
      show('✓ 기존 IAP 검색 완료 · 상담 수정 후 저장하세요.',true);
      observer.disconnect();
     }
    });
    if(nativeStatus)observer.observe(nativeStatus,{childList:true,subtree:true,characterData:true});
    win.setTimeout(()=>observer.disconnect(),90000);
   }
  }
  function saveConsultation(){
   if(!flow.searched||!flow.reg){show('IAP 등록번호 검색부터 완료해 주세요.');return}
   if(!owner){show('직원 로그인 상태를 확인한 뒤 저장해 주세요.');return}
   if((originalReg?.value||flow.reg).trim().toUpperCase()!==flow.reg){show('입력된 등록번호가 검색한 번호와 다릅니다. 저장을 중단했습니다.');return}
   if(!flow.stored&&!flow.dirty&&fingerprint()===flow.initialFingerprint){
    show('상담내용을 먼저 작성한 다음 저장해 주세요.');return;
   }
   const reg=flow.reg;
   if(s.tab.pageId==='p05'){
    const before=nativeIapRecord(reg);
    try{id('iapParticipantSaveBtn')?.click()}catch{show('IAP 저장이 실패했습니다. 다시 확인해 주세요.');return}
    const after=nativeIapRecord(reg);
    const changed=!!after&&JSON.stringify(before)!==JSON.stringify(after);
    if(!after||(!changed&&flow.needsSave())){
     show('IAP 저장 확인이 되지 않았습니다. 화면의 오류·수정사유를 확인하세요.');return;
    }
    flow.stored=true;flow.savedFingerprint=fingerprint();flow.dirty=false;
    show('✓ IAP 저장 확인 완료 · '+new Date().toLocaleTimeString('ko-KR'),true);
    return;
   }
   const key=storageKey(reg),database=readRequiredDb(),latest=database[key]||null;
   if(latest && latest.revision!==flow.revision){
    show('다른 작업 탭에서 이 상담기록이 수정됐습니다. 새 탭에서 재검색 후 확인해 주세요.');return;
   }
   const snapshot={version:1,page:s.tab.pageId,reg,updatedAt:new Date().toISOString(),revision:(latest?.revision||0)+1,fields:take(doc),native:win.clgWorkspaceState?.collect?.()||null,embedded:collectEmbeddedNative(doc)};
   if(JSON.stringify(snapshot).length>300000){show('입력 데이터가 너무 커서 저장하지 못했습니다. 대용량 첨부·내용을 확인하세요.');return}
   try{
    // Keep the legacy shared profile mapping, but never mistake it for a full counseling save.
    database[key]=snapshot;
    requiredStorage().setItem(requiredDbKey(),JSON.stringify(database));
    const check=readRequiredDb()[key];
    if(!check||check.revision!==snapshot.revision)throw Error('저장 검증 실패');
    doc.getElementById('clgIapCommonSaveBtn')?.click();
   }catch(e){show('저장 실패 · 브라우저 저장공간 또는 접속 환경을 확인해 주세요.');return}
   flow.stored=true;flow.revision=snapshot.revision;
   flow.savedFingerprint=fingerprint();flow.dirty=false;
   show('✓ 상담내용 전체 저장 완료 · '+new Date().toLocaleTimeString('ko-KR'),true);
  }
  lookupBtn.addEventListener('click',lookup);
  noInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookup()}});
  saveBtn.addEventListener('click',saveConsultation);
  doc.addEventListener('input',e=>{if(!e.target.closest?.('.clg-required-flow'))markEdited()});
  doc.addEventListener('change',e=>{if(!e.target.closest?.('.clg-required-flow'))markEdited()});
  // Native IAP save buttons also count if their own persisted record has actually changed.
  if(s.tab.pageId==='p05'){
   doc.addEventListener('click',e=>{
    if(!flow.searched||!e.target.closest?.('#iapParticipantSaveBtn,#iapEditSaveBtn'))return;
    win.setTimeout(()=>{
     const saved=nativeIapRecord(flow.reg);
     if(saved&&!flow.needsSave()){flow.stored=true;flow.savedFingerprint=fingerprint();flow.dirty=false;show('✓ IAP 저장된 내용 확인',true)}
    },0);
   });
  }
  if(s.tab.frame.classList.contains('is-active'))win.setTimeout(()=>noInput.focus(),40);
 }
 // Existing tab-close button is outside the iframe: confirm deliberate discard rather than losing changes silently.
 document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.clgWorkTabClose');
  if(!btn)return;
  const tabId=btn.closest('.clgWorkTab')?.dataset.tabId;
  const state=[...states].find(x=>x.tab.id===tabId&&!x.closed);
  if(!state?.flow?.needsSave?.())return;
  if(!window.confirm('저장하지 않은 상담내용이 있습니다.\n취소를 누르고 상담내용을 저장하세요.\n\n저장하지 않고 이 탭의 작성내용을 폐기하시겠습니까?')){
   e.preventDefault();e.stopImmediatePropagation();
   try{state.doc.getElementById('clgFlowSave')?.focus()}catch{}
  }
 },true);
 window.addEventListener('beforeunload',e=>{
  if(![...states].some(s=>!s.closed&&s.flow?.needsSave?.()))return;
  e.preventDefault();e.returnValue='';
 });

 function attach(tab){if(tab.frame.dataset.external==='1')return;let doc,win;try{doc=tab.frame.contentDocument;win=tab.frame.contentWindow}catch{return}if(!doc?.body||doc.readyState==='loading')return;
  if(resetPages.has(tab.pageId)&&!doc.getElementById('clgConsultResetBar')){
    const bar=doc.createElement('div');bar.id='clgConsultResetBar';bar.className='clg-consult-controls';
    bar.style.cssText='display:flex;justify-content:flex-end;padding:5px 10px;max-width:1200px;margin:0 auto';
    const button=doc.createElement('button');button.type='button';button.id='clgConsultResetBtn';button.textContent='↺ 현재 상담 초기화';
    button.title='현재 탭의 입력과 결과만 초기화합니다. 저장된 상담자료는 유지됩니다.';
    button.style.cssText='width:auto;margin:0;padding:6px 11px;border:1px solid #e6a4a4;border-radius:7px;background:#fff;color:#a32929;font-size:12px;white-space:nowrap;align-self:center;cursor:pointer';
    button.onclick=()=>window.clgResetWorkTab?.(tab.id);bar.appendChild(button);const host=tab.pageId==='p20'?doc.querySelector('.header'):null;if(host)host.append(bar);else doc.body.prepend(bar);
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
  installRequiredFlow(s);
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
