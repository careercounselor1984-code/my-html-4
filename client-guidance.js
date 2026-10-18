/* IAP 기반 내담자 안내: 기존 입력/상담일지 생성 코드는 변경하지 않습니다. */
(function installClientGuidance(){
  'use strict';
  const VERSION='clg-client-guidance-20261018-v1';
  const COMMON='clg_iap_common_profiles_v1';
  const PARTICIPANTS='iap_participant_records_v1';
  const PENDING='clg_client_guidance_pending_v1';
  const by=(doc,id)=>doc.getElementById(id);
  const loadJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(e){return fallback}};
  const pad=n=>String(n).padStart(2,'0');
  const parse=s=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return null;
    const [y,m,d]=s.split('-').map(Number),dt=new Date(y,m-1,d,12);
    return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?dt:null;
  };
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const nice=s=>{
    const d=parse(s);
    return d?`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}(${['일','월','화','수','목','금','토'][d.getDay()]})`:'미확인';
  };
  const addMonths=(d,n)=>{
    const x=new Date(d),day=x.getDate();
    x.setDate(1);x.setMonth(x.getMonth()+n);
    x.setDate(Math.min(day,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));
    return x;
  };
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const overlaps=(r,start,end)=>{
    const a=parse(r.start),b=parse(r.end);
    return !!((a||b)&&(a||b)<=end&&(b||a)>=start);
  };
  function savedPlan(regNo){
    const c=loadJson(COMMON,{})[regNo]||{};
    const p=loadJson(PARTICIPANTS,{records:{}}).records?.[regNo]||{};
    if(!p.state&&!c.iapSavedAt)return null;
    const st=p.state||{};
    const preferState=!!(p.updatedAt&&(!c.iapSavedAt||p.updatedAt>c.iapSavedAt));
    const jobs=preferState?(st.jobRows||c.iapJobRows||[]):(c.iapJobRows||st.jobRows||[]);
    const acts=preferState?(st.actRows||c.iapActRows||[]):(c.iapActRows||st.actRows||[]);
    return {
      iapDate:c.iapDate||st.fields?.['#iapDate']||'',
      recognitionDate:c.recognitionDate||st.fields?.['#recognitionDate']||'',
      desired:c.iapDesiredJob||st.fields?.['#wishJob']||'',
      type:st.fields?.['name:userType:2']===true?'2':'1',
      jobs:Array.isArray(jobs)?jobs:[],
      acts:Array.isArray(acts)?acts:[]
    };
  }
  function activityHelp(kind,name,detail){
    const t=[kind,name,detail].filter(Boolean).join(' ');
    if(/직업훈련|훈련|학원|원격/.test(t))return '훈련: 계획된 과정에 참여하고 출석·수료내역을 확인해 주세요. 집체훈련은 지급주기 출석률, 원격훈련은 수료 여부 등 인정기준이 다르므로 담당 상담사에게 확인하세요.';
    if(/일경험/.test(t))return '일경험: 예정 일정에 실제 참여하고 출석·참여확인자료를 준비하세요.';
    if(/면접/.test(t))return '면접: 실제 면접에 참석하고 면접안내 및 참석사실을 확인할 수 있는 자료를 준비하세요.';
    if(/입사지원|이력서.*제출|구직활동|취업알선/.test(t))return '입사지원: 희망직무의 모집 중인 채용공고에 실제로 지원하세요. 지원완료 내역에서 회사명·지원일·지원완료 여부를 확인하고 증빙을 준비하세요. 공고 캡처만으로는 지원완료 증빙이 되지 않습니다.';
    if(/집단상담|취업특강|심리안정|상담|컨설팅|클리닉/.test(t))return '프로그램·상담: 계획된 일정에 참여하고 수료·참여 확인방법을 담당 상담사에게 확인하세요.';
    if(/자격증|시험/.test(t))return '자격시험: 계획된 시험에 실제 응시하고 응시확인 등 객관적인 자료를 준비하세요.';
    if(/창업|시장조사|자영업/.test(t))return '창업준비: 계획된 준비활동을 실제로 수행하고 시장조사서·계약서 등 사실을 확인할 수 있는 자료를 준비하세요.';
    return '해당 활동: IAP에 계획된 내용과 방법을 확인하여 실제 이행하고, 활동 사실을 입증할 수 있는 자료를 준비하세요.';
  }
  function build(doc){
    const regNo=by(doc,'clgSudangIapRegNo')?.value.trim()||'';
    if(!regNo)return {error:'먼저 위쪽 IAP 등록번호를 입력해 주세요.'};
    const plan=savedPlan(regNo);
    if(!plan)return {error:'이 등록번호로 저장된 IAP가 없습니다. IAP 수립상담에서 먼저 저장해 주세요.'};
    if(plan.type==='2')return {error:'Ⅱ유형 참여자는 구직촉진수당 대상 회차 안내를 생성하지 않습니다.'};
    if(!parse(plan.iapDate))return {error:'저장된 IAP 수립일을 확인할 수 없습니다. IAP를 다시 확인해 주세요.'};
    const round=Number(by(doc,'round')?.value||0);
    if(!(round>=1&&round<=6))return {error:'지원 회차를 확인해 주세요.'};
    const date=parse(plan.iapDate);
    let stdStart,stdEnd;
    if(round===1){
      stdStart=parse(plan.recognitionDate);
      stdEnd=date;
      if(!stdStart)return {error:'1회차 기간 확인을 위해 저장된 인정통지일이 필요합니다.'};
    }else{
      stdStart=addDays(addMonths(date,round-2),1);
      stdEnd=addMonths(date,round-1);
    }
    const fieldStart=by(doc,'startDate')?.value||'';
    const fieldEnd=by(doc,'endDate')?.value||'';
    const fieldDesign=by(doc,'designationDate')?.value||'';
    const manual=!!(parse(fieldStart)&&parse(fieldEnd)&&parse(fieldDesign));
    const start=manual?parse(fieldStart):stdStart;
    const end=manual?parse(fieldEnd):stdEnd;
    const designation=manual?fieldDesign:iso(stdEnd);
    if(start>end)return {error:'입력된 지급주기의 시작일이 종료일보다 늦습니다.'};
    const warnings=[];
    if(!manual)warnings.push('구촉수당 상담의 시작일·종료일·지정일이 모두 입력되지 않아 IAP 수립일 기준 표준기간을 표시했습니다. 지정일 변경 여부를 확인하세요.');
    else if(iso(start)!==iso(stdStart)||iso(end)!==iso(stdEnd)||designation!==iso(stdEnd))warnings.push('구촉수당 입력일정이 IAP 수립일 기준 표준기간과 다릅니다. 변경된 지급주기·지정일을 확인하세요.');
    let rows=[];
    if(round>=2){
      plan.jobs.filter(r=>{
        const explicit=String(r.jobCycle||'').trim();
        return explicit?/^\d+$/.test(explicit)&&Number(explicit)===round:overlaps(r,start,end);
      }).forEach(r=>{
        const label=[r.kind&&r.kind!=='선택'?r.kind:'취업지원 프로그램',r.name].filter(Boolean).join(' · ');
        rows.push({label,count:r.creditBand==='ge10'?'2회 인정 예정':r.creditBand==='lt10'?'1회 인정 예정':'인정횟수 확인 필요',kind:r.kind||'',name:r.name||'',detail:''});
        if(/직업훈련|일경험/.test(label)&&!['ge10','lt10'].includes(r.creditBand))warnings.push('훈련·일경험의 회차별 예정일수와 인정횟수를 확인하세요.');
      });
      plan.acts.filter(r=>{
        const explicit=String(r.activityCycle||'').trim();
        return explicit?/^\d+$/.test(explicit)&&Number(explicit)===round:overlaps(r,start,end);
      }).forEach(r=>{
        const label=[r.kind&&r.kind!=='선택'?r.kind:'구직활동',r.detail].filter(Boolean).join(' · ');
        rows.push({label,count:r.cnt?`${r.cnt}회 계획`:'횟수 확인 필요',kind:r.kind||'',name:'',detail:r.detail||''});
        if(!r.detail||!r.cnt)warnings.push('구직활동 계획의 세부내용 또는 횟수가 비어 있습니다.');
      });
      if(!rows.length)return {error:`${round}회차에 해당하는 저장된 IAP 활동이 없습니다. 임의의 구직활동을 생성하지 않습니다. IAP 계획을 확인해 주세요.`};
    }
    const lines=[
      `[국민취업지원제도 ${round}회차 안내]`,
      '안녕하세요. 이번 회차 구직활동 및 구직촉진수당 신청을 안내드립니다.',
      '',
      `■ 활동기간: ${nice(iso(start))} ~ ${nice(iso(end))}`,
      `■ 구촉수당 지정일: ${nice(designation)}`,
      ''
    ];
    if(round===1){
      lines.push('■ 이번 회차 확인사항','- IAP 수립상담 및 취업활동계획 수립 완료','- 1회차 구직촉진수당 신청절차 확인');
    }else{
      lines.push('■ 이번 회차에 해야 할 활동');
      rows.forEach((r,i)=>lines.push(`${i+1}. ${r.label} (${r.count})`));
      lines.push('','계획된 활동을 실제로 이행하고 필요한 증빙자료를 준비해 주세요.');
    }
    lines.push('','■ 신청 전 꼭 확인하세요',
      '- 아르바이트·근로·사업·프로그램 참여 등으로 신고 대상 소득이 발생했다면 소득 내용·금액·발생일을 사실대로 신고해 주세요.',
      '- 취업하거나 창업한 경우에도 담당 상담사에게 바로 알려주세요.',
      '- 지정일에는 고용24에서 구직활동 이행내용과 필요한 증빙을 등록하고 구촉수당 지급신청서를 최종 제출했는지 확인해 주세요.',
      '- 지정일이나 활동계획을 변경해야 한다면 반드시 미리 담당 상담사와 협의해 주세요.',
      '',
      '※ 신청서 저장만으로 제출이 완료된 것은 아닙니다. 제출예약을 이용한 경우에도 실제 제출 여부를 확인해 주세요.');
    const extra=[];
    const dedupe=new Set();
    rows.forEach(r=>{
      const help=activityHelp(r.kind,r.name,r.detail);
      if(!dedupe.has(help)){dedupe.add(help);extra.push('- '+help);}
    });
    if(round===1)extra.push('- 1회차는 IAP 수립 완료를 기준으로 하므로 이후 회차의 입사지원 계획과 구분해 주세요.');
    extra.push('- 고용24 신청 메뉴에서 해당 회차를 확인하고, 이행내역·증빙·소득 신고를 검토한 뒤 지정일에 최종 제출하세요.');
    return {
      short:lines.join('\n'),
      detailed:lines.join('\n')+'\n\n■ 구체적인 활동·증빙 준비방법\n'+extra.join('\n'),
      warnings,
      source:manual?'구촉수당 상담 화면의 기간·지정일 입력값을 사용했습니다.':'저장된 IAP 수립일로 표준기간을 계산했습니다.',
      count:rows.length
    };
  }
  function mountSudang(doc){
    if(by(doc,'clgClientGuidance'))return;
    const ref=by(doc,'clgSudangIapBox');
    if(!ref)return;
    const style=doc.createElement('style');
    style.textContent='.clg-guide{margin:0 0 14px;border:1px solid #c5ded5;border-radius:11px;background:#f8fcfa;color:#244536}.clg-guide summary{padding:11px 13px;cursor:pointer;font-size:13px;font-weight:800;list-style:none}.clg-guide summary::-webkit-details-marker{display:none}.clg-guide summary span{font-size:11px;font-weight:500;color:#64748b;margin-left:8px}.clg-guide-inner{border-top:1px solid #d6e7dd;padding:12px 13px}.clg-guide-note{font-size:12px;line-height:1.6;margin:0 0 8px;color:#426254;white-space:pre-wrap}.clg-guide textarea{box-sizing:border-box;width:100%;min-height:185px;resize:vertical;background:#fff;border:1px solid #cfddd7;border-radius:8px;padding:10px;font:12px/1.65 "Malgun Gothic",sans-serif}.clg-guide-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:9px}.clg-guide button{padding:8px 12px;background:#047857;color:#fff;border:0;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer}.clg-guide button:disabled{opacity:.45;cursor:not-allowed}.clg-guide .clg-guide-secondary{background:#fff;color:#166534;border:1px solid #accdbb}.clg-guide .clg-guide-confirm{display:flex;align-items:center;gap:6px;font-size:12px;color:#334155;flex-basis:100%}';
    doc.head.appendChild(style);
    const panel=doc.createElement('details');
    panel.id='clgClientGuidance';
    panel.className='clg-guide';
    panel.innerHTML='<summary>✉️ 회차별 내담자 안내 <span>IAP 기반 · 카카오톡 복사</span></summary><div class="clg-guide-inner"><p class="clg-guide-note" id="clgGuideStatus">회차와 IAP 계획을 확인하여 안내문을 만듭니다.</p><textarea id="clgGuidePreview" readonly aria-label="내담자 안내문 미리보기"></textarea><div class="clg-guide-actions"><label class="clg-guide-confirm"><input type="checkbox" id="clgGuideVerify"> 실제 IAP·지급주기·지정일을 확인했습니다.</label><button type="button" class="clg-guide-secondary" id="clgGuideRefresh">안내문 갱신</button><button type="button" id="clgGuideCopy" disabled>안내문 복사</button><button type="button" id="clgGuideCopyDetail" disabled>방법까지 복사</button></div></div>';
    ref.insertAdjacentElement('afterend',panel);
    const preview=by(doc,'clgGuidePreview'),status=by(doc,'clgGuideStatus'),verify=by(doc,'clgGuideVerify');
    const copyButton=by(doc,'clgGuideCopy'),detailButton=by(doc,'clgGuideCopyDetail');
    let generated=null;
    function render(){
      generated=build(doc);verify.checked=false;
      const ok=!!generated&&!generated.error;
      copyButton.disabled=detailButton.disabled=true;
      preview.value=ok?generated.short:'';
      status.textContent=ok
        ? generated.source+(generated.warnings.length?'\n확인사항: '+[...new Set(generated.warnings)].join(' / '):'\n안내 전 실제 계획과 기간을 확인하세요.')
        : generated?.error||'IAP 정보를 불러오지 못했습니다.';
    }
    verify.addEventListener('change',()=>{const ok=!!generated&&!generated.error&&verify.checked;copyButton.disabled=detailButton.disabled=!ok});
    by(doc,'clgGuideRefresh').addEventListener('click',render);
    panel.addEventListener('toggle',()=>{if(panel.open)render()});
    function copy(detailed){
      if(!generated||generated.error||!verify.checked)return;
      const content=detailed?generated.detailed:generated.short;
      function fallback(){
        preview.value=content;preview.focus();preview.select();
        const ok=doc.execCommand('copy');
        preview.value=generated.short;
        status.textContent=ok?'복사했습니다. 내담자에게 보내기 전에 마지막으로 확인하세요.':'자동복사에 실패했습니다. 안내문을 직접 선택하여 복사해 주세요.';
      }
      try{
        if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(content).then(()=>{status.textContent='복사했습니다. 내담자에게 보내기 전에 마지막으로 확인하세요.'}).catch(fallback);
        else fallback();
      }catch(e){fallback()}
    }
    copyButton.addEventListener('click',()=>copy(false));
    detailButton.addEventListener('click',()=>copy(true));
    ['round','clgSudangIapRegNo','startDate','endDate','designationDate'].forEach(id=>{
      const el=by(doc,id);if(!el)return;
      el.addEventListener('change',()=>{if(panel.open)render()});
    });
    try{
      const pending=JSON.parse(sessionStorage.getItem(PENDING)||'null');
      if(pending?.regNo&&Date.now()-pending.time<120000){
        sessionStorage.removeItem(PENDING);
        by(doc,'clgSudangIapRegNo').value=pending.regNo;
        by(doc,'clgSudangIapLoad')?.click();
        panel.open=true;render();
        panel.scrollIntoView({block:'nearest',behavior:'smooth'});
      }
    }catch(e){}
  }
  function mountIap(doc){
    if(by(doc,'clgIapClientGuidanceJump'))return;
    const anchor=by(doc,'iapSendWork24Btn');
    if(!anchor)return;
    const button=doc.createElement('button');
    button.type='button';
    button.id='clgIapClientGuidanceJump';
    button.className=anchor.className;
    button.textContent='✉ 내담자 안내';
    button.title='IAP 저장자료로 구촉수당 회차별 안내문 만들기';
    anchor.insertAdjacentElement('afterend',button);
    button.addEventListener('click',()=>{
      const regNo=by(doc,'iapRegNo')?.value.trim()||'';
      if(!regNo){alert('IAP 등록번호를 입력하고 계획을 저장한 뒤 이용해 주세요.');return;}
      if(doc.querySelector('input[name="userType"]:checked')?.value==='2'){alert('구직촉진수당 회차별 안내는 Ⅰ유형 전용입니다.');return;}
      if(!savedPlan(regNo)){alert('저장된 IAP가 없습니다. IAP 저장 버튼으로 먼저 저장해 주세요.');return;}
      try{sessionStorage.setItem(PENDING,JSON.stringify({regNo,time:Date.now()}))}catch(e){}
      try{
        if(typeof window.loadPage==='function')window.loadPage('p06');
        else alert('구직촉진수당 화면에서 같은 등록번호로 내담자 안내를 열어주세요.');
      }catch(e){alert('구직촉진수당 화면으로 이동하지 못했습니다. 왼쪽 메뉴에서 열어주세요.');}
    });
  }
  function scan(){
    const seen=new Set();
    const visit=(doc,depth)=>{
      if(!doc||seen.has(doc)||depth>3)return;
      seen.add(doc);
      try{mountIap(doc);mountSudang(doc)}catch(e){console.warn('[내담자 안내]',e)}
      try{doc.querySelectorAll('iframe').forEach(frame=>{
        if(!frame.dataset.clgGuideHook){
          frame.dataset.clgGuideHook='1';
          frame.addEventListener('load',()=>setTimeout(scan,65));
        }
        try{if(frame.contentDocument)visit(frame.contentDocument,depth+1)}catch(e){}
      })}catch(e){}
    };
    visit(document,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});
  else scan();
  window.addEventListener('clg-page-change',()=>setTimeout(scan,80));
  window.addEventListener('clg-tab-switch',()=>setTimeout(scan,80));
  window.addEventListener('clg-tab-frame-load',()=>setTimeout(scan,80));
  setTimeout(scan,400);
  setTimeout(scan,1500);
  setInterval(scan,3000);
})();
