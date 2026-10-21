const isWork24Tab=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr'));}catch{return false;}};
const $=id=>document.getElementById(id);
let lastData=null;
const COUNSEL_ALLOWANCE_KEY='clgAllowanceToCounselPendingV112';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=v=>v===0?'0':(v||'미인식');
const money=v=>{if(v===0||v==='0')return '0원'; if(!v)return '미인식'; return /원$/.test(String(v))?String(v):`${v}원`;};

const monthlyPlanRequirement = plans => {
  let total = 0;
  let allMonthly = true;
  for (const p of (plans||[])) {
    const t = String(p?.frequency||'').replace(/\s+/g,'');
    const m = t.match(/^월(\d+)회이상$/);
    if (m) total += Number(m[1]);
    else if (t) allMonthly = false;
  }
  return {total, allMonthly};
};

const validatedReviewResult = d => {
  const status=String(d?.processStatus||'').trim();
  const raw=String(d?.review?.result||d?.review?.reportStatus||'').trim();

  // 실제 업무 진행상태가 최종 단계일 때만 검토결과를 확정값으로 사용
  const finalStatuses=['지급결정','반려','지급취소'];
  if(finalStatuses.includes(status)){
    return raw || status;
  }

  // 검토요청/검토중/결재중 등에서는 화면의 '지급' 선택이 미리 들어가 있을 수 있음
  if(raw){
    return `미확정 (화면값: ${raw} / 현재 처리상태: ${status||'미인식'})`;
  }
  if(status){
    return `미확정 (현재 처리상태: ${status})`;
  }
  return '미인식';
};

/*
 * chrome.scripting.executeScript(... world:'MAIN')에서 직접 실행되는 함수.
 * 현재 회차의 "구직활동지원 프로그램 활동 계획" Grid만 엄격하게 찾아
 * 화면에 렌더링되지 않은 가상스크롤 행까지 Dataset에서 읽는다.
 */
function probeNexacroPlanGridMAIN(supportStart,supportEnd){
  const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const compact=s=>norm(s).replace(/\s/g,'');
  const PLAN_TYPES=[
    '입사지원서(취업알선상담 포함)제출',
    '입사지원에 필요한 컨설팅 참여',
    '상담사가 부과한 과제 이행 후 상담 참여',
    '구직활동 프로그램 참여',
    '취업특강 참여',
    '직업훈련 참여'
  ];
  const noise=/(로그아웃|연장|결재|좋은일자리 북부센터|취업지원 공통|조회\/관리|겸직)/;

  const dateList=s=>{
    const out=[];
    const re=/((?:19|20)\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/g;
    let m;
    while((m=re.exec(norm(s)))){
      const d=`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
      if(!out.includes(d))out.push(d);
    }
    return out;
  };

  const collectionItems=col=>{
    const out=[];
    if(!col)return out;
    try{
      const len=Number(col.length);
      if(Number.isFinite(len)){
        for(let i=0;i<len;i++){
          let v=null;
          try{v=col[i];}catch{}
          if(!v&&typeof col.get_item==='function'){try{v=col.get_item(i);}catch{}}
          if(v&&!out.includes(v))out.push(v);
        }
      }
    }catch{}
    try{
      const ids=Array.isArray(col._idArray)?col._idArray:[];
      for(const id of ids){
        let v=null;
        try{v=col[id];}catch{}
        if(!v&&typeof col.get_item==='function'){try{v=col.get_item(id);}catch{}}
        if(v&&!out.includes(v))out.push(v);
      }
    }catch{}
    return out;
  };

  const objType=o=>{
    try{return norm(o?._type_name||o?.constructor?.name||'');}catch{return '';}
  };

  const cleanHeader=t=>{
    t=norm(t);
    return t.replace(/^(?:text|bind|expr):/i,'').replace(/[{}]/g,'').trim();
  };

  const result={
    ok:false,
    appFound:false,
    visited:0,
    exactGridCount:0,
    plans:[],
    grids:[],
    errors:[]
  };

  let app=null;
  try{
    app=window.nexacro?.getApplication?.() || window.application || null;
  }catch(e){
    result.errors.push('getApplication:'+String(e));
  }
  result.appFound=!!app;
  if(!app)return result;

  const seen=new WeakSet();
  const q=[{o:app,path:'app',depth:0}];

  const addCandidate=(v,path,depth)=>{
    if(!v || (typeof v!=='object'&&typeof v!=='function'))return;
    q.push({o:v,path,depth});
  };

  while(q.length && result.visited<4500){
    const {o,path,depth}=q.shift();
    if(!o || (typeof o!=='object'&&typeof o!=='function'))continue;
    try{if(seen.has(o))continue;seen.add(o);}catch{}
    result.visited++;

    const type=objType(o);
    const gridLike=/Grid/i.test(type) ||
      (typeof o.getCellCount==='function' && typeof o.getCellText==='function');

    if(gridLike){
      try{
        let hc=0,bc=0;
        try{hc=Number(o.getCellCount('head')||0);}catch{}
        try{bc=Number(o.getCellCount('body')||0);}catch{}
        const headers=[];
        for(let i=0;i<Math.min(hc,40);i++){
          let t='';
          try{t=cleanHeader(o.getCellProperty('head',i,'text'));}catch{}
          if(t)headers.push(t);
        }
        const h=compact(headers.join('|'));
        const exact =
          h.includes(compact('구분')) &&
          h.includes(compact('세부내용')) &&
          h.includes(compact('참여기간')) &&
          (h.includes(compact('활동(지원)횟수')) || h.includes(compact('활동(지원)횟수(월)')) || h.includes('횟수'));

        let ds=null, rowCount=0;
        try{ds=o.getBindDataset?.()||null;}catch{}
        try{
          rowCount=ds&&typeof ds.getRowCount==='function'
            ? Number(ds.getRowCount()||0)
            : Number(o.rowcount||0);
        }catch{}

        if(exact){
          result.exactGridCount++;
          const gridDiag={path,type,headers,rowCount,rows:[]};

          for(let r=0;r<Math.min(rowCount,50);r++){
            const vals=[];
            for(let c=0;c<Math.min(bc,40);c++){
              let t='';
              try{t=norm(o.getCellText(r,c));}catch{}
              if(t&&!vals.includes(t))vals.push(t);
            }

            // getCellText가 비는 환경이면 Dataset의 실제 컬럼값도 보조 사용
            if(!vals.length && ds){
              try{
                const cc=Number(ds.getColCount?.()||0);
                for(let c=0;c<Math.min(cc,50);c++){
                  let id='';
                  try{id=ds.getColID(c);}catch{}
                  let v='';
                  try{v=norm(ds.getColumn(r,id||c));}catch{}
                  if(v&&!vals.includes(v))vals.push(v);
                }
              }catch{}
            }

            const text=norm(vals.join(' '));
            gridDiag.rows.push({row:r,values:vals,text});

            const planType=PLAN_TYPES.find(k=>compact(text).includes(compact(k)));
            if(!planType)continue;

            const dates=[];
            for(const v of vals){
              for(const d of dateList(v))if(!dates.includes(d))dates.push(d);
            }
            if(dates.length<2){
              for(const d of dateList(text))if(!dates.includes(d))dates.push(d);
            }
            if(dates.length<2)continue;

            // 현재 회차 범위와 전혀 겹치지 않는 행 제외
            if(supportStart&&supportEnd){
              const overlaps=!(dates[1]<supportStart || dates[0]>supportEnd);
              if(!overlaps)continue;
            }

            let frequency='';
            for(const v of vals){
              const m=norm(v).match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);
              if(m){frequency=norm(m[0]);break;}
            }
            if(!frequency){
              const m=text.match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);
              if(m)frequency=norm(m[0]);
            }

            const isBad=v=>{
              const t=norm(v);
              if(!t)return true;
              if(noise.test(t))return true;
              if(PLAN_TYPES.some(k=>compact(t)===compact(k)))return true;
              if(dateList(t).length)return true;
              if(/^(연번|상태|등록구분|구분|세부내용|참여기간|활동\(지원\)횟수(?:\(월\))?|선택|접수내역)$/.test(t))return true;
              if(/^(?:월\s*)?\d+\s*회(?:\s*이상)?$/.test(t))return true;
              if(/^\d{1,2}$/.test(t))return true;
              return false;
            };

            const detailCandidates=vals.filter(v=>!isBad(v));
            let detail=detailCandidates
              .filter(v=>!PLAN_TYPES.some(k=>compact(v).includes(compact(k))))
              .sort((a,b)=>norm(b).length-norm(a).length)[0]||'';

            if(noise.test(detail))continue;

            const seq=vals.map(norm).find(v=>/^\d{1,2}$/.test(v))||String(r+1);
            const plan={
              seq,
              type:planType,
              detail:norm(detail),
              period:`${dates[0]} ~ ${dates[1]}`,
              frequency
            };

            const key=[compact(plan.type),compact(plan.detail),plan.period,compact(plan.frequency)].join('|');
            if(!result.plans.some(x=>x._key===key))result.plans.push({...plan,_key:key});
          }

          result.grids.push(gridDiag);
        }else if(headers.length){
          // 진단용: 정확한 표가 안 잡힌 경우 가까운 Grid 헤더만 조금 남긴다.
          const nearScore=['구분','세부내용','참여기간','활동','횟수'].filter(k=>h.includes(compact(k))).length;
          if(nearScore>=2 && result.grids.length<12){
            result.grids.push({path,type,headers,rowCount,nearScore});
          }
        }
      }catch(e){
        result.errors.push(`grid:${path}:${String(e)}`);
      }
    }

    if(depth>=12)continue;

    // Nexacro 주요 트리 구조
    const props=['mainframe','form','frames','childframes','components','all','objects'];
    for(const k of props){
      let v=null;
      try{v=o[k];}catch{}
      if(!v)continue;

      if(['frames','childframes','components','all','objects'].includes(k)){
        for(const child of collectionItems(v)){
          let id='';
          try{id=norm(child?.id||child?.name||child?._id||objType(child));}catch{}
          addCandidate(child,`${path}.${k}.${id||'item'}`,depth+1);
        }
      }else{
        addCandidate(v,`${path}.${k}`,depth+1);
      }
    }

    // 일부 Nexacro 버전에서 컴포넌트가 전용 프로퍼티로만 연결되는 경우 보조
    try{
      const keys=Object.keys(o).slice(0,350);
      for(const k of keys){
        if(!/(grid|form|frame|div|tab|dataset|component)/i.test(k))continue;
        let v=null;try{v=o[k];}catch{}
        if(!v || (typeof v!=='object'&&typeof v!=='function'))continue;
        addCandidate(v,`${path}.${k}`,depth+1);
      }
    }catch{}
  }

  result.plans=result.plans
    .map(({_key,...x})=>x)
    .sort((a,b)=>(+(a.seq||999))-(+(b.seq||999)));

  result.ok=result.exactGridCount>0;
  return result;
}
function setStatus(msg,kind=''){ $('status').textContent=msg; $('status').className='status'+(kind?` ${kind}`:''); }
function row(label,value,cls=''){const empty=!(value||value===0);return `<div class="row"><div class="label">${esc(label)}</div><div class="value ${empty?'empty':''} ${cls}">${esc(val(value))}</div></div>`;}

function render(d){
  const plans=(d.jobSearchPlans||[]).map((x,i)=>`<div class="item"><strong>${i+1}. ${esc(x.type||'계획')}</strong>${x.detail?`<div>${esc(x.detail)}</div>`:''}${x.period?`<div class="muted">참여기간: ${esc(x.period)}</div>`:''}${x.frequency?`<div class="muted">활동횟수: ${esc(x.frequency)}</div>`:''}</div>`).join('') || `<div class="item muted">활동계획을 찾지 못했습니다.</div>`;
  const acts=(d.activities||[]).map((a,i)=>`<div class="item"><strong>${i+1}. ${esc(a.activityName||a.activityType||'활동')}</strong>${a.activityType?`<div>${esc(a.activityType)}</div>`:''}${a.activityContent?`<div>${esc(a.activityContent)}</div>`:''}${a.activityPeriod?`<div class="muted">활동기간: ${esc(a.activityPeriod)}</div>`:''}</div>`).join('') || `<div class="item muted">이행결과를 찾지 못했습니다.</div>`;
  const income=d.income||{};
  const incomeHtml=(income.items||[]).length ? (income.items||[]).map((x,i)=>`<div class="item"><strong>${i+1}. ${esc(x.type||'소득')}</strong>${x.content?`<div>${esc(x.content)}</div>`:''}<div class="muted">${x.date?`발생일 ${esc(x.date)} · `:''}${x.applicationAmount?`신청소득 ${esc(money(x.applicationAmount))} · `:''}${x.amount?`소득 ${esc(money(x.amount))}`:''}</div></div>`).join('') + `<div class="item muted">총 ${esc(income.count??0)}건 · 합계 ${esc(money(income.total||'0'))}</div>` : `<div class="item"><strong>${Number(income.count||0)===0?'소득발생 없음':'소득 내역'}</strong><div class="muted">총 ${esc(income.count??0)}건 · 합계 ${esc(money(income.total||'0'))}</div></div>`;
  const emp=d.employment||{};
  const empHours=Number(String(emp.weeklyHours||'').replace(/[^0-9.]/g,''));
  const emp30=emp.reported==='있음' && Number.isFinite(empHours) && empHours>=30;
  const esp=d.employmentSupport||{};
  const ep=(esp.plans||[]).map((x,i)=>`<div class="item"><strong>계획 ${i+1}. ${esc(x.type||'')}</strong><div>${esc(x.program||'')}</div><div class="muted">${esc(x.period||'')}${x.institution?` · ${esc(x.institution)}`:''}${x.phone?` · ${esc(x.phone)}`:''}</div></div>`).join('');
  const er=(esp.results||[]).map((x,i)=>`<div class="item"><strong>결과 ${i+1}. ${esc(x.type||'')}</strong><div>${esc(x.program||'')}</div><div class="muted">${x.registration?`${esc(x.registration)} · `:''}${esc(x.period||'')}${x.institution?` · ${esc(x.institution)}`:''}${x.phone?` · ${esc(x.phone)}`:''}</div></div>`).join('');
  const programHtml=(ep||er)
    ? `${ep}${er}`
    : `<div class="item"><strong>등록된 참여내용 없음</strong><div class="muted">현재 화면 기준 계획/결과 없음</div></div>`;
  const sups=(d.supplements||[]).length ? d.supplements.map((s,i)=>`<div class="item"><strong>${i+1}. 보완요청</strong><div>${esc(s.reason||'사유 미인식')}</div><div class="muted">${esc([s.startDate,s.endDate].filter(Boolean).join(' ~ '))}${s.completedDate?` · 완료 ${esc(s.completedDate)}`:''}</div></div>`).join('') : `<div class="item"><strong>보완요청 없음</strong></div>`;
  const r=d.review||{}, p=d.payment||{};
  $('result').innerHTML=`
    <section class="card"><div class="cardTitle">회차 기본정보</div>
      ${row('현재 회차',d.round?`${d.round}회차`:'')}${row('지원대상기간',[d.supportStart,d.supportEnd].filter(Boolean).join(' ~ '))}${row('지정일',d.designatedDate)}${row('전체 처리상태',d.processStatus)}${row('이행보고 상태',d.reportProgress)}${row('보고서 제출일',d.reportSubmitDate)}${row('제출여부',d.submitted)}
    </section>
    <section class="card"><div class="cardTitle">구직활동 계획 항목 · ${(d.jobSearchPlans||[]).length}건${monthlyPlanRequirement(d.jobSearchPlans||[]).total>0&&monthlyPlanRequirement(d.jobSearchPlans||[]).allMonthly?` / 월 활동요건 합계 ${monthlyPlanRequirement(d.jobSearchPlans||[]).total}회 이상`:``}</div>${plans}</section>
    <section class="card"><div class="cardTitle">구직활동 이행결과 · ${(d.activities||[]).length}건</div>${acts}</section>
    <section class="card"><div class="cardTitle">소득발생내역</div>${incomeHtml}</section>
    <section class="card"><div class="cardTitle">취업여부 정보${emp30?' · 30시간 이상 취업':''}</div>${row('취업(예정) 신고여부',emp.reported)}${row('회사명',emp.company)}${row('취업형태',emp.employmentType)}${row('취업예정일',emp.plannedDate)}${row('주당 근로시간',emp.weeklyHours?emp.weeklyHours+'시간':'')}${emp30?`<div class="item" style="border-color:#f6c453;background:#fff8e6;color:#8a5200"><strong>중요 · 주 ${esc(emp.weeklyHours)}시간 취업</strong><div>30시간 이상 취업으로 확인됩니다. 해당 회차는 구직활동 미이행 예외가 적용되는지 반드시 확인하세요.</div></div>`:''}</section>
    <section class="card"><div class="cardTitle">취업지원 프로그램</div>${programHtml}</section>
    <section class="card"><div class="cardTitle">보완요청</div>${sups}</section>
    <section class="card"><div class="cardTitle">검토결과</div>${row('보고진행상태',r.reportStatus)}${row('보고서 제출일',r.submitDate)}${row('검토승인결과',validatedReviewResult(d))}${r.reason?row('결과사유',r.reason):''}</section>
    <section class="card"><div class="cardTitle">구직촉진수당 지급 요청</div>${row('지급구분',p.type)}${row('지급여부',p.decision)}${row('요청일자',p.requestDate)}${row('신청사유',p.reason)}${row('총요청금액',p.totalRequest?money(p.totalRequest):'','money')}${row('기본금',p.basicAmount?money(p.basicAmount):'','money')}${row('가족수당',p.familyAmount!==''?money(p.familyAmount):'')}${row('총소득금액',p.totalIncome!==''?money(p.totalIncome):'')}${row('추가감액금액',p.extraReduction!==''?money(p.extraReduction):'')}
    </section>`;
  $('result').classList.add('show');
}

function toText(d){
  const lines=[];
  lines.push(`[구직촉진수당 ${d.round?d.round+'회차':'현재 회차'}]`);
  lines.push(`지원대상기간: ${[d.supportStart,d.supportEnd].filter(Boolean).join(' ~ ')||'미인식'}`);
  lines.push(`지정일: ${val(d.designatedDate)}`);
  lines.push(`전체 처리상태: ${val(d.processStatus)}`);
  lines.push(`이행보고 상태: ${val(d.reportProgress)}`);
  lines.push(`보고서 제출일: ${val(d.reportSubmitDate)}`);
  lines.push('');
  const planReq=monthlyPlanRequirement(d.jobSearchPlans||[]);
  lines.push(planReq.total>0&&planReq.allMonthly?`[구직활동 계획 항목 ${(d.jobSearchPlans||[]).length}건 / 월 활동요건 합계 ${planReq.total}회 이상]`:`[구직활동 계획 항목 ${(d.jobSearchPlans||[]).length}건]`);
  (d.jobSearchPlans||[]).forEach((x,i)=>lines.push(`${i+1}. ${[x.type,x.detail,x.period,x.frequency].filter(Boolean).join(' / ')}`));
  lines.push('');
  lines.push(`[구직활동 이행결과 ${(d.activities||[]).length}건]`);
  (d.activities||[]).forEach((a,i)=>lines.push(`${i+1}. ${[a.activityName,a.activityContent,a.activityPeriod].filter(Boolean).join(' / ')}`));
  lines.push('');
  lines.push(`소득: ${Number(d.income?.count||0)===0?'발생 없음':`총 ${d.income?.count}건 / 합계 ${money(d.income?.total||'0')}`}`);
  (d.income?.items||[]).forEach((x,i)=>lines.push(`  ${i+1}. ${[x.type,x.content,x.date,x.amount?money(x.amount):''].filter(Boolean).join(' / ')}`));
  const emp=d.employment||{};
  const empHours=Number(String(emp.weeklyHours||'').replace(/[^0-9.]/g,''));
  const emp30=emp.reported==='있음' && Number.isFinite(empHours) && empHours>=30;
  lines.push(`취업여부: ${emp.reported||'미인식'}${emp.company?` / ${emp.company}`:''}${emp.employmentType?` / ${emp.employmentType}`:''}${emp.plannedDate?` / ${emp.plannedDate}`:''}${emp.weeklyHours?` / 주 ${emp.weeklyHours}시간`:''}`);
  if(emp30) lines.push(`※ 중요: 주 ${emp.weeklyHours}시간 취업(30시간 이상) — 해당 회차 구직활동 미이행 예외 적용 여부 확인`);
  const esp=d.employmentSupport||{};
  if((esp.plans||[]).length || (esp.results||[]).length){
    lines.push(`취업지원 프로그램: 계획 ${(esp.plans||[]).length}건 / 결과 ${(esp.results||[]).length}건`);
    (esp.plans||[]).forEach((x,i)=>lines.push(`  계획 ${i+1}. ${[x.type,x.program,x.period,x.institution,x.phone].filter(Boolean).join(' / ')}`));
    (esp.results||[]).forEach((x,i)=>lines.push(`  결과 ${i+1}. ${[x.registration,x.type,x.program,x.period,x.institution,x.phone].filter(Boolean).join(' / ')}`));
  }else{
    lines.push('취업지원 프로그램: 등록된 참여내용 없음');
  }
  if((d.supplements||[]).length){
    lines.push('보완요청: 있음');
    (d.supplements||[]).forEach((s,i)=>lines.push(`${i+1}. ${s.reason||''} / ${[s.startDate,s.endDate].filter(Boolean).join(' ~ ')}${s.completedDate?` / 완료 ${s.completedDate}`:''}`));
  }else lines.push('보완요청: 없음');
  lines.push('');
  const reviewText=validatedReviewResult(d);
  lines.push(`검토결과: ${reviewText}`);
  lines.push(`지급요청: ${[d.payment?.type,d.payment?.decision].filter(Boolean).join(' / ')||'미인식'}`);
  lines.push(`총요청금액: ${d.payment?.totalRequest?money(d.payment.totalRequest):'미인식'}`);
  lines.push(`기본금: ${d.payment?.basicAmount?money(d.payment.basicAmount):'미인식'}`);
  lines.push(`가족수당: ${d.payment?.familyAmount!==''?money(d.payment.familyAmount):'미인식'}`);
  return lines.join('\n');
}

async function ensureScript(tabId,frameId){
  try{await chrome.tabs.sendMessage(tabId,{type:'GUKCHWI_ALLOWANCE_PING'},{frameId});return true;}catch{}
  try{await chrome.scripting.executeScript({target:{tabId,frameIds:[frameId]},files:['allowance_content.js']});return true;}catch{return false;}
}

$('readBtn').addEventListener('click',async()=>{
  $('readBtn').disabled=true;$('copyBtn').disabled=true;$('sendCounselBtn').disabled=true;setStatus('현재 회차 화면을 확인하고 있습니다…');
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id) throw new Error('현재 탭을 찾지 못했습니다.');
    if(!isWork24Tab(tab.url||'')) throw new Error('Work24 구직촉진수당 등록 화면에서 실행해 주세요.');
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const scanOnce=async()=>{
      let allFrames=[];try{allFrames=await chrome.webNavigation.getAllFrames({tabId:tab.id})||[];}catch{}
      if(!allFrames.length) allFrames=[{frameId:0,url:tab.url}];

      // Work24는 화면 전환을 반복하면 WebDRM/about:blank/설치용 프레임이 수백 개 남을 수 있다.
      // 실제 Nexacro 본문 프레임만 우선 확인해 속도와 오인식을 동시에 줄인다.
      const mainNx=allFrames.filter(f=>/https:\/\/adm\.work24\.go\.kr\/nxpi\/index\.html/i.test(f.url||''))
        .sort((a,b)=>(b.frameId||0)-(a.frameId||0));
      let frames=mainNx.slice(0,10);
      if(!frames.length){
        frames=allFrames.filter(f=>
          isWork24Tab(f.url||'') &&
          !/(about:blank|\/static\/solution\/|\/install\.do|externalWebfilter\.do)/i.test(f.url||'')
        ).sort((a,b)=>(b.frameId||0)-(a.frameId||0)).slice(0,14);
      }
      if(!frames.length)frames=[{frameId:0,url:tab.url}];

      const results=[];
      for(const f of frames){
        if(!(await ensureScript(tab.id,f.frameId))){results.push({frameId:f.frameId,url:f.url,error:'스크립트 접근 불가'});continue;}
        try{const r=await chrome.tabs.sendMessage(tab.id,{type:'GUKCHWI_EXTRACT_ALLOWANCE'},{frameId:f.frameId});results.push({frameId:f.frameId,url:f.url,result:r});}
        catch(e){results.push({frameId:f.frameId,url:f.url,error:String(e?.message||e)});}
      }
      const candidates=results.filter(x=>x.result).sort((a,b)=>(b.result.found||0)-(a.result.found||0));
      const best=candidates.find(x=>x.result?.ok)||candidates[0]||null;
      return {frames,allFrameCount:allFrames.length,results,best};
    };
    const sig=x=>{
      const d=x?.best?.result?.data||x?.result?.data||{};
      const plans=(d.jobSearchPlans||[]).map(p=>[p.type||'',p.detail||'',p.period||'',p.frequency||'']);
      const acts=(d.activities||[]).map(a=>[a.activityType||'',a.activityName||'',a.activityContent||'',a.activityPeriod||'']);
      const eps=(d.employmentSupport?.plans||[]).map(p=>[p.type||'',p.program||'',p.period||'',p.institution||'']);
      const emp=d.employment||{};
      return JSON.stringify([d.round||'',d.supportStart||'',d.supportEnd||'',d.designatedDate||'',plans,acts,eps,[emp.reported||'',emp.company||'',emp.employmentType||'',emp.plannedDate||'',emp.weeklyHours||''],d.payment?.totalRequest||'']);
    };
    const quality=x=>{
      const b=x?.best; if(!b?.result)return -9999;
      const d=b.result.data||{}; let q=(b.result.ok?200:0)+(b.result.found||0)*8;
      const bad=/(고용보험|일용근로|사업장|업종코드|업종명|생년월일|주민등록|Frame Work|IAP이행보고|\[\d+차\])/;
      const emp=d.employment||{};
      if(emp.reported)q+=10;if(emp.company)q+=8;if(emp.weeklyHours)q+=8;
      if(emp.reported==='있음' && Number(emp.weeklyHours)>=30)q+=8;
      for(const p of d.jobSearchPlans||[]){
        q+=20;
        if(p.type)q+=8;if(p.frequency)q+=8;
        if(p.detail&&!bad.test(String(p.detail)))q+=15;else q-=60;
        const ds=String(p.period||'').match(/(?:19|20)\d{2}-\d{2}-\d{2}/g)||[];
        if(ds.length>=2){
          const a=Date.parse(ds[0]+'T00:00:00Z'),z=Date.parse(ds[1]+'T00:00:00Z');
          const days=(z-a)/86400000;
          if(days>=0&&days<=400)q+=15;else q-=100;
        }
      }
      return q;
    };

    // 내용까지 동일한 결과가 2번 확인돼야 확정한다. 건수만 같고 내용이 다른 오인식은 안정값으로 보지 않는다.
    const scans=[];
    setStatus('현재 회차를 1차 확인 중…');
    scans.push(await scanOnce());
    await sleep(300);
    setStatus('화면 안정화 후 2차 확인 중…');
    scans.push(await scanOnce());
    await sleep(420);
    setStatus('계획 내용까지 최종 확인 중…');
    scans.push(await scanOnce());

    const good=scans.filter(x=>x.best?.result?.ok);
    if(!good.length){} // 아래 기존 오류처리로 넘김
    const groups=new Map();
    for(const x of good){const k=sig(x);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
    let chosen=null;
    const ranked=[...groups.values()].sort((a,b)=>{
      if(b.length!==a.length)return b.length-a.length;
      return Math.max(...b.map(quality))-Math.max(...a.map(quality));
    });
    if(ranked.length){
      const g=ranked[0];
      chosen=g.sort((a,b)=>quality(b)-quality(a))[0];
    }
    if(!chosen){
      chosen=scans.slice().sort((a,b)=>quality(b)-quality(a))[0];
    }
    const frames=chosen.frames, results=chosen.results, best=chosen.best;
    if(!best?.result?.ok) throw new Error(`현재 선택 회차의 구직촉진수당 데이터를 충분히 찾지 못했습니다. 아래 진단 정보를 캡처해 주세요.`);

    // MAIN world에서 실제 Nexacro Grid/Dataset을 직접 조회한다.
    // content script 격리월드에서는 Nexacro 객체에 접근되지 않아 v0.4.3의 nexacroProbe가 null이었던 문제를 우회한다.
    let directProbe=null;
    try{
      const base=best.result.data||{};
      const probeExec=await chrome.scripting.executeScript({
        target:{tabId:tab.id,frameIds:[best.frameId]},
        world:'MAIN',
        func:probeNexacroPlanGridMAIN,
        args:[base.supportStart||'',base.supportEnd||'']
      });
      directProbe=probeExec?.[0]?.result||null;

      // 정확한 '구분/세부내용/참여기간/활동횟수' Grid를 찾았을 때만 대체.
      // 다른 Grid의 메뉴/담당자 정보는 절대 합치지 않는다.
      if(false && directProbe?.ok && Array.isArray(directProbe.plans) && directProbe.plans.length){
        const strictPlans=directProbe.plans.filter(p=>
          p?.type && p?.period &&
          !/(로그아웃|연장|결재|좋은일자리 북부센터|취업지원 공통|조회\/관리|겸직)/.test(String(p.detail||''))
        );
        if(strictPlans.length){
          best.result.data.jobSearchPlans=strictPlans;
        }
      }
    }catch(e){
      directProbe={ok:false,error:String(e?.message||e)};
    }

    if(best.result.debug)best.result.debug.directNexacroProbe=directProbe;
    $('debug').textContent=results.map(x=>{
      const d=x.result?.debug||{};
      return `frame ${x.frameId}\nURL: ${x.url||d.url||'-'}\n인식 점수: ${x.result?.found??0}/${x.result?.total??14}\n구촉 화면: ${d.titleOk?'예':'아니오'}\n활동 섹션: ${d.activitySection?'있음':'없음'} / 활동 ${d.activityCount??0}건\n보완 섹션: ${d.supplementSection?'있음':'없음'}\n상세 진단: ${JSON.stringify(d,null,2)}${x.error?`\n오류: ${x.error}`:''}`;
    }).join('\n\n');

    lastData=best.result.data;render(lastData);$('copyBtn').disabled=false;$('sendCounselBtn').disabled=false;
    setStatus(`✓ 현재 ${lastData.round?lastData.round+'회차 ':''}정보를 읽었습니다. (검증항목 ${best.result.found}/${best.result.total})`,'ok');
  }catch(e){lastData=null;$('result').classList.remove('show');$('result').innerHTML='';$('sendCounselBtn').disabled=true;setStatus(`읽기 실패: ${e.message||e}`,'err');}
  finally{$('readBtn').disabled=false;}
});
$('copyBtn').addEventListener('click',async()=>{if(!lastData)return;try{await navigator.clipboard.writeText(toText(lastData));setStatus('✓ 결과를 복사했습니다.','ok');}catch{setStatus('복사하지 못했습니다.','err');}});
$('clearBtn').addEventListener('click',()=>{lastData=null;$('result').classList.remove('show');$('result').innerHTML='';$('copyBtn').disabled=true;$('sendCounselBtn').disabled=true;$('debug').textContent='아직 실행하지 않았습니다.';setStatus('비웠습니다. 원하는 회차를 연 뒤 다시 읽어주세요.');});


$('sendCounselBtn').addEventListener('click', async()=>{
  if(!lastData) return;
  const payload={
    source:'Work24 구직촉진수당 현재 회차',
    bridgeVersion:2,
    sentAt:new Date().toISOString(),
    round:lastData.round||'',
    supportStart:lastData.supportStart||'',
    supportEnd:lastData.supportEnd||'',
    designatedDate:lastData.designatedDate||'',
    processStatus:lastData.processStatus||'',
    reviewResult:validatedReviewResult(lastData),
    totalRequest:lastData.payment?.totalRequest||'',
    data:lastData
  };
  const sendBtn=$('sendCounselBtn');
  const originalText=sendBtn?.textContent||'상담일지 통합본으로 보내기';
  try{
    if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='전달 중…';}
    await chrome.storage.local.set({[COUNSEL_ALLOWANCE_KEY]:payload});
    const saved=await chrome.storage.local.get(COUNSEL_ALLOWANCE_KEY);
    const actual=saved?.[COUNSEL_ALLOWANCE_KEY];
    if(!actual || actual.sentAt!==payload.sentAt) throw new Error('저장 확인 실패');
    try{await chrome.runtime.sendMessage({type:'CLG_COUNSEL_REFRESH_PENDING'});}catch(e){}
    if(sendBtn)sendBtn.textContent='✓ 전달 완료';
    setStatus(`✓ 상담일지 전달 완료\n${payload.round?payload.round+'회차 · ':''}${[payload.supportStart,payload.supportEnd].filter(Boolean).join(' ~ ')}\n통합본 미니바에 자료가 바로 표시됩니다.`, 'ok');
    setTimeout(()=>{if(sendBtn){sendBtn.disabled=false;sendBtn.textContent=originalText;}},1400);
  }catch(e){
    if(sendBtn){sendBtn.disabled=false;sendBtn.textContent='전달 실패 · 다시 시도';}
    setStatus(`전달 실패: ${e?.message||e}`, 'err');
    setTimeout(()=>{if(sendBtn)sendBtn.textContent=originalText;},2200);
  }

});
