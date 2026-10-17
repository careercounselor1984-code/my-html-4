/* Independent client tabs. Session drafts are not committed counseling records. */
(()=>{'use strict';
 if(window.__CLG_CLIENT_WORKSPACE__)return;window.__CLG_CLIENT_WORKSPACE__=true;
 const supported=new Set(['p00','p01','p02','p03','p04','p05','p06','p07','p10','p11','p13','p16','p17','p30','p34']);
 const regSelector='#iapRegNo,#clgIapRegNo,#clgSudangIapRegNo';
 const nameSelector='#clientName,#participantName,#participant_name,#counseleeName,#client_name,#personName';
 const prefix='clg_work_drafts_v1:';let owner=window.__CLG_JOURNAL_EMPLOYEE?.email||'';
 const installed=new WeakMap(),states=new Set();
 const tabs=()=>window.clgGetWorkTabs?.()||[];
 function read(){try{return JSON.parse(sessionStorage.getItem(prefix+owner)||'{}')}catch{return {}}}
 function write(all){sessionStorage.setItem(prefix+owner,JSON.stringify(all))}
 function fields(doc){return [...doc.querySelectorAll('input,select,textarea')].filter(el=>!el.closest('.clg-client-workspace')&&!(el.tagName==='INPUT'&&['file','password','button','submit','reset','hidden'].includes(el.type)))}
 function take(doc){const counts={};return fields(doc).map((el,index)=>{const key=el.id?'id:'+el.id:el.name?'name:'+el.name:'index:'+index;const n=counts[key]||0;counts[key]=n+1;return {key,n,value:el.type==='checkbox'||el.type==='radio'?el.checked:el.value}})}
 function restoreFields(doc,values){const counts={},map=new Map();fields(doc).forEach((el,index)=>{const key=el.id?'id:'+el.id:el.name?'name:'+el.name:'index:'+index;const n=counts[key]||0;counts[key]=n+1;map.set(key+':'+n,el)});
  const apply=dispatch=>{for(const item of values||[]){const el=map.get(item.key+':'+item.n);if(!el)continue;if(el.type==='checkbox'||el.type==='radio')el.checked=!!item.value;else{if(el.tagName==='SELECT'&&item.value&&!Array.from(el.options).some(o=>o.value===item.value))el.add(new doc.defaultView.Option(item.value,item.value));el.value=String(item.value??'')}if(dispatch){el.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));el.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}))}}};apply(true);apply(false);
 }
 function setStatus(s,text){s.status.textContent=text}
 function setClient(s,value){const client={reg:String(value.reg||'').trim(),name:String(value.name||'').trim(),key:value.key||s.client?.key||s.tab.draftId};s.client=client;window.clgSetWorkTabClient?.(s.tab.id,client);s.name.value=client.name;s.reg.value=client.reg;const nativeName=s.doc.querySelector(nameSelector);if(nativeName&&nativeName.value!==client.name){nativeName.value=client.name;nativeName.dispatchEvent(new s.win.Event('input',{bubbles:true}))}const native=s.doc.querySelector(regSelector);if(native){native.readOnly=!!client.reg;native.title=client.reg?'이 탭의 등록번호입니다. 다른 내담자는 새 탭으로 여세요.':''}s.reg.readOnly=!!client.reg}
 function save(s){if(!owner||s.closed||s.restoring)return;try{const snapshot={version:1,page:s.tab.pageId,at:Date.now(),client:s.client,fields:take(s.doc),native:s.win.clgWorkspaceState?.collect?.()||null};if(JSON.stringify(snapshot).length>500000)throw Error('초안 용량 초과');const all=read();all[s.tab.draftId]=snapshot;write(all);setStatus(s,'초안 저장됨 · 이 브라우저 탭에서 새로고침 후 복원 · 기록 저장/전산 반영은 별도')}catch{setStatus(s,'초안 저장 실패 · 현재 내용은 별도로 저장해 주세요.')}}
 function schedule(s){if(s.restoring||s.closed)return;clearTimeout(s.timer);setStatus(s,'작성 중 · 초안 보관 대기');s.timer=setTimeout(()=>save(s),500)}
 function openOther(s,reg=''){save(s);const tab=reg?window.clgOpenClientWorkTab?.(s.tab.pageId,{reg,name:''}):window.clgOpenNewWorkTab?.(s.tab.pageId);if(!tab)setStatus(s,'새 탭을 열지 못했습니다. 사용하지 않는 작업 탭을 먼저 닫아주세요.');return tab}
 function guard(s,event){if(s.restoring)return false;const target=event.target,reg=s.doc.querySelector(regSelector)||s.reg;
  const isIdentity=target===reg||target===s.reg;
  const button=target.closest?.('button');const action=button&&(/검색|계획 확인|저장/.test(button.textContent||'')||/Load|Save/.test(button.id));
  if(!isIdentity&&!action)return false;
  const next=String(reg.value||'').trim();
  if(s.client.reg&&next!==s.client.reg){event.preventDefault();event.stopImmediatePropagation();reg.value=s.client.reg;s.reg.value=s.client.reg;if(next)openOther(s,next);else setStatus(s,'다른 내담자는 ‘다른 내담자 새 탭’으로 시작하세요.');return true}
  if(next&&!s.client.reg&&event.type!=='input'&&(event.type!=='keydown'||event.key==='Enter')){setClient(s,{...s.client,reg:next});schedule(s)}return false;
 }
 function hydrate(s){if(!owner||s.hydrated===owner||s.closed)return;s.hydrated=owner;const saved=read()[s.tab.draftId];
  if(!saved||saved.version!==1||saved.page!==s.tab.pageId||Date.now()-saved.at>24*3600000||saved.at>Date.now()+60000)return;
  if(s.edited){setStatus(s,'이전에 보관한 초안이 있습니다. 현재 입력은 유지했습니다.');return}
  try{s.restoring=true;if(saved.native&&s.win.clgWorkspaceState?.apply)s.win.clgWorkspaceState.apply(saved.native);restoreFields(s.doc,saved.fields);setClient(s,saved.client||{});setStatus(s,'입력 초안 복원됨 · 생성 결과와 날짜를 확인한 뒤 기록을 저장하세요.')}catch{setStatus(s,'초안 복원을 완료하지 못했습니다. 저장 기록을 확인해 주세요.')}finally{s.restoring=false}
 }
 function attach(tab){if(!supported.has(tab.pageId)||tab.frame.dataset.external==='1')return;let doc,win;try{doc=tab.frame.contentDocument;win=tab.frame.contentWindow}catch{return}if(!doc?.body||doc.readyState==='loading')return;if(installed.has(doc)){hydrate(installed.get(doc));return}for(const old of states){if(old.tab.id===tab.id&&old.doc!==doc){old.closed=true;clearTimeout(old.timer);states.delete(old)}}
  const box=doc.createElement('section');box.className='clg-client-workspace';box.setAttribute('aria-label','이 작업 탭의 내담자');box.innerHTML='<div class="clg-client-row"><label>내담자 이름 <input data-name autocomplete="off" maxlength="60" placeholder="탭에 표시할 이름"></label><label>등록번호 <input data-reg autocomplete="off" maxlength="100" placeholder="등록번호 (선택)"></label><button type="button" data-other>다른 내담자 새 탭</button></div><details><summary>같은 내담자 상담 열기</summary><div class="clg-client-row"><select data-page aria-label="열 상담 선택"></select><button type="button" data-open>이 내담자로 열기</button></div></details><small data-status role="status">각 탭의 입력은 따로 유지됩니다. 초안은 로그인 후 보관합니다.</small>';
  const style=doc.createElement('style');style.textContent='.clg-client-workspace{font:12px/1.5 system-ui,sans-serif;color:#36516e;border:1px solid #cbddec;background:#f4f9fe;border-radius:10px;padding:10px;margin:0 0 12px;box-sizing:border-box}.clg-client-row{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}.clg-client-row label{display:flex;flex-direction:column;gap:3px;flex:1;min-width:140px}.clg-client-workspace input,.clg-client-workspace select,.clg-client-workspace button{font:inherit!important;padding:7px 9px!important;min-height:34px!important;border:1px solid #bfcfe0!important;border-radius:7px!important;background:#fff!important;color:#294d72!important;box-sizing:border-box;width:auto}.clg-client-workspace input{width:100%}.clg-client-workspace input[readonly]{background:#edf3f8!important}.clg-client-workspace summary{cursor:pointer;margin:7px 0}.clg-client-workspace small{display:block;margin-top:6px;color:#627d96}@media print{.clg-client-workspace{display:none!important}}';doc.head.append(style);doc.body.prepend(box);
  const s={tab,doc,win,box,name:box.querySelector('[data-name]'),reg:box.querySelector('[data-reg]'),status:box.querySelector('[data-status]'),client:{reg:'',name:''},restoring:false,edited:false,closed:false,timer:null,hydrated:''};installed.set(doc,s);states.add(s);
  const nativeReg=doc.querySelector(regSelector),nativeName=doc.querySelector(nameSelector);if(tab.client?.reg&&nativeReg&&nativeReg.value.trim()!==tab.client.reg){if(nativeReg.value)win.clgWorkspaceState?.reset?.();nativeReg.value=''}setClient(s,tab.client||{reg:nativeReg?.value||'',name:nativeName?.value||''});
  win.clgWorkspaceBeforeIapApply=state=>{const reg=String(state?.fields?.['#iapRegNo']||'').trim();if(reg&&s.client.reg&&reg!==s.client.reg){openOther(s,reg);setStatus(s,'다른 내담자 자료는 새 탭에서 확인하세요. 현재 입력은 유지했습니다.');return false}return true};
  const page=box.querySelector('[data-page]');for(const entry of (typeof PAGES!=='undefined'?PAGES:[])){if(supported.has(entry.id)){const option=doc.createElement('option');option.value=entry.id;option.textContent=entry.title;page.append(option)}}page.value=tab.pageId==='p01'||tab.pageId==='p02'?'p03':'p05';
  box.querySelector('[data-other]').onclick=()=>openOther(s);
  box.querySelector('[data-open]').onclick=()=>{if(!s.client.reg&&!s.client.name){setStatus(s,'이름 또는 등록번호를 먼저 입력하세요.');s.name.focus();return}save(s);window.clgOpenClientWorkTab?.(page.value,s.client)};
  s.name.oninput=()=>{setClient(s,{...s.client,name:s.name.value});schedule(s)};
  s.reg.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();s.reg.dispatchEvent(new win.Event('change',{bubbles:true}))}};
  s.reg.onchange=()=>{if(!nativeReg&&!s.client.reg){setClient(s,{...s.client,reg:s.reg.value});schedule(s)}};
  for(const type of ['change','blur','click','keydown'])doc.addEventListener(type,event=>guard(s,event),true);
  const changed=event=>{if(s.restoring)return;s.edited=true;const reg=doc.querySelector(regSelector);if(event.type==='change'&&event.target===s.reg&&reg&&!s.client.reg){reg.value=s.reg.value;reg.dispatchEvent(new win.Event('change',{bubbles:true}))}if(event.target===nativeName)setClient(s,{...s.client,name:nativeName.value});schedule(s)};
  doc.addEventListener('input',changed);doc.addEventListener('change',changed);
  doc.addEventListener('click',event=>{const b=event.target.closest?.('button');if(b&&!b.closest('.clg-client-workspace'))setTimeout(()=>schedule(s),0)});
  hydrate(s);
  if(!s.client.reg&&tab.client?.reg)setClient(s,tab.client);
  if(s.client.reg&&nativeReg&&!nativeReg.value){nativeReg.value=s.client.reg;nativeReg.dispatchEvent(new win.Event('change',{bubbles:true}));const button=doc.getElementById('clgIapCommonLoadBtn')||doc.getElementById('clgSudangIapLoad');button?.click()}
 }
 function scan(){for(const tab of tabs())attach(tab)}
 window.addEventListener('clg-tab-frame-load',scan);window.addEventListener('clg-tab-switch',scan);document.addEventListener('load',e=>{if(e.target?.tagName==='IFRAME')setTimeout(scan,60)},true);
 window.addEventListener('clg-auth-ready',()=>{owner=window.__CLG_JOURNAL_EMPLOYEE?.email||'';scan()});
 window.addEventListener('clg-auth-logout',()=>{for(const s of states){clearTimeout(s.timer);s.hydrated=''}if(owner)sessionStorage.removeItem(prefix+owner);owner=''});
 window.addEventListener('clg-work-tab-close',e=>{for(const s of states)if(s.tab.id===e.detail.tabId){s.closed=true;clearTimeout(s.timer);states.delete(s)}if(owner){const all=read();delete all[e.detail.draftId];try{write(all)}catch{}}});
 window.addEventListener('pagehide',()=>{for(const s of states)save(s)});
 window.clgFlushWorkDrafts=()=>{for(const s of states)save(s)};
 scan();setTimeout(scan,250);setTimeout(scan,1000);
})();
