/* 공유 채용공고 · 상담사별 정보제공/알선/취업 이력 v2
 * 기존 Supabase 로그인과 RLS를 그대로 사용하며 내담자 정보는 GitHub에 저장하지 않습니다.
 */
(function(){
'use strict';
if(window.GJSharedDashboard)return;
var ACTIVITY='counselor_job_activity',ARCHIVE='counselor_job_archive';
var TYPES={provided:'정보제공',referred:'알선',employed:'취업'};
function safe(v,n){return String(v==null?'':v).trim().slice(0,n||1000)}
function normalizedCode(v){return safe(v,80).toLowerCase().replace(/\s+/g,'')}
function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())}
function elem(d,tag,cls,value){var e=d.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e}
function create(frame,goBack){
 var d=frame.contentDocument;if(!d||!d.body)return null;
 if(!d.getElementById('gjSharedDashboardCss')){var stylesheet=d.createElement('link');stylesheet.id='gjSharedDashboardCss';stylesheet.rel='stylesheet';stylesheet.href=new URL('./job-share-dashboard.css?v=20261121-2',window.location.href).href;d.head.append(stylesheet)}
 var root=d.createElement('section');root.id='gjSharedDashboard';root.hidden=true;root.setAttribute('aria-label','상담사 공유 채용공고');
 root.innerHTML='<div class="gjs-wrap">'+
 '<header class="gjs-head"><div><div class="gjs-kicker">공동 채용정보 관리</div><h1>상담사 공유 채용공고</h1><p class="gjs-subtitle">공고별 내담자 진행 상황과 중복 방지 기록을 관리합니다. 센터 간 비교는 집계 수치만 표시합니다.</p></div>'+
 '<div class="gjs-head-actions"><button data-reload>↻ 새로고침</button><button data-export>분석 CSV</button><button class="gjs-back" data-back>← 내 보관함으로</button></div></header>'+
 '<div class="gjs-stats"><div class="gjs-stat"><span>공유 공고</span><strong data-njobs>0</strong><small>중복 공고 통합</small></div><div class="gjs-stat"><span>정보제공</span><strong data-nprovided>0</strong><small data-window-label>조회 기간 기준</small></div><div class="gjs-stat"><span>알선</span><strong data-nreferred>0</strong><small>등록한 활동 건수</small></div><div class="gjs-stat"><span>취업</span><strong data-nemployed>0</strong><small>취업 확인 기록</small></div></div>'+
 '<div class="gjs-tools"><input data-search type="search" placeholder="기업명 · 공고명 · 지역 검색" aria-label="공고 검색">'+
 '<select data-period class="gjs-period" aria-label="활동 집계 기간"><option value="today">오늘 활동</option><option value="week">최근 7일</option><option value="all">전체 기간</option><option value="date">날짜 지정</option></select>'+
 '<input data-date type="date" aria-label="활동 집계 날짜" hidden>'+
 '<select data-sort aria-label="공고 정렬"><option value="recent">최근 공유순</option><option value="active">활동 많은 순</option><option value="company">기업명순</option></select>'+
 '<label><input data-hide-expired type="checkbox">마감 공고 숨기기</label></div>'+
 '<p class="gjs-note">상단 날짜는 활동 통계 기준입니다. 내담자 고유번호는 내부 업무번호만 사용하세요(전화번호·주민등록번호 금지). 취업 기록은 고용24 공식 실적이 아닙니다. 45초마다 자동 갱신합니다.</p>'+
 '<div class="gjs-status" data-status role="status" aria-live="polite"></div>'+
 '<div class="gjs-layout" data-layout><div class="gjs-grid" data-grid></div>'+
 '<aside class="gjs-side" data-side hidden><div class="gjs-side-head"><b>공고 활용 기록</b><button data-close-side aria-label="상세 닫기">✕</button></div>'+
 '<h2 data-side-title></h2><div class="gjs-muted" data-side-meta></div><a class="gjs-origin" data-origin href="#" target="_blank" rel="noopener noreferrer" hidden>원문 공고 확인 ↗</a>'+
 '<div class="gjs-types"><button data-type="provided" class="active">정보제공</button><button data-type="referred">알선</button><button data-type="employed">취업</button></div>'+
 '<form data-form><label for="gjs-client-code">내담자 고유번호 *</label><input id="gjs-client-code" data-client-code maxlength="80" required autocomplete="off" placeholder="예: IAP-000123 · 상담사 공통 내부번호"><p class="gjs-muted">같은 내담자는 모든 상담사가 동일한 고유번호로 입력하세요.</p><label for="gjs-client">내담자 표시명 *</label><input id="gjs-client" data-client maxlength="80" required autocomplete="off" placeholder="예: 김○○">'+
 '<label for="gjs-date">실제 진행일 *</label><input id="gjs-date" data-event-date type="date" required>'+
 '<label for="gjs-notes">메모 (선택)</label><textarea id="gjs-notes" data-notes maxlength="400" placeholder="지원 여부, 입사 확인 등 필요한 사항만 기록"></textarea>'+
 '<p class="gjs-warning" data-dup role="status" aria-live="polite"></p><button class="gjs-save gjs-primary" type="submit" data-save>활동 기록 저장</button></form>'+
 '<div class="gjs-history-title">내담자별 진행 상태 <span data-journey-count></span></div><div data-journeys></div><div class="gjs-history-title">전체 활동 이력 <span data-history-count></span></div><div data-history></div></aside></div>'+
 '<details class="gjs-analytics" open><summary>상담사별 · 날짜별 · 센터별 활동 분석</summary><div class="gjs-table-wrap" data-analytics></div><div class="gjs-table-wrap" data-center-analytics></div><p class="gjs-note">활동 입력 기준이며 공식 취업률·알선취업률과 다릅니다. 센터별 수치는 개인정보 없는 합계만 표시됩니다.</p></details>'+
 '</div>';d.body.append(root);
 var q=function(x){return root.querySelector(x)};
 var state={jobs:[],activities:[],centerStats:[],selectedKey:'',type:'provided',userId:'',busy:false,visible:false,truncated:false,pollTimer:null,refreshQueued:false};
 var status=function(s){q('[data-status]').textContent=s||''};
 q('[data-date]').value=today();q('[data-event-date]').value=today();
 function client(){var c=window.clgJobArchiveClient&&window.clgJobArchiveClient();if(!c)throw Error('로그인 후 사용할 수 있습니다.');return c}
 function periodActivities(items){
  var v=q('[data-period]').value,date=today(),chosen=q('[data-date]').value;
  if(v==='all')return items;
  var lower=v==='week'?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(new Date(date+'T00:00:00+09:00').getTime()-6*86400000)):date;
  return items.filter(function(a){var x=String(a.event_date).slice(0,10);return v==='today'?x===date:v==='date'?x===chosen:x>=lower&&x<=date});
 }
 function uniqueJobs(){
  var m=new Map();state.jobs.forEach(function(x){
   if(!m.has(x.job_key))m.set(x.job_key,{key:x.job_key,job:x.job||{},saved_at:x.saved_at,owners:new Set()});
   m.get(x.job_key).owners.add(x.owner_id);
  });return Array.from(m.values());
 }
 function activitiesFor(k){return state.activities.filter(function(a){return a.job_key===k&&!a.voided_at})}
 function counts(items){return ['provided','referred','employed'].map(function(type){return items.filter(function(a){return a.event_type===type}).length})}
 function expired(j){var m=safe(j.deadline).match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);return !!m&&(m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'))<today()}
 function card(x){
  var j=x.job,c=elem(d,'article','gjs-card'+(x.key===state.selectedKey?' selected':'')),top=elem(d,'div','gjs-card-top');
  top.append(elem(d,'span','gjs-company',safe(j.company,100)||'기업명 미입력'),elem(d,'span','gjs-badge',expired(j)?'마감':'공유 중'));
  c.append(top,elem(d,'h3','',safe(j.title,160)||'채용공고'),elem(d,'p','gjs-detail',safe(j.location,100)||'지역 정보 없음'),elem(d,'p','gjs-detail',[j.salary,j.deadline?'마감 '+j.deadline:''].filter(Boolean).join(' · ')||'공고 상세 확인'));
  var count=counts(periodActivities(activitiesFor(x.key))),strip=elem(d,'div','gjs-counts');
  ['제공 ','알선 ','취업 '].forEach(function(label,i){strip.append(elem(d,'span','',label+count[i]))});c.append(strip);
  var buttons=elem(d,'div','gjs-actions');
  [['provided','정보제공 +'],['referred','알선 +'],['employed','취업 +']].forEach(function(r){var b=elem(d,'button','',r[1]);b.type='button';b.onclick=function(){select(x.key,r[0])};buttons.append(b)});
  c.append(buttons);return c;
 }
 function render(){
  var records=periodActivities(state.activities),nums=counts(records),jobs=uniqueJobs();
  q('[data-njobs]').textContent=jobs.length.toLocaleString('ko-KR');
  q('[data-nprovided]').textContent=nums[0].toLocaleString('ko-KR');q('[data-nreferred]').textContent=nums[1].toLocaleString('ko-KR');q('[data-nemployed]').textContent=nums[2].toLocaleString('ko-KR');
  q('[data-window-label]').textContent={'today':'오늘 진행','week':'최근 7일','date':q('[data-date]').value,'all':'전체 기록'}[q('[data-period]').value];
  var term=safe(q('[data-search]').value).toLowerCase(),hide=q('[data-hide-expired]').checked;
  jobs=jobs.filter(function(x){return (!hide||!expired(x.job))&&[x.job.company,x.job.title,x.job.location,x.job.duties].some(function(v){return safe(v).toLowerCase().includes(term)})});
  if(q('[data-sort]').value==='active')jobs.sort(function(a,b){return activitiesFor(b.key).length-activitiesFor(a.key).length});
  else if(q('[data-sort]').value==='company')jobs.sort(function(a,b){return safe(a.job.company).localeCompare(safe(b.job.company),'ko')});
  var grid=q('[data-grid]');grid.replaceChildren();jobs.forEach(function(x){grid.append(card(x))});
  if(!jobs.length)grid.append(elem(d,'div','gjs-empty',state.jobs.length?'조건에 맞는 공유 공고가 없습니다.':'공유된 공고가 없습니다. 내 보관함에서 공고를 공유해 주세요.'));
  if(state.selectedKey)renderSide();
  renderAnalytics(records);
  aggregateCenterRows();
 }
 function renderAnalytics(records){
  var body=q('[data-analytics]');body.replaceChildren(),people=new Map(),dates=new Map();
  records.forEach(function(a){var who=safe(a.actor_name,80)||'상담사',date=String(a.event_date).slice(0,10),ix=['provided','referred','employed'].indexOf(a.event_type);if(ix<0)return;
   if(!people.has(who))people.set(who,{label:who,n:[0,0,0]});if(!dates.has(date))dates.set(date,{label:date,n:[0,0,0]});
   people.get(who).n[ix]++;dates.get(date).n[ix]++;
  });
  function tab(label,rows){body.append(elem(d,'h3','',label));var t=elem(d,'table'),h=elem(d,'tr');
   [(label==='상담사별 집계'?'상담사':'일자'),'정보제공','알선','취업','합계'].forEach(function(v){h.append(elem(d,'th','',v))});t.append(h);
   rows.forEach(function(r){var tr=elem(d,'tr');[r.label].concat(r.n,[r.n.reduce(function(s,n){return s+n},0)]).forEach(function(v){tr.append(elem(d,'td','',String(v)))});t.append(tr)});body.append(t)}
  tab('상담사별 집계',Array.from(people.values()).sort(function(a,b){return b.n.reduce(function(s,n){return s+n},0)-a.n.reduce(function(s,n){return s+n},0)}));
  tab('일자별 집계',Array.from(dates.values()).sort(function(a,b){return b.label.localeCompare(a.label)}));
  if(!records.length)body.append(elem(d,'p','gjs-muted','해당 기간에 활동 기록이 없습니다.'));
 }

 function aggregateCenterRows(){
  var out=q('[data-center-analytics]');out.replaceChildren();
  out.append(elem(d,'h3','','센터별 활동 건수 (내담자 정보 제외)'));
  var map=new Map();
  (state.centerStats||[]).forEach(function(v){
   var key=safe(v.center_name,100)||'미분류',r=map.get(key)||{label:key,n:[0,0,0]},i=['provided','referred','employed'].indexOf(v.activity_type);
   if(i!==-1)r.n[i]+=Number(v.activity_count)||0;
   map.set(key,r);
  });
  var table=elem(d,'table'),head=elem(d,'tr');
  ['센터','정보제공','알선','취업','합계'].forEach(function(x){head.append(elem(d,'th','',x))});table.append(head);
  Array.from(map.values()).sort(function(a,b){return a.label.localeCompare(b.label,'ko')}).forEach(function(row){
   var tr=elem(d,'tr');[row.label].concat(row.n,[row.n.reduce(function(a,b){return a+b},0)]).forEach(function(x){tr.append(elem(d,'td','',String(x)))});table.append(tr);
  });out.append(table);
  if(!map.size)out.append(elem(d,'p','gjs-muted','선택한 기간에 센터별 기록이 없습니다.'));
 }
 function centerRange(){
  var v=q('[data-period]').value,t=today();
  if(v==='all')return {p_from:null,p_to:null};
  if(v==='today')return {p_from:t,p_to:t};
  if(v==='date')return {p_from:q('[data-date]').value,p_to:q('[data-date]').value};
  return {p_from:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(new Date(t+'T00:00:00+09:00').getTime()-6*86400000)),p_to:t};
 }
 async function refreshCenterCounts(){
  try{var r=await client().rpc('job_activity_center_summary',centerRange());if(r.error)throw r.error;
   state.centerStats=r.data||[];aggregateCenterRows();
  }catch(err){state.centerStats=[];aggregateCenterRows();status('센터별 집계 오류: '+safe(err.message,130))}
 }
 function checkDuplicate(){
  var code=normalizedCode(q('[data-client-code]').value),duplicate=!!code&&activitiesFor(state.selectedKey).some(function(a){return a.client_code===code&&a.event_type===state.type});
  q('[data-dup]').textContent=duplicate?'이미 이 내담자의 '+TYPES[state.type]+' 기록이 있습니다. 중복 기록은 허용하지 않습니다.':(!code?'고유번호를 입력하면 기존 기록과 자동 연결됩니다.':'');
  q('[data-dup]').classList.toggle('is-error',duplicate);
  q('[data-save]').disabled=duplicate;
  return duplicate;
 }
 function renderJourneys(records){
  var box=q('[data-journeys]');box.replaceChildren();var map=new Map();
  records.forEach(function(a){
   var key=safe(a.client_code,80)||'기존 기록:'+safe(a.client_label,80);
   if(!map.has(key))map.set(key,{code:key,label:safe(a.client_label,80),last:'',records:[]});
   var row=map.get(key);row.records.push(a);
   if(String(a.event_date)>row.last)row.last=String(a.event_date);
  });
  var items=Array.from(map.values()).sort(function(a,b){return b.last.localeCompare(a.last)});
  q('[data-journey-count]').textContent='('+items.length+'명)';
  if(!items.length)box.append(elem(d,'p','gjs-muted','이 공고에 등록된 내담자가 없습니다.'));
  items.forEach(function(v){
   var article=elem(d,'div','gjs-journey'),top=elem(d,'div','gjs-journey-head');
   top.append(elem(d,'strong','',v.label),elem(d,'small','',v.code));article.append(top);
   var stages=new Set(v.records.map(function(r){return r.event_type})),flow=elem(d,'div','gjs-journey-flow');
   ['provided','referred','employed'].forEach(function(type){flow.append(elem(d,'span','gjs-stage'+(stages.has(type)?' done':''),TYPES[type]))});
   article.append(flow);var bottom=elem(d,'div','gjs-journey-actions');
   bottom.append(elem(d,'span','',Array.from(new Set(v.records.map(function(r){return r.actor_name||'상담사'}))).join(', ')+' · '+v.last));
   var next=stages.has('employed')?null:stages.has('referred')?'employed':stages.has('provided')?'referred':'provided';
   if(next&&!v.code.startsWith('legacy-')&&!v.code.startsWith('기존 기록:')){
    var b=elem(d,'button','','다음 단계: '+TYPES[next]);b.type='button';
    b.onclick=function(){
     state.type=next;q('[data-client-code]').value=v.code;q('[data-client]').value=v.label;q('[data-event-date]').value=today();
     root.querySelectorAll('[data-type]').forEach(function(x){x.classList.toggle('active',x.dataset.type===next)});
     checkDuplicate();q('[data-notes]').focus();
    };bottom.append(b);
   }
   article.append(bottom);box.append(article);
  });
 }
 function select(key,type){state.selectedKey=key;state.type=type||'provided';q('[data-side]').hidden=false;q('[data-layout]').classList.add('gjs-open');q('[data-client]').value='';q('[data-client-code]').value='';q('[data-event-date]').value=today();q('[data-notes]').value='';render();q('[data-client-code]').focus()}
 function renderSide(){
  var x=uniqueJobs().find(function(j){return j.key===state.selectedKey});if(!x){closeSide();return}
  q('[data-side-title]').textContent=[x.job.company,x.job.title].filter(Boolean).join(' · ')||'공고';
  q('[data-side-meta]').textContent=[x.job.location,x.job.deadline?'마감 '+x.job.deadline:'',x.owners.size+'명 공유'].filter(Boolean).join(' · ');
  var a=q('[data-origin]');a.hidden=!/^https?:\/\//i.test(safe(x.job.url));if(!a.hidden)a.href=x.job.url;
  root.querySelectorAll('[data-type]').forEach(function(b){b.classList.toggle('active',b.dataset.type===state.type)});
  var hist=activitiesFor(state.selectedKey).slice().sort(function(a,b){return String(b.event_date).localeCompare(String(a.event_date))||String(b.created_at).localeCompare(String(a.created_at))});
  q('[data-history-count]').textContent='('+hist.length+'건)';
  renderJourneys(hist);
  var list=q('[data-history]');list.replaceChildren();
  if(!hist.length)list.append(elem(d,'p','gjs-muted','아직 이 공고의 활용 기록이 없습니다.'));
  hist.forEach(function(a){var item=elem(d,'div','gjs-event'),top=elem(d,'div','gjs-event-top');
   top.append(elem(d,'b','',TYPES[a.event_type]||a.event_type),elem(d,'span','',safe(a.actor_name,50)||'상담사'),elem(d,'time','',String(a.event_date).slice(0,10)));
   item.append(top,elem(d,'div','gjs-client',safe(a.client_label,80)));
   if(a.notes)item.append(elem(d,'p','gjs-event-note',safe(a.notes,400)));
   if(a.actor_id===state.userId){var cancel=elem(d,'button','','기록 취소');cancel.type='button';cancel.onclick=function(){voidEvent(a.id)};item.append(cancel)}
   list.append(item);
  });
  checkDuplicate();
 }
 function closeSide(){state.selectedKey='';q('[data-side]').hidden=true;q('[data-layout]').classList.remove('gjs-open');render()}
 async function loadData(){
  if(state.busy)return;state.busy=true;q('[data-reload]').disabled=true;status('공유 공고와 활동 이력을 불러오는 중…');
  try{
   var c=client(),auth=await c.auth.getUser();if(auth.error||!auth.data||!auth.data.user)throw Error('로그인을 확인해 주세요.');
   state.userId=auth.data.user.id;var jobs=[],cursor=0,step=200;
   for(var i=0;i<5;i++){var r=await c.from(ARCHIVE).select('id,owner_id,owner_name,job_key,job,is_shared,saved_at').eq('is_shared',true).order('saved_at',{ascending:false}).range(cursor,cursor+step-1);if(r.error)throw r.error;jobs=jobs.concat(r.data||[]);if(!r.data||r.data.length<step)break;cursor+=step}
   var all=[],off=0,pageSize=500;
   for(var j=0;j<10;j++){var p=await c.from(ACTIVITY).select('id,job_key,event_type,client_label,event_date,notes,actor_id,actor_name,created_at,voided_at').is('voided_at',null).order('created_at',{ascending:false}).range(off,off+pageSize-1);if(p.error)throw p.error;all=all.concat(p.data||[]);if(!p.data||p.data.length<pageSize)break;off+=pageSize}
   var keys=new Set(jobs.map(function(x){return x.job_key}));state.jobs=jobs;state.activities=all.filter(function(x){return keys.has(x.job_key)});
   state.truncated=jobs.length>=1000||all.length>=5000;render();
   status(state.truncated?'목록 표시 상한에 도달했습니다. 장기 정확 통계는 서버 집계 확장이 필요합니다.':'공유 공고 '+new Set(jobs.map(function(x){return x.job_key})).size+'건 · 활동 '+state.activities.length+'건');
  }catch(e){status('불러오기 실패: '+safe(e.message,200)+' · 활동기록 테이블 권한을 확인해 주세요.')}
  finally{state.busy=false;q('[data-reload]').disabled=false}
 }
 async function add(e){
  e.preventDefault();if(!state.selectedKey)return;var who=safe(q('[data-client]').value,80),when=q('[data-event-date]').value,memo=safe(q('[data-notes]').value,400);
  if(!who||!when){status('내담자 성명 또는 관리번호와 진행일을 입력해 주세요.');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(when)){status('진행일 형식을 확인해 주세요.');return}
  var b=q('[data-save]');b.disabled=true;
  try{var c=client(),r=await c.from(ACTIVITY).insert({job_key:state.selectedKey,event_type:state.type,client_label:who,event_date:when,notes:memo});
   if(r.error)throw r.error;q('[data-client]').value='';q('[data-notes]').value='';await loadData();status('활동 기록이 저장되었습니다.');
  }catch(err){status('기록 저장 실패: '+safe(err.message,200))}finally{b.disabled=false}
 }
 async function voidEvent(id){
  if(!window.confirm('선택한 기록을 취소할까요? 원본은 감사 이력으로 유지됩니다.'))return;
  try{var c=client(),r=await c.from(ACTIVITY).update({voided_at:new Date().toISOString()}).eq('id',id).eq('actor_id',state.userId);
   if(r.error)throw r.error;await loadData();status('기록을 취소했습니다.');
  }catch(err){status('기록 취소 실패: '+safe(err.message,200))}
 }
 function downloadCsv(){
  var rows=new Map();periodActivities(state.activities).forEach(function(a){var date=String(a.event_date).slice(0,10),name=safe(a.actor_name,80)||'상담사',key=date+'|'+name,rec=rows.get(key)||{date:date,name:name,n:[0,0,0]},ix=['provided','referred','employed'].indexOf(a.event_type);if(ix>=0)rec.n[ix]++;rows.set(key,rec)});
  function quote(v){var s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  var lines=[['진행일','상담사','정보제공','알선','취업'].map(quote).join(',')];
  Array.from(rows.values()).sort(function(a,b){return b.date.localeCompare(a.date)}).forEach(function(v){lines.push([v.date,v.name].concat(v.n).map(quote).join(','))});
  var blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=elem(d,'a');
  a.href=url;a.download='상담사공유_채용활동_'+today()+'.csv';d.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},3000)
 }
 function show(){state.visible=true;root.hidden=false;loadData()}
 function hide(){state.visible=false;root.hidden=true}
 q('[data-back]').onclick=function(){hide();if(typeof goBack==='function')goBack()};
 q('[data-close-side]').onclick=closeSide;q('[data-reload]').onclick=loadData;q('[data-export]').onclick=downloadCsv;
 q('[data-period]').onchange=function(){q('[data-date]').hidden=q('[data-period]').value!=='date';render();refreshCenterCounts()};
 q('[data-date]').onchange=function(){render();refreshCenterCounts()};q('[data-search]').oninput=render;q('[data-sort]').onchange=render;q('[data-hide-expired]').onchange=render;
 root.querySelectorAll('[data-type]').forEach(function(b){b.onclick=function(){state.type=b.dataset.type;renderSide()}});
 q('[data-client-code]').addEventListener('input',checkDuplicate);
 q('[data-form]').addEventListener('submit',add);
 return {show:show,hide:hide,reload:loadData};
}
window.GJSharedDashboard={create:create};
})();