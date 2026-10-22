(() => {
  if (window.__GUKCHWI_BASICINFO_V1412__) return;
  window.__GUKCHWI_BASICINFO_V1412__ = true;

  const norm = s => String(s ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const stripColon = s => norm(s).replace(/[：:]$/,'').trim();
  const cleanDate = v => {
    const m=norm(v).match(/(?:^|[^0-9])((?:19|20)\d{2})[-./]?(\d{2})[-./]?(\d{2})(?!\d)/);
    if(!m)return '';
    const y=+m[1],mo=+m[2],day=+m[3],d=new Date(Date.UTC(y,mo-1,day));
    return d.getUTCFullYear()===y&&d.getUTCMonth()===mo-1&&d.getUTCDate()===day?`${m[1]}-${m[2]}-${m[3]}`:'';
  };
  const cleanPhone = v => {
    const m = norm(v).match(/01[016789][ -]?\d{3,4}[ -]?\d{4}/);
    return m ? m[0].replace(/ /g,'-') : '';
  };

  function rootsDeep(){
    const roots=[document];
    const seen=new Set(roots);
    for(let i=0;i<roots.length;i++){
      const r=roots[i];
      let els=[];
      try{ els=[...r.querySelectorAll('*')]; }catch{}
      for(const el of els){
        if(el.shadowRoot && !seen.has(el.shadowRoot)){seen.add(el.shadowRoot);roots.push(el.shadowRoot);}
      }
    }
    return roots;
  }

  function allElements(){
    const out=[];
    for(const r of rootsDeep()){
      try{ out.push(...r.querySelectorAll('*')); }catch{}
    }
    return out;
  }

  function elValue(el){
    if(!el) return '';
    if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement){
      return norm(el.value);
    }
    const form = el.querySelector?.('input:not([type="hidden"]),textarea,select');
    if(form && norm(form.value)) return norm(form.value);
    return norm(el.innerText || el.textContent || '');
  }

  function leafTextElements(){
    const all=allElements();
    return all.filter(el => {
      const t=stripColon(el.textContent);
      if(!t || t.length>60) return false;
      let childText=0;
      for(const c of el.children||[]) if(norm(c.textContent)) childText++;
      return childText===0 || ['TH','TD','LABEL','SPAN','DIV','P','B','STRONG','EM','A','BUTTON','NOBR'].includes(el.tagName);
    });
  }

  function findLabel(labels){
    const wanted=labels.map(stripColon);
    const els=leafTextElements();
    let exact=els.filter(el => wanted.includes(stripColon(el.textContent)));
    if(exact.length) return exact.sort((a,b)=>norm(a.textContent).length-norm(b.textContent).length)[0];
    let starts=els.filter(el => wanted.some(w => stripColon(el.textContent).startsWith(w)));
    return starts.sort((a,b)=>norm(a.textContent).length-norm(b.textContent).length)[0] || null;
  }

  function valueFromRow(labelEl, labels){
    const wanted=labels.map(stripColon);
    const cell=labelEl?.closest?.('th,td');
    if(cell && cell.parentElement){
      const cells=[...cell.parentElement.children];
      const idx=cells.indexOf(cell);
      for(let i=idx+1;i<cells.length;i++){
        if(cells[i].tagName==='TH')break;
        const txt=elValue(cells[i]);
        if(txt && !wanted.some(w=>stripColon(txt)===w)) return txt;
      }
    }
    return '';
  }

  function valueFromNearby(labelEl, labels){
    if(!labelEl) return '';
    const wanted=labels.map(stripColon);
    if(labelEl.htmlFor){
      const t=document.getElementById(labelEl.htmlFor); const v=elValue(t); if(v) return v;
    }
    // Table fields must not borrow a value from a different header when their own cell is empty.
    if(labelEl.closest?.('th,td'))return valueFromRow(labelEl,labels);
    const row=valueFromRow(labelEl,labels); if(row) return row;

    let cur=labelEl;
    for(let depth=0;depth<4 && cur;depth++,cur=cur.parentElement){
      const kids=[...cur.children];
      const idx=kids.findIndex(k=>k===labelEl || k.contains?.(labelEl));
      if(idx>=0){
        for(let i=idx+1;i<kids.length;i++){
          const v=elValue(kids[i]);
          if(v && !wanted.some(w=>stripColon(v)===w)) return v;
        }
      }
      const controls=[...cur.querySelectorAll?.('input:not([type="hidden"]),textarea,select')||[]];
      for(const c of controls){const v=norm(c.value); if(v) return v;}
    }
    let sib=labelEl.nextElementSibling;
    while(sib){ const v=elValue(sib); if(v) return v; sib=sib.nextElementSibling; }
    return '';
  }

  function valueByLabel(labels){
    const el=findLabel(labels);
    return {value:valueFromNearby(el,labels), labelFound:!!el};
  }

  function inputValueNearLabel(labels){
    const lab=findLabel(labels); if(!lab) return '';
    let cur=lab;
    for(let d=0;d<5 && cur;d++,cur=cur.parentElement){
      const controls=[...cur.querySelectorAll?.('input:not([type="hidden"]),textarea,select')||[]];
      for(const c of controls){const v=norm(c.value); if(v) return v;}
    }
    return '';
  }

  function corpus(){
    const chunks=[];
    try{ chunks.push(document.body?.innerText||''); }catch{}
    try{ chunks.push(document.body?.textContent||''); }catch{}
    for(const el of allElements()){
      if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement){
        if(norm(el.value)) chunks.push(norm(el.value));
      }
    }
    return norm(chunks.join('\n'));
  }

  function parseNameBirth(raw, full){
    let s=norm(raw);
    if(!s){
      const m=full.match(/([가-힣]{2,5})\s*\(((?:19|20)\d{2}[-./]\d{2}[-./]\d{2})[^)]*\)/);
      if(m) s=`${m[1]}(${m[2]})`;
    }
    const date=s.match(/(?:19|20)\d{2}[-./]\d{2}[-./]\d{2}/)?.[0]?.replace(/[./]/g,'-')||'';
    const name=(s.match(/^\s*([가-힣]{2,5})\s*(?=\()/)?.[1]) || (s.split('(')[0]||'').trim();
    return {name,birthDate:date};
  }

  function parseJobCert(raw, full){
    const s=norm(raw) + ' ' + full;
    const no=s.match(/K\d{10,}/i)?.[0]||'';
    const exp=s.match(/마감예정일\s*[:：]?\s*((?:19|20)\d{2}[-./]\d{2}[-./]\d{2})/i)?.[1]?.replace(/[./]/g,'-')||'';
    return {jobCertNo:no,jobCertExpire:exp};
  }

  function regexAfter(full,label,patterns){
    const i=full.indexOf(label); if(i<0) return '';
    const tail=full.slice(i+label.length,i+label.length+300);
    for(const re of patterns){ const m=tail.match(re); if(m) return norm(m[1]||m[0]); }
    return '';
  }

  function extract(){
    const full=corpus();
    const nbRaw=valueByLabel(['이름(생년월일)','이름 (생년월일)']).value;
    const nb=parseNameBirth(nbRaw,full);

    const phoneRaw=valueByLabel(['휴대전화번호','휴대전화 번호','휴대폰번호','휴대폰 번호']).value || inputValueNearLabel(['휴대전화번호','휴대전화 번호']);
    const iapRaw=valueByLabel(['IAP번호','IAP 번호','IAP등록번호','IAP 등록번호']).value || inputValueNearLabel(['IAP번호','IAP 번호','IAP등록번호','IAP 등록번호']);
    const jobRaw=valueByLabel(['구직인증번호','구직인증 번호']).value;
    const job=parseJobCert(jobRaw,full);

    let type=valueByLabel(['유형구분','유형 구분']).value;
    if(!type) type=full.match(/[12]유형\s*\([^)]{1,80}\)/)?.[0]||'';
    let progress=valueByLabel(['진행상태','진행 상태']).value;
    // 다른 셀(예: 가구소득)을 잘못 집는 경우를 차단하고, '단계/진행/종료/중단/유예' 형태만 인정
    if(progress && !/(단계|진행|종료|중단|유예)/.test(progress)) progress='';
    if(!progress){
      progress=regexAfter(full,'진행상태',[
        /((?:IAP|초기상담|수급자격|취업지원|사후관리|취업|종료|중단|유예)[^,;]{0,28}?단계)/,
        /([가-힣A-Za-z0-9()]+(?:\s+[가-힣A-Za-z0-9()]+){0,3}\s*단계)/,
        /\b(진행|종료|중단|유예)\b/
      ]);
    }

    const rec=valueByLabel(['인정일','수급자격 인정일']).value;
    const assign=valueByLabel(['배정일']).value;
    const init=valueByLabel(['초기상담일','초기 상담일']).value;
    const noticeReceived=valueByLabel(['인정통지를 받은날','인정통지 받은날','인정통지일']).value;
    const iapDate=valueByLabel(['IAP 수립일','IAP수립일']).value;
    let center=valueByLabel(['관할센터/담당자','관할센터 / 담당자','관할센터/ 담당자']).value;

    // label 관계가 깨지는 특수 UI 대비 전체 문자열 보조 규칙
    const fallbackDate = label => cleanDate(regexAfter(full,label,[/^\s*[:：]?\s*((?:19|20)\d{2}[-./]?\d{2}[-./]?\d{2})(?!\d)/]));
    // 기본정보 행에는 센터 입력칸과 담당자 입력칸이 분리되어 있으므로 전체 문자열에서 '센터 / 담당자'를 우선 복원
    const centerMatch=full.match(/\((?:민간위탁|고용센터)\)\s*[^/]{1,80}?\s*\/\s*[가-힣]{2,5}/);
    if(centerMatch) center=centerMatch[0];

    const allInputEls=allElements().filter(el=>el instanceof HTMLInputElement);
    const allInputs=allInputEls.map(el=>norm(el.value)).filter(Boolean);
    const iapFallback=allInputs.find(v=>/^A\d{10,}$/i.test(v)) || full.match(/A\d{10,}/i)?.[0] || '';
    const phoneFallback=allInputs.map(cleanPhone).find(Boolean) || cleanPhone(full);

    // v0.1.4: 진행상태가 접힌 기본정보 영역의 input 값으로만 남는 경우 보조 탐색
    if(!progress){
      const stageCandidates=allInputs.filter(v=>v.length<=40 && /(단계|진행|종료|중단|유예)/.test(v));
      progress=stageCandidates.find(v=>/IAP\s*수립\s*단계/i.test(v))
        || stageCandidates.find(v=>/(초기상담|수급자격|취업지원|사후관리|취업)[^,;]{0,20}단계/.test(v))
        || stageCandidates.find(v=>/단계/.test(v))
        || stageCandidates.find(v=>/^(진행|종료|중단|유예)$/.test(v))
        || '';
    }

    // v0.1.4: 관할센터 입력값 바로 뒤쪽의 짧은 한글 이름을 담당자로 보조 결합
    if(center && !/\/\s*[가-힣]{2,5}/.test(center)){
      const centerIdx=allInputs.findIndex(v=>v===center || (v.includes('센터') && center.includes(v)) || (center.includes('센터') && v.includes('센터')));
      if(centerIdx>=0){
        const near=allInputs.slice(centerIdx+1, centerIdx+5);
        const counselor=near.find(v=>/^[가-힣]{2,5}$/.test(v));
        if(counselor) center=`${center} / ${counselor}`;
      }
    }

    const rawIapDate=cleanDate(iapDate)||fallbackDate('IAP 수립일');
    const progressNorm=norm(progress);

    // v0.1.5 업무 유효성 검증
    // 'IAP 수립단계'는 IAP가 완료된 상태가 아니므로 화면에 날짜가 미리 들어 있어도 확정일로 사용하지 않는다.
    // 원본값은 iapDateRaw에 보관하고, 실제 활용값 iapDate는 비워둔다.
    const isIapPending=/IAP\s*수립\s*단계/i.test(progressNorm);
    const needsIapConfirmation=isIapPending||!progressNorm||/(초기상담|수급자격).*단계/.test(progressNorm);
    const validatedIapDate=needsIapConfirmation ? '' : rawIapDate;

    const data={
      name: nb.name,
      birthDate: nb.birthDate,
      phone: cleanPhone(phoneRaw)||phoneFallback,
      iapNo: (norm(iapRaw).match(/A\d{10,}/i)?.[0]) || iapFallback,
      jobCertNo: job.jobCertNo,
      jobCertExpire: job.jobCertExpire,
      type: norm(type),
      progress: progressNorm,
      recognitionDate: cleanDate(rec)||fallbackDate('인정일'),
      assignmentDate: cleanDate(assign)||fallbackDate('배정일'),
      initialCounselDate: cleanDate(init)||fallbackDate('초기상담일'),
      noticeReceivedDate: cleanDate(noticeReceived)||fallbackDate('인정통지를 받은날'),
      iapDate: validatedIapDate,
      centerCounselor: norm(center),
      svcEnd: cleanDate(valueByLabel(['취업지원서비스 만료일','취업지원서비스 종료일']).value),
      visitStart: cleanDate(valueByLabel(['재진단 시작일','재진단 가능 시작일']).value),
      visitEnd: cleanDate(valueByLabel(['재진단 만료일','재진단 가능 종료일']).value),
      _validation: {
        iapDateRaw: rawIapDate,
        iapDateStatus: needsIapConfirmation && rawIapDate ? '미확정' : (rawIapDate ? '확정값' : '미인식'),
        iapDateReason: needsIapConfirmation && rawIapDate ? 'IAP 수립 완료 여부를 확인할 수 없어 화면 날짜를 확정 수립일로 사용하지 않음' : ''
      }
    };

    // 표시 대상 13개 항목은 '값을 읽었는지'를 기준으로 계산한다.
    // IAP 수립일이 업무상 미확정이어도 원본 날짜를 읽었으면 인식 성공으로 본다.
    const visibleValues=[data.name,data.birthDate,data.phone,data.iapNo,data.jobCertNo,data.jobCertExpire,data.type,data.progress,data.recognitionDate,data.assignmentDate,data.initialCounselDate,data.noticeReceivedDate,data.svcEnd,data.visitStart,data.visitEnd,(data.iapDate||data._validation.iapDateRaw),data.centerCounselor];
    const found=visibleValues.filter(Boolean).length;
    return {
      ok: found>0,
      data,
      found,
      debug:{
        url:location.href,
        title:document.title,
        hasBasicText:full.includes('수급자 기본정보'),
        bodyChars:(document.body?.textContent||'').length,
        inputs:allInputs.length,
        sample:full.slice(0,550)
      }
    };
  }

  // Read on an explicit save/inspection event only; no background screen polling.
  window.__clgCounselSaveReadBasic=()=>{const d=extract().data;return {iapNo:d.iapNo,name:d.name,progress:d.progress,iapDate:d.iapDate};};

  chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
    if(msg?.type==='GUKCHWI_EXTRACT_BASICINFO'){
      try{ sendResponse(extract()); }catch(e){ sendResponse({ok:false,data:{},found:0,error:String(e),debug:{url:location.href,title:document.title}}); }
    }
  });
})();
