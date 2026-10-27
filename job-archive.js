/* 채용공고 보관함 v2: 통합 저장, 간결한 목록, 공유 분리 */
(()=>{
'use strict';
const TABLE='counselor_job_archive';
const fields=['company','title','duties','location','employment','education','experience','workHours','salary','deadline','url','source'];
const statuses={matched:1,api_only:1,page_only:1,conflict:1,unverified:1,manual:1,page_selected:1,api_selected:1};
const panels=new WeakMap();
const str=(v,n=1000)=>String(v||'').trim().slice(0,n);
function cleanVerification(v){
 if(v?.version!==2)return null;
 const out={version:2,checkedAt:str(v.checkedAt,40),postingId:str(v.postingId,30),apiState:['ok','not_supported','not_found','unavailable'].includes(v.apiState)?v.apiState:'unavailable',fields:{}};
 for(const [k,max] of [['duties',3000],['workHours',1000]]){
  const f=v.fields?.[k]||{};
  out.fields[k]={status:statuses[f.status]?f.status:'unverified',pageValue:str(f.pageValue,max),apiValue:str(f.apiValue,max)};
 }
 return out;
}
function cleanJob(v){
 const job={};for(const k of fields)job[k]=str(v?.[k],k==='duties'?3000:1000);
 if(job.url&&!/^https?:\/\//i.test(job.url))job.url='';
 const verification=cleanVerification(v?.verification);if(verification)job.verification=verification;return job;
}
async function context(){
 const c=window.clgJobArchiveClient?.();
 if(!c)throw Error('통합본에 로그인한 뒤 이용해 주세요.');
 const {data,error}=await c.auth.getUser();
 if(error||!data?.user?.id)throw Error('로그인 정보를 확인할 수 없습니다.');
 return {c,user:data.user};
}
async function keyOf(j){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(j.url||j.company+'__'+j.title));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
async function save(value){
 const {c,user}=await context(),job=cleanJob(value);
 if(!job.title&&!job.company)throw Error('공고 제목 또는 기업명이 필요합니다.');
 const job_key=await keyOf(job);
 // 같은 공고를 다시 저장해도 현재 공유 상태를 유지합니다.
 const {data,error}=await c.from(TABLE).upsert({owner_id:user.id,job_key,job},{onConflict:'owner_id,job_key'}).select('id').single();
 if(error)throw error;scan(true);return data;
}
function ready(){window.postMessage({type:'GOODJOB_ARCHIVE_READY'},location.origin)}
window.addEventListener('message',async e=>{
 if(e.source!==window||e.origin!==location.origin||e.data?.type!=='GOODJOB_ARCHIVE_SAVE')return;
 const requestId=String(e.data.requestId||'');
 if(!/^[a-f0-9-]{36}$/.test(requestId))return;
 try{await save(e.data.job);window.postMessage({type:'GOODJOB_ARCHIVE_RESULT',requestId,ok:true},location.origin)}
 catch(error){window.postMessage({type:'GOODJOB_ARCHIVE_RESULT',requestId,ok:false,message:error?.message||'저장 실패'},location.origin)}
});
function getFormJob(d){
 const val=id=>str(d.getElementById(id)?.value||'',id==='c_task'?3000:1000);
 const free=val('c_free_text'),title=val('c_title')||free.split('\n')[0].trim()||[val('c_name'),val('c_task')].filter(Boolean).join(' · ');
 const extra=val('c_etc'),deadline=(extra.match(/(?:마감일|접수마감|마감)\s*[:：]\s*([^/|\n]+)/)||[])[1]||'';
 return {title,company:val('c_name'),duties:val('c_task')||free,location:val('c_address'),
  employment:val('c_type'),education:val('c_edu'),experience:val('c_exp'),salary:val('c_salary'),
  workHours:val('c_work_hours'),deadline:deadline.trim(),url:val('c_link'),source:'통합본 채용정보&알선'};
}
function styles(d){
 if(d.getElementById('gjArchiveStyleV2'))return;
 const css=d.createElement('style');css.id='gjArchiveStyleV2';css.textContent="\nbody{padding:18px 14px!important}\n.main-wrapper{display:grid!important;grid-template-columns:minmax(0,1.45fr) minmax(340px,1fr);max-width:1640px!important;gap:18px!important;align-items:start}\n.form-panel,.history-panel{min-width:0!important;box-sizing:border-box}\n.form-panel{flex:none!important;padding:26px!important}\n.history-panel{flex:none!important;max-height:none!important;overflow:visible!important;padding:20px!important;display:block!important}\n.form-panel>h2{text-align:left;font-size:22px!important;margin-bottom:18px!important}\n.form-panel .form-group,.form-panel .form-group>*{min-width:0}\n.form-panel .btn-group{justify-content:flex-start!important;margin:20px 0 16px!important;gap:7px!important}\n.form-panel .btn-group button{padding:10px 12px!important;font-size:13px!important;box-shadow:none!important}\n.form-panel .btn-save{order:-4;background:#2563eb!important;color:#fff!important}\n.form-panel .btn-copy-log{order:-3;background:#eaf1ff!important;color:#1e40af!important}\n.form-panel .btn-copy-kakao{order:-2;background:#fff7db!important;color:#80570a!important}\n.form-panel .btn-copy-kakao-referral{order:-1;background:#fff1e5!important;color:#9a3412!important}\n.form-panel .btn-capture,.form-panel .btn-print-job{background:#edf2f7!important;color:#334155!important}\n.form-panel .btn-clear{margin-left:auto;background:#fff!important;color:#b42318!important;border:1px solid #fecaca!important}\n.gja{border:0;background:#fff;min-width:0;color:#172033;font-size:13px}\n.gja button{transform:none!important;box-shadow:none!important;min-height:32px;padding:6px 9px;border-radius:7px;font-size:12px;white-space:nowrap}\n.gja-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:13px}\n.gja-head strong{font-size:18px;color:#172033;letter-spacing:-.3px}\n.gja-head small{color:#64748b;font-weight:600}\n.gja-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0;gap:4px;margin-bottom:12px}\n.gja-tabs button{background:transparent;color:#64748b;border-radius:0;padding:10px 6px;border-bottom:2px solid transparent;font-size:13px}\n.gja-tabs button[aria-selected=\"true\"]{border-bottom-color:#2563eb;color:#1d4ed8;font-weight:800}\n.gja-search{width:100%;min-width:0;background:#fff!important;border:1px solid #cbd5e1!important;border-radius:8px;padding:10px 12px!important;font-size:13px;box-sizing:border-box}\n.gja-filter{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}\n.gja-filter select,.gja-filter input[type=\"date\"]{width:auto!important;flex:0 1 auto!important;min-height:32px;padding:5px 7px;font-size:12px;background:#fff}\n.gja-filter label{display:flex;gap:5px;align-items:center;font-size:12px;color:#475569}\n.gja-datebar{display:flex;align-items:center;gap:6px;margin-top:8px}\n.gja-datebar[hidden],.gja-tools[hidden],.gja-more[hidden]{display:none!important}\n.gja-datebar input[type=\"date\"]{width:auto;min-width:0;flex:1;font-size:12px;padding:6px}\n.gja-datebar span{color:#64748b;font-size:12px;white-space:nowrap}\n.gja-tools{display:flex;align-items:center;flex-wrap:wrap;gap:5px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;padding:8px;margin:12px 0 5px}\n.gja-tools label{display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:12px;color:#475569;margin-right:auto}\n.gja-tools label input{width:15px;height:15px;margin:0;accent-color:#2563eb}\n.gja-action{background:#e9f1ff!important;color:#1d4ed8!important;font-weight:700}\n.gja-action:disabled{opacity:.45;cursor:not-allowed}\n.gja-action.danger{background:#fff1f2!important;color:#be123c!important}\n.gja-status{font-size:12px;color:#64748b;min-height:20px;margin:9px 0;line-height:1.5;overflow-wrap:anywhere}\n.gja-list{display:flex;flex-direction:column;gap:7px}\n.gja-item{border:1px solid #e2e8f0;border-radius:10px;padding:10px 11px;background:#fff;min-width:0}\n.gja-item:hover{border-color:#93c5fd;background:#fbfdff}\n.gja-line{display:flex;align-items:flex-start;gap:7px;min-width:0}\n.gja-line input[type=\"checkbox\"]{flex:0 0 15px;width:15px;height:15px;margin:4px 0 0;accent-color:#2563eb}\n.gja-main{flex:1;min-width:0}\n.gja-title{font-size:13px;font-weight:800;line-height:1.43;word-break:keep-all;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.gja-sub{color:#64748b;font-size:12px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}\n.gja-meta{display:flex;flex-wrap:wrap;gap:5px;align-items:center;color:#64748b;font-size:11px;margin-top:5px}\n.gja-tag{border-radius:5px;padding:1px 6px;background:#eaf2ff;color:#1d4ed8;font-size:10px;font-weight:700}\n.gja-bottom{display:flex;gap:6px;margin-top:8px;padding-left:22px}\n.gja-bottom button,.gja-bottom a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155;padding:5px 10px;font-size:12px;font-weight:700;min-height:28px;cursor:pointer}\n.gja-bottom .gja-load{color:#1d4ed8;border-color:#bfdbfe;background:#eff6ff}\n.gja-empty{border:1px dashed #cbd5e1;padding:28px 12px;text-align:center;color:#64748b;border-radius:10px}\n.gja-more{width:100%;background:#f1f5f9;color:#475569;margin-top:10px}\n.gja-legacy{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:12px}\n.gja-legacy>summary{cursor:pointer;color:#64748b;font-size:12px;font-weight:700;list-style:revert;padding:5px 0}\n.gja-legacy>h3{margin-top:12px;font-size:14px}\n.gja-legacy #historyList{max-height:340px;overflow-y:auto}\n@media(max-width:780px){.main-wrapper{grid-template-columns:minmax(0,1fr)!important}.form-panel,.history-panel{padding:18px!important}}\n";d.head.appendChild(css);
}
function mount(frame){
 let d;try{d=frame.contentDocument}catch{return}
 if(!d?.getElementById('c_task')||!d.getElementById('historyList'))return;
 if(panels.has(d))return panels.get(d);
 styles(d);
 const anchor=d.getElementById('historyList').parentElement,box=d.createElement('section');
 box.className='gja';box.id='jobArchivePanel';box.setAttribute('aria-label','채용공고 보관함');
 box.innerHTML=
  '<div class="gja-head"><strong>채용공고 보관함</strong><small data-count>불러오는 중</small></div>'+
  '<div class="gja-tabs" role="tablist"><button type="button" data-tab="mine" role="tab" aria-selected="true">내 보관함</button><button type="button" data-tab="shared" role="tab" aria-selected="false">상담사 공유</button></div>'+
  '<input class="gja-search" data-query type="search" placeholder="기업명 · 직무 · 지역 검색" aria-label="공고 검색">'+
  '<div class="gja-filter"><select data-period aria-label="보관 기간"><option value="all">전체 기간</option><option value="today">오늘</option><option value="date">날짜 지정</option></select><label><input data-open type="checkbox">마감 공고 숨기기</label><button type="button" data-refresh>새로고침</button></div>'+
  '<div class="gja-datebar" data-datebar hidden><button type="button" data-prev aria-label="이전 날짜">‹</button><input data-date type="date" aria-label="보관 날짜"><span data-weekday></span><button type="button" data-next aria-label="다음 날짜">›</button><button type="button" data-today>오늘</button></div>'+
  '<div class="gja-tools" data-tools><label><input type="checkbox" data-selectall><span data-selected>0건 선택</span></label><button type="button" class="gja-action" data-share disabled>선택 공유</button><button type="button" class="gja-action" data-unshare disabled hidden>공유 해제</button><button type="button" class="gja-action danger" data-delete disabled>삭제</button></div>'+
  '<p class="gja-status" data-status role="status" aria-live="polite"></p><div class="gja-list" data-list></div><button class="gja-more" data-more type="button" hidden>더 보기</button>';
 // 이전 PC 기록, 필터, 백업 UI는 '기존 PC 저장 내역' 아래로 보존합니다.
 const legacy=d.createElement('details');legacy.className='gja-legacy';legacy.id='gjLegacyHistory';
 const summary=d.createElement('summary');summary.textContent='기존 PC 저장 내역 · 백업';legacy.append(summary);
 for(const node of Array.from(anchor.children))legacy.append(node);
 anchor.append(box,legacy);
 const q=s=>box.querySelector(s);
 let rows=[],uid='',page=0,busy=false,epoch=0,visible=[],loadedJob=null;
 const checked=new Set(),batch=100;
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
 q('[data-date]').value=today();
 const scope=()=>q('[data-tab="shared"]').getAttribute('aria-selected')==='true'?'shared':'mine';
 const message=s=>q('[data-status]').textContent=s;
 const weekday=()=>q('[data-weekday]').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'short'}).format(new Date(q('[data-date]').value+'T12:00:00+09:00'));
 const dateBounds=()=>{const date=q('[data-period]').value==='today'?today():q('[data-date]').value,start=new Date(date+'T00:00:00+09:00');return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()}};
 function expired(j){const m=str(j.deadline).match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);return !!m&&(m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'))<today()}
 function button(label,fn,cls){
  const b=d.createElement('button');b.type='button';b.textContent=label;if(cls)b.className=cls;
  b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){message('처리 실패: '+e.message)}finally{b.disabled=false}};return b;
 }
 function load(j){
  loadedJob=j;
  const map={c_title:'title',c_name:'company',c_task:'duties',c_address:'location',c_type:'employment',c_salary:'salary',c_work_hours:'workHours',c_link:'url'};
  for(const [id,k]of Object.entries(map)){const el=d.getElementById(id);if(el)el.value=j[k]||(['duties','workHours'].includes(k)?'미확인':'')}
  for(const id of ['c_free_text','c_work_days','c_add_note']){const el=d.getElementById(id);if(el)el.value=''}
  const extra=d.getElementById('c_etc');
  if(extra)extra.value=[j.experience?'경력: '+j.experience:'',j.education?'학력: '+j.education:'',j.deadline?'마감: '+j.deadline:''].filter(Boolean).join(' / ');
  for(const [id,k]of [['c_exp','experience'],['c_edu','education']]){
   const el=d.getElementById(id);if(!el)continue;el.selectedIndex=-1;
   if(j[k]){if(!Array.from(el.options).some(o=>o.value===j[k]))el.add(new frame.contentWindow.Option(j[k],j[k]));el.value=j[k]}
  }
  const dt=d.getElementById('c_date');if(dt)dt.value=today();
  frame.contentWindow.generateText?.();message('왼쪽 입력칸에 불러왔습니다.');
  try{d.querySelector('.form-panel')?.scrollIntoView({behavior:'smooth',block:'start'})}catch{}
 }
 function ownSelected(){return rows.filter(r=>checked.has(String(r.id))&&r.owner_id===uid)}
 function toolbar(){
  const selected=ownSelected(),mine=scope()==='mine';
  q('[data-tools]').hidden=!visible.some(r=>r.owner_id===uid);
  q('[data-share]').hidden=!mine;q('[data-unshare]').hidden=mine;
  q('[data-share]').disabled=!selected.some(r=>!r.is_shared);
  q('[data-unshare]').disabled=!selected.some(r=>r.is_shared);
  q('[data-delete]').hidden=!mine;q('[data-delete]').disabled=!selected.length;
  q('[data-selected]').textContent=checked.size+'건 선택';
  const eligible=visible.filter(r=>r.owner_id===uid);
  q('[data-selectall]').checked=!!eligible.length&&eligible.every(r=>checked.has(String(r.id)));
 }
 function draw(){
  const term=q('[data-query]').value.toLowerCase().trim(),hide=q('[data-open]').checked,list=q('[data-list]');
  visible=rows.filter(r=>(!hide||!expired(r.job||{}))&&fields.some(k=>str(r.job?.[k]).toLowerCase().includes(term)));
  list.replaceChildren();
  for(const r of visible){
   const j=r.job||{},item=d.createElement('article');item.className='gja-item';
   const line=d.createElement('div');line.className='gja-line';
   if(r.owner_id===uid){
    const c=d.createElement('input');c.type='checkbox';c.setAttribute('aria-label','공고 선택');c.checked=checked.has(String(r.id));
    c.onchange=()=>{if(c.checked)checked.add(String(r.id));else checked.delete(String(r.id));toolbar()};line.append(c);
   }
   const main=d.createElement('div');main.className='gja-main';
   const title=d.createElement('div');title.className='gja-title';title.textContent=[j.company,j.title].filter(Boolean).join(' · ')||'제목 없음';
   const sub=d.createElement('div');sub.className='gja-sub';sub.textContent=[j.location,j.salary,j.deadline?'마감 '+j.deadline:''].filter(Boolean).join(' · ')||str(j.duties,80)||'상세정보 없음';
   const meta=d.createElement('div');meta.className='gja-meta';
   const when=d.createElement('span');when.textContent=new Date(r.saved_at).toLocaleDateString('ko-KR');meta.append(when);
   if(scope()==='shared'){const a=d.createElement('span');a.textContent='· '+(r.owner_name||'공유 상담사');meta.append(a)}
   if(r.is_shared&&r.owner_id===uid){const label=d.createElement('span');label.className='gja-tag';label.textContent='공유 중';meta.append(label)}
   main.append(title,sub,meta);line.append(main);item.append(line);
   const actions=d.createElement('div');actions.className='gja-bottom';
   actions.append(button('불러오기',()=>load(j),'gja-load'));
   if(j.url&&/^https?:\/\//i.test(j.url)){const a=d.createElement('a');a.textContent='원문';a.href=j.url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a)}
   item.append(actions);list.append(item);
  }
  if(!visible.length){const empty=d.createElement('div');empty.className='gja-empty';empty.textContent=term?'검색된 공고가 없습니다.':'보관된 공고가 없습니다.';list.append(empty)}
  q('[data-count]').textContent=visible.length+'건'+(rows.length!==visible.length?' / '+rows.length+'건':'');
  toolbar();
 }
 async function refresh(more=false){
  if(busy&&!more){epoch++;busy=false}if(busy)return;busy=true;
  const token=++epoch;message('공고를 불러오는 중…');
  try{
   const {c,user}=await context();if(token!==epoch)return;uid=user.id;
   if(!more){page=0;rows=[];checked.clear()}
   let query=c.from(TABLE).select('*').order('saved_at',{ascending:false}).order('id').range(page*batch,(page+1)*batch-1);
   if(q('[data-period]').value!=='all'){const b=dateBounds();query=query.gte('saved_at',b.start).lt('saved_at',b.end)}
   query=scope()==='mine'?query.eq('owner_id',uid):query.eq('is_shared',true);
   const {data,error}=await query;if(token!==epoch)return;if(error)throw error;
   rows.push(...(data||[]));page++;q('[data-more]').hidden=!(data?.length===batch);
   if(q('[data-period]').value==='date')weekday();
   draw();message('');
  }catch(e){if(token===epoch){q('[data-list]').replaceChildren();message('보관함을 불러오지 못했습니다: '+e.message)}}
  finally{if(token===epoch)busy=false}
 }
 async function updateSelected(mode){
  const selected=ownSelected().filter(r=>mode==='share'?!r.is_shared:mode==='unshare'?r.is_shared:true);
  if(!selected.length)return;
  if(mode==='delete'&&!window.confirm('선택한 '+selected.length+'건을 삭제할까요?'))return;
  const {c}=await context();
  for(const r of selected){
   const base=c.from(TABLE),query=mode==='delete'?base.delete():base.update({is_shared:mode==='share'});
   const {error}=await query.eq('id',r.id).eq('owner_id',uid);if(error)throw error;
  }
  await refresh();
  message(mode==='share'?selected.length+'건을 상담사에게 공유했습니다.':mode==='unshare'?selected.length+'건의 공유를 해제했습니다.':selected.length+'건을 삭제했습니다.');
 }
 function switchTab(name){
  box.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));
  q('[data-query]').value='';return refresh();
 }
 box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
 q('[data-period]').onchange=()=>{q('[data-datebar]').hidden=q('[data-period]').value!=='date';refresh()};
 q('[data-date]').onchange=()=>{if(q('[data-date]').value)refresh()};
 function moveDate(days){
  const x=new Date(q('[data-date]').value+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+days);
  q('[data-date]').value=x.toISOString().slice(0,10);q('[data-period]').value='date';
  q('[data-datebar]').hidden=false;refresh();
 }
 q('[data-prev]').onclick=()=>moveDate(-1);q('[data-next]').onclick=()=>moveDate(1);
 q('[data-today]').onclick=()=>{q('[data-date]').value=today();refresh()};
 q('[data-query]').oninput=draw;q('[data-open]').onchange=draw;
 q('[data-refresh]').onclick=()=>refresh();q('[data-more]').onclick=()=>refresh(true);
 q('[data-selectall]').onchange=e=>{
  for(const r of visible.filter(r=>r.owner_id===uid)){if(e.target.checked)checked.add(String(r.id));else checked.delete(String(r.id))}draw();
 };
 q('[data-share]').onclick=()=>updateSelected('share').catch(e=>message('공유 실패: '+e.message));
 q('[data-unshare]').onclick=()=>updateSelected('unshare').catch(e=>message('공유 해제 실패: '+e.message));
 q('[data-delete]').onclick=()=>updateSelected('delete').catch(e=>message('삭제 실패: '+e.message));
 // 기존 '목록 저장'의 PC 기록과 백업을 유지하면서 서버 보관함 저장도 연동합니다.
 function connectSave(){
  const w=frame.contentWindow,previous=w?.saveAndGenerate;
  if(typeof previous!=='function'||previous.__gjArchiveV2)return;
  const wrapped=function(...args){
   const job=getFormJob(d),result=previous.apply(this,args);
   if(job.title||job.company){
    message('PC 목록 저장됨 · 보관함에도 저장하는 중…');
    save(job).then(async()=>{
     q('[data-period]').value='all';q('[data-datebar]').hidden=true;
     if(scope()!=='mine')await switchTab('mine');else await refresh();
     message('내 보관함에도 저장했습니다.');
    }).catch(e=>message('PC에는 저장됐지만 보관함 연동 실패: '+e.message));
   }
   return result;
  };
  wrapped.__gjArchiveV2=true;w.saveAndGenerate=wrapped;
 }
 connectSave();
 function clear(){epoch++;busy=false;rows=[];checked.clear();uid='';q('[data-list]').replaceChildren();q('[data-count]').textContent='로그인 필요';message('로그인이 필요합니다.')}
 panels.set(d,{refresh,connectSave,clear});
 refresh();
 return panels.get(d);
}
function scan(reload=false){
 if(!window.document)return;
 document.querySelectorAll('iframe').forEach(f=>{
  try{const p=panels.get(f.contentDocument);if(p){p.connectSave();if(reload)p.refresh()}else mount(f)}catch(e){console.warn('보관함 확인:',e)}
 });
}
window.addEventListener('clg-auth-ready',()=>{ready();scan(true)});
window.addEventListener('clg-auth-logout',()=>document.querySelectorAll('iframe').forEach(f=>{try{panels.get(f.contentDocument)?.clear()}catch{}}));
for(const evt of ['clg-tab-frame-load','clg-tab-switch','clg-page-change'])window.addEventListener(evt,()=>setTimeout(()=>scan(),120));
window.addEventListener('focus',()=>{ready();scan(true)});
if(document.body)new MutationObserver(()=>scan()).observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{ready();scan()},500);
})();