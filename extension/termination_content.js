
(() => {
  if (window.__GUKCHWI_EMP_TERM_V018__) return;
  window.__GUKCHWI_EMP_TERM_V018__ = true;

  const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const compact=s=>norm(s).replace(/\s/g,'');
  const cleanDate=v=>{
    const m=norm(v).match(/(?:19|20)\d{2}[-./]\d{2}[-./]\d{2}/);
    return m?m[0].replace(/[./]/g,'-'):'';
  };
  const cleanMoney=v=>{
    const m=norm(v).match(/-?\d[\d,]*/);
    return m?m[0]:'';
  };
  const cleanBiz=v=>{
    const s=norm(v);
    const m=s.match(/\d{3}-\d{2}-\d{5}(?:-\d)?|\d{10,11}/);
    return m?m[0]:'';
  };
  const cleanPhone=v=>{
    const m=norm(v).match(/0\d{1,2}-\d{3,4}-\d{4}/);
    return m?m[0]:'';
  };

  function rootsDeep(){
    const roots=[document], seen=new Set(roots);
    for(let i=0;i<roots.length;i++){
      let els=[]; try{els=[...roots[i].querySelectorAll('*')];}catch{}
      for(const el of els){
        if(el.shadowRoot && !seen.has(el.shadowRoot)){
          seen.add(el.shadowRoot); roots.push(el.shadowRoot);
        }
      }
    }
    return roots;
  }
  function allElements(){
    const out=[];
    for(const r of rootsDeep()){try{out.push(...r.querySelectorAll('*'));}catch{}}
    return out;
  }
  function isHidden(el){
    if(!el)return true;
    try{
      const cs=getComputedStyle(el), r=el.getBoundingClientRect();
      return cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||r.width<1||r.height<1;
    }catch{return false;}
  }
  function ctlValue(c){
    if(!c)return '';
    if(c instanceof HTMLSelectElement)return norm(c.selectedOptions?.[0]?.textContent||c.value);
    if(c instanceof HTMLTextAreaElement)return norm(c.value);
    if(c instanceof HTMLInputElement){
      if(['hidden','button','submit','reset','file'].includes(c.type))return '';
      if(['radio','checkbox'].includes(c.type)){
        if(!c.checked)return '';
        let t='';
        if(c.id){try{t=norm(document.querySelector(`label[for="${CSS.escape(c.id)}"]`)?.textContent||'');}catch{}}
        if(!t)t=norm(c.closest('label')?.textContent||c.parentElement?.textContent||c.value);
        return t;
      }
      return norm(c.value);
    }
    return '';
  }
  function textAtoms(){
    const out=[], seen=new Set();
    for(const el of allElements()){
      if(isHidden(el)||/^(SCRIPT|STYLE|OPTION)$/.test(el.tagName))continue;
      const tx=norm(el.innerText||el.textContent||'');
      if(!tx||tx.length>300)continue;
      let childSame=false;
      for(const ch of el.children||[]){
        const ct=norm(ch.innerText||ch.textContent||'');
        if(ct&&ct===tx){childSame=true;break;}
      }
      if(childSame)continue;
      const r=el.getBoundingClientRect();
      const key=`T|${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}|${Math.round(r.height)}|${tx}`;
      if(seen.has(key))continue;seen.add(key);
      out.push({text:tx,el,rect:r,type:'text'});
    }
    for(const rt of rootsDeep()){
      let cs=[];try{cs=[...rt.querySelectorAll('input,select,textarea')];}catch{}
      for(const c of cs){
        if(isHidden(c))continue;
        const v=ctlValue(c); if(!v)continue;
        const r=c.getBoundingClientRect();
        const key=`C|${Math.round(r.left)}|${Math.round(r.top)}|${v}`;
        if(seen.has(key))continue;seen.add(key);
        out.push({text:v,el:c,rect:r,type:'control'});
      }
    }
    return out;
  }
  function findAtoms(atoms,text,mode='exact'){
    const c=compact(text);
    return atoms.filter(a=>mode==='exact'?compact(a.text)===c:compact(a.text).includes(c));
  }
  const labelKey=s=>compact(s).replace(/^[^0-9A-Za-z가-힣]+/,'').replace(/[:：]+$/,'');
  function findLabelAtoms(atoms,text){
    const k=labelKey(text);
    return atoms.filter(a=>{
      const ak=labelKey(a.text);
      return ak===k || ak.startsWith(k+':') || ak.startsWith(k+'：');
    });
  }
  function inBounds(a,b){
    if(!b)return true;
    const cx=(a.rect.left+a.rect.right)/2;
    const left=(b.left??-Infinity), right=(b.right??Infinity);
    return a.rect.top>=b.top-2&&a.rect.top<b.bottom-2&&cx>=left&&cx<right;
  }
  function bestHeading(atoms,title){
    const xs=findAtoms(atoms,title,'includes').filter(a=>a.text.length<160);
    if(!xs.length)return null;
    return xs.sort((a,b)=>(a.rect.width-b.rect.width)||(a.rect.top-b.rect.top))[0];
  }
  function nextHeadingY(atoms,afterY,titles){
    const ys=[];
    for(const t of titles)for(const a of findAtoms(atoms,t,'includes'))if(a.rect.top>afterY+5)ys.push(a.rect.top);
    return ys.length?Math.min(...ys):Infinity;
  }
  function sectionBounds(atoms,title,nextTitles=[]){
    const h=bestHeading(atoms,title); if(!h)return null;
    return {top:h.rect.top,bottom:nextHeadingY(atoms,h.rect.top,nextTitles),heading:h};
  }
  function sameRowCandidates(atoms,labelText,bounds){
    const labels=findLabelAtoms(atoms,labelText).filter(a=>!bounds||inBounds(a,bounds));
    for(const l of labels){
      const cy=(l.rect.top+l.rect.bottom)/2;
      const xs=atoms.filter(a=>
        a!==l&&(!bounds||inBounds(a,bounds))&&
        a.rect.left>=l.rect.right-24&&
        Math.abs(((a.rect.top+a.rect.bottom)/2)-cy)<=28&&
        a.text.length<220
      ).sort((a,b)=>{
        const ac=a.type==='control'?0:1, bc=b.type==='control'?0:1;
        if(ac!==bc)return ac-bc;
        const ay=Math.abs(((a.rect.top+a.rect.bottom)/2)-cy);
        const by=Math.abs(((b.rect.top+b.rect.bottom)/2)-cy);
        if(ay!==by)return ay-by;
        return a.rect.left-b.rect.left;
      });
      if(xs.length)return xs;
    }
    return [];
  }
  function sameRowValue(atoms,label,bounds,validator){
    for(const a of sameRowCandidates(atoms,label,bounds)){
      const v=norm(a.text);
      if(v&&(!validator||validator(v)))return v;
    }
    return '';
  }
  function sameRowValues(atoms,label,bounds,validator,max=4){
    const out=[];
    for(const a of sameRowCandidates(atoms,label,bounds)){
      const v=norm(a.text);
      if(v&&(!validator||validator(v))&&!out.includes(v))out.push(v);
      if(out.length>=max)break;
    }
    return out;
  }
  function checkedChoice(choices,atoms,bounds){
    for(const el of allElements()){
      if(isHidden(el)||!(el instanceof HTMLInputElement)||!['radio','checkbox'].includes(el.type)||!el.checked)continue;
      const r=el.getBoundingClientRect();
      if(bounds&&(r.top<bounds.top||r.top>=bounds.bottom))continue;
      const v=ctlValue(el);
      const hit=choices.find(x=>compact(v).includes(compact(x)));
      if(hit)return hit;
    }
    let best={v:'',score:-1};
    for(const ch of choices){
      for(const a of findAtoms(atoms,ch,'exact').filter(a=>!bounds||inBounds(a,bounds))){
        let score=0;
        for(const n of [a.el,a.el.parentElement]){
          if(!n)continue;
          const cl=norm(n.className);
          if(/active|selected|on|checked|current/i.test(cl))score+=5;
          try{
            const cs=getComputedStyle(n);
            if(+cs.fontWeight>=700)score++;
            const bg=cs.backgroundColor||'';
            if(bg&&!/transparent|rgba?\(255, 255, 255/.test(bg))score+=2;
          }catch{}
        }
        if(score>best.score)best={v:ch,score};
      }
    }
    return best.score>=3?best.v:'';
  }
  function bodyRegion(starts,ends,maxLen=12000){
    const raw=String(document.body?.innerText||'');
    const chunks=[];
    for(const s of starts){
      let p=0;
      while((p=raw.indexOf(s,p))>=0){
        let e=Math.min(raw.length,p+maxLen);
        for(const x of ends){
          const ep=raw.indexOf(x,p+s.length);
          if(ep>=0&&ep<e)e=ep;
        }
        chunks.push(raw.slice(p,e));p+=s.length;
      }
    }
    chunks.sort((a,b)=>b.length-a.length);
    return chunks[0]||'';
  }

  function normalizeDigits(v){return String(v||'').replace(/\D/g,'');}
  function parseInsuranceRows(raw){
    const rows=[];
    const re=/\d{3}-\d{2}-\d{5}-\d/g;
    const hits=[...raw.matchAll(re)];
    for(let i=0;i<hits.length;i++){
      const st=hits[i].index??0;
      const en=i+1<hits.length?(hits[i+1].index??raw.length):raw.length;
      const chunk=norm(raw.slice(st,en));
      const managementNo=hits[i][0];
      const dates=[...chunk.matchAll(/(?:19|20)\d{2}[./-]\d{2}[./-]\d{2}/g)].map(x=>cleanDate(x[0]));
      if(!dates.length)continue;
      const firstDateRaw=(chunk.match(/(?:19|20)\d{2}[./-]\d{2}[./-]\d{2}/)||[])[0]||'';
      const prefix=firstDateRaw?norm(chunk.slice(managementNo.length,chunk.indexOf(firstDateRaw))):'';
      const parts=prefix.split(/\s+/).filter(Boolean);
      let representative='';
      if(parts.length>=2 && /^[가-힣]{2,5}$/.test(parts[parts.length-1])) representative=parts.pop();
      const company=norm(parts.join(' '));
      const hw=chunk.match(/\b(\d{1,3})\s+(우선지원대상기업|대규모기업)\s+([\d,]{4,})/);
      let industryCode='',industryName='';
      if(hw){
        const tail=norm(chunk.slice((hw.index??0)+hw[0].length));
        const im=tail.match(/\b(\d{5})\s+(.+?)(?=\s+\d+\s*$|$)/);
        if(im){industryCode=im[1];industryName=norm(im[2].replace(/\[[^\]]+\]\s*$/,''));}
      }
      rows.push({
        managementNo,company,representative,
        acquisitionDate:dates[0]||'',lossDate:dates[1]||'',
        weeklyHours:hw?hw[1]:'',companyScale:hw?hw[2]:'',wage:hw?hw[3]:'',
        industryCode,industryName,raw:chunk.slice(0,1800)
      });
    }
    return rows;
  }
  function chooseInsuranceRow(rows,current={}){
    if(!rows.length)return null;
    const cCompany=compact(current.company||'');
    const cMgmt=normalizeDigits(current.insuranceManagementNo||'');
    const cDate=cleanDate(current.employmentDate||'');
    const cHours=String(current.weeklyHours||'').trim();
    const cWage=String(current.wage||'').replace(/,/g,'');
    let best=null,bestScore=-1;
    for(const r of rows){
      let score=0;
      if(cMgmt && normalizeDigits(r.managementNo)===cMgmt)score+=120;
      if(cCompany && compact(r.company)===cCompany)score+=100;
      else if(cCompany && (compact(r.company).includes(cCompany)||cCompany.includes(compact(r.company))))score+=70;
      if(cDate && r.acquisitionDate===cDate)score+=80;
      if(cHours && String(r.weeklyHours)===cHours)score+=20;
      if(cWage && String(r.wage||'').replace(/,/g,'')===cWage)score+=20;
      if(score>bestScore){bestScore=score;best=r;}
    }
    return best||rows[0];
  }
  function extractInsuranceHistory(current={}){
    const raw=norm(bodyRegion(
      ['고용보험 가입이력'],
      ['고용보험 일용근로이력','산재보험 가입정보','구직활동','훈련'],
      10000
    ));
    if(!raw)return {found:false,raw:'',rows:[]};
    const rows=parseInsuranceRows(raw);
    const chosen=chooseInsuranceRow(rows,current);
    if(chosen){
      return {
        found:true,
        managementNo:chosen.managementNo||'', company:chosen.company||'',
        acquisitionDate:chosen.acquisitionDate||'', lossDate:chosen.lossDate||'',
        weeklyHours:chosen.weeklyHours||'', wage:chosen.wage||'',
        industryCode:chosen.industryCode||'', industryName:chosen.industryName||'',
        representative:chosen.representative||'', companyScale:chosen.companyScale||'',
        rows, raw:raw.slice(0,3500)
      };
    }
    return {found:false,managementNo:'',company:'',acquisitionDate:'',weeklyHours:'',wage:'',industryCode:'',industryName:'',rows,raw:raw.slice(0,3500)};
  }

  function extractTermination(){
    const body=norm(document.body?.innerText||'');
    const titleOk=/종료신청조회/.test(body)||/종료신청조회/.test(document.title||'');
    const atoms=textAtoms();

    const summary=sectionBounds(atoms,'취업지원 종료신청 내역',['취업지원 종료신청 상세']);
    const detailHeading=bestHeading(atoms,'취업지원 종료신청 상세');
    const rightPaneHeads=['고용보험 가입이력','고용보험 일용근로이력','산재보험 가입정보']
      .map(t=>bestHeading(atoms,t)).filter(Boolean)
      .filter(h=>detailHeading && h.rect.left>detailHeading.rect.left+120);
    const detailRight=rightPaneHeads.length?Math.min(...rightPaneHeads.map(h=>h.rect.left))-8:Infinity;
    // 오른쪽 고용보험 영역의 제목이 세로상 아래에 있어도 좌측 상세영역을 끊지 않도록 X좌표로 분리한다.
    const detail=detailHeading?{top:detailHeading.rect.top,bottom:Infinity,left:-Infinity,right:detailRight,heading:detailHeading}:null;

    const summaryRaw=norm(bodyRegion(
      ['취업지원 종료신청 내역'],
      ['취업지원 종료신청 상세'],
      9000
    ));

    const reasonVals=summary?sameRowValues(atoms,'종료사유',summary,v=>labelKey(v)!==labelKey('종료사유'),8):[];
    const summaryAtomTexts=summary
      ? [...new Set(atoms.filter(a=>inBounds(a,summary)).map(a=>norm(a.text)).filter(Boolean))]
      : [];
    let reason='', reasonDetail='';

    for(const v of reasonVals){
      const t=norm(v);
      if(!reason && /^취업$/.test(t))reason='취업';
      if(!reasonDetail && /취업\s*\(\s*임금근로자\s*\)/.test(t))reasonDetail='취업(임금근로자)';
    }

    // 같은 상단 행에 두 Combo 값이 따로 노출되는 경우 보조 탐색
    if(summary){
      const rv=sameRowValues(atoms,'종료사유',summary,v=>labelKey(v)!==labelKey('종료사유'),12);
      for(const t0 of rv){
        const t=norm(t0);
        if(!reason && /^취업$/.test(t))reason='취업';
        if(!reasonDetail && /취업\s*\(\s*임금근로자\s*\)/.test(t))reasonDetail='취업(임금근로자)';
      }
    }

    // Nexacro의 Combo 값은 body.innerText에는 안 잡히지만 화면 atom에는 잡히는 경우가 많다.
    if(!reason && summaryAtomTexts.some(t=>/^취업$/.test(t)))reason='취업';
    if(!reasonDetail && summaryAtomTexts.some(t=>/취업\s*\(\s*임금근로자\s*\)/.test(t)))reasonDetail='취업(임금근로자)';

    // 원문은 마지막 보조수단.
    if(!reason && /종료사유[\s\S]{0,160}?취업/.test(summaryRaw))reason='취업';
    if(!reasonDetail && /취업\s*\(\s*임금근로자\s*\)/.test(summaryRaw))reasonDetail='취업(임금근로자)';

    let employmentOnly =
      reason==='취업' ||
      reasonDetail==='취업(임금근로자)' ||
      (summaryAtomTexts.some(t=>/^취업$/.test(t)) &&
       summaryAtomTexts.some(t=>/취업\s*\(\s*임금근로자\s*\)/.test(t)));
    const acquisitionStatus=summary?sameRowValue(atoms,'고용보험 취득신고 여부',summary,v=>/^(취득|미취득|미신고|미가입)$/.test(v)):'';
    const endRegistrationDate=summary?cleanDate(sameRowValue(atoms,'종료등록일자',summary,v=>!!cleanDate(v))):'';

    const field=(label,validator)=>{
      let v=detail?sameRowValue(atoms,label,detail,validator):'';
      if(v)return v;
      // Nexacro 배치가 바뀐 경우에도 좌측 상세영역의 가장 왼쪽 라벨을 기준으로 같은 행 값을 다시 찾는다.
      const labels=findLabelAtoms(atoms,label).filter(a=>!detailHeading||a.rect.top>=detailHeading.rect.top-2).sort((a,b)=>a.rect.left-b.rect.left||a.rect.top-b.rect.top);
      for(const l of labels){
        if(Number.isFinite(detailRight) && l.rect.left>=detailRight)continue;
        const cy=(l.rect.top+l.rect.bottom)/2;
        const xs=atoms.filter(a=>a!==l && a.rect.left>=l.rect.right-24 && (!Number.isFinite(detailRight)||a.rect.left<detailRight) && Math.abs(((a.rect.top+a.rect.bottom)/2)-cy)<=32 && a.text.length<220)
          .sort((a,b)=>((a.type==='control'?0:1)-(b.type==='control'?0:1)) || Math.abs(((a.rect.top+a.rect.bottom)/2)-cy)-Math.abs(((b.rect.top+b.rect.bottom)/2)-cy) || a.rect.left-b.rect.left);
        for(const a of xs){const x=norm(a.text);if(x&&(!validator||validator(x)))return x;}
      }
      return '';
    };
    const jobCloseType=field('구직마감유형',v=>v!=='선택'&&v.length<80);
    const mediationType=field('알선형태',v=>v!=='선택'&&v.length<100);
    const company=field('사업장명',v=>v!=='-'&&v.length>=2&&v.length<100);
    const businessNo=cleanBiz(field('사업자번호',v=>/\d/.test(v)));
    const insuranceManagementNo=cleanBiz(field('고용보험 사업장관리번호',v=>/\d/.test(v)));
    const occupation=field('직종명',v=>v!=='선택'&&v.length>=2);
    const industry=field('업종명',v=>v!=='선택'&&v.length>=2);
    const wage=cleanMoney(field('임금수준(월 임금)(원)',v=>/[\d,]/.test(v))||field('임금수준(월 임금)',v=>/[\d,]/.test(v)));
    const processedDate=cleanDate(field('취업처리일자',v=>!!cleanDate(v)));
    const employmentDate=cleanDate(field('취업일자',v=>!!cleanDate(v)));
    const weeklyHours=(field('주 소정 근로시간',v=>/^\d+(?:\.\d+)?$/.test(norm(v))).match(/\d+(?:\.\d+)?/)||[])[0]||'';
    const successAllowance=detail?checkedChoice(['지급','부지급','기타장려금'],atoms,detail):'';

    // 가입이력은 첫 번째 행이 아니라 현재 취업처/관리번호/취업일과 가장 잘 맞는 행을 선택한다.
    const insurance=extractInsuranceHistory({company,insuranceManagementNo,employmentDate,weeklyHours,wage});

    // 종료사유 Combo 자체가 노출되지 않는 Nexacro 화면에서는,
    // 실제 취업 상세값 + 고용보험 취득이력이 충분히 채워져 있을 때만
    // 취업(임금근로자) 종료로 보조 판정한다.
    const employmentEvidence=[
      company, businessNo, insuranceManagementNo, occupation, industry,
      wage, processedDate, employmentDate, weeklyHours
    ].filter(Boolean).length;

    // 종료사유 Combo가 끝까지 노출되지 않는 화면에서는
    // '본인취업' 구직마감 + 실제 사업장 + 같은 사업장의 고용보험 취득이력
    // 조합을 취업종료 화면 식별 근거로 사용한다.
    const insuranceCompanyMatched =
      !!(company && insurance?.company && compact(company)===compact(insurance.company));

    const strongEmploymentEvidence =
      /취업/.test(jobCloseType||'') &&
      !!company &&
      !!businessNo &&
      !!insurance?.acquisitionDate &&
      insuranceCompanyMatched;

    if(!employmentOnly && strongEmploymentEvidence){
      employmentOnly=true;
      // 화면 자체는 취업종료로 식별하되, 종료사유 콤보 원값은 보이지 않았으므로
      // reason/reasonDetail은 임의로 채우지 않는다.
    }else if(!employmentOnly && employmentEvidence>=4 && insurance?.acquisitionDate){
      employmentOnly=true;
    }

    const compare={
      company: company&&insurance.company ? compact(company)===compact(insurance.company) : null,
      employmentDate: employmentDate&&insurance.acquisitionDate ? employmentDate===insurance.acquisitionDate : null,
      weeklyHours: weeklyHours&&insurance.weeklyHours ? String(weeklyHours)===String(insurance.weeklyHours) : null,
      wage: wage&&insurance.wage ? String(wage).replace(/,/g,'')===String(insurance.wage).replace(/,/g,'') : null
    };

    const data={
      reason,reasonDetail,employmentOnly,acquisitionStatus,endRegistrationDate,
      jobCloseType,mediationType,company,businessNo,insuranceManagementNo,
      occupation,industry,wage,processedDate,employmentDate,weeklyHours,successAllowance,
      insurance,compare
    };

    const checks=[
      reason,reasonDetail,acquisitionStatus,endRegistrationDate,jobCloseType,mediationType,
      company,businessNo,insuranceManagementNo,occupation,industry,wage,processedDate,employmentDate,
      weeklyHours,successAllowance,insurance.acquisitionDate
    ];
    const found=checks.filter(Boolean).length;

    return {
      ok:titleOk && employmentOnly && found>=5,
      titleOk,employmentOnly,found,total:checks.length,data,
      debug:{
        url:location.href,title:document.title,bodyChars:(document.body?.textContent||'').length,
        reasonVals,
        labelHits:{
          종료사유:findLabelAtoms(atoms,'종료사유').map(a=>a.text).slice(0,10),
          고용보험취득신고:findLabelAtoms(atoms,'고용보험 취득신고 여부').map(a=>a.text).slice(0,10),
          종료등록일자:findLabelAtoms(atoms,'종료등록일자').map(a=>a.text).slice(0,10),
          직종명:findLabelAtoms(atoms,'직종명').map(a=>a.text).slice(0,10),
          업종명:findLabelAtoms(atoms,'업종명').map(a=>a.text).slice(0,10),
          임금:findLabelAtoms(atoms,'임금수준(월 임금)(원)').map(a=>a.text).slice(0,10),
          취업일자:findLabelAtoms(atoms,'취업일자').map(a=>a.text).slice(0,10),
          취업처리일자:findLabelAtoms(atoms,'취업처리일자').map(a=>a.text).slice(0,10),
          주근로시간:findLabelAtoms(atoms,'주 소정 근로시간').map(a=>a.text).slice(0,10)
        },
        summaryAtomTexts:summaryAtomTexts.slice(0,120),
        employmentEvidence,
        strongEmploymentEvidence,
        insuranceCompanyMatched,
        dataPreview:data,
        summaryRaw:summaryRaw.slice(0,3500),
        detailRaw:norm(bodyRegion(['취업지원 종료신청 상세'],['고용보험 가입이력','고용보험 일용근로이력','산재보험 가입정보'],12000)).slice(0,7000),
        insuranceRows:insurance.rows||[],
        detailRight,
        insuranceRaw:insurance.raw||''
      }
    };
  }

  chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
    if(msg?.type==='GUKCHWI_EMP_TERM_PING_V018'){sendResponse({ok:true,url:location.href});return;}
    if(msg?.type==='GUKCHWI_EXTRACT_EMP_TERM_V018'){
      try{sendResponse(extractTermination());}
      catch(e){sendResponse({ok:false,found:0,total:17,data:{},error:String(e),debug:{url:location.href,title:document.title,stack:e?.stack||''}});}
    }
  });
})();
