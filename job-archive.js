/* Counselor posting archive: the existing authenticated client owns all API calls. */
(()=>{
 'use strict';
 const TABLE='counselor_job_archive';
 const fields=['company','title','duties','location','employment','education','experience','workHours','salary','deadline','url','source'];
 const cleanJob=value=>{const job={};for(const k of fields)job[k]=String(value?.[k]||'').trim().slice(0,k==='duties'?3000:1000);if(job.url&&!/^https?:\/\//i.test(job.url))job.url='';return job};
 async function context(){const c=window.clgJobArchiveClient?.();if(!c)throw new Error('통합본 로그인 후 이용할 수 있습니다.');const {data,error}=await c.auth.getUser();if(error||!data.user)throw new Error('로그인이 필요합니다.');return {c,user:data.user}}
 async function keyOf(j){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(j.url||j.company+'__'+j.title));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}
 async function save(value){const {c,user}=await context(),job=cleanJob(value);if(!job.title&&!job.company)throw new Error('공고 제목 또는 기업명이 필요합니다.');const job_key=await keyOf(job);
 // Upserting omits is_shared so a second capture preserves the owner's sharing choice.
 const {data,error}=await c.from(TABLE).upsert({owner_id:user.id,job_key,job},{onConflict:'owner_id,job_key'}).select('id').single();if(error)throw error;scan(true);return data}
 window.addEventListener('message',async e=>{
  if(e.source!==window||e.origin!==location.origin||e.data?.type!=='GOODJOB_ARCHIVE_SAVE')return;
  const requestId=String(e.data.requestId||'');if(!/^[a-f0-9-]{36}$/.test(requestId))return;
  try{await save(e.data.job);window.postMessage({type:'GOODJOB_ARCHIVE_RESULT',requestId,ok:true},location.origin)}catch(error){window.postMessage({type:'GOODJOB_ARCHIVE_RESULT',requestId,ok:false,message:error.message},location.origin)}
 });
 function ready(){window.postMessage({type:'GOODJOB_ARCHIVE_READY'},location.origin)}
 window.addEventListener('clg-auth-ready',()=>{ready();scan(true)});
 window.addEventListener('clg-auth-logout',()=>document.querySelectorAll('iframe').forEach(f=>{try{f.contentDocument?.getElementById('jobArchivePanel')?.remove();panels.delete(f.contentDocument)}catch{}}));
 const panels=new WeakMap();
 function mount(frame){let d;try{d=frame.contentDocument}catch{return}if(!d?.getElementById('c_task'))return;
  if(panels.has(d))return panels.get(d);
  const box=d.createElement('section');box.id='jobArchivePanel';box.style.cssText='padding:16px;margin:0 0 16px;border:1px solid #c7d2fe;border-radius:12px;background:#f8faff';
  box.innerHTML='<h3 style="margin:0 0 8px">채용정보 찾기 · 상담사 보관함</h3><p style="font-size:13px">도우미에서 보관한 공고를 불러오거나 다른 상담사와 공유할 수 있습니다.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><select aria-label="보관함" data-scope><option value="mine">내 보관함</option><option value="shared">상담사 공유</option></select><input data-query placeholder="기업명·직무·지역 검색" aria-label="채용정보 검색"><button data-refresh type="button">새로고침</button><button data-save type="button">작성 중 공고 보관</button><label><input type="checkbox" data-open checked>마감된 공고 숨기기</label></div><p data-status role="status"></p><div data-list style="max-height:420px;overflow:auto"></div><button data-more type="button" hidden>더 보기</button>';
  const anchor=d.getElementById('historyList').closest('.card') || d.getElementById('historyList').parentElement;
  anchor.prepend(box);
  const q=s=>box.querySelector(s);let rows=[],uid='',page=0,busy=false,epoch=0;const batch=100;
  const status=t=>q('[data-status]').textContent=t;
  function expired(j){const m=j.deadline?.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);return !!m&&`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`<new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())}
  function button(label,fn){const b=d.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){status('처리 실패: '+e.message)}finally{b.disabled=false}};return b}
  function draw(){const term=q('[data-query]').value.toLowerCase().trim(),hide=q('[data-open]').checked,list=q('[data-list]');list.replaceChildren();
   const visible=rows.filter(r=>(!hide||!expired(r.job))&&fields.map(k=>r.job[k]).join(' ').toLowerCase().includes(term));
   for(const r of visible){const j=r.job,item=d.createElement('article');item.style.cssText='padding:12px 0;border-top:1px solid #ddd';const title=d.createElement('strong');title.textContent=[j.company,j.title].filter(Boolean).join(' · ');item.append(title);
    const details=d.createElement('p');details.style.cssText='font-size:13px;margin:6px 0;white-space:pre-wrap';details.textContent=[j.duties,j.workHours,j.location,j.salary,j.deadline?'마감: '+j.deadline:'',`등록: ${r.owner_name||'상담사'} · ${new Date(r.saved_at).toLocaleDateString('ko-KR')} · ${r.is_shared?'공유 중':'나만 보기'}`].filter(Boolean).join('\n');item.append(details);
    item.append(button('불러오기',()=>{const map={c_title:'title',c_name:'company',c_task:'duties',c_address:'location',c_type:'employment',c_salary:'salary',c_work_hours:'workHours',c_link:'url'};for(const [id,k]of Object.entries(map))d.getElementById(id).value=j[k]||'';
     d.getElementById('c_free_text').value='';d.getElementById('c_work_days').value='';d.getElementById('c_etc').value=[j.experience?'경력: '+j.experience:'',j.education?'학력: '+j.education:'',j.deadline?'마감: '+j.deadline:''].filter(Boolean).join(' / ');
     for(const [id,k]of [['c_exp','experience'],['c_edu','education']]){const el=d.getElementById(id);el.selectedIndex=-1;if(j[k]){if(!Array.from(el.options).some(o=>o.value===j[k]))el.add(new frame.contentWindow.Option(j[k],j[k]));el.value=j[k]}}
     d.getElementById('c_add_note').value='';d.getElementById('c_date').value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());frame.contentWindow.generateText();status('공고를 입력칸에 불러왔습니다. 확인 후 목록 저장을 누르세요.');}));
    if(j.url)item.append(button('원문',()=>window.open(j.url,'_blank','noopener,noreferrer')));
    if(r.owner_id===uid){item.append(button(r.is_shared?'공유 해제':'상담사에게 공유',async()=>{const {c}=await context();const {error}=await c.from(TABLE).update({is_shared:!r.is_shared}).eq('id',r.id).eq('owner_id',uid);if(error)throw error;await refresh()}));item.append(button('삭제',async()=>{if(!window.confirm('이 공고를 보관함에서 삭제할까요?'))return;const {c}=await context();const {error}=await c.from(TABLE).delete().eq('id',r.id).eq('owner_id',uid);if(error)throw error;await refresh()}));}
    list.append(item);
   }if(!visible.length)list.textContent=term?'불러온 공고 중 검색 결과가 없습니다. 더 보기를 눌러 추가 공고를 검색하세요.':'표시할 공고가 없습니다.';
   status(`${visible.length}건 표시 / ${rows.length}건 불러옴`);
  }
  async function refresh(more=false){if(busy&&!more){epoch++;busy=false}if(busy)return;busy=true;const token=++epoch;status('불러오는 중…');try{const {c,user}=await context();uid=user.id;if(!more){page=0;rows=[]}let query=c.from(TABLE).select('*').order('saved_at',{ascending:false}).order('id').range(page*batch,(page+1)*batch-1);query=q('[data-scope]').value==='mine'?query.eq('owner_id',uid):query.eq('is_shared',true);const {data,error}=await query;if(token!==epoch)return;if(error)throw error;rows.push(...data);page++;q('[data-more]').hidden=data.length<batch;draw()}catch(e){if(token===epoch){q('[data-list]').replaceChildren();status('보관함을 불러오지 못했습니다: '+e.message)}}finally{if(token===epoch)busy=false}}
  q('[data-refresh]').onclick=()=>refresh();q('[data-more]').onclick=()=>refresh(true);q('[data-scope]').onchange=()=>refresh();q('[data-query]').oninput=draw;q('[data-open]').onchange=draw;
  q('[data-save]').onclick=async()=>{const b=q('[data-save]');b.disabled=true;try{const v=id=>d.getElementById(id).value,job={company:v('c_name'),title:v('c_title'),duties:v('c_task'),location:v('c_address'),employment:v('c_type'),education:v('c_edu'),experience:v('c_exp'),salary:v('c_salary'),workHours:v('c_work_hours'),url:v('c_link'),source:'통합본'};if(v('c_free_text').trim()){status('자유양식 공고는 기업명·제목·직무내용 입력칸에 정리한 후 보관해 주세요.');return}await save(job);await refresh();status('내 보관함에 저장했습니다. 공유 버튼으로 다른 상담사에게 공개할 수 있습니다.')}catch(e){status('저장 실패: '+e.message)}finally{b.disabled=false}};
  panels.set(d,refresh);refresh();return refresh;
 }
 function scan(reload=false){if(!window.document)return;document.querySelectorAll('iframe').forEach(f=>{try{const existing=panels.get(f.contentDocument);if(existing){if(reload)existing()}else mount(f)}catch{}})}
 for(const evt of ['clg-tab-frame-load','clg-tab-switch','clg-page-change'])window.addEventListener(evt,()=>setTimeout(()=>scan(),100));
 window.addEventListener('focus',()=>{ready();scan(true)});new MutationObserver(()=>scan()).observe(document.body,{childList:true,subtree:true});setTimeout(()=>{ready();scan()},500);
})();
