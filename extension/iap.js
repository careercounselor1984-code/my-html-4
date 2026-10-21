const KEY='clgIapTransferPendingV120';
const isWork24Tab=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr'));}catch{return false;}};
const $=id=>document.getElementById(id);
const diagnostic=$('diag');
if(diagnostic){const details=document.createElement('details');details.id='iapDiagnosticDetails';const summary=document.createElement('summary');summary.textContent='기술 진단 보기';summary.style.cssText='cursor:pointer;margin-top:10px;font-size:11px;color:#64748b';diagnostic.insertAdjacentElement('beforebegin',details);details.append(summary,diagnostic);}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pending=null;
let applyingIap=false;
function getPendingIap(){return pending;}

function render(p){
  pending=p||null;
  const st=$('status'),c=$('content'),apply=$('applyBtn');
  if(!p){
    st.className='status';
    st.textContent='대기 중인 IAP 계획이 없습니다. 통합본 IAP 화면에서 “전산 반영 준비”를 눌러주세요.';
    c.innerHTML='';
    apply.disabled=true;
    return;
  }
  const a=p.audit||{};
  st.className='status ok';
  st.textContent=`✓ IAP 대기자료 수신 완료 · ${p.userType==='1'?'Ⅰ유형':'Ⅱ유형'} · ${p.iapDate||'IAP일 미입력'}`;
  let h=`<div class="card"><div class="ct">기본정보</div><div class="row"><div class="grid"><b>IAP 등록번호</b><span>${esc(p.iapNo||'미입력 · 재전송 필요')}</span><b>IAP 수립일</b><span>${esc(p.iapDate||'-')}</span><b>서비스기간</b><span>${esc((p.svcStart||'-')+' ~ '+(p.svcEnd||'-'))}</span><b>재진단 가능기간</b><span>${esc((p.visitStart||'-')+' ~ '+(p.visitEnd||'-'))}</span><b>희망직무</b><span>${esc(p.wishJob||'-')}</span><b>사전점검</b><span>${a.ok?'통과':'오류'}${a.warnN?` · 주의 ${a.warnN}건`:''}</span></div></div></div>`;
  h+=`<div class="card"><div class="ct">취업지원 프로그램 ${(p.jobRows||[]).length}행</div>`+((p.jobRows||[]).length?(p.jobRows||[]).map((r,i)=>`<div class="row"><span class="pill">${i+1}</span> ${esc(r.kind||'')} · ${esc(r.name||'')}<br>${esc((r.start||'')+' ~ '+(r.end||''))}</div>`).join(''):'<div class="row empty">없음</div>')+'</div>';
  h+=`<div class="card"><div class="ct">구직활동지원 ${(p.actRows||[]).length}행</div>`+((p.actRows||[]).length?(p.actRows||[]).map((r,i)=>`<div class="row"><span class="pill">${i+1}</span> ${esc(r.kind||'')} · ${esc(r.detail||'')} · 월 ${esc(r.cnt||'')}회<br>${esc((r.start||'')+' ~ '+(r.end||''))}</div>`).join(''):'<div class="row empty">없음</div>')+'</div>';
  c.innerHTML=h;
  apply.disabled=!(/^A\d{10,}$/.test(String(p.iapNo||'')) && a.ok && (((p.actRows||[]).length)+((p.jobRows||[]).length)>0));
}
function load(){chrome.storage.local.get(KEY,r=>render(r?.[KEY]||null));}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[KEY])render(changes[KEY].newValue||null);});
$('refreshBtn').addEventListener('click',load);
$('clearBtn').addEventListener('click',()=>chrome.storage.local.remove(KEY,load));

/*
 * Work24 Nexacro IAP등록/관리 화면의 "구직활동지원 프로그램 활동 계획" Grid를 찾아
 * 전달받은 행을 Dataset에 입력한다. 이 함수는 MAIN world에서 실행된다.
 * 최종 저장/제출 버튼은 절대 누르지 않는다.
 */
async function applyIapActivitiesMAIN(payload){
  function checkIapParticipantMAIN(expected){
   const required=String(expected||'').trim().toUpperCase();
   if(!/^A\d{10,}$/.test(required))return {checked:true,ok:false,reason:'유효한 전체 IAP 등록번호가 없습니다. 통합본에서 다시 전송해 주세요.'};
   const ids=new Set();
   let doc=document;
   for(let level=0;doc&&level<8;level++){
    const view=doc.defaultView||window;
    for(const el of doc.querySelectorAll('input,textarea,span,td,div')){
     try{
      const r=el.getBoundingClientRect(),cs=view.getComputedStyle(el);
      if(r.width<1||r.height<1||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity||1)===0||el.children.length)continue;
      const text=String(el.value||el.textContent||'').trim();
      // Whole identifiers only: never compare names, suffixes, masked or partial numbers.
      for(const m of text.matchAll(/(?:^|[^A-Za-z0-9])A\d{10,}(?![A-Za-z0-9])/ig))ids.add(m[0].replace(/^[^A-Za-z0-9]/,'').toUpperCase());
     }catch{}
    }
    try{const parent=view.parent;if(!parent||parent===view)break;doc=parent.document;}catch{break;}
   }
   if(ids.size!==1)return {checked:true,ok:false,reason:'현재 IAP 화면의 등록번호를 한 개로 확정할 수 없습니다. 다른 참여자 창을 닫고 번호를 표시해 주세요.'};
   return {checked:true,ok:ids.has(required),reason:ids.has(required)?'등록번호 일치':'통합본과 Work24 등록번호 불일치'};
  }
  let identityStopped=false;
  function assertIapIdentity(){
    const result=checkIapParticipantMAIN(payload?.iapNo);
    if(identityStopped||!result.ok){identityStopped=true;throw new Error('등록번호 검증 실패 · '+result.reason);}
  }
  if(!payload?.repairOnly)assertIapIdentity();

  const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const compact=s=>norm(s).replace(/\s/g,'').replace(/[·ㆍ]/g,'');
  const out={ok:false,found:false,pageHint:'',visited:0,gridPath:'',headers:[],body:[],rowCountBefore:0,rowCountAfter:0,added:0,skipped:0,failed:0,notes:[],rows:[]};
  const acts=Array.isArray(payload?.actRows)?payload.actRows:[];
  const repairOnly=payload?.repairOnly===true;
  if(!acts.length&&!repairOnly){out.notes.push('전달된 구직활동지원 행이 없습니다.');return out;}
  if(payload?.audit && payload.audit.ok===false){out.notes.push('IAP 사전점검 오류가 있어 자동입력을 중단했습니다.');return out;}


  // v1.4.6: Nexacro Dataset.addRow()는 Work24의 행추가 업무 로직을 건너뛰므로 사용하지 않는다.
  // 반드시 해당 IAP 표의 실제 행추가 버튼으로 새 행을 만들고, 그 표의 Dataset이
  // 정확히 한 행 증가했을 때만 내용을 기록한다. 최종 저장은 자동화하지 않는다.
  async function appendViaNativeIapButton(grid, dataset, buttonNames, notes){
    const before=Number(dataset.getRowCount?.()||0);
    const names=(buttonNames||[]).map(String);
    const lowerNames=new Set(names.map(n=>n.toLowerCase()));
    const candidates=[];
    const attempted=new Set();
    const idOf=o=>String(o?.name||o?.id||o?._id||'');
    const isButton=o=>!!o&&(typeof o.click==='function'||typeof o.on_fire_onclick==='function');
    const add=(o,source,expectedName)=>{
      if(!o||!isButton(o)||attempted.has(o))return;
      if(o.enable===false||o.visible===false)return;
      const id=idOf(o);
      if(id && !lowerNames.has(id.toLowerCase()))return;
      if(expectedName && id && id.toLowerCase()!==expectedName.toLowerCase())return;
      attempted.add(o);candidates.push({o,source,id:id||expectedName||'버튼'});
    };
    const item=(o,key)=>{
      if(!o)return null;
      const tries=[];
      try{tries.push(o[key])}catch{}
      try{tries.push(o.components?.get_item?.(key))}catch{}
      try{tries.push(o.objects?.get_item?.(key))}catch{}
      try{tries.push(o.frames?.get_item?.(key))}catch{}
      try{tries.push(o.childframes?.get_item?.(key))}catch{}
      try{tries.push(o.lookup?.(key))}catch{}
      try{if(o.form&&o.form!==o){tries.push(o.form[key]);tries.push(o.form.components?.get_item?.(key));tries.push(o.form.lookup?.(key))}}catch{}
      return tries.find(x=>x&&x!==o)||null;
    };
    // The full Nexacro component path is embedded in the rendered DOM id on Work24.
    const resolveDomPath=fullId=>{
      const parts=String(fullId||'').split('.').filter(Boolean);
      if(!parts.length)return null;
      const roots=[];const push=o=>{if(o&&!roots.includes(o))roots.push(o)};
      try{push(app)}catch{}
      try{push(window.nexacro?.getApplication?.())}catch{}
      try{push(window.parent?.nexacro?.getApplication?.())}catch{}
      try{push(window.top?.nexacro?.getApplication?.())}catch{}
      const mi=parts.indexOf('mainframe');
      for(const base of roots){
        for(const start of [0,mi>=0?mi:0,mi>=0?mi+1:0]){
          let node=base;
          if(mi>=0&&start===mi+1){node=item(base,'mainframe')||base.mainframe||base._mainframe;if(!node)continue;}
          let good=true;
          for(let i=start;i<parts.length;i++){
            const next=item(node,parts[i]);
            if(!next){good=false;break;}node=next;
          }
          if(good&&node)return node;
        }
      }
      return null;
    };
    const parents=[];let node=grid;
    for(let i=0;node&&i<15;i++){
      if(!parents.includes(node))parents.push(node);
      try{if(node.form&&!parents.includes(node.form))parents.push(node.form)}catch{}
      try{node=node.parent}catch{break}
    }
    const domMatches=[];
    const visible=el=>{try{const r=el.getBoundingClientRect(),v=getComputedStyle(el);return r.width>2&&r.height>2&&v.display!=='none'&&v.visibility!=='hidden'}catch{return false}};
    try{
      for(const el of document.querySelectorAll('[id]')){
        const fullId=String(el.id||''),leaf=(fullId.split('.').pop()||'').toLowerCase();
        if(!lowerNames.has(leaf)||!visible(el))continue;
        domMatches.push({el,fullId,leaf});
      }
    }catch{}
    // Prefer the exact visible Nexacro button resolved from its full DOM path.
    for(const {fullId,leaf} of domMatches){const o=resolveDomPath(fullId);add(o,'화면 전체경로',leaf)}
    for(const parent of parents){
      for(const name of names){
        const o=item(parent,name);
        add(o,'Grid 인접 Form',name);
      }
    }
    notes.push('원본 행추가 후보: '+(candidates.map(x=>x.id+'('+x.source+')').join(', ')||'Nexacro 객체 없음')+' / 화면ID '+domMatches.length+'개');
    const wait=ms=>new Promise(done=>setTimeout(done,ms));
    const count=()=>Number(dataset.getRowCount?.()||0);
    const poll=async()=>{
      for(let i=0;i<16;i++){
        const after=count();if(after!==before)return after;
        await wait(100);
      }
      return count();
    };
    let method='', clickedNative=false;
    for(const {o,id,source} of candidates){
      // Button.click() is the documented Nexacro API to dispatch onclick.
      // Calling on_fire_onclick() with no event parameters was not reliable.
      if(typeof o.click!=='function'){
        notes.push('행추가 건너뜀: '+id+' / 공식 click() 메서드 없음');
        continue;
      }
      if(!repairOnly)assertIapIdentity();
      try{o.click();}catch(e){notes.push('행추가 호출 실패: '+id+' / '+String(e?.message||e).slice(0,120));continue;}
      clickedNative=true;
      const after=await poll();
      notes.push('행추가 시도: '+id+'('+source+') '+before+'→'+after);
      if(after!==before){method='Nexacro Button.click()';}
      else notes.push('중복 생성 예방: 클릭 이후 행 증가가 없어 다른 후보의 자동 클릭을 생략했습니다.');
      break;
    }
    if(count()===before&&!clickedNative){
      for(const {el,fullId} of domMatches){
        // Only click an actual interactive HTML element; do not synthesize
        // mouse events against random Nexacro rendering sub-elements.
        if(!el.matches('button,input[type="button"],input[type="submit"],a,[role="button"]'))continue;
        if(!repairOnly)assertIapIdentity();
        try{el.click()}catch(e){notes.push('화면 버튼 호출 실패: '+String(e?.message||e).slice(0,80));continue;}
        const after=await poll();
        notes.push('화면 버튼 시도: '+fullId.split('.').pop()+' '+before+'→'+after);
        if(after!==before){method='화면 실제 버튼';break;}
      }
    }
    const after=count();
    if(after!==before+1){
      notes.push(`안전 중단: 행추가 결과가 ${before}→${after}입니다. 원본 버튼 처리와 데이터셋의 행 증가를 확인하지 못했습니다.`);
      return -1;
    }
    const row=after-1;
    let col='';
    try{
      const n=Number(dataset.getColCount?.()||0);
      for(let i=0;i<n;i++){
        const id=String(dataset.getColID?.(i)||dataset.getColumnInfo?.(i)?.id||'');
        if(id.toUpperCase()==='IAP_NO'){col=id;break;}
      }
    }catch{}
    if(col){
      let val='';try{val=String(dataset.getColumn(row,col)??'').trim()}catch{}
      if(!val){
        notes.push('안전 중단: 전산망 행추가 이후에도 IAP_NO 연결값이 비어 있습니다. 임의로 채우지 않습니다.');
        if(!repairOnly)assertIapIdentity();try{dataset.deleteRow?.(row)}catch{}
        return -1;
      }
      notes.push('행추가에서 생성된 IAP_NO 연결값 확인(번호는 표시하지 않음).');
    }else{
      notes.push('행추가 완료. Dataset에 IAP_NO 열이 없어 연결번호는 검증하지 못했습니다. 저장 검증 필요.');
    }
    notes.push(method+' 사용: '+before+'→'+after+'행');
    return row;
  }

  const TYPE_MAP={
    '입사지원서 제출':'입사지원서(취업알선상담 포함)제출',
    '입사 면접 참여':'입사지원서(취업알선상담 포함)제출',
    '입사지원에 필요한 컨설팅 참여':'입사지원에 필요한 컨설팅 참여',
    '상담사가 부과한 과제 이행 후 상담 참여':'상담사가 부과한 과제 이행 후 상담 참여',
    '기타 구직 활동':'구직활동 프로그램 참여'
  };
  const date8=s=>norm(s).replace(/[^0-9]/g,'').slice(0,8);
  const date10=s=>{const x=date8(s);return x.length===8?`${x.slice(0,4)}-${x.slice(4,6)}-${x.slice(6,8)}`:norm(s)};
  const collectionItems=col=>{
    const arr=[]; if(!col)return arr;
    try{const n=Number(col.length);if(Number.isFinite(n))for(let i=0;i<n;i++){let v=null;try{v=col[i]}catch{};if(!v&&typeof col.get_item==='function')try{v=col.get_item(i)}catch{};if(v&&!arr.includes(v))arr.push(v)}}catch{}
    try{for(const id of (Array.isArray(col._idArray)?col._idArray:[])){let v=null;try{v=col[id]}catch{};if(!v&&typeof col.get_item==='function')try{v=col.get_item(id)}catch{};if(v&&!arr.includes(v))arr.push(v)}}catch{}
    return arr;
  };
  const objType=o=>{try{return norm(o?._type_name||o?.constructor?.name||'')}catch{return''}};
  const cleanHead=t=>norm(t).replace(/^(?:text|bind|expr):/i,'').replace(/[{}]/g,'').trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const prop=(g,band,i,k)=>{try{return g.getCellProperty(band,i,k)}catch{return null}};
  const bindCol=(g,i)=>{const t=norm(prop(g,'body',i,'text'));const m=t.match(/^bind:(.+)$/i);return m?m[1].trim():''};
  // Work24 화면마다 Nexacro Application이 노출되는 위치가 달라질 수 있어
  // 표준 getApplication() 외에 parent/top 및 알려진 내부 참조까지 단계적으로 확인한다.
  const appCandidates=[];
  const addApp=(v,src)=>{
    if(!v || (typeof v!=='object' && typeof v!=='function')) return;
    if(appCandidates.some(x=>x.v===v)) return;
    appCandidates.push({v,src});
  };
  const inspectWin=(w,label)=>{
    if(!w)return;
    try{ addApp(w.nexacro?.getApplication?.call(w.nexacro), label+'.nexacro.getApplication()'); }catch{}
    try{ addApp(w.nexacro?.getApplication?.(), label+'.nexacro.getApplication()'); }catch{}
    for(const k of ['application','_application','__application','app']){
      try{ addApp(w[k], label+'.'+k); }catch{}
    }
    try{
      const nx=w.nexacro;
      if(nx){
        for(const k of ['application','_application','__application','_app','app']){
          try{ addApp(nx[k], label+'.nexacro.'+k); }catch{}
        }
        // Application 타입으로 보이는 전역 참조를 제한적으로 탐색
        for(const k of Object.getOwnPropertyNames(nx).slice(0,1200)){
          if(!/app|application|mainframe/i.test(k)) continue;
          let v=null; try{v=nx[k]}catch{}
          addApp(v,label+'.nexacro.'+k);
        }
      }
    }catch{}
    try{
      for(const k of Object.getOwnPropertyNames(w).slice(0,2500)){
        if(!/app|application/i.test(k)) continue;
        let v=null; try{v=w[k]}catch{}
        if(!v)continue;
        const t=objType(v);
        if(/Application/i.test(t) || v.mainframe || v._mainframe || typeof v.lookup==='function') addApp(v,label+'.'+k);
      }
    }catch{}
  };
  inspectWin(window,'window');
  try{ if(window.parent && window.parent!==window) inspectWin(window.parent,'parent'); }catch{}
  try{ if(window.top && window.top!==window && window.top!==window.parent) inspectWin(window.top,'top'); }catch{}
  try{ if(window.opener) inspectWin(window.opener,'opener'); }catch{}

  const looksLikeApp=o=>{
    if(!o)return false;
    const t=objType(o);
    if(/Application/i.test(t))return true;
    try{if(o.mainframe||o._mainframe)return true}catch{}
    try{if(typeof o.getActiveFrame==='function'||typeof o.lookup==='function')return true}catch{}
    return false;
  };
  let app=(appCandidates.find(x=>looksLikeApp(x.v))||appCandidates[0]||{}).v||null;
  out.appFound=!!app;
  out.appSource=(appCandidates.find(x=>x.v===app)||{}).src||'';
  out.frameUrl=(()=>{try{return location.href}catch{return''}})();
  out.nexacroPresent=(()=>{try{return !!window.nexacro}catch{return false}})();
  if(!app){
    out.notes.push(`Nexacro application을 찾지 못했습니다. (nexacro=${out.nexacroPresent?'있음':'없음'})`);
    return out;
  }

  const seen=new WeakSet(),q=[{o:app,path:'app',depth:0}];
  let target=null;
  while(q.length && out.visited<5000){
    const {o,path,depth}=q.shift();
    if(!o||(typeof o!=='object'&&typeof o!=='function'))continue;
    try{if(seen.has(o))continue;seen.add(o)}catch{}
    out.visited++;
    const type=objType(o);
    const gridLike=/Grid/i.test(type)||(typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function'&&typeof o.getBindDataset==='function');
    if(gridLike){
      try{
        const hc=Number(o.getCellCount('head')||0),bc=Number(o.getCellCount('body')||0);
        const heads=[];
        for(let i=0;i<hc;i++){
          const text=cleanHead(prop(o,'head',i,'text'));
          if(text)heads.push({i,text,left:num(prop(o,'head',i,'left')),width:num(prop(o,'head',i,'width')),col:num(prop(o,'head',i,'col')),colspan:num(prop(o,'head',i,'colspan'))||1});
        }
        const h=compact(heads.map(x=>x.text).join('|'));
        const exact=h.includes(compact('구분'))&&h.includes(compact('세부내용'))&&h.includes(compact('참여기간'))&&(h.includes(compact('활동(지원)횟수'))||h.includes(compact('활동지원횟수'))||h.includes(compact('활동(지원)회수'))||h.includes(compact('활동지원회수'))||h.includes('횟수')||h.includes('회수'));
        if(!out.gridSamples)out.gridSamples=[];
        if(out.gridSamples.length<20 && heads.length){
          out.gridSamples.push({path,headers:heads.map(x=>x.text).slice(0,12)});
        }
        if(exact){target={grid:o,path,heads,bc};break;}
      }catch(e){}
    }
    if(depth<13){
      let kids=[];
      for(const key of ['components','objects','all','forms','frames','childframes','popupframes','_frames','_child_list']){
        try{kids.push(...collectionItems(o[key]))}catch{}
      }
      for(const k of ['form','parent','mainframe','_mainframe','frame','childframe','activeFrame','workFrame','_active_frame']){
        try{const v=o[k];if(v&&v!==o)kids.push(v)}catch{}
      }
      // Application/Frame 계열은 화면 프레임 참조가 일반 컬렉션 밖에 숨어있는 경우가 있어
      // 이름이 frame/form/component 계열인 속성만 제한적으로 추가 탐색한다.
      if(depth<5){
        try{
          for(const k of Object.getOwnPropertyNames(o).slice(0,1200)){
            if(!/frame|form|component|object|child|popup/i.test(k))continue;
            let v=null;try{v=o[k]}catch{}
            if(v&&v!==o){
              if(Array.isArray(v)) kids.push(...v);
              else if(typeof v==='object'||typeof v==='function'){
                kids.push(v);
                try{kids.push(...collectionItems(v))}catch{}
              }
            }
          }
        }catch{}
      }
      const uniq=[];for(const k of kids)if(k&&!uniq.includes(k))uniq.push(k);
      for(const k of uniq)q.push({o:k,path:path+'/'+(norm(k.name||k.id)||objType(k)||'obj'),depth:depth+1});
    }
  }
  async function tryDomFallback(){
    const d={ok:false,found:false,method:'DOM',added:0,skipped:0,failed:0,headers:[],rows:[],notes:[]};
    const vis=el=>{try{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>2&&r.height>2&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0}catch{return false}};
    const txt=el=>norm(el?.innerText||el?.textContent||el?.value||'');
    const cpt=el=>compact(txt(el));
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const all=sel=>{try{return Array.from(document.querySelectorAll(sel))}catch{return[]}};
    const findText=(labels)=>{
      const labs=labels.map(compact);
      const nodes=all('h1,h2,h3,h4,h5,h6,legend,caption,th,td,label,strong,span,div,p');
      return nodes.filter(vis).filter(el=>{
        const t=cpt(el); if(!t||t.length>120)return false;
        return labs.some(l=>t===l||t.includes(l));
      }).sort((a,b)=>{
        const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
        return (ar.width*ar.height)-(br.width*br.height);
      })[0]||null;
    };
    const heading=findText(['구직활동지원 프로그램 활동 계획']);
    if(!heading){d.notes.push('DOM에서 「구직활동지원 프로그램 활동 계획」 제목을 찾지 못했습니다.');return d;}
    d.found=true;
    let region=heading;
    for(let i=0;i<10 && region;i++){
      const t=compact(txt(region));
      if(t.includes(compact('구직활동지원 프로그램 활동 계획')) && t.includes(compact('행추가')) && t.includes(compact('세부내용')) && t.includes(compact('참여기간'))){break;}
      region=region.parentElement;
    }
    if(!region) region=heading.parentElement||document.body;

    const candidates=()=>Array.from(region.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"]')).filter(vis);
    const addBtn=()=>candidates().filter(el=>compact(txt(el)||el.value)==='행추가').sort((a,b)=>{
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      return Math.abs(ar.top-heading.getBoundingClientRect().top)-Math.abs(br.top-heading.getBoundingClientRect().top);
    })[0]||null;
    if(!addBtn()){d.notes.push('DOM에서 해당 영역의 「행추가」 버튼을 찾지 못했습니다.');return d;}

    const headerEl=(labels)=>{
      const labs=labels.map(compact);
      return Array.from(region.querySelectorAll('th,td,div,span,label')).filter(vis).filter(el=>{
        const t=cpt(el); if(!t||t.length>60)return false;
        return labs.some(l=>t===l);
      }).sort((a,b)=>{
        const aa=a.getBoundingClientRect(),bb=b.getBoundingClientRect();
        const ap=(a.tagName==='TH'?0:a.tagName==='TD'?1:2),bp=(b.tagName==='TH'?0:b.tagName==='TD'?1:2);
        return ap-bp || (aa.width*aa.height)-(bb.width*bb.height);
      })[0]||null;
    };
    const hs={
      kind:headerEl(['구분']),
      detail:headerEl(['세부내용']),
      period:headerEl(['참여기간']),
      count:headerEl(['활동(지원)횟수','활동지원횟수','활동(지원)회수','활동지원회수','횟수','회수'])
    };
    d.headers=Object.fromEntries(Object.entries(hs).map(([k,v])=>[k,v?txt(v):'']));
    if(!hs.kind||!hs.detail||!hs.period||!hs.count){d.notes.push('DOM 표 헤더 위치를 모두 찾지 못했습니다.');return d;}
    const centers=Object.fromEntries(Object.entries(hs).map(([k,v])=>{const r=v.getBoundingClientRect();return[k,r.left+r.width/2]}));
    const headerBottom=Math.max(...Object.values(hs).map(v=>v.getBoundingClientRect().bottom));

    const getSetter=(el)=>{
      let p=el; while(p){const desc=Object.getOwnPropertyDescriptor(p,'value');if(desc?.set)return desc.set;p=Object.getPrototypeOf(p)}return null;
    };
    const fire=el=>{
      for(const ev of ['input','change']){try{el.dispatchEvent(new Event(ev,{bubbles:true,composed:true}))}catch{}}
      try{el.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'Tab'}))}catch{}
      try{el.blur()}catch{}
    };
    const setVal=(el,val)=>{
      if(!el)return false; val=String(val??'');
      if(!repairOnly)assertIapIdentity();
      try{el.focus()}catch{}
      if(el.tagName==='SELECT'){
        const opts=Array.from(el.options||[]);const want=compact(val);
        let o=opts.find(x=>compact(x.textContent)===want)||opts.find(x=>compact(x.textContent).includes(want)||want.includes(compact(x.textContent)));
        if(o)el.value=o.value;else el.value=val;fire(el);return true;
      }
      if(el.isContentEditable){el.textContent=val;fire(el);return true;}
      try{const setter=getSetter(el); if(setter)setter.call(el,val); else el.value=val;}catch{try{el.value=val}catch{return false}}
      fire(el);return true;
    };
    const editable=()=>Array.from(region.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]),select,textarea,[contenteditable="true"]')).filter(vis).filter(el=>el.getBoundingClientRect().top>headerBottom-3);
    const byColumn=(els,key)=>els.filter(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2;const pairs=Object.entries(centers).sort((a,b)=>Math.abs(x-a[1])-Math.abs(x-b[1]));return pairs[0]?.[0]===key;}).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
    const rowGroups=els=>{
      const sorted=[...els].sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top||a.getBoundingClientRect().left-b.getBoundingClientRect().left);
      const groups=[];
      for(const el of sorted){const y=el.getBoundingClientRect().top;let g=groups.find(x=>Math.abs(x.y-y)<18);if(!g){g={y,els:[]};groups.push(g)}g.els.push(el)}
      return groups.sort((a,b)=>a.y-b.y);
    };
    const existingDup=a=>editable().some(el=>compact(el.value||el.textContent)===compact(a.detail||''));

    for(const a of acts){
      if(!a||(!a.kind&&!a.detail))continue;
      if(existingDup(a)){d.skipped++;d.rows.push({detail:a.detail,status:'이미 존재하여 건너뜀'});continue;}
      const before=new Set(editable());
      const b=addBtn(); if(!b){d.failed++;d.rows.push({detail:a.detail,status:'행추가 버튼 소실'});continue;}
      if(!repairOnly)assertIapIdentity();
      try{b.click()}catch{try{b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}catch{}}
      await wait(350);
      let ed=editable();
      let fresh=ed.filter(x=>!before.has(x));
      let groups=rowGroups(fresh.length?fresh:ed);
      let row=groups.filter(g=>g.y>headerBottom-2).slice(-1)[0]?.els||[];
      if(!row.length){d.failed++;d.rows.push({detail:a.detail,status:'행추가 후 입력칸 미발견'});continue;}
      const ck=byColumn(row,'kind'),cd=byColumn(row,'detail'),cp=byColumn(row,'period'),cc=byColumn(row,'count');
      const mapped=TYPE_MAP[norm(a.kind)]||norm(a.kind);
      let good=0,total=0;
      total++; if(setVal(ck[0],mapped))good++;
      total++; if(setVal(cd[0],norm(a.detail)))good++;
      if(cp.length>=2){total+=2;if(setVal(cp[0],date10(a.start)))good++;if(setVal(cp[1],date10(a.end)))good++;}
      else if(cp.length===1){total++;if(setVal(cp[0],`${date10(a.start)} ~ ${date10(a.end)}`))good++;}
      else total++;
      total++; if(setVal(cc[0],String(a.cnt||'2').replace(/[^0-9]/g,'')||'2'))good++;
      if(good===total){d.added++;d.rows.push({detail:a.detail,status:`DOM입력 ${good}/${total}`});}
      else{d.failed++;d.rows.push({detail:a.detail,status:`DOM 부분입력 ${good}/${total} · kind${ck.length}/detail${cd.length}/period${cp.length}/count${cc.length}`});}
      await wait(120);
    }
    d.ok=d.added>0||d.skipped>0;
    d.notes.push('DOM 기반 보조 입력을 사용했습니다. 최종 저장·제출은 수행하지 않았습니다.');
    return d;
  }


  async function tryNexacroButtonFallback(){
    const d={ok:false,found:false,method:'Nexacro 행추가 추적',added:0,skipped:0,failed:0,headers:[],rows:[],notes:[],buttonCandidates:[],datasetChanges:[],datasetColumns:[]};
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const label=o=>{
      for(const k of ['text','caption','value','title','name','id']){
        try{const v=o?.[k];if(typeof v==='string'&&norm(v))return norm(v)}catch{}
      }
      for(const m of ['get_text','get_caption','get_value']){
        try{if(typeof o?.[m]==='function'){const v=o[m]();if(typeof v==='string'&&norm(v))return norm(v)}}catch{}
      }
      return '';
    };
    const xy=o=>{
      const val=(methods,props)=>{
        for(const m of methods)try{if(typeof o?.[m]==='function'){const v=Number(o[m]());if(Number.isFinite(v))return v}}catch{}
        for(const p of props)try{const v=Number(o?.[p]);if(Number.isFinite(v))return v}catch{}
        return 0;
      };
      let x=val(['getOffsetLeft'],['_adjust_left','left','_left']);
      let y=val(['getOffsetTop'],['_adjust_top','top','_top']);
      const w=val(['getOffsetWidth'],['_adjust_width','width','_width']);
      const h=val(['getOffsetHeight'],['_adjust_height','height','_height']);
      let p=null;try{p=o.parent}catch{}
      let n=0;
      while(p&&p!==o&&n++<18){
        try{if(typeof p.getOffsetLeft==='function')x+=Number(p.getOffsetLeft()||0);else x+=Number(p._adjust_left||0)}catch{}
        try{if(typeof p.getOffsetTop==='function')y+=Number(p.getOffsetTop()||0);else y+=Number(p._adjust_top||0)}catch{}
        try{p=p.parent}catch{break}
      }
      return{x,y,w,h};
    };
    const visible=o=>{try{if(o.visible===false||o.enable===false)return false}catch{};return true};
    const scan=()=>{
      const seen2=new WeakSet(),q2=[{o:app,path:'app',depth:0}],buttons=[],titles=[],datasets=[],grids=[];
      let visited=0;
      const addDataset=(o,path)=>{
        if(!o)return;
        const type=objType(o);
        const dsLike=/Dataset/i.test(type)||(typeof o.getRowCount==='function'&&typeof o.setColumn==='function'&&typeof o.addRow==='function');
        if(dsLike&&!datasets.some(x=>x.o===o)) datasets.push({o,path,name:norm(o.name||o.id||''),type});
      };
      while(q2.length&&visited<6500){
        const {o,path,depth}=q2.shift();
        if(!o||(typeof o!=='object'&&typeof o!=='function'))continue;
        try{if(seen2.has(o))continue;seen2.add(o)}catch{}
        visited++;
        const type=objType(o),lb=label(o),cp=compact(lb);
        if((/Button/i.test(type)||typeof o.on_fire_onclick==='function'||typeof o.click==='function')&&visible(o)){
          if(lb)buttons.push({o,path,type,label:lb,rect:xy(o)});
        }
        if(lb&&cp.includes(compact('구직활동지원 프로그램 활동 계획'))) titles.push({o,path,type,label:lb,rect:xy(o)});
        const gridLike=/Grid/i.test(type)||(typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function');
        if(gridLike&&visible(o))grids.push({o,path,type,label:lb,rect:xy(o)});
        addDataset(o,path);
        if(depth<15){
          let kids=[];
          for(const key of ['components','objects','all','forms','frames','childframes','popupframes','_frames','_child_list'])try{kids.push(...collectionItems(o[key]))}catch{}
          for(const k of ['form','mainframe','_mainframe','frame','childframe','activeFrame','workFrame','_active_frame'])try{const v=o[k];if(v&&v!==o)kids.push(v)}catch{}
          if(depth<6){
            try{for(const k of Object.getOwnPropertyNames(o).slice(0,1600)){
              if(!/frame|form|component|object|child|popup|dataset|ds|grid|btn|button/i.test(k))continue;
              let v=null;try{v=o[k]}catch{}
              if(v&&v!==o){
                if(Array.isArray(v))kids.push(...v);
                else if(typeof v==='object'||typeof v==='function'){kids.push(v);try{kids.push(...collectionItems(v))}catch{}}
              }
            }}catch{}
          }
          const uniq=[];for(const k of kids)if(k&&!uniq.includes(k))uniq.push(k);
          for(const k of uniq)q2.push({o:k,path:path+'/'+(norm(k.name||k.id)||objType(k)||'obj'),depth:depth+1});
        }
      }
      return{buttons,titles,datasets,grids,visited};
    };
    const dsCols=ds=>{
      const cols=[];
      try{
        const n=Number(ds.getColCount?.()||0);
        for(let i=0;i<n;i++){
          let ci=null;try{ci=ds.getColumnInfo?.(i)}catch{}
          let id='';try{id=norm(ci?.id||ci?.name||'')}catch{}
          if(!id){try{id=norm(ds.colinfos?.[i]?.id||'')}catch{}}
          if(id)cols.push(id);
        }
      }catch{}
      if(!cols.length){
        try{for(const ci of collectionItems(ds.colinfos)){const id=norm(ci?.id||ci?.name||'');if(id&&!cols.includes(id))cols.push(id)}}catch{}
      }
      return cols;
    };
    const rowCount=ds=>{try{return Number(ds.getRowCount?.()||0)}catch{return 0}};
    const fireNxButton=o=>{
      if(!o)return false;
      // Nexacro Button의 실제 이벤트 체인을 우선 사용한다.
      if(!repairOnly)assertIapIdentity();
      try{if(typeof o.click==='function'){o.click();return true}}catch{}
      try{if(typeof o.on_fire_onclick==='function'){o.on_fire_onclick();return true}}catch{}
      try{if(o.onclick&&typeof o.onclick._fireEvent==='function'){o.onclick._fireEvent(o,null);return true}}catch{}
      try{if(typeof o._on_click==='function'){o._on_click();return true}}catch{}
      return false;
    };
    const clickButton=btn=>{
      if(btn?.nxObj && fireNxButton(btn.nxObj))return true;
      if(btn?.dom){
        const el=btn.dom;
        try{
          const r=el.getBoundingClientRect();
          const cx=r.left+r.width/2,cy=r.top+r.height/2;
          const target=document.elementFromPoint(cx,cy)||el;
          const base={bubbles:true,cancelable:true,view:window,clientX:cx,clientY:cy,button:0};
          try{target.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1}))}catch{}
          try{target.dispatchEvent(new MouseEvent('mousedown',{...base,buttons:1}))}catch{}
          try{target.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0}))}catch{}
          try{target.dispatchEvent(new MouseEvent('mouseup',{...base,buttons:0}))}catch{}
          try{target.dispatchEvent(new MouseEvent('click',{...base,buttons:0}))}catch{}
          return true;
        }catch{}
        if(!repairOnly)assertIapIdentity();
        try{el.click();return true}catch{}
        return false;
      }
      const o=btn?.o||btn;
      return fireNxButton(o);
    };
    const snap=scan();
    let addBtns=snap.buttons.filter(b=>compact(b.label)==='행추가'||compact(b.label).includes(compact('행추가')));
    const nxTitle=snap.titles[0]||null;

    // Work24 IAP의 행추가가 Nexacro Button 객체로 노출되지 않는 경우가 있어,
    // 화면에 실제 렌더링된 '행추가' 텍스트 요소도 후보로 잡는다.
    // 렌더링 DOM의 id에는 Nexacro 컴포넌트 전체 경로가 그대로 들어가는 경우가 있다.
    // 예: mainframe....tp_act.form.div_form.form.div_cmmBtnArea3.form.btn_addSeek
    // 이 경로를 실제 Nexacro 객체로 역해석하여 DOM click이 아니라 컴포넌트 onclick을 직접 발생시킨다.
    const getByCollection=(o,key)=>{
      if(!o||!key)return null;
      for(const c of ['components','objects','all','frames','childframes','popupframes','_frames']){
        let col=null;try{col=o[c]}catch{}
        if(!col)continue;
        try{if(col[key])return col[key]}catch{}
        try{if(typeof col.get_item==='function'){const v=col.get_item(key);if(v)return v}}catch{}
      }
      return null;
    };
    const resolveNxDomId=(id)=>{
      id=norm(id);if(!id)return null;
      const parts=id.split('.').filter(Boolean);
      const roots=[];
      const addRoot=(v,name)=>{if(v&&!roots.some(x=>x.v===v))roots.push({v,name})};
      addRoot(app,'app');
      try{addRoot(window.nexacro?.getApplication?.(),'window.app')}catch{}
      try{addRoot(window.parent?.nexacro?.getApplication?.(),'parent.app')}catch{}
      try{addRoot(window.top?.nexacro?.getApplication?.(),'top.app')}catch{}
      const step=(cur,key)=>{
        if(!cur)return null;
        try{if(cur[key])return cur[key]}catch{}
        const cc=getByCollection(cur,key);if(cc)return cc;
        // 동적 Frame/Form 구조에서는 현재 객체의 form 아래에 형제가 노출되는 경우가 있다.
        try{if(cur.form&&cur.form!==cur){if(cur.form[key])return cur.form[key];const x=getByCollection(cur.form,key);if(x)return x}}catch{}
        return null;
      };
      for(const root of roots){
        for(const startAt of [0, parts[0]==='mainframe'?1:0]){
          let cur=root.v,ok=true;
          let used=[];
          if(parts[0]==='mainframe'&&startAt===1){
            try{cur=cur.mainframe||cur._mainframe||step(cur,'mainframe')}catch{}
            if(!cur)continue;used.push('mainframe');
          }
          for(let i=startAt;i<parts.length;i++){
            const key=parts[i];
            if(i===0&&key==='mainframe'){const m=step(cur,'mainframe');if(m){cur=m;used.push(key);continue}}
            const nx=step(cur,key);
            if(!nx){ok=false;break}
            cur=nx;used.push(key);
          }
          if(ok&&cur)return {o:cur,source:root.name,parts:used,type:objType(cur),label:label(cur)};
        }
      }
      return null;
    };
    const domVisible=el=>{try{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>2&&r.height>2&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0}catch{return false}};
    const domText=el=>norm(el?.innerText||el?.textContent||el?.value||'');
    const exactDom=(label)=>{
      const want=compact(label),res=[];
      try{
        for(const el of document.querySelectorAll('body *')){
          if(!domVisible(el)||compact(domText(el))!==want)continue;
          const r=el.getBoundingClientRect();
          const nx=resolveNxDomId(el.id||'');
          res.push({dom:el,nxObj:nx?.o||null,nxSource:nx?.source||'',nxType:nx?.type||'',nxLabel:nx?.label||'',path:`DOM:${el.tagName.toLowerCase()}#${el.id||''}`,type:'RenderedDOM',label,rect:{x:r.left,y:r.top,w:r.width,h:r.height},area:r.width*r.height});
        }
      }catch{}
      return res.sort((a,b)=>a.area-b.area);
    };
    const domTitles=exactDom('구직활동지원 프로그램 활동 계획');
    const domAdds=exactDom('행추가');
    if(!addBtns.length && domAdds.length){
      addBtns=domAdds;
      d.method='화면 행추가 + Nexacro Dataset 추적';
      d.notes.push(`Nexacro Button 객체 대신 화면의 「행추가」 후보 ${domAdds.length}개를 찾았습니다.`);
    }
    d.buttonCandidates=addBtns.map(b=>({label:b.label,path:b.path,y:Math.round(b.rect.y),x:Math.round(b.rect.x),source:b.dom?(b.nxObj?'DOM→Nexacro':'DOM'):'Nexacro',nxType:b.nxType||'',nxLabel:b.nxLabel||'',nxSource:b.nxSource||''})).slice(0,12);
    if(!addBtns.length){
      d.notes.push('Nexacro 객체와 화면 DOM 모두에서 「행추가」 컨트롤을 찾지 못했습니다.');
      d.notes.push('Nexacro 버튼후보: '+snap.buttons.filter(b=>/추가|등록|저장/.test(b.label)).slice(0,10).map(b=>`${b.label}@${Math.round(b.rect.y)}`).join(' | '));
      return d;
    }
    const titleRect=nxTitle?.rect||domTitles[0]?.rect||null;
    let btn=null;
    if(titleRect){
      btn=addBtns.slice().sort((a,b)=>{
        const ay=a.rect.y||0,by=b.rect.y||0,ty=titleRect.y||0;
        // 제목 아래 250px 안쪽 후보를 우선하고, 같은 경우 제목과의 세로거리 우선
        const ap=(ay>=ty-20&&ay<=ty+260)?0:10000;
        const bp=(by>=ty-20&&by<=ty+260)?0:10000;
        return ap-bp+Math.abs(ay-ty)-Math.abs(by-ty);
      })[0];
    }else btn=addBtns.slice().sort((a,b)=>(b.rect.y||0)-(a.rect.y||0))[0];
    if(!btn){d.notes.push('구직활동지원 영역의 행추가 후보를 결정하지 못했습니다.');return d;}
    d.found=true;
    d.notes.push(`행추가 후보 선택: ${btn.path} / y=${Math.round(btn.rect.y||0)} / ${btn.nxObj?'DOM경로→Nexacro 객체('+ (btn.nxType||'') +')':(btn.dom?'화면DOM':'Nexacro')}`);
    if(btn.dom&&btn.nxObj)d.notes.push(`Nexacro 객체 역해석 성공: ${btn.nxLabel||btn.label||'-'} / ${btn.nxSource||'app'}`);

    // v1.4.6: 선택된 행추가 버튼 바로 아래의 Grid를 찾되, 새로운 행은
    // Dataset.addRow가 아닌 Work24 원본 행추가 절차로만 생성한다.
    // 최종 저장·제출은 실행하지 않는다.
    const tryDirectNearbyGrid=async()=>{
      const rr={ok:false,found:false,method:'Nexacro 인접 Grid Dataset 직접입력',added:0,skipped:0,failed:0,headers:[],rows:[],notes:[],gridCandidates:[]};
      const headInfo=gr=>{
        const heads=[];let hc=0,bc=0;
        try{hc=Number(gr.getCellCount?.('head')||0)}catch{}
        try{bc=Number(gr.getCellCount?.('body')||0)}catch{}
        const idxProp=(band,i,key)=>{try{const v=gr.getCellProperty?.(band,i,key);if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}catch{return null}};
        for(let i=0;i<hc;i++){
          const text=cleanHead(prop(gr,'head',i,'text'));
          if(text)heads.push({
            i,text,
            left:num(prop(gr,'head',i,'left')),width:num(prop(gr,'head',i,'width')),
            gridcol:idxProp('head',i,'col'),colspan:idxProp('head',i,'colspan')||1
          });
        }
        const body=[];
        for(let i=0;i<bc;i++){
          const col=bindCol(gr,i);if(!col)continue;
          body.push({
            i,col,
            left:num(prop(gr,'body',i,'left')),width:num(prop(gr,'body',i,'width')),
            gridcol:idxProp('body',i,'col'),colspan:idxProp('body',i,'colspan')||1,
            edittype:norm(prop(gr,'body',i,'edittype')),displaytype:norm(prop(gr,'body',i,'displaytype')),
            combods:norm(prop(gr,'body',i,'combodataset')),combocode:norm(prop(gr,'body',i,'combocodecol')),combodata:norm(prop(gr,'body',i,'combodatacol'))
          });
        }
        return{heads,body,hc,bc};
      };
      const exactHeaders=hi=>{
        const h=compact(hi.heads.map(x=>x.text).join('|'));
        return h.includes(compact('구분'))&&h.includes(compact('세부내용'))&&h.includes(compact('참여기간'))&&(h.includes(compact('활동(지원)횟수'))||h.includes(compact('활동지원횟수'))||h.includes(compact('활동(지원)회수'))||h.includes(compact('활동지원회수'))||h.includes('횟수')||h.includes('회수'));
      };
      const candidates=[];
      const addGrid=(x,src)=>{
        if(!x?.o||candidates.some(c=>c.o===x.o))return;
        const hi=headInfo(x.o),r=x.rect||xy(x.o);
        let score=0;
        if(exactHeaders(hi))score+=100;
        const h=compact(hi.heads.map(z=>z.text).join('|'));
        if(h.includes(compact('세부내용')))score+=20;
        if(h.includes(compact('참여기간')))score+=20;
        if(h.includes('횟수')||h.includes('회수'))score+=15;
        if(h.includes(compact('구분')))score+=10;
        const dy=(r.y||0)-(btn.rect.y||0);
        if(dy>=-20&&dy<=240)score+=25-Math.min(20,Math.abs(dy)/12);
        if((r.w||0)>500)score+=5;
        candidates.push({...x,src,hi,r,score,dy});
      };
      for(const gr of (snap.grids||[]))addGrid(gr,'global');
      // 버튼의 가까운 상위 폼 안쪽을 별도로 훑어서 전역 탐색에서 누락된 Grid도 찾는다.
      const roots=[];let cur=btn.nxObj||btn.o||null;let climb=0;
      while(cur&&climb++<10){
        try{cur=cur.parent}catch{cur=null}
        if(cur&&!roots.includes(cur))roots.push(cur);
      }
      for(const root of roots.slice(0,6)){
        const seen3=new WeakSet(),qq=[{o:root,depth:0}];let v=0;
        while(qq.length&&v++<1800){
          const {o,depth}=qq.shift();if(!o||(typeof o!=='object'&&typeof o!=='function'))continue;
          try{if(seen3.has(o))continue;seen3.add(o)}catch{}
          const t=objType(o),gridLike=/Grid/i.test(t)||(typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function');
          if(gridLike)addGrid({o,path:'near/'+(norm(o.name||o.id)||t),rect:xy(o)},'near');
          if(depth<7){
            let kids=[];
            for(const key of ['components','objects','all'])try{kids.push(...collectionItems(o[key]))}catch{}
            for(const k of ['form'])try{const z=o[k];if(z&&z!==o)kids.push(z)}catch{}
            for(const z of kids)qq.push({o:z,depth:depth+1});
          }
        }
      }
      candidates.sort((a,b)=>b.score-a.score||Math.abs(a.dy)-Math.abs(b.dy));
      rr.gridCandidates=candidates.slice(0,12).map(c=>({path:c.path,src:c.src,y:Math.round(c.r.y||0),dy:Math.round(c.dy||0),score:Math.round(c.score),headers:c.hi.heads.map(h=>h.text).slice(0,10)}));
      const cg=candidates.find(c=>exactHeaders(c.hi));
      if(!cg){
        rr.notes.push('행추가 버튼 인접 Grid 후보는 찾았지만 구직활동지원 4개 헤더가 모두 일치하는 Grid를 확정하지 못했습니다.');
        if(rr.gridCandidates.length)rr.notes.push('인접 Grid 후보: '+rr.gridCandidates.map(x=>`${x.path}@y${x.y}/score${x.score}[${x.headers.join(',')}]`).join(' | '));
        return rr;
      }
      rr.found=true;rr.headers=cg.hi.heads.map(x=>x.text);
      const gr=cg.o;
      const resolveDs=(id)=>{
        if(id&&typeof id==='object'&&typeof id.getRowCount==='function')return id;
        id=norm(id).replace(/^@/,'');
        const tries=[];
        try{tries.push(gr.getBindDataset?.())}catch{}
        try{tries.push(gr._findDataset?.(id))}catch{}
        let p=gr,n=0;
        while(p&&n++<12){
          try{tries.push(p.lookup?.(id))}catch{}
          try{tries.push(p[id])}catch{}
          try{tries.push(p.objects?.get_item?.(id))}catch{}
          try{p=p.parent}catch{break}
        }
        try{tries.push(app.lookup?.(id),app[id])}catch{}
        return tries.find(x=>x&&typeof x.getRowCount==='function'&&typeof x.setColumn==='function')||null;
      };
      let bd=null;try{bd=gr.getBindDataset?.()}catch{}
      let ds=(bd&&typeof bd==='object')?bd:null;
      if(!ds){let id='';try{id=norm(gr.binddataset||gr._binddataset||bd||'')}catch{};ds=resolveDs(id)}
      if(!ds||typeof ds.getRowCount!=='function'||typeof ds.setColumn!=='function'){
        rr.notes.push(`정확한 구직활동지원 Grid(${cg.path})는 찾았지만 바인딩 Dataset을 해석하지 못했습니다.`);
        return rr;
      }
      const hi=cg.hi;
      // Nexacro Grid의 head/body는 화면 pixel(left/width) 값이 0 또는 상대값으로 노출되는 경우가 있어
      // v1.3.0부터는 head의 col/colspan과 body의 col을 우선 사용한다.
      // 특히 '참여기간'처럼 1개 헤더가 시작일/종료일 2개 body column을 묶는 구조를 정확히 매핑한다.
      const cellsFor=headText=>{
        const hh=hi.heads.filter(h=>compact(h.text).includes(compact(headText))).sort((a,b)=>{
          const ac=a.gridcol===null?9999:a.gridcol,bc=b.gridcol===null?9999:b.gridcol;
          return ac-bc||a.left-b.left;
        })[0];
        if(!hh)return[];
        if(hh.gridcol!==null){
          const from=hh.gridcol,to=from+Math.max(1,hh.colspan||1)-1;
          const byCol=hi.body.filter(b=>b.gridcol!==null&&b.gridcol>=from&&b.gridcol<=to)
            .sort((a,b)=>(a.gridcol??9999)-(b.gridcol??9999)||a.left-b.left);
          if(byCol.length)return byCol;
        }
        return hi.body.filter(b=>{const x=b.left+b.width/2;return x>=hh.left-2&&x<=hh.left+hh.width+2}).sort((a,b)=>a.left-b.left);
      };
      const cKind=cellsFor('구분'),cDetail=cellsFor('세부내용'),cPeriod=cellsFor('참여기간');
      let cCount=cellsFor('활동(지원)횟수');if(!cCount.length)cCount=cellsFor('활동(지원)회수');if(!cCount.length)cCount=cellsFor('횟수');if(!cCount.length)cCount=cellsFor('회수');
      if(!cKind.length||!cDetail.length||!cPeriod.length||!cCount.length){
        rr.notes.push(`정확한 Grid는 찾았지만 body 바인딩 열 매핑 실패: 구분 ${cKind.length}, 세부내용 ${cDetail.length}, 참여기간 ${cPeriod.length}, 횟수 ${cCount.length}`);
        rr.notes.push('Grid body 바인딩: '+hi.body.map(b=>`${b.i}:${b.col}@col${b.gridcol??'?'}(${b.edittype||b.displaytype||'-'})`).join(' | '));
        return rr;
      }
      rr.notes.push(`열매핑: 구분=${cKind.map(x=>x.col).join(',')} / 세부내용=${cDetail.map(x=>x.col).join(',')} / 참여기간=${cPeriod.map(x=>x.col).join(',')} / 회수=${cCount.map(x=>x.col).join(',')}`);
      rr.notes.push('헤더 col: '+hi.heads.map(h=>`${h.text}@${h.gridcol??'?'}x${h.colspan||1}`).join(' | '));
      const rc=()=>{try{return Number(ds.getRowCount?.()||0)}catch{return 0}};
      const resolveComboDs=(cell)=>{
        const id=norm(cell?.combods).replace(/^@/,'');if(!id)return null;
        // v1.3.3: Combo Dataset 해석에서는 기존 resolveDs()를 사용하지 않는다.
        // resolveDs()는 Grid의 binddataset을 첫 후보로 반환하므로, combodataset=ds_BUAC0010을
        // 찾는 과정에서 ds_seekPgmList가 잘못 선택될 수 있었다.
        const isDs=x=>x&&typeof x.getRowCount==='function'&&typeof x.getColumn==='function';
        const names=x=>[x?.name,x?.id,x?._id,x?._name].map(norm).filter(Boolean);
        const exactName=x=>names(x).some(n=>n===id);
        const found=[];
        const add=(x,source)=>{if(isDs(x)&&!found.some(z=>z.o===x))found.push({o:x,source,exact:exactName(x)});};
        try{add(gr._findDataset?.(id),'grid._findDataset')}catch{}
        let p=gr,n=0;
        while(p&&n++<14){
          try{add(p[id],`parent[${id}]`)}catch{}
          try{add(p.objects?.get_item?.(id),'parent.objects')}catch{}
          try{add(p.lookup?.(id),'parent.lookup')}catch{}
          try{if(p.form&&p.form!==p){add(p.form[id],'parent.form[id]');add(p.form.objects?.get_item?.(id),'parent.form.objects');add(p.form.lookup?.(id),'parent.form.lookup')}}catch{}
          try{p=p.parent}catch{break}
        }
        try{add(app[id],'app[id]');add(app.lookup?.(id),'app.lookup')}catch{}
        for(const x of (snap.datasets||[])){
          const nm=norm(x.name||x.o?.name||x.o?.id||'');
          const last=norm(String(x.path||'').split('/').pop()||'');
          if(nm===id||last===id)add(x.o,'snapshot:'+String(x.path||''));
        }
        if(!found.length)return null;
        const codeWant=norm(cell?.combocode),dataWant=norm(cell?.combodata);
        const hasCI=(cols,w)=>!!w&&cols.some(c=>String(c).toLowerCase()===String(w).toLowerCase());
        found.sort((a,b)=>{
          const ac=dsCols(a.o),bc=dsCols(b.o);
          const as=(a.exact?20:0)+(hasCI(ac,codeWant)?4:0)+(hasCI(ac,dataWant)?4:0)+Math.min(2,Number(a.o.getRowCount?.()||0));
          const bs=(b.exact?20:0)+(hasCI(bc,codeWant)?4:0)+(hasCI(bc,dataWant)?4:0)+Math.min(2,Number(b.o.getRowCount?.()||0));
          return bs-as;
        });
        // 이름이 전혀 다른 Dataset(특히 ds_seekPgmList)은 명시 Combo Dataset으로 인정하지 않는다.
        return found.find(x=>x.exact)?.o||null;
      };
      const dsName=x=>norm(x?.name||x?.id||'')||'(이름없음)';
      const colCI=(cols,want)=>{
        want=norm(want);if(!want)return'';
        return cols.find(c=>c===want)||cols.find(c=>String(c).toLowerCase()===want.toLowerCase())||'';
      };
      const comboOptions=(cds,codeCol,dataCol,limit=30)=>{
        const out=[];if(!cds)return out;
        const cols=dsCols(cds);
        if(!cols.length)return out;
        const dc=colCI(cols,dataCol)||(cols.find(c=>/(nm|name|data|label|text)/i.test(c))||'');
        const cc=colCI(cols,codeCol)||(cols.find(c=>/(cd|code|se|gbn|type|kind)/i.test(c))||'');
        if(!dc||!cc)return out;
        const n=Math.min(limit,Number(cds.getRowCount?.()||0));
        for(let r=0;r<n;r++){
          let code='',label='';try{code=norm(cds.getColumn(r,cc));label=norm(cds.getColumn(r,dc))}catch{}
          if(code||label)out.push({code,label});
        }
        return out;
      };
      // Work24의 구분 셀은 화면 표시문자가 아니라 코드값을 저장하는 Combo다.
      // v1.3.3은 Grid가 명시한 combodataset/code/data를 정확한 Dataset 이름 기준으로 사용한다.
      // 명시 Dataset을 찾은 경우 다른 메뉴/공통 Dataset으로 절대 넘어가지 않아 오탐 코드를 막는다.
      const comboResolve=(cell,labels0)=>{
        const labels=[...new Set((Array.isArray(labels0)?labels0:[labels0]).map(norm).filter(Boolean))];
        if(!labels.length)return null;
        const wants=labels.map(x=>({raw:x,c:compact(x),loose:compact(x).replace(/\([^)]*\)/g,'')}));
        const explicitCode=norm(cell?.combocode), explicitData=norm(cell?.combodata);
        const explicitId=norm(cell?.combods).replace(/^@/,'');
        const searchOne=(cds,source,allowPartial=true)=>{
          if(!cds||cds===ds||typeof cds.getRowCount!=='function'||typeof cds.getColumn!=='function')return null;
          const cols=dsCols(cds),n=Math.min(1000,Number(cds.getRowCount?.()||0));
          if(!n||!cols.length)return null;
          const dataCols=[];
          const explicitDataCol=colCI(cols,explicitData);
          if(explicitDataCol)dataCols.push(explicitDataCol);
          for(const c of cols){if(c!==explicitDataCol&&/(nm|name|data|label|text|cn|cont|desc|se_nm|type_nm|kind_nm)/i.test(c))dataCols.push(c)}
          if(!dataCols.length)for(const c of cols)dataCols.push(c);
          let partial=null;
          for(let r=0;r<n;r++)for(const dataCol of dataCols){
            let dv='';try{dv=norm(cds.getColumn(r,dataCol))}catch{}
            if(!dv)continue;
            const dc=compact(dv),looseDc=dc.replace(/\([^)]*\)/g,'');
            let match=wants.find(w=>dc===w.c);
            let exact=!!match;
            if(!match&&allowPartial)match=wants.find(w=>dc.includes(w.c)||w.c.includes(dc)||looseDc===w.loose);
            if(!match)continue;
            let codeCol=colCI(cols,explicitCode);
            let cv=null;
            if(codeCol){try{cv=cds.getColumn(r,codeCol)}catch{}}
            // 명시 코드열이 있더라도 해당 행 값이 비어 있으면 같은 행의 다른 코드성 열을 확인한다.
            if(!codeCol||cv===null||cv===undefined||norm(cv)===''){
              const pref=cols.filter(c=>c!==dataCol).sort((a,b)=>{
                const sa=/(^|_)(cd|code|se|gbn|clsf|type|kind)(_|$)/i.test(a)?0:/(cd|code|se|gbn|type|kind)/i.test(a)?1:2;
                const sb=/(^|_)(cd|code|se|gbn|clsf|type|kind)(_|$)/i.test(b)?0:/(cd|code|se|gbn|type|kind)/i.test(b)?1:2;
                return sa-sb;
              });
              codeCol='';cv=null;
              for(const c of pref){let v=null;try{v=cds.getColumn(r,c)}catch{};if(v!==null&&v!==undefined&&norm(v)!==''&&compact(norm(v))!==dc){codeCol=c;cv=v;break}}
            }
            if(!codeCol||cv===null||cv===undefined||norm(cv)==='')continue;
            const hit={code:cv,label:dv,ds:dsName(cds),dataCol,codeCol,source,exact};
            if(exact)return hit;
            if(!partial)partial=hit;
          }
          return partial;
        };
        const explicitDs=resolveComboDs(cell);
        if(explicitId){
          if(explicitDs){
            const hit=searchOne(explicitDs,'cell.combodataset:'+explicitId,true);
            if(hit)return hit;
            return {notFound:true,explicit:true,ds:dsName(explicitDs),options:comboOptions(explicitDs,explicitCode,explicitData)};
          }
          return {notFound:true,explicit:true,ds:explicitId,options:[]};
        }
        // 명시 combodataset이 없는 경우에만 제한적 fallback
        for(const x of (snap.datasets||[])){
          const hit=searchOne(x.o,x.path||'scan',false);
          if(hit)return hit;
        }
        return null;
      };
      const sample=col=>{for(let r=0;r<rc();r++){let v='';try{v=norm(ds.getColumn(r,col))}catch{};if(v)return v}return''};
      const adaptDate=(col,v)=>/^(?:PRGM_BGDE|PRGM_ENDE|PRGM_BGDT|PRGM_ENDT|JHAC_BGDE|JHAC_ENDE|BGDE|ENDE)$/i.test(String(col||''))||/^\d{8}$/.test(sample(col))?date8(v):date10(v);
      const read=(r,c)=>{try{return norm(ds.getColumn(r,c.col))}catch{return''}};
      const set=(r,c,v,kind='text',comboLabels=null)=>{
        if(!c?.col)return false;let x=v,comboHit=null;
        if(kind==='date')x=adaptDate(c.col,v);
        if(kind==='combo'){
          comboHit=comboResolve(c,comboLabels||[v]);
          if(comboHit&&!comboHit.notFound)x=comboHit.code;
        }
        if(kind==='count')x=String(v||'2').replace(/\D/g,'')||'2';
        let ok=false;if(!repairOnly)assertIapIdentity();try{ok=ds.setColumn(r,c.col,x)!==false}catch{return false}
        if(kind==='date'){
          const stored=read(r,c);
          if(!ok||!dateValid(stored)||!/^\d{8}$/.test(stored)||stored!==date8(v)){
            rr.notes.push(`저장 차단: ${c.col} ${r+1}행 날짜 저장값 ${stored.length}자리 (8자리 필요)`);return false;
          }
          return true;
        }
        if(kind==='combo'){
          let shown='';try{shown=norm(gr.getCellText?.(r,c.i)||'')}catch{}
          if(comboHit&&!comboHit.notFound){
            rr.notes.push(`구분코드: ${norm(v)} → ${norm(comboHit.code)} / ${comboHit.ds}.${comboHit.codeCol} (${comboHit.label})`);
            // Combo 코드가 정상 반영되면 화면표시가 생기거나, 최소한 Dataset에는 해당 코드가 들어가야 한다.
            let stored='';try{stored=norm(ds.getColumn(r,c.col))}catch{}
            return ok&&stored!=='';
          }
          const opts=comboHit?.options?.length?` / 실제옵션=${comboHit.options.map(o=>`${o.code}:${o.label}`).join(' | ')}`:'';
          rr.notes.push(`구분코드 탐색 실패: ${norm(v)} / Grid combodataset=${norm(c.combods)||'-'} code=${norm(c.combocode)||'-'} data=${norm(c.combodata)||'-'} / 해석Dataset=${comboHit?.ds||'-'}${opts} / 화면표시=${shown||'(빈값)'}`);
          return false;
        }
        return ok;
      };
  const dateCols=cPeriod.slice(0,2).filter(c=>/^(?:PRGM_BGDE|PRGM_ENDE|PRGM_BGDT|PRGM_ENDT|JHAC_BGDE|JHAC_ENDE|BGDE|ENDE)$/i.test(String(c.col||'')));
  const dateValid=v=>{
    const d=date8(v);if(!/^\d{8}$/.test(d))return false;
    const y=+d.slice(0,4),m=+d.slice(4,6),day=+d.slice(6,8);
    const dt=new Date(Date.UTC(y,m-1,day));
    return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===day;
  };
  const dateCheck=(tryRepair)=>{
    let problems=0;
    for(let r=0;r<rc();r++)for(const c of dateCols){
      let stored=read(r,c);if(!stored)continue;
      if(/^\d{8}$/.test(stored)&&dateValid(stored))continue;
      if(tryRepair&&/^\d{4}-\d{2}-\d{2}$/.test(stored)&&dateValid(stored)){
        const canonical=date8(stored);
        let wrote=false;if(!repairOnly)assertIapIdentity();try{wrote=ds.setColumn(r,c.col,canonical)!==false}catch{}
        stored=read(r,c);
        if(wrote&&stored===canonical){rr.repaired++;rr.notes.push(`기존 ${r+1}행 ${c.col}: 10자리→8자리 정정 후 재검증 완료`);continue;}
      }
      problems++;
      rr.rows.push({detail:`기존 ${r+1}행`,status:`${c.col} 날짜 저장값 길이 ${stored.length}자리 (8자리 필요)`});
    }
    return problems;
  };
      rr.repaired=0;
      const priorProblems=dateCheck(true);
      if(priorProblems){rr.failed+=priorProblems;rr.rowCountAfter=rc();rr.notes.push('구직활동 날짜 검증 실패 · Work24 저장을 중단하세요.');return rr;}
      if(repairOnly){
        await new Promise(resolve=>setTimeout(resolve,180));
        rr.failed+=dateCheck(false);rr.rowCountBefore=rc();rr.rowCountAfter=rc();rr.ok=rr.failed===0;
        rr.notes.push(`구직활동 날짜 점검 완료 · 정정 ${rr.repaired}개 · 오류 ${rr.failed}개 · 최종 저장하지 않음`);return rr;
      }
      const duplicate=a=>{
        for(let r=0;r<rc();r++){
          const de=read(r,cDetail[0]),st=read(r,cPeriod[0]);
          if(compact(de)===compact(a.detail||'')&&(!a.start||date8(st)===date8(a.start)))return true;
        }
        return false;
      };
      const findBlank=()=>{for(let r=0;r<rc();r++){if(!read(r,cDetail[0])&&!read(r,cPeriod[0]))return r}return-1};
      rr.rowCountBefore=rc();
      for(const a of acts){
        if(!a||(!a.kind&&!a.detail))continue;
        if(!dateValid(a.start)||!dateValid(a.end)||date8(a.start)>date8(a.end)){rr.failed++;rr.rows.push({detail:a.detail,status:'시작일·종료일 형식 또는 순서 오류 — 행 추가하지 않음'});continue;}
        if(duplicate(a)){rr.skipped++;rr.rows.push({detail:a.detail,status:'이미 존재하여 건너뜀'});continue;}
        let r=findBlank();if(r>=0){
          const colIds=dsCols(ds).map(x=>x.toUpperCase());
          if(colIds.includes('IAP_NO')){let v='';try{v=norm(ds.getColumn(r,'IAP_NO'))}catch{};if(!v)r=-1;}else r=-1;
        }
        if(r<0)r=await appendViaNativeIapButton(gr,ds,['btn_addSeek'],rr.notes);
        if(r<0){rr.failed++;rr.rows.push({detail:a.detail,status:'원본 행추가 실패 · 데이터 미변경'});continue;}
        const mapped=TYPE_MAP[norm(a.kind)]||norm(a.kind);let good=0,total=0;
        total++;if(set(r,cKind[0],mapped,'combo',[mapped,norm(a.kind)]))good++;
        total++;if(set(r,cDetail[0],norm(a.detail),'text'))good++;
        if(cPeriod.length>=2){total+=2;if(set(r,cPeriod[0],a.start,'date'))good++;if(set(r,cPeriod[1],a.end,'date'))good++;}
        else{total++;if(set(r,cPeriod[0],`${date10(a.start)} ~ ${date10(a.end)}`,'text'))good++;}
        total++;if(set(r,cCount[0],a.cnt||'2','count'))good++;
        if(good===total){rr.added++;rr.rows.push({detail:a.detail,status:`원본 행추가 후 입력 ${good}/${total}`,row:r});}
        else{rr.failed++;rr.rows.push({detail:a.detail,status:`원본 행추가 후 부분입력 ${good}/${total}`,row:r});}
      }
      await new Promise(resolve=>setTimeout(resolve,180));
      rr.failed+=dateCheck(false);
      rr.rowCountAfter=rc();
      try{gr.redraw?.()}catch{}
      try{gr.setFocus?.()}catch{}
      rr.ok=rr.failed===0&&(rr.added>0||rr.skipped>0);
      rr.notes.push(`인접 Grid 확정: ${cg.path} / Dataset ${norm(ds.name||ds.id||gr.binddataset||'')||'(이름없음)'} / ${rr.rowCountBefore}→${rr.rowCountAfter}`);
      rr.notes.push('Work24 원본 행추가를 사용했습니다. 최종 저장·제출은 수행하지 않았습니다.');
      return rr;
    };
    const direct=await tryDirectNearbyGrid();
    if(direct.found){
      // Grid까지 확정된 경우에는 잘못된 다른 행추가 버튼을 실행하지 않고 여기서 종료한다.
      Object.assign(d,direct);
      return d;
    }
    if(direct.gridCandidates?.length)d.notes.push(...(direct.notes||[]));

    // IAP_NO 누락 원인을 재발시키지 않도록 안전성 미확인 추측형 Dataset 경로는 막는다.
    d.notes.push('안전 중단: 해당 Grid를 확정하지 못했으므로 임의 Dataset 탐색·추가를 수행하지 않습니다.');
    return d;

    const before=new Map(snap.datasets.map(x=>[x.o,rowCount(x.o)]));
    if(!clickButton(btn)){d.notes.push('Nexacro 행추가 버튼 호출에 실패했습니다.');return d;}
    await wait(450);
    const after=scan();
    const changes=[];
    for(const x of after.datasets){
      const b=before.has(x.o)?before.get(x.o):0, a=rowCount(x.o);
      if(a>b)changes.push({...x,before:b,after:a,cols:dsCols(x.o)});
    }
    d.datasetChanges=changes.map(x=>({name:x.name,path:x.path,before:x.before,after:x.after,cols:x.cols.slice(0,20)}));
    if(!changes.length){
      d.notes.push(`${btn.nxObj?'Nexacro 객체로 역해석한':'화면의'} 「행추가」 컨트롤을 실행했지만 증가한 Dataset을 찾지 못했습니다.`);
      if(btn.nxObj)d.notes.push(`실행 객체: ${btn.nxType||objType(btn.nxObj)||'-'} / ${btn.nxLabel||label(btn.nxObj)||'-'}`);
      d.notes.push(`행추가 후보: ${d.buttonCandidates.map(x=>`${x.label}@y${x.y}/${x.source||''}${x.nxType?'/'+x.nxType:''}`).join(' | ')}`);
      return d;
    }
    const scoreCols=cols=>{
      const s=cols.join('|').toLowerCase();let score=0;
      if(/(detail|dtl|content|cn|act.*nm|srch|job.*act)/i.test(s))score+=3;
      if(/(start|begin|bgng|from|fr.*dt|bgn.*dt)/i.test(s))score+=2;
      if(/(end|to.*dt|end.*dt|finish)/i.test(s))score+=2;
      if(/(cnt|count|times|freq|number|qnty)/i.test(s))score+=2;
      if(/(type|secd|se_cd|gubun|kind|div)/i.test(s))score+=1;
      return score;
    };
    let targetChange=changes.slice().sort((a,b)=>scoreCols(b.cols)-scoreCols(a.cols)||(b.after-b.before)-(a.after-a.before))[0];
    const ds=targetChange.o;
    d.datasetColumns=targetChange.cols;
    const addedRow=Math.max(0,targetChange.after-1);

    // 새로 늘어난 Dataset에 연결된 Grid가 있으면 헤더-바인딩으로 우선 매핑한다.
    const boundGrids=after.grids.filter(gr=>{
      try{const bd=gr.o.getBindDataset?.();if(bd===ds)return true}catch{}
      try{const id=norm(gr.o.binddataset||gr.o._binddataset||'').replace(/^@/,'');return id&&targetChange.name&&id===targetChange.name}catch{return false}
    });
    let map={kind:'',detail:'',start:'',end:'',count:''};
    let mapSource='column-id';
    const mapFromGrid=gr=>{
      try{
        const g=gr.o,hc=Number(g.getCellCount('head')||0),bc=Number(g.getCellCount('body')||0),heads=[];
        for(let i=0;i<hc;i++){const t=cleanHead(prop(g,'head',i,'text'));if(t)heads.push({i,text:t,left:num(prop(g,'head',i,'left')),width:num(prop(g,'head',i,'width'))});}
        const body=[];for(let i=0;i<bc;i++){const col=bindCol(g,i);if(col)body.push({i,col,left:num(prop(g,'body',i,'left')),width:num(prop(g,'body',i,'width'))});}
        const pick=headText=>{const hh=heads.find(h=>compact(h.text).includes(compact(headText)));if(!hh)return[];return body.filter(b=>{const x=b.left+b.width/2;return x>=hh.left-2&&x<=hh.left+hh.width+2}).sort((a,b)=>a.left-b.left).map(x=>x.col)};
        const k=pick('구분'),de=pick('세부내용'),pe=pick('참여기간'),co=(pick('횟수').length?pick('횟수'):pick('회수'));
        if(k[0])map.kind=k[0];if(de[0])map.detail=de[0];if(pe[0])map.start=pe[0];if(pe[1])map.end=pe[1];if(co[0])map.count=co[0];
        if(map.kind||map.detail||map.start||map.count){d.headers=heads.map(x=>x.text);mapSource='grid';}
      }catch{}
    };
    for(const gr of boundGrids){mapFromGrid(gr);if(map.detail&&map.start&&map.count)break;}

    const cols=targetChange.cols;
    const pickCol=(patterns,used=[])=>{
      let best='',bestScore=0;
      for(const c of cols){if(used.includes(c))continue;const x=c.toLowerCase();let sc=0;for(const [re,w] of patterns)if(re.test(x))sc+=w;if(sc>bestScore){bestScore=sc;best=c}}
      return bestScore?best:'';
    };
    const used=()=>Object.values(map).filter(Boolean);
    if(!map.kind)map.kind=pickCol([[/se.?cd|type|kind|gubun|div|clsf|ctgry/i,4],[/act|job|srch/i,1]],used());
    if(!map.detail)map.detail=pickCol([[/detail|dtl|content|cn$|cont|memo|desc|act.*nm|srch.*cn/i,5],[/nm$|name/i,2]],used());
    if(!map.start)map.start=pickCol([[/start|begin|bgng|from|fr.*dt|bgn.*dt|start.*date/i,5],[/dt$|date/i,1]],used());
    if(!map.end)map.end=pickCol([[/end|finish|to.*dt|end.*date|enddt/i,5],[/dt$|date/i,1]],used());
    if(!map.count)map.count=pickCol([[/cnt|count|times|freq|qnty|number|num/i,5],[/act|sprt/i,1]],used());
    d.notes.push(`Dataset: ${targetChange.name||targetChange.path} (${targetChange.before}→${targetChange.after}), 열매핑(${mapSource}): ${JSON.stringify(map)}`);

    const required=['detail','start','count'];
    if(required.some(k=>!map[k])){
      if(!repairOnly)assertIapIdentity();try{if(typeof ds.deleteRow==='function')ds.deleteRow(addedRow)}catch{}
      d.notes.push('새 행 Dataset은 찾았지만 필수 열을 확정하지 못해 방금 추가된 빈 행을 되돌렸습니다.');
      return d;
    }
    const set=(r,col,val)=>{if(!col)return true;if(!repairOnly)assertIapIdentity();try{return ds.setColumn(r,col,val)!==false}catch{return false}};
    const read=(r,col)=>{try{return norm(ds.getColumn(r,col))}catch{return''}};
    const adapt=(col,val)=>{const sample=(()=>{for(let i=0;i<rowCount(ds);i++){const v=read(i,col);if(v)return v}return''})();return /^(?:PRGM_BGDE|PRGM_ENDE|PRGM_BGDT|PRGM_ENDT|JHAC_BGDE|JHAC_ENDE|BGDE|ENDE)$/i.test(String(col||''))||/^\d{8}$/.test(sample)?date8(val):date10(val)};
    const writeRow=(r,a)=>{
      const mapped=TYPE_MAP[norm(a.kind)]||norm(a.kind);let good=0,total=0;
      if(map.kind){total++;if(set(r,map.kind,mapped))good++;}
      total++;if(set(r,map.detail,norm(a.detail)))good++;
      total++;if(set(r,map.start,adapt(map.start,a.start)))good++;
      if(map.end){total++;if(set(r,map.end,adapt(map.end,a.end)))good++;}
      total++;if(set(r,map.count,String(a.cnt||'2').replace(/[^0-9]/g,'')||'2'))good++;
      return{good,total};
    };
    const duplicate=a=>{
      for(let r=0;r<rowCount(ds);r++){
        if(r===addedRow)continue;
        const de=map.detail?read(r,map.detail):'';
        const st=map.start?date8(read(r,map.start)):'';
        if(compact(de)===compact(a.detail||'')&&(!a.start||st===date8(a.start)))return true;
      }
      return false;
    };
    let firstUsed=false;
    for(const a of acts){
      if(!a||(!a.kind&&!a.detail))continue;
      if(duplicate(a)){d.skipped++;d.rows.push({detail:a.detail,status:'이미 존재하여 건너뜀'});continue;}
      let r;
      if(!firstUsed){r=addedRow;firstUsed=true;}
      else{
        const beforeN=rowCount(ds);
        if(!clickButton(btn)){d.failed++;d.rows.push({detail:a.detail,status:'행추가 버튼 호출 실패'});continue;}
        await wait(300);
        const afterN=rowCount(ds);
        if(afterN<=beforeN){
          r=-1; d.notes.push('안전 중단: Work24 행추가 버튼의 행 증가가 확인되지 않아 Dataset 직접 추가를 건너뜁니다.');
        }else r=afterN-1;
      }
      if(r<0){d.failed++;d.rows.push({detail:a.detail,status:'새 행 생성 실패'});continue;}
      const wr=writeRow(r,a);
      if(wr.good===wr.total){d.added++;d.rows.push({detail:a.detail,status:`Nexacro 입력 ${wr.good}/${wr.total}`});}
      else{d.failed++;d.rows.push({detail:a.detail,status:`Nexacro 부분입력 ${wr.good}/${wr.total}`});}
    }
    if(!firstUsed){if(!repairOnly)assertIapIdentity();try{if(typeof ds.deleteRow==='function')ds.deleteRow(addedRow)}catch{}}
    for(const gr of boundGrids)try{gr.o.redraw?.()}catch{}
    d.ok=d.failed===0&&(d.added>0||d.skipped>0);
    d.notes.push('Nexacro 내부 「행추가」 버튼과 실제 증가 Dataset을 추적하여 입력했습니다. 최종 저장·제출은 수행하지 않았습니다.');
    return d;
  }

  if(!target){
    const nxbtn=await tryNexacroButtonFallback();
    // v1.2.5에서는 DOM fallback이 제목만 찾아도 found=true가 되어 실제 Nexacro 진단을 덮어썼다.
    // v1.3.0에서는 실제 Grid의 head col/colspan ↔ body col 바인딩으로 열을 확정해 Dataset에 직접 입력하고, 실패 시 기존 버튼 이벤트 추적을 사용한다.
    if(nxbtn.found){
      Object.assign(out,nxbtn);
      out.appFound=!!app;out.appSource=out.appSource||'';out.frameUrl=out.frameUrl||(()=>{try{return location.href}catch{return''}})();
      return out;
    }
    const dom=await tryDomFallback();
    if(dom.ok){
      Object.assign(out,dom);
      out.appFound=!!app;out.appSource=out.appSource||'';out.frameUrl=out.frameUrl||(()=>{try{return location.href}catch{return''}})();
      return out;
    }
    out.notes.push(...(nxbtn.notes||[]));
    out.notes.push(...(dom.notes||[]));
    if(nxbtn.buttonCandidates?.length) out.notes.push('행추가 후보: '+nxbtn.buttonCandidates.map(x=>`${x.label}@y${x.y}/${x.source||''}`).join(' | '));
    out.notes.push(`구직활동지원 자동입력 대상을 확정하지 못했습니다. (Application 발견: ${out.appSource||'예'}, 탐색객체 ${out.visited}개)`);
    return out;
  }
  out.found=true;out.gridPath=target.path;out.headers=target.heads.map(x=>x.text);
  const g=target.grid,ds=(()=>{try{return g.getBindDataset?.()||null}catch{return null}})();
  if(!ds||typeof ds.getRowCount!=='function'||typeof ds.setColumn!=='function'){out.notes.push('표의 Dataset을 찾지 못했습니다.');return out;}
  out.rowCountBefore=Number(ds.getRowCount()||0);

  const body=[];
  for(let i=0;i<target.bc;i++){
    const col=bindCol(g,i); if(!col)continue;
    body.push({i,col,left:num(prop(g,'body',i,'left')),width:num(prop(g,'body',i,'width')),edittype:norm(prop(g,'body',i,'edittype')),displaytype:norm(prop(g,'body',i,'displaytype')),combods:norm(prop(g,'body',i,'combodataset')),combocode:norm(prop(g,'body',i,'combocodecol')),combodata:norm(prop(g,'body',i,'combodatacol'))});
  }
  out.body=body.map(x=>({i:x.i,col:x.col,edittype:x.edittype,displaytype:x.displaytype}));

  function cellsFor(headerText){
    const hh=target.heads.filter(h=>compact(h.text).includes(compact(headerText))).sort((a,b)=>a.left-b.left)[0];
    if(!hh)return[];
    let cells=body.filter(b=>{
      if(hh.width>0&&b.width>0){const cx=b.left+b.width/2;return cx>=hh.left-2&&cx<=hh.left+hh.width+2;}
      return false;
    }).sort((a,b)=>a.left-b.left);
    if(!cells.length && target.heads.length===body.length){
      const idx=target.heads.indexOf(hh);if(idx>=0&&body[idx])cells=[body[idx]];
    }
    return cells;
  }
  const cKind=cellsFor('구분'),cDetail=cellsFor('세부내용'),cPeriod=cellsFor('참여기간'),cCount=(cellsFor('활동(지원)횟수').length?cellsFor('활동(지원)횟수'):(cellsFor('활동(지원)회수').length?cellsFor('활동(지원)회수'):(cellsFor('횟수').length?cellsFor('횟수'):cellsFor('회수'))));
  if(!cKind.length||!cDetail.length||!cPeriod.length||!cCount.length){
    out.notes.push(`열 매핑 실패: 구분 ${cKind.length}, 세부내용 ${cDetail.length}, 참여기간 ${cPeriod.length}, 횟수 ${cCount.length}`);
    return out;
  }

  const resolveDataset=id=>{
    id=norm(id).replace(/^@/,''); if(!id)return null;
    const tries=[];
    try{tries.push(g._findDataset?.(id))}catch{}
    try{tries.push(g.parent?.lookup?.(id))}catch{}
    try{tries.push(g.parent?.[id])}catch{}
    try{tries.push(app.lookup?.(id))}catch{}
    try{tries.push(app[id])}catch{}
    return tries.find(x=>x&&typeof x.getRowCount==='function')||null;
  };
  const comboCode=(cell,label)=>{
    const cds=resolveDataset(cell.combods); if(!cds)return null;
    const code=cell.combocode||'code',data=cell.combodata||'data';
    const n=Number(cds.getRowCount?.()||0); let partial=null;
    for(let r=0;r<n;r++){
      let dv='',cv='';try{dv=norm(cds.getColumn(r,data));cv=cds.getColumn(r,code)}catch{}
      if(compact(dv)===compact(label))return cv;
      if(!partial&&(compact(dv).includes(compact(label))||compact(label).includes(compact(dv))))partial=cv;
    }
    return partial;
  };
  const existingSample=(col)=>{
    const n=Number(ds.getRowCount()||0);for(let r=0;r<n;r++){let v='';try{v=norm(ds.getColumn(r,col))}catch{};if(v)return v;}return'';
  };
  const adaptDate=(col,val)=>{const ex=existingSample(col);return /^(?:PRGM_BGDE|PRGM_ENDE|PRGM_BGDT|PRGM_ENDT|JHAC_BGDE|JHAC_ENDE|BGDE|ENDE)$/i.test(String(col||''))||/^\d{8}$/.test(ex)?date8(val):date10(val)};
  const setCell=(row,cell,value,kind='text')=>{
    if(!cell||!cell.col)return false;
    let v=value;
    if(kind==='date')v=adaptDate(cell.col,value);
    if(kind==='combo'){
      const code=comboCode(cell,value); if(code!==null&&code!==undefined&&code!=='')v=code;
    }
    if(kind==='count'){
      const ex=existingSample(cell.col);
      if(/^\d+$/.test(ex)||typeof ex==='number')v=String(value).replace(/\D/g,'')||value;
      else if(/회/.test(ex))v=`월 ${String(value).replace(/\D/g,'')||value}회 이상`;
      else v=String(value).replace(/\D/g,'')||value;
    }
    if(!repairOnly)assertIapIdentity();
    try{return ds.setColumn(row,cell.col,v)!==false}catch(e){return false}
  };
  const read=(r,c)=>{try{return norm(ds.getColumn(r,c.col))}catch{return''}};
  const sameRow=(r,a)=>{
    const detail=read(r,cDetail[0]);
    const start=cPeriod[0]?read(r,cPeriod[0]):'';
    const end=cPeriod[1]?read(r,cPeriod[1]):'';
    const ds0=date8(start),de0=date8(end),as=date8(a.start),ae=date8(a.end);
    return compact(detail)===compact(a.detail||'') && (!as||ds0===as) && (!ae||!cPeriod[1]||de0===ae);
  };
  const findBlank=()=>{
    const n=Number(ds.getRowCount()||0);for(let r=0;r<n;r++){
      const d=read(r,cDetail[0]),p1=read(r,cPeriod[0]),p2=cPeriod[1]?read(r,cPeriod[1]):'';
      if(!d&&!p1&&!p2)return r;
    }return -1;
  };

  for(const a of acts){
    if(!a||(!a.kind&&!a.detail))continue;
    let duplicate=-1;for(let r=0;r<Number(ds.getRowCount()||0);r++){if(sameRow(r,a)){duplicate=r;break;}}
    if(duplicate>=0){out.skipped++;out.rows.push({detail:a.detail,status:'이미 존재하여 건너뜀',row:duplicate});continue;}
    let r=findBlank();
    if(r>=0){const colIds=[];try{for(let i=0;i<Number(ds.getColCount?.()||0);i++)colIds.push(String(ds.getColID?.(i)||'').toUpperCase())}catch{};
      if(colIds.includes('IAP_NO')){let v='';try{v=norm(ds.getColumn(r,'IAP_NO'))}catch{};if(!v)r=-1;}else r=-1;
    }
    if(r<0){r=await appendViaNativeIapButton(g,ds,['btn_addSeek'],out.notes)}
    if(r<0){out.failed++;out.rows.push({detail:a.detail,status:'원본 행추가 실패 · 데이터 미변경'});continue;}
    const mappedType=TYPE_MAP[norm(a.kind)]||norm(a.kind);
    let good=0,total=0;
    total++;if(setCell(r,cKind[0],mappedType,'combo'))good++;
    total++;if(setCell(r,cDetail[0],norm(a.detail),'text'))good++;
    if(cPeriod.length>=2){total+=2;if(setCell(r,cPeriod[0],a.start,'date'))good++;if(setCell(r,cPeriod[1],a.end,'date'))good++;}
    else{total++;if(setCell(r,cPeriod[0],`${date10(a.start)} ~ ${date10(a.end)}`,'text'))good++;}
    total++;if(setCell(r,cCount[0],a.cnt||'2','count'))good++;
    if(good===total){out.added++;out.rows.push({detail:a.detail,status:'입력',row:r});}
    else{out.failed++;out.rows.push({detail:a.detail,status:`부분입력 ${good}/${total}`,row:r});}
  }
  out.rowCountAfter=Number(ds.getRowCount()||0);
  try{g.redraw?.()}catch{}
  out.ok=out.failed===0&&(out.added>0||out.skipped>0);
  out.notes.push('최종 저장·제출은 수행하지 않았습니다. 화면 값을 확인한 뒤 상담사가 직접 저장하세요.');
  return out;
}


/*
 * v1.3.4: Work24 IAP등록/관리의 "취업지원 프로그램 참여 계획"(grd_empList)을 찾아
 * 전달받은 jobRows를 원본 행추가 절차를 이용해 입력한다.
 * 기존 구직활동지원 자동입력 함수는 수정하지 않고 별도 함수로 추가한다.
 * 최종 저장/제출 버튼은 절대 누르지 않는다.
 */
async function applyIapJobProgramsMAIN(payload){
  function checkIapParticipantMAIN(expected){
   const required=String(expected||'').trim().toUpperCase();
   if(!/^A\d{10,}$/.test(required))return {checked:true,ok:false,reason:'유효한 전체 IAP 등록번호가 없습니다. 통합본에서 다시 전송해 주세요.'};
   const ids=new Set();
   let doc=document;
   for(let level=0;doc&&level<8;level++){
    const view=doc.defaultView||window;
    for(const el of doc.querySelectorAll('input,textarea,span,td,div')){
     try{
      const r=el.getBoundingClientRect(),cs=view.getComputedStyle(el);
      if(r.width<1||r.height<1||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity||1)===0||el.children.length)continue;
      const text=String(el.value||el.textContent||'').trim();
      // Whole identifiers only: never compare names, suffixes, masked or partial numbers.
      for(const m of text.matchAll(/(?:^|[^A-Za-z0-9])A\d{10,}(?![A-Za-z0-9])/ig))ids.add(m[0].replace(/^[^A-Za-z0-9]/,'').toUpperCase());
     }catch{}
    }
    try{const parent=view.parent;if(!parent||parent===view)break;doc=parent.document;}catch{break;}
   }
   if(ids.size!==1)return {checked:true,ok:false,reason:'현재 IAP 화면의 등록번호를 한 개로 확정할 수 없습니다. 다른 참여자 창을 닫고 번호를 표시해 주세요.'};
   return {checked:true,ok:ids.has(required),reason:ids.has(required)?'등록번호 일치':'통합본과 Work24 등록번호 불일치'};
  }
  let identityStopped=false;
  function assertIapIdentity(){
    const result=checkIapParticipantMAIN(payload?.iapNo);
    if(identityStopped||!result.ok){identityStopped=true;throw new Error('등록번호 검증 실패 · '+result.reason);}
  }
  if(!payload?.repairOnly)assertIapIdentity();

  const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const compact=s=>norm(s).replace(/\s/g,'').replace(/[·ㆍ]/g,'');
  const date8=s=>norm(s).replace(/[^0-9]/g,'').slice(0,8);
  const date10=s=>{const x=date8(s);return x.length===8?`${x.slice(0,4)}-${x.slice(4,6)}-${x.slice(6,8)}`:norm(s)};
  const jobs=Array.isArray(payload?.jobRows)?payload.jobRows:[];
  const repairOnly=payload?.repairOnly===true;
  const out={repaired:0,ok:false,found:false,appFound:false,appSource:'',frameUrl:'',visited:0,gridPath:'',headers:[],rowCountBefore:0,rowCountAfter:0,added:0,skipped:0,failed:0,notes:[],rows:[]};
  if(!jobs.length && !repairOnly){out.ok=true;out.found=true;out.notes.push('취업지원 프로그램 행이 없어 입력을 건너뜁니다.');return out;}
  if(payload?.audit && payload.audit.ok===false && !repairOnly){out.notes.push('IAP 사전점검 오류가 있어 취업지원 프로그램 자동입력을 중단했습니다.');return out;}


  // v1.4.6: Nexacro Dataset.addRow()는 Work24의 행추가 업무 로직을 건너뛰므로 사용하지 않는다.
  // 반드시 해당 IAP 표의 실제 행추가 버튼으로 새 행을 만들고, 그 표의 Dataset이
  // 정확히 한 행 증가했을 때만 내용을 기록한다. 최종 저장은 자동화하지 않는다.
  async function appendViaNativeIapButton(grid, dataset, buttonNames, notes){
    const before=Number(dataset.getRowCount?.()||0);
    const names=(buttonNames||[]).map(String);
    const lowerNames=new Set(names.map(n=>n.toLowerCase()));
    const candidates=[];
    const attempted=new Set();
    const idOf=o=>String(o?.name||o?.id||o?._id||'');
    const isButton=o=>!!o&&(typeof o.click==='function'||typeof o.on_fire_onclick==='function');
    const add=(o,source,expectedName)=>{
      if(!o||!isButton(o)||attempted.has(o))return;
      if(o.enable===false||o.visible===false)return;
      const id=idOf(o);
      if(id && !lowerNames.has(id.toLowerCase()))return;
      if(expectedName && id && id.toLowerCase()!==expectedName.toLowerCase())return;
      attempted.add(o);candidates.push({o,source,id:id||expectedName||'버튼'});
    };
    const item=(o,key)=>{
      if(!o)return null;
      const tries=[];
      try{tries.push(o[key])}catch{}
      try{tries.push(o.components?.get_item?.(key))}catch{}
      try{tries.push(o.objects?.get_item?.(key))}catch{}
      try{tries.push(o.frames?.get_item?.(key))}catch{}
      try{tries.push(o.childframes?.get_item?.(key))}catch{}
      try{tries.push(o.lookup?.(key))}catch{}
      try{if(o.form&&o.form!==o){tries.push(o.form[key]);tries.push(o.form.components?.get_item?.(key));tries.push(o.form.lookup?.(key))}}catch{}
      return tries.find(x=>x&&x!==o)||null;
    };
    // The full Nexacro component path is embedded in the rendered DOM id on Work24.
    const resolveDomPath=fullId=>{
      const parts=String(fullId||'').split('.').filter(Boolean);
      if(!parts.length)return null;
      const roots=[];const push=o=>{if(o&&!roots.includes(o))roots.push(o)};
      try{push(app)}catch{}
      try{push(window.nexacro?.getApplication?.())}catch{}
      try{push(window.parent?.nexacro?.getApplication?.())}catch{}
      try{push(window.top?.nexacro?.getApplication?.())}catch{}
      const mi=parts.indexOf('mainframe');
      for(const base of roots){
        for(const start of [0,mi>=0?mi:0,mi>=0?mi+1:0]){
          let node=base;
          if(mi>=0&&start===mi+1){node=item(base,'mainframe')||base.mainframe||base._mainframe;if(!node)continue;}
          let good=true;
          for(let i=start;i<parts.length;i++){
            const next=item(node,parts[i]);
            if(!next){good=false;break;}node=next;
          }
          if(good&&node)return node;
        }
      }
      return null;
    };
    const parents=[];let node=grid;
    for(let i=0;node&&i<15;i++){
      if(!parents.includes(node))parents.push(node);
      try{if(node.form&&!parents.includes(node.form))parents.push(node.form)}catch{}
      try{node=node.parent}catch{break}
    }
    const domMatches=[];
    const visible=el=>{try{const r=el.getBoundingClientRect(),v=getComputedStyle(el);return r.width>2&&r.height>2&&v.display!=='none'&&v.visibility!=='hidden'}catch{return false}};
    try{
      for(const el of document.querySelectorAll('[id]')){
        const fullId=String(el.id||''),leaf=(fullId.split('.').pop()||'').toLowerCase();
        if(!lowerNames.has(leaf)||!visible(el))continue;
        domMatches.push({el,fullId,leaf});
      }
    }catch{}
    // Prefer the exact visible Nexacro button resolved from its full DOM path.
    for(const {fullId,leaf} of domMatches){const o=resolveDomPath(fullId);add(o,'화면 전체경로',leaf)}
    for(const parent of parents){
      for(const name of names){
        const o=item(parent,name);
        add(o,'Grid 인접 Form',name);
      }
    }
    notes.push('원본 행추가 후보: '+(candidates.map(x=>x.id+'('+x.source+')').join(', ')||'Nexacro 객체 없음')+' / 화면ID '+domMatches.length+'개');
    const wait=ms=>new Promise(done=>setTimeout(done,ms));
    const count=()=>Number(dataset.getRowCount?.()||0);
    const poll=async()=>{
      for(let i=0;i<16;i++){
        const after=count();if(after!==before)return after;
        await wait(100);
      }
      return count();
    };
    let method='', clickedNative=false;
    for(const {o,id,source} of candidates){
      // Button.click() is the documented Nexacro API to dispatch onclick.
      // Calling on_fire_onclick() with no event parameters was not reliable.
      if(typeof o.click!=='function'){
        notes.push('행추가 건너뜀: '+id+' / 공식 click() 메서드 없음');
        continue;
      }
      if(!repairOnly)assertIapIdentity();
      try{o.click();}catch(e){notes.push('행추가 호출 실패: '+id+' / '+String(e?.message||e).slice(0,120));continue;}
      clickedNative=true;
      const after=await poll();
      notes.push('행추가 시도: '+id+'('+source+') '+before+'→'+after);
      if(after!==before){method='Nexacro Button.click()';}
      else notes.push('중복 생성 예방: 클릭 이후 행 증가가 없어 다른 후보의 자동 클릭을 생략했습니다.');
      break;
    }
    if(count()===before&&!clickedNative){
      for(const {el,fullId} of domMatches){
        // Only click an actual interactive HTML element; do not synthesize
        // mouse events against random Nexacro rendering sub-elements.
        if(!el.matches('button,input[type="button"],input[type="submit"],a,[role="button"]'))continue;
        if(!repairOnly)assertIapIdentity();
        try{el.click()}catch(e){notes.push('화면 버튼 호출 실패: '+String(e?.message||e).slice(0,80));continue;}
        const after=await poll();
        notes.push('화면 버튼 시도: '+fullId.split('.').pop()+' '+before+'→'+after);
        if(after!==before){method='화면 실제 버튼';break;}
      }
    }
    const after=count();
    if(after!==before+1){
      notes.push(`안전 중단: 행추가 결과가 ${before}→${after}입니다. 원본 버튼 처리와 데이터셋의 행 증가를 확인하지 못했습니다.`);
      return -1;
    }
    const row=after-1;
    let col='';
    try{
      const n=Number(dataset.getColCount?.()||0);
      for(let i=0;i<n;i++){
        const id=String(dataset.getColID?.(i)||dataset.getColumnInfo?.(i)?.id||'');
        if(id.toUpperCase()==='IAP_NO'){col=id;break;}
      }
    }catch{}
    if(col){
      let val='';try{val=String(dataset.getColumn(row,col)??'').trim()}catch{}
      if(!val){
        notes.push('안전 중단: 전산망 행추가 이후에도 IAP_NO 연결값이 비어 있습니다. 임의로 채우지 않습니다.');
        if(!repairOnly)assertIapIdentity();try{dataset.deleteRow?.(row)}catch{}
        return -1;
      }
      notes.push('행추가에서 생성된 IAP_NO 연결값 확인(번호는 표시하지 않음).');
    }else{
      notes.push('행추가 완료. Dataset에 IAP_NO 열이 없어 연결번호는 검증하지 못했습니다. 저장 검증 필요.');
    }
    notes.push(method+' 사용: '+before+'→'+after+'행');
    return row;
  }

  const collectionItems=col=>{
    const arr=[]; if(!col)return arr;
    try{const n=Number(col.length);if(Number.isFinite(n))for(let i=0;i<n;i++){let v=null;try{v=col[i]}catch{};if(!v&&typeof col.get_item==='function')try{v=col.get_item(i)}catch{};if(v&&!arr.includes(v))arr.push(v)}}catch{}
    try{for(const id of (Array.isArray(col._idArray)?col._idArray:[])){let v=null;try{v=col[id]}catch{};if(!v&&typeof col.get_item==='function')try{v=col.get_item(id)}catch{};if(v&&!arr.includes(v))arr.push(v)}}catch{}
    return arr;
  };
  const objType=o=>{try{return norm(o?._type_name||o?.constructor?.name||'')}catch{return''}};
  const prop=(g,band,i,k)=>{try{return g.getCellProperty(band,i,k)}catch{return null}};
  const cleanHead=t=>norm(t).replace(/^(?:text|bind|expr):/i,'').replace(/[{}]/g,'').trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const bindCol=(g,i)=>{const t=norm(prop(g,'body',i,'text'));const m=t.match(/^bind:(.+)$/i);return m?m[1].trim():''};
  const appCandidates=[];
  const addApp=(v,src)=>{if(!v||(typeof v!=='object'&&typeof v!=='function'))return;if(appCandidates.some(x=>x.v===v))return;appCandidates.push({v,src})};
  const inspectWin=(w,label)=>{
    if(!w)return;
    try{addApp(w.nexacro?.getApplication?.call(w.nexacro),label+'.nexacro.getApplication()')}catch{}
    try{addApp(w.nexacro?.getApplication?.(),label+'.nexacro.getApplication()')}catch{}
    for(const k of ['application','_application','__application','app'])try{addApp(w[k],label+'.'+k)}catch{}
    try{const nx=w.nexacro;if(nx)for(const k of ['application','_application','__application','_app','app'])try{addApp(nx[k],label+'.nexacro.'+k)}catch{}}catch{}
  };
  inspectWin(window,'window');
  try{if(window.parent&&window.parent!==window)inspectWin(window.parent,'parent')}catch{}
  try{if(window.top&&window.top!==window&&window.top!==window.parent)inspectWin(window.top,'top')}catch{}
  const looksLikeApp=o=>{if(!o)return false;const t=objType(o);if(/Application/i.test(t))return true;try{if(o.mainframe||o._mainframe)return true}catch{};try{if(typeof o.getActiveFrame==='function'||typeof o.lookup==='function')return true}catch{};return false};
  const app=(appCandidates.find(x=>looksLikeApp(x.v))||appCandidates[0]||{}).v||null;
  out.appFound=!!app;out.appSource=(appCandidates.find(x=>x.v===app)||{}).src||'';try{out.frameUrl=location.href}catch{}
  if(!app){out.notes.push('Nexacro application을 찾지 못했습니다.');return out;}

  const isDataset=o=>o&&typeof o.getRowCount==='function'&&typeof o.getColumn==='function'&&typeof o.setColumn==='function';
  const datasets=[];
  const seen=new WeakSet(),q=[{o:app,path:'app',depth:0}];let target=null;
  const headInfo=gr=>{
    const heads=[],body=[];let hc=0,bc=0;
    try{hc=Number(gr.getCellCount?.('head')||0)}catch{};try{bc=Number(gr.getCellCount?.('body')||0)}catch{}
    const idxProp=(band,i,key)=>{try{const v=gr.getCellProperty?.(band,i,key);if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}catch{return null}};
    for(let i=0;i<hc;i++){const text=cleanHead(prop(gr,'head',i,'text'));if(text)heads.push({i,text,left:num(prop(gr,'head',i,'left')),width:num(prop(gr,'head',i,'width')),gridcol:idxProp('head',i,'col'),colspan:idxProp('head',i,'colspan')||1})}
    for(let i=0;i<bc;i++){const col=bindCol(gr,i);if(!col)continue;body.push({i,col,left:num(prop(gr,'body',i,'left')),width:num(prop(gr,'body',i,'width')),gridcol:idxProp('body',i,'col'),colspan:idxProp('body',i,'colspan')||1,edittype:norm(prop(gr,'body',i,'edittype')),displaytype:norm(prop(gr,'body',i,'displaytype')),combods:norm(prop(gr,'body',i,'combodataset')),combocode:norm(prop(gr,'body',i,'combocodecol')),combodata:norm(prop(gr,'body',i,'combodatacol'))})}
    return{heads,body};
  };
  const exactEmp=hi=>{const h=compact(hi.heads.map(x=>x.text).join('|'));return h.includes(compact('구분'))&&h.includes(compact('프로그램명'))&&h.includes(compact('참여기간'))&&h.includes(compact('운영기관명'))&&h.includes(compact('전화번호'))};
  while(q.length&&out.visited<6000){
    const {o,path,depth}=q.shift();if(!o||(typeof o!=='object'&&typeof o!=='function'))continue;
    try{if(seen.has(o))continue;seen.add(o)}catch{};out.visited++;
    if(isDataset(o)&&!datasets.some(x=>x.o===o))datasets.push({o,path,name:norm(o.name||o.id||'')});
    const type=objType(o),gridLike=/Grid/i.test(type)||(typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function'&&typeof o.getBindDataset==='function');
    if(gridLike){
      const hi=headInfo(o),nm=norm(o.name||o.id||'');
      if(nm==='grd_empList'||exactEmp(hi)){target={grid:o,path,hi};if(exactEmp(hi))break;}
    }
    if(depth<13){
      let kids=[];
      for(const key of ['components','objects','all','forms','frames','childframes','popupframes','_frames','_child_list'])try{kids.push(...collectionItems(o[key]))}catch{}
      for(const k of ['form','mainframe','_mainframe','frame','childframe','activeFrame','workFrame','_active_frame'])try{const v=o[k];if(v&&v!==o)kids.push(v)}catch{}
      const uniq=[];for(const k of kids)if(k&&!uniq.includes(k))uniq.push(k);
      for(const k of uniq)q.push({o:k,path:path+'/'+(norm(k.name||k.id)||objType(k)||'obj'),depth:depth+1});
    }
  }
  // v1.3.6: app 전역 BFS에서 grd_empList가 누락되는 Work24 화면이 있다.
  // 화면에 렌더링된 Nexacro DOM id(행추가 버튼/그리드)를 실제 Nexacro 객체 경로로 역해석한 뒤,
  // 해당 버튼의 가까운 상위 Form을 훑어 grd_empList를 찾는 보조 경로를 사용한다.
  if(!target){
    const visible=el=>{try{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>2&&r.height>2&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0}catch{return false}};
    const domText=el=>norm(el?.innerText||el?.textContent||el?.value||'');
    const step=(cur,key)=>{
      if(!cur)return null;
      const tries=[];
      try{tries.push(cur[key])}catch{}
      try{tries.push(cur.form?.[key])}catch{}
      try{tries.push(cur.components?.get_item?.(key))}catch{}
      try{tries.push(cur.objects?.get_item?.(key))}catch{}
      try{tries.push(cur.frames?.get_item?.(key))}catch{}
      try{tries.push(cur.childframes?.get_item?.(key))}catch{}
      try{tries.push(cur.lookup?.(key))}catch{}
      return tries.find(v=>v&&v!==cur)||null;
    };
    const resolveNxDomId=id=>{
      const parts=norm(id).split('.').filter(Boolean);if(!parts.length)return null;
      const roots=[];const add=(v,name)=>{if(v&&!roots.some(x=>x.v===v))roots.push({v,name})};
      add(app,'app');
      try{add(app.mainframe||app._mainframe,'app.mainframe')}catch{}
      for(const root of roots){
        for(const start of [0,parts[0]==='mainframe'?1:0]){
          let cur=root.v,ok=true;
          if(parts[0]==='mainframe'&&start===1){try{cur=app.mainframe||app._mainframe||step(app,'mainframe')}catch{};if(!cur)continue;}
          for(let i=start;i<parts.length;i++){
            const key=parts[i];
            if(i===0&&key==='mainframe'){const m=step(cur,'mainframe');if(m){cur=m;continue}}
            const nx=step(cur,key);if(!nx){ok=false;break}cur=nx;
          }
          if(ok&&cur)return cur;
        }
      }
      return null;
    };
    const acceptGrid=(o,path)=>{
      if(!o)return null;
      const type=objType(o),gridLike=/Grid/i.test(type)||(typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function'&&typeof o.getBindDataset==='function');
      if(!gridLike)return null;
      const hi=headInfo(o),nm=norm(o.name||o.id||'');
      if(nm==='grd_empList'||exactEmp(hi))return {grid:o,path,hi};
      return null;
    };
    // 1) 렌더링된 grd_empList DOM id가 직접 노출되면 가장 먼저 사용한다.
    try{
      const els=[...document.querySelectorAll('[id*="grd_empList"]')].filter(visible);
      for(const el of els){const o=resolveNxDomId(el.id||'');const hit=acceptGrid(o,'DOM:'+String(el.id||''));if(hit){target=hit;out.notes.push('취업지원 Grid 보조탐색: 렌더링 DOM id에서 grd_empList를 직접 역해석했습니다.');break}}
    }catch{}
    // 2) 직접 id가 없으면 화면의 「행추가」 Nexacro 객체 주변 Form을 탐색한다.
    if(!target){
      const btns=[];
      try{
        for(const el of document.querySelectorAll('body *')){
          if(!visible(el)||compact(domText(el))!==compact('행추가')||!el.id)continue;
          const o=resolveNxDomId(el.id);if(o)btns.push({o,id:el.id,y:el.getBoundingClientRect().top});
        }
      }catch{}
      btns.sort((a,b)=>a.y-b.y);
      for(const b of btns){
        const roots=[];let cur=b.o,n=0;
        while(cur&&n++<11){try{cur=cur.parent}catch{cur=null};if(cur&&!roots.includes(cur))roots.push(cur)}
        for(const root of roots.slice(0,8)){
          const seen2=new WeakSet(),qq=[{o:root,path:'near',depth:0}];let scan=0;
          while(qq.length&&scan++<2200&&!target){
            const {o,path,depth}=qq.shift();if(!o||(typeof o!=='object'&&typeof o!=='function'))continue;
            try{if(seen2.has(o))continue;seen2.add(o)}catch{}
            const hit=acceptGrid(o,path+'/'+(norm(o.name||o.id)||objType(o)||'obj'));if(hit){target=hit;break}
            if(depth<8){
              let kids=[];
              for(const key of ['components','objects','all'])try{kids.push(...collectionItems(o[key]))}catch{}
              try{if(o.form&&o.form!==o)kids.push(o.form)}catch{}
              const uniq=[];for(const k of kids)if(k&&!uniq.includes(k))uniq.push(k);
              for(const k of uniq)qq.push({o:k,path:path+'/'+(norm(k.name||k.id)||objType(k)||'obj'),depth:depth+1});
            }
          }
          if(target){out.notes.push(`취업지원 Grid 보조탐색: 화면의 행추가 객체(${b.id}) 주변에서 grd_empList를 찾았습니다.`);break}
        }
        if(target)break;
      }
    }
  }
  if(!target){out.notes.push(`취업지원 프로그램 Grid(grd_empList)를 찾지 못했습니다. 탐색객체 ${out.visited}개`);return out;}
  out.found=true;out.gridPath=target.path;out.headers=target.hi.heads.map(x=>x.text);
  const gr=target.grid,hi=target.hi;
  let ds=null;try{const bd=gr.getBindDataset?.();if(bd&&typeof bd==='object')ds=bd}catch{}
  const resolveDsByName=id=>{
    id=norm(id).replace(/^@/,'');if(!id)return null;
    const found=[];const add=x=>{if(isDataset(x)&&!found.includes(x))found.push(x)};
    try{add(gr._findDataset?.(id))}catch{};let p=gr,n=0;
    while(p&&n++<14){try{add(p[id]);add(p.objects?.get_item?.(id));add(p.lookup?.(id));if(p.form&&p.form!==p){add(p.form[id]);add(p.form.objects?.get_item?.(id));add(p.form.lookup?.(id))}}catch{};try{p=p.parent}catch{break}}
    try{add(app[id]);add(app.lookup?.(id))}catch{};
    for(const x of datasets)if(x.name===id||norm(String(x.path||'').split('/').pop())===id)add(x.o);
    return found.find(x=>[x.name,x.id,x._id,x._name].map(norm).includes(id))||found[0]||null;
  };
  if(!ds){let id='';try{id=norm(gr.binddataset||gr._binddataset||'')}catch{};ds=resolveDsByName(id)}
  if(!ds||typeof ds.getRowCount!=='function'||typeof ds.setColumn!=='function'){out.notes.push('grd_empList의 바인딩 Dataset을 찾지 못했습니다.');return out;}
  const cellsFor=headText=>{
    const hh=hi.heads.filter(h=>compact(h.text).includes(compact(headText))).sort((a,b)=>(a.gridcol??9999)-(b.gridcol??9999)||a.left-b.left)[0];if(!hh)return[];
    if(hh.gridcol!==null){const from=hh.gridcol,to=from+Math.max(1,hh.colspan||1)-1;const by=hi.body.filter(b=>b.gridcol!==null&&b.gridcol>=from&&b.gridcol<=to).sort((a,b)=>(a.gridcol??9999)-(b.gridcol??9999)||a.left-b.left);if(by.length)return by}
    return hi.body.filter(b=>{const x=b.left+b.width/2;return x>=hh.left-2&&x<=hh.left+hh.width+2}).sort((a,b)=>a.left-b.left);
  };
  const cKind=cellsFor('구분'),cName=cellsFor('프로그램명'),cPeriod=cellsFor('참여기간'),cOrg=cellsFor('운영기관명'),cTel=cellsFor('전화번호');
  if(!cKind.length||!cName.length||!cPeriod.length||!cOrg.length||!cTel.length){out.notes.push(`취업지원 열 매핑 실패: 구분 ${cKind.length}, 프로그램명 ${cName.length}, 참여기간 ${cPeriod.length}, 운영기관명 ${cOrg.length}, 전화번호 ${cTel.length}`);out.notes.push('body='+hi.body.map(b=>`${b.col}@${b.gridcol??'?'}`).join(' | '));return out;}
  out.notes.push(`취업지원 열매핑: 구분=${cKind.map(x=>x.col).join(',')} / 프로그램명=${cName.map(x=>x.col).join(',')} / 참여기간=${cPeriod.map(x=>x.col).join(',')} / 운영기관명=${cOrg.map(x=>x.col).join(',')} / 전화번호=${cTel.map(x=>x.col).join(',')}`);

  const dsCols=x=>{const a=[];try{const n=Number(x.getColCount?.()||0);for(let i=0;i<n;i++){const id=norm(x.getColID?.(i));if(id)a.push(id)}}catch{};return a};
  const colCI=(cols,want)=>{want=norm(want);if(!want)return'';return cols.find(c=>c===want)||cols.find(c=>String(c).toLowerCase()===want.toLowerCase())||''};
  const dsName=x=>norm(x?.name||x?.id||'')||'(이름없음)';
  const rc=()=>{try{return Number(ds.getRowCount?.()||0)}catch{return 0}};
  const resolveComboDs=(cell)=>{
    const id=norm(cell?.combods).replace(/^@/,'');if(!id)return null;
    const isDs=x=>x&&typeof x.getRowCount==='function'&&typeof x.getColumn==='function';
    const names=x=>[x?.name,x?.id,x?._id,x?._name].map(norm).filter(Boolean);
    const exactName=x=>names(x).some(n=>n===id);
    const found=[];
    const add=(x,source)=>{if(isDs(x)&&!found.some(z=>z.o===x))found.push({o:x,source,exact:exactName(x)})};
    try{add(gr._findDataset?.(id),'grid._findDataset')}catch{}
    let pp=gr,n=0;
    while(pp&&n++<14){
      try{add(pp[id],`parent[${id}]`)}catch{}
      try{add(pp.objects?.get_item?.(id),'parent.objects')}catch{}
      try{add(pp.lookup?.(id),'parent.lookup')}catch{}
      try{if(pp.form&&pp.form!==pp){add(pp.form[id],'parent.form[id]');add(pp.form.objects?.get_item?.(id),'parent.form.objects');add(pp.form.lookup?.(id),'parent.form.lookup')}}catch{}
      try{pp=pp.parent}catch{break}
    }
    try{add(app[id],'app[id]');add(app.lookup?.(id),'app.lookup')}catch{}
    for(const x of datasets){
      const nm=norm(x.name||x.o?.name||x.o?.id||''),last=norm(String(x.path||'').split('/').pop()||'');
      if(nm===id||last===id)add(x.o,'scan:'+String(x.path||''));
    }
    if(!found.length)return null;
    const codeWant=norm(cell?.combocode),dataWant=norm(cell?.combodata);
    const hasCI=(cols,w)=>!!w&&cols.some(c=>String(c).toLowerCase()===String(w).toLowerCase());
    found.sort((a,b)=>{
      const ac=dsCols(a.o),bc=dsCols(b.o);
      const as=(a.exact?20:0)+(hasCI(ac,codeWant)?4:0)+(hasCI(ac,dataWant)?4:0)+Math.min(2,Number(a.o.getRowCount?.()||0));
      const bs=(b.exact?20:0)+(hasCI(bc,codeWant)?4:0)+(hasCI(bc,dataWant)?4:0)+Math.min(2,Number(b.o.getRowCount?.()||0));
      return bs-as;
    });
    return found.find(x=>x.exact)?.o||null;
  };
  const comboOptions=(cds,codeCol,dataCol,limit=40)=>{
    const out=[];if(!cds)return out;const cols=dsCols(cds);if(!cols.length)return out;
    const dc=colCI(cols,dataCol)||(cols.find(c=>/(nm|name|data|label|text|cn|cont|desc)/i.test(c))||'');
    const cc=colCI(cols,codeCol)||(cols.find(c=>/(cd|code|se|gbn|clsf|type|kind)/i.test(c))||'');
    if(!dc||!cc)return out;const n=Math.min(limit,Number(cds.getRowCount?.()||0));
    for(let r=0;r<n;r++){let code='',label='';try{code=norm(cds.getColumn(r,cc));label=norm(cds.getColumn(r,dc))}catch{};if(code||label)out.push({code,label})}
    return out;
  };
  const comboCanon=v=>compact(v).replace(/\([^)]*\)/g,'').replace(/프로그램|서비스|지원|참여|과정/g,'');
  const comboResolve=(cell,labels0)=>{
    const labels=[...new Set((Array.isArray(labels0)?labels0:[labels0]).map(norm).filter(Boolean))];if(!labels.length)return null;
    const explicitId=norm(cell?.combods).replace(/^@/,''),explicitCode=norm(cell?.combocode),explicitData=norm(cell?.combodata);
    const cds=explicitId?resolveComboDs(cell):null;
    const searchOne=(x,source,allowLoose)=>{
      if(!x||x===ds||typeof x.getRowCount!=='function'||typeof x.getColumn!=='function')return null;
      const cols=dsCols(x),n=Math.min(1000,Number(x.getRowCount?.()||0));if(!cols.length||!n)return null;
      const dataCols=[];const ed=colCI(cols,explicitData);if(ed)dataCols.push(ed);
      for(const c of cols)if(c!==ed&&/(nm|name|data|label|text|cn|cont|desc|se_nm|type_nm|kind_nm)/i.test(c))dataCols.push(c);
      if(!dataCols.length)dataCols.push(...cols);
      const wants=labels.map(raw=>({raw,c:compact(raw),loose:compact(raw).replace(/\([^)]*\)/g,''),canon:comboCanon(raw)}));
      let best=null;
      const consider=(cand)=>{if(!best||cand.score>best.score)best=cand};
      for(let r=0;r<n;r++)for(const dataCol of dataCols){
        let dv='';try{dv=norm(x.getColumn(r,dataCol))}catch{};if(!dv)continue;
        const dc=compact(dv),looseDc=dc.replace(/\([^)]*\)/g,''),canonDc=comboCanon(dv);
        let score=0;
        for(const w of wants){
          if(dc===w.c)score=Math.max(score,100);
          else if(looseDc===w.loose&&w.loose)score=Math.max(score,96);
          else if(w.canon&&canonDc===w.canon)score=Math.max(score,92);
          else if(allowLoose&&w.c.length>=3&&(dc.includes(w.c)||w.c.includes(dc)))score=Math.max(score,82);
          else if(allowLoose&&w.canon.length>=2&&canonDc.length>=2&&(canonDc.includes(w.canon)||w.canon.includes(canonDc)))score=Math.max(score,76);
        }
        if(!score)continue;
        let codeCol=colCI(cols,explicitCode),cv=null;
        if(codeCol)try{cv=x.getColumn(r,codeCol)}catch{}
        if(!codeCol||cv===null||cv===undefined||norm(cv)===''){
          const pref=cols.filter(c=>c!==dataCol).sort((a,b)=>{
            const sa=/(^|_)(cd|code|se|gbn|clsf|type|kind)(_|$)/i.test(a)?0:/(cd|code|se|gbn|type|kind)/i.test(a)?1:2;
            const sb=/(^|_)(cd|code|se|gbn|clsf|type|kind)(_|$)/i.test(b)?0:/(cd|code|se|gbn|type|kind)/i.test(b)?1:2;return sa-sb;
          });
          codeCol='';cv=null;
          for(const c of pref){let vv=null;try{vv=x.getColumn(r,c)}catch{};if(vv!==null&&vv!==undefined&&norm(vv)!==''&&compact(norm(vv))!==dc){codeCol=c;cv=vv;break}}
        }
        if(!codeCol||cv===null||cv===undefined||norm(cv)==='')continue;
        consider({code:cv,label:dv,ds:dsName(x),dataCol,codeCol,source,score});
      }
      return best;
    };
    if(explicitId){
      if(cds){const hit=searchOne(cds,'cell.combodataset:'+explicitId,true);if(hit)return hit;return{notFound:true,explicit:true,ds:dsName(cds),options:comboOptions(cds,explicitCode,explicitData)}}
      return{notFound:true,explicit:true,ds:explicitId,options:[]};
    }
    for(const x of datasets){const hit=searchOne(x.o,x.path||'scan',false);if(hit)return hit}
    return null;
  };
  const comboAliases=v=>{
    const a=[norm(v)];const c=norm(v);
    if(c.includes('일경험'))a.push('일경험프로그램');
    if(c.includes('심리안정'))a.push('심리안정지원프로그램');
    if(c.includes('집단상담'))a.push('집단상담프로그램');
    if(c.includes('단기취업특강'))a.push('취업특강');
    return [...new Set(a.filter(Boolean))];
  };
  const sample=col=>{for(let r=0;r<rc();r++){let v='';try{v=norm(ds.getColumn(r,col))}catch{};if(v)return v}return''};
  const adaptDate=(col,v)=>/^(?:PRGM_BGDE|PRGM_ENDE|PRGM_BGDT|PRGM_ENDT|JHAC_BGDE|JHAC_ENDE|BGDE|ENDE)$/i.test(String(col||''))||/^\d{8}$/.test(sample(col))?date8(v):date10(v);
  const read=(r,c)=>{try{return norm(ds.getColumn(r,c.col))}catch{return''}};
  const set=(r,c,v,kind='text',aliases=null)=>{
    if(!c?.col)return false;let x=v,comboHit=null;
    if(kind==='date')x=adaptDate(c.col,v);
    if(kind==='combo'){
      comboHit=comboResolve(c,aliases||comboAliases(v));
      if(comboHit&&!comboHit.notFound)x=comboHit.code;
    }
    let ok=false;if(!repairOnly)assertIapIdentity();try{ok=ds.setColumn(r,c.col,x)!==false}catch{return false}
    if(kind==='date'){
      // setColumn() may return success even if the column-change handler
      // stores an ISO (10-char) string. Verify the *actual* dataset value.
      let stored='';try{stored=norm(ds.getColumn(r,c.col))}catch{}
      if(!ok || !/^\d{8}$/.test(stored) || stored!==date8(v)){
        out.notes.push(`저장 차단: ${c.col} ${r+1}행이 8자리 원본 날짜로 유지되지 않습니다 (데이터셋 값 길이 ${stored.length}).`);
        return false;
      }
      return true;
    }
    if(kind==='combo'){
      let shown='';try{shown=norm(gr.getCellText?.(r,c.i)||'')}catch{}
      if(comboHit&&!comboHit.notFound){
        out.notes.push(`취업지원 구분코드: ${norm(v)} → ${norm(comboHit.code)} / ${comboHit.ds}.${comboHit.codeCol} (${comboHit.label})`);
        let stored='';try{stored=norm(ds.getColumn(r,c.col))}catch{}
        return ok&&stored!=='';
      }
      const opts=comboHit?.options?.length?` / 실제옵션=${comboHit.options.map(o=>`${o.code}:${o.label}`).join(' | ')}`:'';
      out.notes.push(`취업지원 구분코드 탐색 실패: ${norm(v)} / Grid combodataset=${norm(c.combods)||'-'} code=${norm(c.combocode)||'-'} data=${norm(c.combodata)||'-'} / 해석Dataset=${comboHit?.ds||'-'}${opts} / 화면표시=${shown||'(빈값)'}`);
      return false;
    }
    return ok;
  };
  // Validate only the Work24 IAP participation date columns. Existing
  // 10-character ISO values from older extension versions can be repaired
  // without adding rows; do not guess at any other malformed value.
  const dateCols=cPeriod.slice(0,2).filter(c=>/^(?:PRGM_BGDE|PRGM_ENDE|PRGM_BGDT|PRGM_ENDT|JHAC_BGDE|JHAC_ENDE|BGDE|ENDE)$/i.test(String(c.col||'')));
  const dateValid=v=>{
    const d=date8(v);if(!/^\d{8}$/.test(d))return false;
    const y=+d.slice(0,4),m=+d.slice(4,6),day=+d.slice(6,8);
    const dt=new Date(Date.UTC(y,m-1,day));
    return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===day;
  };
  const dateCheck=(tryRepair)=>{
    let problems=0;
    for(let r=0;r<rc();r++)for(const c of dateCols){
      let stored=read(r,c);if(!stored)continue;
      if(/^\d{8}$/.test(stored)&&dateValid(stored))continue;
      if(tryRepair&&/^\d{4}-\d{2}-\d{2}$/.test(stored)&&dateValid(stored)){
        const canonical=date8(stored);
        let wrote=false;if(!repairOnly)assertIapIdentity();try{wrote=ds.setColumn(r,c.col,canonical)!==false}catch{}
        stored=read(r,c);
        if(wrote&&stored===canonical){out.repaired++;out.notes.push(`기존 ${r+1}행 ${c.col}: 10자리→8자리 정정 후 재검증 완료`);continue;}
      }
      problems++;
      out.rows.push({detail:`기존 ${r+1}행`,status:`${c.col} 날짜 저장값 길이 ${stored.length}자리 (8자리 필요)`});
    }
    return problems;
  };
  const priorProblems=dateCheck(true);
  if(priorProblems){
    out.failed+=priorProblems;
    out.notes.push('날짜 필드의 데이터셋 값이 8자리로 유지되지 않습니다. 이 상태에서는 Work24 저장을 시도하지 마세요.');
    out.rowCountAfter=rc();return out;
  }
  if(repairOnly){
    out.rowCountBefore=rc();out.rowCountAfter=rc();
    out.ok=true;out.notes.push(`현재 취업지원 표 날짜 점검 완료 · 정정 ${out.repaired}개 · 오류 0개. 최종 Work24 저장은 수행하지 않았습니다.`);
    return out;
  }
  const duplicate=j=>{for(let r=0;r<rc();r++){if(compact(read(r,cName[0]))===compact(j.name||'')&&(!j.start||date8(read(r,cPeriod[0]))===date8(j.start)))return true}return false};
  const findBlank=()=>{for(let r=0;r<rc();r++){if(!read(r,cName[0])&&!read(r,cPeriod[0]))return r}return-1};
  out.rowCountBefore=rc();
  for(const j of jobs){
    if(!j||(!j.kind&&!j.name))continue;
    const isValidDay=v=>{
      const d=date8(v);
      if(!/^\d{8}$/.test(d))return false;
      const y=+d.slice(0,4),m=+d.slice(4,6),day=+d.slice(6,8);
      const dt=new Date(Date.UTC(y,m-1,day));
      return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===day;
    };
    if(!isValidDay(j.start)||!isValidDay(j.end)||date8(j.start)>date8(j.end)){
      out.failed++;out.rows.push({detail:j.name,status:'시작일·종료일 형식 또는 순서 오류 — 행 추가하지 않음'});continue;
    }
    if(duplicate(j)){out.skipped++;out.rows.push({detail:j.name,status:'이미 존재하여 건너뜀'});continue;}
    let r=findBlank();
    if(r>=0){const colIds=dsCols(ds).map(x=>x.toUpperCase());if(colIds.includes('IAP_NO')){let v='';try{v=norm(ds.getColumn(r,'IAP_NO'))}catch{};if(!v)r=-1;}else r=-1;}
    if(r<0)r=await appendViaNativeIapButton(gr,ds,['btn_addEmp','btn_addJob','btn_addPgm','btn_addSpor'],out.notes);
    if(r<0){out.failed++;out.rows.push({detail:j.name,status:'원본 행추가 실패 · 데이터 미변경'});continue;}
    let good=0,total=0;
    total++;if(set(r,cKind[0],norm(j.kind),'combo',comboAliases(j.kind)))good++;
    total++;if(set(r,cName[0],norm(j.name),'text'))good++;
    if(cPeriod.length>=2){total+=2;if(set(r,cPeriod[0],j.start,'date'))good++;if(set(r,cPeriod[1],j.end,'date'))good++;}
    else{total++;if(set(r,cPeriod[0],`${date10(j.start)} ~ ${date10(j.end)}`,'text'))good++;}
    total++;if(set(r,cOrg[0],norm(j.org),'text'))good++;
    total++;if(set(r,cTel[0],norm(j.tel),'text'))good++;
    if(good===total){out.added++;out.rows.push({detail:j.name,status:`원본 행추가 후 입력 ${good}/${total}`,row:r});}
    else{out.failed++;out.rows.push({detail:j.name,status:`원본 행추가 후 부분입력 ${good}/${total}`,row:r});}
  }
  // Re-read after Nexacro column-change handlers settle; 6/6 setColumn
  // calls are not proof that the database's 8-character contract holds.
  await new Promise(resolve=>setTimeout(resolve,180));
  const postProblems=dateCheck(false);
  if(postProblems){out.failed+=postProblems;out.notes.push('최종 저장 전 검증 실패: 날짜 형식이 8자리로 유지되지 않았습니다. 저장 버튼을 누르지 마세요.');}
  out.rowCountAfter=rc();try{gr.redraw?.()}catch{};try{gr.setFocus?.()}catch{}
  out.ok=out.failed===0&&(out.added>0||out.skipped>0);out.notes.push(`취업지원 Grid 확정: ${norm(gr.name||gr.id||'grd_empList')} / Dataset ${norm(ds.name||ds.id||gr.binddataset||'')||'(이름없음)'} / ${out.rowCountBefore}→${out.rowCountAfter}`);out.notes.push('최종 저장·제출은 수행하지 않았습니다.');return out;
}

function probeIapFrameMAIN(){
  const visible=el=>{try{const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>2&&r.height>2&&st.visibility!=='hidden'&&st.display!=='none'}catch{return false}};
  const ids=[...document.querySelectorAll('[id]')].filter(visible).map(el=>String(el.id||'').split('.').pop());
  const has=x=>ids.includes(x);
  const t=String(document.body?.innerText||'').replace(/\s+/g,'');
  return {jobGrid:has('grd_empList'),actGrid:has('grd_workList'),jobTitle:t.includes('취업지원프로그램참여계획'),actTitle:t.includes('구직활동지원프로그램활동계획')};
}

// Extra safety: where the integrated app supplies an IAP registration number, cross-check the one visible on the Work24 page.
function checkIapParticipantMAIN(expected){
 const required=String(expected||'').trim().toUpperCase();
 if(!/^A\d{10,}$/.test(required))return {checked:true,ok:false,reason:'유효한 전체 IAP 등록번호가 없습니다. 통합본에서 다시 전송해 주세요.'};
 const ids=new Set();
 let doc=document;
 for(let level=0;doc&&level<8;level++){
  const view=doc.defaultView||window;
  for(const el of doc.querySelectorAll('input,textarea,span,td,div')){
   try{
    const r=el.getBoundingClientRect(),cs=view.getComputedStyle(el);
    if(r.width<1||r.height<1||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity||1)===0||el.children.length)continue;
    const text=String(el.value||el.textContent||'').trim();
    // Whole identifiers only: never compare names, suffixes, masked or partial numbers.
    for(const m of text.matchAll(/(?:^|[^A-Za-z0-9])A\d{10,}(?![A-Za-z0-9])/ig))ids.add(m[0].replace(/^[^A-Za-z0-9]/,'').toUpperCase());
   }catch{}
  }
  try{const parent=view.parent;if(!parent||parent===view)break;doc=parent.document;}catch{break;}
 }
 if(ids.size!==1)return {checked:true,ok:false,reason:'현재 IAP 화면의 등록번호를 한 개로 확정할 수 없습니다. 다른 참여자 창을 닫고 번호를 표시해 주세요.'};
 return {checked:true,ok:ids.has(required),reason:ids.has(required)?'등록번호 일치':'통합본과 Work24 등록번호 불일치'};
}

$('repairDatesBtn')?.addEventListener('click',async()=>{
  const st=$('status'), diag=$('diag'), btn=$('repairDatesBtn');
  if(!confirm('현재 Work24 IAP 화면의 취업지원·구직활동 참여기간을 함께 점검합니다.\n\n잘못 저장된 10자리(yyyy-MM-dd) 날짜만 8자리(yyyyMMdd)로 변경합니다. 새로운 행을 추가하거나 최종 저장하지 않습니다.\n\n계속하시겠습니까?'))return;
  btn.disabled=true;
  try{
    st.className='status';st.textContent='현재 화면에서 취업지원·구직활동 참여기간을 확인하고 있습니다...';
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!isWork24Tab(tab.url||''))throw Error('Work24 IAP등록/관리 화면을 먼저 열어주세요.');
    const scan=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},world:'MAIN',func:probeIapFrameMAIN});
    const reports=[];
    for(const [key,func] of [['jobGrid',applyIapJobProgramsMAIN],['actGrid',applyIapActivitiesMAIN]]){
      const hits=scan.filter(x=>x.result?.[key]);
      if(hits.length!==1)throw Error(`${key} 표 검색결과 ${hits.length}개: 두 표가 표시된 IAP 화면을 하나만 열어주세요.`);
      reports.push({frameId:hits[0].frameId,func});
    }
    const checked=[];
    for(const item of reports){
      const results=await chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:[item.frameId]},world:'MAIN',func:item.func,args:[{repairOnly:true,jobRows:[],actRows:[]}]});
      checked.push(results?.[0]?.result);
    }
    if(checked.some(x=>!x?.found))throw Error('취업지원 또는 구직활동 Dataset을 확인하지 못했습니다.');
    const r={ok:checked.every(x=>x.ok),repaired:checked.reduce((n,x)=>n+(x.repaired||0),0),failed:checked.reduce((n,x)=>n+(x.failed||0),0),notes:checked.flatMap(x=>x.notes||[]),rows:checked.flatMap(x=>x.rows||[])};
    if(r.ok){st.className='status ok';st.textContent=`✓ 날짜 점검 완료 · 정정 ${r.repaired||0}개 · 남은 오류 0개. 전산 저장 전 화면을 확인하세요.`;}
    else{st.className='status err';st.textContent=`날짜 점검에서 ${r.failed||0}개 오류 발견 · 아래 진단을 확인하고 전산 저장을 중단하세요.`;}
    if(diag){diag.textContent=[`확장 ${chrome.runtime.getManifest().version} · 참여기간 점검`,...(r.notes||[]),...(r.rows||[]).map(x=>`${x.detail} / ${x.status}`)].join('\n');diag.style.display='block';}
  }catch(err){st.className='status err';st.textContent='날짜 점검 실패: '+(err?.message||String(err));}
  finally{btn.disabled=false;}
});

$('applyBtn').addEventListener('click',async()=>{
  if(applyingIap)return;
  const pending=JSON.parse(JSON.stringify(getPendingIap()));
  const st=$('status'),diag=$('diag');
  if(!pending){st.className='status';st.textContent='대기자료가 없습니다.';return;}
  const liveIap=(await chrome.storage.local.get(KEY))?.[KEY];
  if(applyingIap)return;
  const sentAtMs=Date.parse(String(pending.sentAt||''));
  if(!liveIap||JSON.stringify(liveIap)!==JSON.stringify(pending)||!Number.isFinite(sentAtMs)||Date.now()-sentAtMs>24*3600000||sentAtMs>Date.now()+300000){
    st.className='status err';st.textContent='대기자료가 만료되었거나 변경되었습니다. 통합본에서 다시 전송해 주세요.';return;
  }
  if(!(pending.audit||{}).ok){st.className='status err';st.textContent='IAP 사전점검 오류가 있어 자동입력할 수 없습니다.';return;}
  const jobN=(pending.jobRows||[]).length,actN=(pending.actRows||[]).length;
  if(!jobN&&!actN){st.className='status err';st.textContent='자동입력할 IAP 계획 행이 없습니다.';return;}
  const ok=confirm(`현재 열려 있는 Work24 IAP등록/관리 화면에 IAP 계획을 자동입력합니다.\n\n취업지원 프로그램 ${jobN}행\n구직활동지원 ${actN}행\n\n※ 최종 저장·제출은 하지 않습니다.\n※ 화면의 참여자가 맞는지 먼저 확인하세요.\n\n계속할까요?`);
  if(!ok)return;
  const chooseBest=(rs,kind)=>{
    const results=(rs||[]).map((x,i)=>({...(x.result||{}),_frameId:x.frameId,_documentId:x.documentId,_i:i})).filter(x=>Object.keys(x).length>3);
    const score=x=>(x.found?100000:0)+(x.ok?50000:0)+(x.appFound?10000:0)+(Number(x.added||0)*100)+(Number(x.skipped||0)*10)+Number(x.visited||0)/10000;
    return {best:[...results].sort((a,b)=>score(b)-score(a))[0]||null,results,kind};
  };
  const lineFor=(title,r)=>{
    if(!r)return `${title}: 실행결과 없음`;
    return `${title}: ${r.ok?'성공':'확인필요'} · ${r.rowCountBefore||0}→${r.rowCountAfter||0} · 입력 ${r.added||0} · 기존 ${r.skipped||0} · 실패 ${r.failed||0}`;
  };
  let frameProbeSummary='';
  applyingIap=true;$('applyBtn').disabled=true;
  try{
    st.className='status';st.textContent='Work24 IAP 화면을 찾고 취업지원·구직활동 계획을 자동입력 중입니다...';
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id)throw new Error('현재 탭을 확인하지 못했습니다.');
    if(!isWork24Tab(tab.url||''))throw new Error('현재 탭이 Work24가 아닙니다. Work24 IAP등록/관리 화면을 먼저 열어주세요.');

    const expectedNumber=pending.iapNo||'';
    if(!/^A\d{10,}$/.test(expectedNumber))throw new Error('IAP 등록번호가 없습니다. 통합본에서 다시 전송해 주세요.');

    // Discovery is read-only across frames. Apply each IAP section in ONE selected
    // frame only; the old allFrames:true mutation could trigger duplicate input.
    const probe=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},world:'MAIN',func:probeIapFrameMAIN});
    frameProbeSummary='화면 탐색: '+probe.map(x=>`frame=${x.frameId} 취업지원=${x.result?.jobGrid?'Y':'N'} 구직활동=${x.result?.actGrid?'Y':'N'}`).join(' | ');
    const matches=kind=>probe.filter(x=>x?.result?.[kind+'Grid']);
    const pick=(kind,other)=>{
      const a=matches(kind);
      if(a.length===1)return a[0].frameId;
      if(a.length>1)throw new Error(kind+' 표가 여러 프레임에서 발견되어 안전하게 중단했습니다.');
      if(other!==null&&other!==undefined){
        const same=probe.find(x=>x.frameId===other);
        if(same?.result?.[kind+'Title'])return other;
      }
      throw new Error(kind+' 표의 실제 실행 프레임을 찾지 못했습니다. IAP등록/관리 화면의 해당 표를 펼쳐 주세요.');
    };
    const jobFrame=jobN?pick('job',null):null;
    const actFrame=actN?pick('act',jobFrame):null;
    // Check every selected mutation frame before writing even the first section.
    const selected=[...new Set([jobFrame,actFrame].filter(x=>x!==null))];
    const identities=await chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:selected},world:'MAIN',func:checkIapParticipantMAIN,args:[expectedNumber]});
    if(identities.length!==selected.length||identities.some(x=>!x.result?.ok))throw new Error('등록번호 검증 실패 · '+(identities.find(x=>!x.result?.ok)?.result?.reason||'현재 화면의 번호를 확인할 수 없습니다.'));
    const targetFor=frameId=>{
      const documentId=identities.find(x=>x.frameId===frameId)?.documentId;
      if(!documentId)throw new Error('화면 식별정보를 확인하지 못했습니다. 전산 화면을 새로 열어주세요.');
      return {tabId:tab.id,documentIds:[documentId]};
    };
    let jobPack={best:{ok:true,found:true,added:0,skipped:0,failed:0,notes:['취업지원 프로그램 행 없음']},results:[],kind:'취업지원'};
    if(jobN){
      const jr=await chrome.scripting.executeScript({target:targetFor(jobFrame),world:'MAIN',func:applyIapJobProgramsMAIN,args:[pending]});
      jobPack=chooseBest(jr,'취업지원');
    }
    let actPack={best:{ok:true,found:true,added:0,skipped:0,failed:0,notes:['구직활동지원 행 없음']},results:[],kind:'구직활동'};
    if(actN && jobPack.best?.ok===false){throw new Error('취업지원 날짜·입력 검증이 실패하여 구직활동 추가도 중단했습니다. 진단에서 날짜 확인 후 재시도해 주세요.');}
    if(actN){
      const ar=await chrome.scripting.executeScript({target:targetFor(actFrame),world:'MAIN',func:applyIapActivitiesMAIN,args:[pending]});
      actPack=chooseBest(ar,'구직활동');
    }
    const jb=jobPack.best,ab=actPack.best;
    const jobOkay=!jobN||(jb?.found&&jb?.ok&&!(jb?.failed>0)),actOkay=!actN||(ab?.found&&ab?.ok&&!(ab?.failed>0));
    const totalAdded=Number(jb?.added||0)+Number(ab?.added||0),totalSkipped=Number(jb?.skipped||0)+Number(ab?.skipped||0),totalFailed=Number(jb?.failed||0)+Number(ab?.failed||0);
    if(jobOkay&&actOkay){
      st.className='status ok';st.textContent=`✓ Work24 IAP 화면 입력 완료(저장 전 검증 필요) · 입력 ${totalAdded}행${totalSkipped?` · 기존 ${totalSkipped}행 건너뜀`:''}${totalFailed?` · 부분/실패 ${totalFailed}행`:''} · 최종 저장은 하지 않음`;
    }else{
      st.className='status err';st.textContent=`IAP 일부 자동입력 확인 필요 · 취업지원 ${jobOkay?'완료':'실패'} / 구직활동 ${actOkay?'완료':'실패'}`;
    }
    if(diag){
      const blocks=[`국취 전산 상담 도우미 ${chrome.runtime.getManifest().version} · Work24 저장 전 진단`];
      blocks.push(frameProbeSummary);
      blocks.push(lineFor('취업지원 프로그램',jb));
      if(jb){blocks.push(`  표: ${(jb.headers||[]).join(' | ')||'-'}`);for(const r of (jb.rows||[]))blocks.push(`  - ${r.status} · ${r.detail||''}`);if((jb.notes||[]).length)blocks.push('  '+jb.notes.join(' / '));}
      blocks.push('');blocks.push(lineFor('구직활동지원',ab));
      if(ab){blocks.push(`  표: ${Array.isArray(ab.headers)?ab.headers.join(' | '):JSON.stringify(ab.headers||{})}`);for(const r of (ab.rows||[]))blocks.push(`  - ${r.status} · ${r.detail||''}`);if((ab.notes||[]).length)blocks.push('  '+ab.notes.join(' / '));}
      if(!jobOkay&&jobPack.results.length){blocks.push('');blocks.push('취업지원 프레임 진단:');for(const x of jobPack.results.filter(x=>x.appFound||x.found).slice(0,4))blocks.push(`frame=${x._frameId} app=${x.appSource||'-'} found=${x.found?'Y':'N'} · ${(x.notes||[]).join(' / ')}`)}
      diag.textContent=blocks.join('\n');diag.style.display='block';
      if($('iapDiagnosticDetails'))$('iapDiagnosticDetails').open=!(jobOkay&&actOkay);
    }
  }catch(e){
    if($('iapDiagnosticDetails'))$('iapDiagnosticDetails').open=true;
    st.className='status err';st.textContent='자동입력 오류 · '+(e?.message||String(e));
    if(diag){diag.textContent=[frameProbeSummary,'안전 중단: '+(e?.message||String(e))].filter(Boolean).join('\n');diag.style.display='block';}
  }finally{applyingIap=false;$('applyBtn').disabled=!getPendingIap();}
});
load();
