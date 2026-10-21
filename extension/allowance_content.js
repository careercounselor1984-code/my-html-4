(() => {
  if (window.__GUKCHWI_ALLOWANCE_V055__) return;
  window.__GUKCHWI_ALLOWANCE_V055__ = true;

  const norm = s => String(s ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const compact = s => norm(s).replace(/\s/g,'');
  const dateRe = /(?:19|20)\d{2}[-./]\d{2}[-./]\d{2}/g;
  const cleanDate = v => {
    const m = norm(v).match(/(?:19|20)\d{2}[-./]\d{2}[-./]\d{2}/);
    return m ? m[0].replace(/[./]/g,'-') : '';
  };
  const allDates = v => (norm(v).match(dateRe)||[]).map(x=>x.replace(/[./]/g,'-'));
  const cleanMoney = v => {
    const s=norm(v); if(!s) return '';
    const ms=[...s.matchAll(/(?<![:\d])-?\d[\d,]*(?![:\d])/g)].map(x=>x[0]);
    return ms.length ? ms[ms.length-1] : '';
  };

  function rootsDeep(){
    const roots=[document], seen=new Set(roots);
    for(let i=0;i<roots.length;i++){
      let els=[]; try{els=[...roots[i].querySelectorAll('*')];}catch{}
      for(const el of els){ if(el.shadowRoot && !seen.has(el.shadowRoot)){seen.add(el.shadowRoot);roots.push(el.shadowRoot);} }
    }
    return roots;
  }
  function allElements(){ const out=[]; for(const r of rootsDeep()){try{out.push(...r.querySelectorAll('*'));}catch{}} return out; }
  function isHidden(el){
    if(!el)return true;
    try{const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||r.width<1||r.height<1;}
    catch{return false;}
  }

  function crossParent(el){
    if(!el)return null;
    if(el.parentElement)return el.parentElement;
    try{return el.getRootNode?.()?.host||null;}catch{return null;}
  }
  function rectOverlap(a,b,pad=0){
    return a && b && a.right>b.left+pad && a.left<b.right-pad && a.bottom>b.top+pad && a.top<b.bottom-pad;
  }
  function isActuallyVisible(el){
    if(!el || isHidden(el))return false;
    let r;try{r=el.getBoundingClientRect();}catch{return false;}
    if(r.width<1||r.height<1||r.right<=0||r.bottom<=0||r.left>=innerWidth||r.top>=innerHeight)return false;

    // Work24/Nexacro는 화면 전환 뒤 예전 컴포넌트를 DOM에 남겨두는 경우가 있다.
    // 조상 스크롤/클리핑 영역 밖의 잔존 요소는 실제 화면값으로 보지 않는다.
    let n=el;
    for(let i=0;i<18;i++){
      n=crossParent(n); if(!n||n===document.documentElement)break;
      let cs,ar;try{cs=getComputedStyle(n);ar=n.getBoundingClientRect();}catch{continue;}
      if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;
      const ov=`${cs.overflow||''} ${cs.overflowX||''} ${cs.overflowY||''}`;
      if(/hidden|scroll|auto|clip/i.test(ov) && ar.width>1 && ar.height>1 && !rectOverlap(r,ar,-1))return false;
    }

    // 화면의 맨 위 레이어와 전혀 관계없는 뒤쪽 잔존 컴포넌트도 제외한다.
    const L=Math.max(1,Math.max(0,r.left)), R=Math.min(innerWidth-2,r.right);
    const T=Math.max(1,Math.max(0,r.top)), B=Math.min(innerHeight-2,r.bottom);
    if(R<=L||B<=T)return false;
    const x=(L+R)/2,y=(T+B)/2;
    let top=null;try{top=document.elementFromPoint(x,y);}catch{}
    if(top && !(top===el || el.contains?.(top) || top.contains?.(el))){
      // 같은 Nexacro 셀 내부의 형제 레이어는 허용하되 전혀 다른 컨테이너는 배제
      const ep=el.parentElement, tp=top.parentElement;
      if(!ep || !tp || (ep!==tp && !ep.contains?.(top) && !tp.contains?.(el)))return false;
    }
    return true;
  }
  function daySpan(d1,d2){
    try{
      const a=Date.parse(`${d1}T00:00:00Z`),b=Date.parse(`${d2}T00:00:00Z`);
      if(!Number.isFinite(a)||!Number.isFinite(b))return null;
      return Math.round((b-a)/86400000);
    }catch{return null;}
  }
  function planDetailNoise(t){
    t=norm(t);
    return !t || t.length>180 || /(Frame Work|IAP이행보고|고용보험|일용근로|산재보험|사업장관리번호|사업장명|대표자명|업종코드|업종명|생년월일|주민등록번호|휴직정보|사업자조회|행삭제|파일추가|\[\d+차\])/i.test(t);
  }
  function sanePlanDates(ds,supportStart='',supportEnd=''){
    if(!Array.isArray(ds)||ds.length<2)return false;
    const span=daySpan(ds[0],ds[1]);
    if(span===null||span<0||span>400)return false; // IAP 서비스기간을 훨씬 넘는 범위(예: 생년월일 혼입) 차단
    if(supportStart&&supportEnd && (ds[1]<supportStart || ds[0]>supportEnd))return false;
    return true;
  }
  function ctlValue(c){
    if(!c) return '';
    if(c instanceof HTMLSelectElement) return norm(c.selectedOptions?.[0]?.textContent || c.value);
    if(c instanceof HTMLTextAreaElement) return norm(c.value);
    if(c instanceof HTMLInputElement){
      if(['hidden','button','submit','reset','file'].includes(c.type)) return '';
      if(c.type==='radio'||c.type==='checkbox'){
        if(!c.checked) return '';
        let t='';
        if(c.id){try{t=norm(document.querySelector(`label[for="${CSS.escape(c.id)}"]`)?.textContent||'');}catch{}}
        if(!t)t=norm(c.closest('label')?.textContent||c.parentElement?.textContent||c.value);
        return t;
      }
      return norm(c.value);
    }
    return '';
  }
  function elementText(el){
    if(!el) return '';
    const vals=[];
    try{for(const c of el.querySelectorAll('input,select,textarea')){const v=ctlValue(c);if(v&&!vals.includes(v))vals.push(v);}}catch{}
    const txt=norm(el.innerText||el.textContent||'');
    return vals.length ? `${txt} ${vals.join(' ')}`.trim() : txt;
  }
  function textAtoms(){
    const out=[], seen=new Set();
    for(const el of allElements()){
      if(isHidden(el) || /^(SCRIPT|STYLE|OPTION)$/.test(el.tagName)) continue;
      let tx=norm(el.innerText||el.textContent||'');
      if(!tx || tx.length>260) continue;
      let childSame=false;
      for(const ch of el.children||[]){
        const ct=norm(ch.innerText||ch.textContent||'');
        if(ct && (ct===tx || (ct.length>2 && tx===ct))){ childSame=true; break; }
      }
      if(childSame) continue;
      const r=el.getBoundingClientRect();
      const key=`${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}|${Math.round(r.height)}|${tx}`;
      if(seen.has(key)) continue; seen.add(key);
      out.push({text:tx,el,rect:r,type:'text'});
    }
    for(const r0 of rootsDeep()){
      let cs=[]; try{cs=[...r0.querySelectorAll('input,select,textarea')];}catch{}
      for(const c of cs){
        if(isHidden(c))continue; const v=ctlValue(c); if(!v)continue;
        const r=c.getBoundingClientRect(); const key=`C|${Math.round(r.left)}|${Math.round(r.top)}|${v}`;
        if(seen.has(key))continue; seen.add(key); out.push({text:v,el:c,rect:r,type:'control'});
      }
    }
    return out;
  }
  function findAtoms(atoms,text,mode='exact'){
    const c=compact(text);
    return atoms.filter(a=> mode==='exact' ? compact(a.text)===c : compact(a.text).includes(c));
  }
  function bestHeading(atoms,title){
    const cands=findAtoms(atoms,title,'includes').filter(a=>a.text.length<140);
    if(!cands.length)return null;
    // 실제 업무영역은 보통 좌측 본문에 있고, 너무 큰 컨테이너는 제외
    cands.sort((a,b)=>(a.rect.width-b.rect.width)|| (a.rect.top-b.rect.top));
    return cands[0];
  }
  function nextHeadingY(atoms, afterY, titles){
    let ys=[];
    for(const t of titles){ for(const a of findAtoms(atoms,t,'includes')) if(a.rect.top>afterY+5) ys.push(a.rect.top); }
    return ys.length?Math.min(...ys):Infinity;
  }
  function sectionBounds(atoms,title,nextTitles=[]){
    const h=bestHeading(atoms,title); if(!h)return null;
    return {top:h.rect.top,bottom:nextHeadingY(atoms,h.rect.top,nextTitles),heading:h};
  }
  function inBounds(a,b){ return a.rect.top>=b.top-2 && a.rect.top<b.bottom-2; }
  function sameRowValue(atoms,labelText,bounds,validator){
    const labels=findAtoms(atoms,labelText,'exact').filter(a=>!bounds||inBounds(a,bounds));
    for(const l of labels){
      const ly=(l.rect.top+l.rect.bottom)/2;
      let candidates=atoms.filter(a=>a!==l && (!bounds||inBounds(a,bounds)) && a.rect.left>=l.rect.right-8 && Math.abs(((a.rect.top+a.rect.bottom)/2)-ly)<=22 && a.text.length<180);
      candidates.sort((a,b)=> (a.rect.left-b.rect.left) || (Math.abs(a.rect.top-l.rect.top)-Math.abs(b.rect.top-l.rect.top)) );
      for(const a of candidates){ if(!validator || validator(a.text)) return a.text; }
    }
    return '';
  }
  function sameRowValues(atoms,labelText,bounds,validator,max=4){
    const labels=findAtoms(atoms,labelText,'exact').filter(a=>!bounds||inBounds(a,bounds));
    for(const l of labels){
      const ly=(l.rect.top+l.rect.bottom)/2;
      let candidates=atoms.filter(a=>a!==l && (!bounds||inBounds(a,bounds)) && a.rect.left>=l.rect.right-8 && Math.abs(((a.rect.top+a.rect.bottom)/2)-ly)<=22 && a.text.length<180);
      candidates.sort((a,b)=>a.rect.left-b.rect.left);
      const vals=[];
      for(const a of candidates){ if((!validator||validator(a.text)) && !vals.includes(a.text))vals.push(a.text); if(vals.length>=max)break; }
      if(vals.length)return vals;
    }
    return [];
  }

  function activeRound(){
    let best={round:'',score:-1};
    for(const el of allElements()){
      if(isHidden(el))continue; const tx=norm(el.textContent||''); const m=tx.match(/^(\d+)회차(?:\s*\(제출\))?$/); if(!m)continue;
      let score=0; for(const n of [el,el.parentElement]){if(!n)continue; const cl=norm(n.className);if(/active|selected|on|current/i.test(cl))score+=5;try{const cs=getComputedStyle(n);if(+cs.fontWeight>=700)score++;const bg=cs.backgroundColor||'';if(bg&&!/transparent|rgba?\(255, 255, 255/.test(bg))score++;}catch{}}
      if(score>best.score)best={round:m[1],score};
    }
    return best.round;
  }
  function selectedProcessStatus(){
    const choices=['접수','검토요청','검토중','결재요청','결재중','지급요청','지급결정','지급취소','반려'];
    let best={text:'',score:-1};
    for(const ch of choices){
      for(const el of allElements()){
        if(isHidden(el)||compact(el.textContent||'')!==compact(ch))continue;
        let score=0;for(const n of [el,el.parentElement]){if(!n)continue;const cl=norm(n.className);if(/active|selected|on|current/i.test(cl))score+=5;try{const cs=getComputedStyle(n);if(+cs.fontWeight>=700)score++;const bg=cs.backgroundColor||'';if(bg&&!/transparent|rgba?\(255, 255, 255/.test(bg))score+=2;}catch{}}
        if(score>best.score)best={text:ch,score};
      }
    }
    return best.score>=3?best.text:'';
  }
  function checkedChoice(label, choices, atoms, bounds){
    // 실제 체크 input 우선
    for(const el of allElements()){
      if(isHidden(el) || !(el instanceof HTMLInputElement) || !['radio','checkbox'].includes(el.type) || !el.checked)continue;
      const r=el.getBoundingClientRect(); if(bounds && (r.top<bounds.top||r.top>=bounds.bottom))continue;
      const v=ctlValue(el); const hit=choices.find(x=>v.includes(x)); if(hit)return hit;
    }
    // 시각적 선택 상태
    let best={v:'',score:-1};
    for(const ch of choices){
      for(const a of findAtoms(atoms,ch,'exact').filter(a=>!bounds||inBounds(a,bounds))){
        let score=0;
        for(const n of [a.el,a.el.parentElement]){if(!n)continue;const cl=norm(n.className);if(/active|selected|on|checked|current/i.test(cl))score+=5;try{const cs=getComputedStyle(n);if(+cs.fontWeight>=700)score++; const bg=cs.backgroundColor||'';if(bg&&!/transparent|rgba?\(255, 255, 255/.test(bg))score+=2;}catch{}}
        if(score>best.score)best={v:ch,score};
      }
    }
    return best.score>=3?best.v:'';
  }

  function bodyRegions(startMarkers,endMarkers,maxLen=9000){
    const raw=String(document.body?.innerText||'');
    const candidates=[];
    for(const s of startMarkers){
      let p=0; while((p=raw.indexOf(s,p))>=0){
        let end=Math.min(raw.length,p+maxLen);
        for(const e of endMarkers){const ep=raw.indexOf(e,p+s.length); if(ep>=0&&ep<end)end=ep;}
        candidates.push(raw.slice(p,end)); p+=s.length;
      }
    }
    return candidates;
  }

  function bodyRegion(startMarkers,endMarkers,maxLen=9000){
    const candidates=bodyRegions(startMarkers,endMarkers,maxLen);
    candidates.sort((a,b)=>b.length-a.length);
    return candidates[0]||'';
  }

  function currentSectionRegion(startMarkers,endMarkers,maxLen,supportStart='',supportEnd=''){
    const candidates=bodyRegions(startMarkers,endMarkers,maxLen).map(norm).filter(Boolean);
    if(!candidates.length)return '';
    const noisy=/(Frame Work|IAP이행보고 검토목록|고용보험 가입이력|고용보험 일용근로이력|산재보험 가입정보|사업자조회)/;
    const score=txt=>{
      const ds=allDates(txt);
      let s=0;
      if(supportStart && supportEnd){
        if(ds.includes(supportStart))s+=220;
        if(ds.includes(supportEnd))s+=220;
        for(let i=0;i<ds.length-1;i++){
          const a=ds[i],b=ds[i+1];
          if(!(b<supportStart || a>supportEnd))s+=35;
        }
      }
      if(noisy.test(txt))s-=180;
      s-=Math.min(txt.length,20000)/80;
      return s;
    };
    candidates.sort((a,b)=>score(b)-score(a));
    return candidates[0]||'';
  }

  function reportRowFromText(round){
    const region=bodyRegion(['취업활동 이행보고'],['소득발생내역','소득 등 기타 증빙자료'],7000);
    const flat=norm(region); const dr='(?:19|20)\\d{2}[-./]\\d{2}[-./]\\d{2}';
    let re;
    if(round) re=new RegExp(`(?:^|\\s)${round}\\s+(${dr})\\s*~\\s*(${dr})\\s+([\\d,]+)\\s+(${dr})\\s+(제출|미제출)\\s+(${dr})\\s+([YN])(?:\\s+([^\\n]{0,80}))?`);
    else re=new RegExp(`(?:^|\\s)(\\d+)\\s+(${dr})\\s*~\\s*(${dr})\\s+([\\d,]+)\\s+(${dr})\\s+(제출|미제출)\\s+(${dr})\\s+([YN])`);
    const m=flat.match(re);
    if(m){
      if(round)return {round,supportStart:m[1].replace(/[./]/g,'-'),supportEnd:m[2].replace(/[./]/g,'-'),limit:m[3],designatedDate:m[4].replace(/[./]/g,'-'),reportProgress:m[5],reportSubmitDate:m[6].replace(/[./]/g,'-'),submitted:m[7],route:norm(m[8]||''),region:flat.slice(0,1600)};
      return {round:m[1],supportStart:m[2].replace(/[./]/g,'-'),supportEnd:m[3].replace(/[./]/g,'-'),limit:m[4],designatedDate:m[5].replace(/[./]/g,'-'),reportProgress:m[6],reportSubmitDate:m[7].replace(/[./]/g,'-'),submitted:m[8],region:flat.slice(0,1600)};
    }
    // 정규식 실패 시 섹션 안 날짜 순서로 보조 추출
    const ds=allDates(flat);
    return {round,supportStart:ds[0]||'',supportEnd:ds[1]||'',designatedDate:ds[2]||'',reportProgress:/\b제출\b/.test(flat)?'제출':(/미제출/.test(flat)?'미제출':''),reportSubmitDate:ds[3]||'',submitted:/\bY\b/.test(flat)?'Y':(/\bN\b/.test(flat)?'N':''),region:flat.slice(0,1600)};
  }

  function gridRows(atoms, sectionTitle, nextTitles, headers){
    const bounds=sectionBounds(atoms,sectionTitle,nextTitles); if(!bounds)return {bounds:null,rows:[],headers:{}};
    const h={};
    for(const name of headers){
      const cands=findAtoms(atoms,name,'exact').filter(a=>a.rect.top>bounds.top && a.rect.top<bounds.bottom);
      if(cands.length) h[name]=cands.sort((a,b)=>a.rect.top-b.rect.top || a.rect.width-b.rect.width)[0];
    }
    const hs=Object.values(h); if(hs.length<Math.max(3,Math.ceil(headers.length/2))) return {bounds,rows:[],headers:h};
    const headerY=Math.max(...hs.map(a=>a.rect.bottom));
    const centers=headers.map(name=>h[name]?((h[name].rect.left+h[name].rect.right)/2):null);
    const boundaries=[];
    for(let i=0;i<centers.length-1;i++) boundaries.push(centers[i]!=null&&centers[i+1]!=null?(centers[i]+centers[i+1])/2:null);
    const colLeft=i=>i===0?-Infinity:(boundaries[i-1]??-Infinity);
    const colRight=i=>i===headers.length-1?Infinity:(boundaries[i]??Infinity);
    const vals=atoms.filter(a=>a.rect.top>headerY+2 && a.rect.top<bounds.bottom && a.text.length<220 && !headers.some(x=>compact(x)===compact(a.text)));
    const groups=[];
    for(const a of vals.sort((x,y)=>x.rect.top-y.rect.top||x.rect.left-y.rect.left)){
      const cy=(a.rect.top+a.rect.bottom)/2; let g=groups.find(z=>Math.abs(z.cy-cy)<=12);
      if(!g){g={cy,items:[]};groups.push(g);} g.items.push(a); g.cy=(g.cy*(g.items.length-1)+cy)/g.items.length;
    }
    const rows=[];
    for(const g of groups){
      const cells=headers.map(()=>[]);
      for(const a of g.items){
        const cx=(a.rect.left+a.rect.right)/2; let idx=0;
        while(idx<boundaries.length && boundaries[idx]!=null && cx>boundaries[idx])idx++;
        const left=colLeft(idx), right=colRight(idx);
        // 행 전체 문장처럼 여러 열을 가로지르는 부모 요소는 버린다.
        if(Number.isFinite(left) && a.rect.left < left-8) continue;
        if(Number.isFinite(right) && a.rect.right > right+8) continue;
        cells[idx].push(a);
      }
      const obj={};
      headers.forEach((n,i)=>{
        const items=cells[i];
        if(!items.length){obj[n]='';return;}
        items.sort((a,b)=>{
          const ac=a.type==='control'?0:1, bc=b.type==='control'?0:1;
          if(ac!==bc)return ac-bc;
          const aa=a.rect.width*a.rect.height, ba=b.rect.width*b.rect.height;
          if(aa!==ba)return aa-ba;
          return a.text.length-b.text.length;
        });
        const unique=[];
        for(const a of items){
          const t=norm(a.text); if(!t||unique.some(x=>compact(x)===compact(t)))continue;
          if(unique.some(x=>compact(t).includes(compact(x)) && compact(t)!==compact(x)))continue;
          unique.push(t);
        }
        obj[n]=unique[0]||'';
      });
      if(Object.values(obj).some(Boolean))rows.push(obj);
    }
    return {bounds,rows,headers:h};
  }

  function activityControlPool(){
    const vals=[];
    for(const root of rootsDeep()){
      let cs=[]; try{cs=[...root.querySelectorAll('input,select,textarea')];}catch{}
      for(const c of cs){
        const v=ctlValue(c); if(!v || v.length>260) continue;
        if(/^\d{2}:\d{2}:\d{2}$/.test(v)) continue;
        if(!vals.includes(v)) vals.push(v);
      }
    }
    return vals;
  }

  function activityRowsTextRobust(){
    const raw=bodyRegion(['구직활동지원 프로그램 활동 결과 보고'],['이행보고 전달사항','이행보고 첨부자료','보완요청 내역','검토결과'],18000);
    const region=norm(raw);
    if(!region) return [];
    const known=['입사지원서(취업알선상담 포함)제출','입사지원에 필요한 컨설팅 참여','상담사가 부과한 과제 이행 후 상담 참여','구직활동 프로그램 참여','취업특강 참여','직업훈련 참여'];
    const pool=activityControlPool();
    const dr='(?:19|20)\\d{2}[-./]\\d{2}[-./]\\d{2}';
    const pair=new RegExp(`(${dr})\\s*~\\s*(${dr})`,'g');
    const out=[]; let m,prevEnd=0;
    while((m=pair.exec(region))){
      let pre=norm(region.slice(prevEnd,m.index));
      prevEnd=pair.lastIndex;
      // 현재 날짜쌍 바로 앞의 마지막 '연번 + 등록구분'을 현재 행의 시작점으로 사용
      const regs=[...pre.matchAll(/(?:^|\s)(\d{1,2})\s+(인터넷\s*등록|워크넷\s*등록)\s+/g)];
      let seq='',registration='',row='';
      if(regs.length){
        const r=regs[regs.length-1]; seq=r[1]; registration=norm(r[2]); row=norm(pre.slice((r.index||0)+r[0].length));
      }else{
        // 연번이 DOM 본문에서 빠진 경우 등록구분만으로 보조
        const regs2=[...pre.matchAll(/(?:^|\s)(인터넷\s*등록|워크넷\s*등록)\s+/g)];
        if(!regs2.length) continue;
        const r=regs2[regs2.length-1]; registration=norm(r[1]); row=norm(pre.slice((r.index||0)+r[0].length));
      }
      if(!row) continue;
      // 알려진 활동구분을 정확히 떼어낸다.
      let activityType=''; let typePos=Infinity;
      for(const k of known){ const pos=compact(row).indexOf(compact(k)); if(pos>=0 && pos<typePos){activityType=k;typePos=pos;} }
      if(activityType){
        // 공백 차이와 무관하게 실제 문자열 위치를 찾아 활동구분 뒤만 남김
        const direct=row.indexOf(activityType);
        if(direct>=0) row=norm(row.slice(direct+activityType.length));
        else {
          // 드물게 공백이 변형된 경우 앞부분을 토큰 단위로 제거
          const kt=compact(activityType); const cr=compact(row); const cp=cr.indexOf(kt);
          if(cp>=0){
            let seen=0,cut=0;
            for(let i=0;i<row.length;i++){if(!/\s/.test(row[i]))seen++; if(seen>=cp+kt.length){cut=i+1;break;}}
            row=norm(row.slice(cut));
          }
        }
      }
      // 행 안에 실제 입력컨트롤 값이 그대로 포함되므로, 그 값을 이용해 활동명/활동내용을 분리한다.
      let matches=pool.filter(v=>{
        if(v.length<2 || !row.includes(v)) return false;
        if(cleanDate(v) || /^\d+$/.test(v)) return false;
        if(/^(인터넷\s*등록|워크넷\s*등록|제출|미제출|선택)$/.test(v)) return false;
        if(known.some(k=>compact(v)===compact(k))) return false;
        return true;
      });
      matches=[...new Set(matches)].sort((a,b)=>{
        const ia=row.indexOf(a), ib=row.indexOf(b); if(ia!==ib)return ia-ib;
        return b.length-a.length;
      });
      // 서로 포함되는 후보는 더 구체적인(긴) 실제 입력값만 남긴다.
      const refined=[];
      for(const v of matches){
        if(refined.some(x=>x.includes(v) && x!==v)) continue;
        const idx=refined.findIndex(x=>v.includes(x) && v!==x);
        if(idx>=0) refined[idx]=v; else refined.push(v);
      }
      matches=refined.sort((a,b)=>row.indexOf(a)-row.indexOf(b));
      let activityName=matches[0]||'';
      let activityContent=matches[1]||'';
      if(!activityName){
        const toks=row.split(/\s+/).filter(Boolean); activityName=toks.shift()||''; activityContent=toks.join(' ');
      }else if(!activityContent){
        const pos=row.indexOf(activityName); activityContent=norm(row.slice(pos+activityName.length));
      }
      // 잔여 헤더/행번호가 내용 끝에 붙는 현상 제거
      activityContent=norm(activityContent.replace(/\s+\d{1,2}$/,'').replace(/(?:이행보고 전달사항|이행보고 첨부자료|행삭제|행추가).*$/,'').trim());
      out.push({seq:seq||String(out.length+1),registration,activityType,activityName:norm(activityName),activityContent,activityPeriod:`${m[1].replace(/[./]/g,'-')} ~ ${m[2].replace(/[./]/g,'-')}`});
      if(out.length>30)break;
    }
    // 동일 행 중복 제거
    const uniq=[];
    for(const r of out){
      const key=[r.seq,r.activityName,r.activityContent,r.activityPeriod].join('|');
      if(!uniq.some(x=>[x.seq,x.activityName,x.activityContent,x.activityPeriod].join('|')===key)) uniq.push(r);
    }
    return uniq;
  }

  function activityRowsByControls(atoms){
    const bounds=sectionBounds(atoms,'구직활동지원 프로그램 활동 결과 보고',['이행보고 전달사항','이행보고 첨부자료','보완요청 내역','검토결과']);
    if(!bounds) return [];
    const known=['입사지원서(취업알선상담 포함)제출','입사지원에 필요한 컨설팅 참여','상담사가 부과한 과제 이행 후 상담 참여','구직활동 프로그램 참여','취업특강 참여','직업훈련 참여'];
    const cs=[];
    for(const root of rootsDeep()){
      let arr=[]; try{arr=[...root.querySelectorAll('input,select,textarea')];}catch{}
      for(const c of arr){
        if(c instanceof HTMLInputElement && ['hidden','button','submit','reset','file'].includes(c.type)) continue;
        const v=ctlValue(c); if(!v)continue;
        let r;try{r=c.getBoundingClientRect();}catch{continue;}
        if(r.top<bounds.top-4 || r.top>=bounds.bottom+90 || r.width<1 || r.height<1)continue;
        cs.push({v,el:c,rect:r,cy:(r.top+r.bottom)/2});
      }
    }
    cs.sort((a,b)=>a.cy-b.cy||a.rect.left-b.rect.left);
    const groups=[];
    for(const c of cs){
      let g=groups.find(x=>Math.abs(x.cy-c.cy)<=11);
      if(!g){g={cy:c.cy,items:[]};groups.push(g);} g.items.push(c); g.cy=(g.cy*(g.items.length-1)+c.cy)/g.items.length;
    }
    const out=[];
    for(const g of groups){
      const vals=g.items.sort((a,b)=>a.rect.left-b.rect.left).map(x=>x.v);
      const dates=vals.map(cleanDate).filter(Boolean);
      const activityType=known.find(k=>vals.some(v=>compact(v)===compact(k)))||'';
      if(!activityType || !dates.length)continue;
      const others=vals.filter(v=>!cleanDate(v) && !known.some(k=>compact(v)===compact(k)) && !/^(인터넷\s*등록|워크넷\s*등록|선택|제출|미제출)$/.test(v) && !/^\d+$/.test(v));
      if(!others.length)continue;
      out.push({seq:String(out.length+1),registration:'인터넷 등록',activityType,activityName:others[0]||'',activityContent:others[1]||'',activityPeriod:dates.length>=2?`${dates[0]} ~ ${dates[1]}`:`${dates[0]} ~ ${dates[0]}`});
    }
    return out;
  }

  function activityRows(atoms){
    const textRows=activityRowsTextRobust();
    const controlRows=activityRowsByControls(atoms);
    // 텍스트 파서는 가상스크롤로 화면 밖에 있는 행도 잡을 수 있어 행 수가 더 많으면 우선한다.
    let base=textRows.length>=controlRows.length?textRows:controlRows;
    // 같은 순번의 컨트롤 값이 더 명확한 경우 보완한다.
    if(textRows.length && controlRows.length){
      const n=Math.min(textRows.length,controlRows.length);
      base=base.map((r,i)=>{
        if(i>=n)return r;
        const t=textRows[i],c=controlRows[i];
        return {
          ...r,
          activityType:t.activityType||c.activityType||r.activityType,
          activityName:t.activityName||c.activityName||r.activityName,
          activityContent:t.activityContent||c.activityContent||r.activityContent,
          activityPeriod:t.activityPeriod||c.activityPeriod||r.activityPeriod
        };
      });
    }
    return base.map(({seq,...x})=>x);
  }

  function looseDate(v){
    const m=norm(v).match(/((?:19|20)\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\.?/);
    if(!m)return '';
    return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  }

  function robustSectionBounds(atoms,title,nextTitles=[],required=[]){
    const hs=findAtoms(atoms,title,'includes').filter(a=>a.text.length<180);
    let best=null;
    for(const h of hs){
      let bottoms=[];
      for(const nt of nextTitles){
        for(const a of findAtoms(atoms,nt,'includes')) if(a.rect.top>h.rect.top+5) bottoms.push(a.rect.top);
      }
      const bottom=bottoms.length?Math.min(...bottoms):Infinity;
      let score=0;
      for(const req of required){
        const hits=findAtoms(atoms,req,'includes').filter(a=>a.rect.top>=h.rect.top-2&&a.rect.top<bottom-2);
        if(hits.length)score+=10;
      }
      score += atoms.filter(a=>a.type==='control'&&a.rect.top>=h.rect.top-2&&a.rect.top<bottom-2).length*0.05;
      score -= Math.max(0,h.rect.width-900)*0.001;
      if(!best||score>best.score)best={top:h.rect.top,bottom,heading:h,score};
    }
    return best;
  }


  async function requestNexacroProbe(timeoutMs=1200){
    return await new Promise(resolve=>{
      const id=`guk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      let done=false;
      const finish=v=>{if(done)return;done=true;window.removeEventListener('message',onMsg);clearTimeout(tm);resolve(v||null);};
      const onMsg=ev=>{
        if(ev.source!==window) return;
        const d=ev.data;
        if(d?.source==='GUKCHWI_ALLOWANCE_MAIN' && d?.type==='GUKCHWI_NEXACRO_PROBE_RESPONSE' && d?.id===id) finish(d.result);
      };
      window.addEventListener('message',onMsg);
      const tm=setTimeout(()=>finish(null),timeoutMs);
      window.postMessage({source:'GUKCHWI_ALLOWANCE_ISOLATED',type:'GUKCHWI_NEXACRO_PROBE_REQUEST',id},'*');
    });
  }

  const PLAN_TYPES=['입사지원서(취업알선상담 포함)제출','입사지원에 필요한 컨설팅 참여','상담사가 부과한 과제 이행 후 상담 참여','구직활동 프로그램 참여','취업특강 참여','직업훈련 참여'];

  function planRowsVisibleStrict(atoms,supportStart='',supportEnd=''){
    // 현재 화면에 실제로 보이는 표의 '열 위치'를 기준으로만 읽는다.
    // 다른 탭/숨은 화면의 생년월일·업종·고용보험 값이 같은 행처럼 섞이는 문제를 차단한다.
    const va=(atoms||[]).filter(a=>a?.el && a?.rect && a.text.length<220 && isActuallyVisible(a.el));
    if(!va.length)return [];
    const cy=a=>(a.rect.top+a.rect.bottom)/2;
    const cx=a=>(a.rect.left+a.rect.right)/2;
    const exact=(a,t)=>compact(a.text)===compact(t);
    const headerType=va.filter(a=>exact(a,'구분'));
    let best=null;

    const pickNear=(base,matcher,minLeft)=>{
      const y=cy(base);
      return va.filter(a=>a!==base && a.rect.left>=minLeft && Math.abs(cy(a)-y)<=24 && matcher(a))
        .sort((a,b)=>a.rect.left-b.rect.left || a.rect.width-b.rect.width)[0]||null;
    };

    for(const hType of headerType){
      const hDetail=pickNear(hType,a=>exact(a,'세부내용'),hType.rect.right-5); if(!hDetail)continue;
      const hPeriod=pickNear(hType,a=>exact(a,'참여기간'),hDetail.rect.right-5); if(!hPeriod)continue;
      const hFreq=pickNear(hType,a=>/활동\(지원\)(?:횟수|회수)/.test(norm(a.text)),hPeriod.rect.right-5); if(!hFreq)continue;
      if(!(cx(hType)<cx(hDetail)&&cx(hDetail)<cx(hPeriod)&&cx(hPeriod)<cx(hFreq)))continue;

      const hy=Math.max(hType.rect.bottom,hDetail.rect.bottom,hPeriod.rect.bottom,hFreq.rect.bottom);
      const heading=va.filter(a=>compact(a.text).includes(compact('구직활동지원 프로그램 활동 계획')) && a.rect.bottom<=hy+8 && hy-a.rect.bottom<420)
        .sort((a,b)=>b.rect.bottom-a.rect.bottom)[0]||null;
      const b1=(cx(hType)+cx(hDetail))/2,b2=(cx(hDetail)+cx(hPeriod))/2,b3=(cx(hPeriod)+cx(hFreq))/2;
      const rowHits=va.filter(a=>a.rect.top>hy+1 && a.rect.top<Math.min(innerHeight,hy+650) && cx(a)<b1 && PLAN_TYPES.some(k=>compact(a.text)===compact(k))).length;
      let score=rowHits*40 + (heading?100:0) - Math.abs(hType.rect.top-hDetail.rect.top);
      // 헤더가 현재 뷰포트 안에서 넓게 한 줄로 정렬될수록 우선
      score += Math.min(40,(hFreq.rect.right-hType.rect.left)/20);
      if(!best||score>best.score)best={hType,hDetail,hPeriod,hFreq,hy,b1,b2,b3,heading,score};
    }
    if(!best)return [];

    let bottom=Math.min(innerHeight,best.hy+760);
    const next=va.filter(a=>compact(a.text).includes(compact('구직활동지원 프로그램 활동 결과 보고')) && a.rect.top>best.hy+10)
      .sort((a,b)=>a.rect.top-b.rect.top)[0];
    if(next)bottom=Math.min(bottom,next.rect.top-2);

    const tableLeft=Math.max(0,best.hType.rect.left-130);
    const tableRight=Math.min(innerWidth,best.hFreq.rect.right+90);
    const colRanges={
      type:[tableLeft,best.b1],detail:[best.b1,best.b2],period:[best.b2,best.b3],freq:[best.b3,tableRight]
    };
    const inCol=(a,name)=>{
      const [l,r]=colRanges[name],x=cx(a);
      if(x<l||x>=r)return false;
      // 여러 열을 가로지르는 상위 컨테이너 텍스트는 배제
      if(a.rect.left<l-10 || a.rect.right>r+10)return false;
      return true;
    };

    const anchors=va.filter(a=>a.rect.top>best.hy+2 && a.rect.top<bottom && inCol(a,'type') && PLAN_TYPES.some(k=>compact(a.text)===compact(k)))
      .sort((a,b)=>cy(a)-cy(b));
    const out=[];
    for(const a of anchors){
      const y=cy(a);
      const band=va.filter(x=>x.rect.top>best.hy && x.rect.top<bottom && Math.abs(cy(x)-y)<=28);
      const type=PLAN_TYPES.find(k=>compact(a.text)===compact(k)); if(!type)continue;

      const dItems=band.filter(x=>inCol(x,'detail'));
      const detailCandidates=[];
      for(const x of dItems){
        const t=norm(x.text);
        if(!t||PLAN_TYPES.some(k=>compact(t)===compact(k))||looseDate(t)||cleanDate(t)||/(?:월\s*)?\d+\s*회/.test(t))continue;
        if(/^(세부내용|선택|연번|구분)$/.test(t)||planDetailNoise(t))continue;
        if(!detailCandidates.some(v=>compact(v.t)===compact(t)))detailCandidates.push({t,control:x.type==='control',area:x.rect.width*x.rect.height});
      }
      detailCandidates.sort((x,y)=>(y.control-x.control)||(y.t.length-x.t.length)||(x.area-y.area));
      const detail=detailCandidates[0]?.t||'';
      if(planDetailNoise(detail))continue;

      const pItems=band.filter(x=>inCol(x,'period'));
      const dates=[];
      for(const x of pItems){
        const found=allDates(x.text); if(!found.length){const d=looseDate(x.text)||cleanDate(x.text);if(d)found.push(d);}
        for(const d of found)if(!dates.includes(d))dates.push(d);
      }
      dates.sort();
      if(!sanePlanDates(dates,supportStart,supportEnd))continue;

      let frequency='';
      const fItems=band.filter(x=>inCol(x,'freq'));
      for(const x of fItems){
        const m=norm(x.text).match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);
        if(m){frequency=norm(m[0]);break;}
      }
      if(!frequency)continue;

      const seqAtom=band.filter(x=>x.rect.right<=best.hType.rect.left+10 && /^\d{1,2}$/.test(norm(x.text))).sort((x,y)=>y.rect.left-x.rect.left)[0];
      const obj={seq:seqAtom?norm(seqAtom.text):'',type,detail,period:`${dates[0]} ~ ${dates[1]}`,frequency};
      const key=[compact(obj.type),compact(obj.detail),obj.period,compact(obj.frequency)].join('|');
      if(!out.some(r=>r._key===key))out.push({...obj,_key:key});
    }
    return out.map(({_key,...r})=>r);
  }

  function planRowsVisibleSimple(atoms){
    const b=robustSectionBounds(atoms,'구직활동지원 프로그램 활동 계획',['구직활동지원 프로그램 활동 결과 보고'],['세부내용','참여기간','활동(지원)횟수']);
    if(!b)return [];
    const out=[];
    for(const type of PLAN_TYPES){
      const anchors=findAtoms(atoms,type,'includes').filter(a=>inBounds(a,b)&&a.text.length<120);
      for(const a of anchors){
        const cy=(a.rect.top+a.rect.bottom)/2;
        const row=atoms.filter(x=>inBounds(x,b)&&Math.abs(((x.rect.top+x.rect.bottom)/2)-cy)<=18&&x.text.length<220)
          .sort((x,y)=>x.rect.left-y.rect.left);
        const dates=[];
        for(const x of row){const d=looseDate(x.text)||cleanDate(x.text);if(d&&!dates.includes(d))dates.push(d);}
        if(!dates.length)continue;
        let freq='';
        for(const x of row){const m=norm(x.text).match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);if(m){freq=norm(m[0]);break;}}
        const bad=t=>!t||PLAN_TYPES.some(k=>compact(t)===compact(k))||!!(looseDate(t)||cleanDate(t))||/^(연번|구분|세부내용|참여기간|활동\(지원\)횟수\(월\)|활동\(지원\)횟수|선택|인터넷 등록)$/.test(t)||/^\d+$/.test(t)||/(?:월\s*)?\d+\s*회/.test(t);
        const texts=row.map(x=>norm(x.text)).filter(t=>!bad(t));
        let detail='';
        // type 오른쪽에 있는 가장 의미 있는 문자열을 세부내용으로 선택
        const right=row.filter(x=>x.rect.left>=a.rect.right-8).map(x=>norm(x.text)).filter(t=>!bad(t));
        if(right.length) detail=right.sort((x,y)=>y.length-x.length)[0];
        if(!detail&&texts.length)detail=texts.sort((x,y)=>y.length-x.length)[0];
        const seqAtom=row.filter(x=>x.rect.right<=a.rect.left+8&&/^\d{1,2}$/.test(norm(x.text))).sort((x,y)=>y.rect.left-x.rect.left)[0];
        const obj={seq:seqAtom?norm(seqAtom.text):'',type,detail,period:dates.length>=2?`${dates[0]} ~ ${dates[1]}`:`${dates[0]} ~ ${dates[0]}`,frequency:freq};
        const key=`${compact(obj.type)}|${compact(obj.detail)}|${obj.period}`;
        if(!out.some(r=>`${compact(r.type)}|${compact(r.detail)}|${r.period}`===key))out.push(obj);
      }
    }
    return out;
  }

  function findPlanScrollers(atoms){
    const b=robustSectionBounds(atoms,'구직활동지원 프로그램 활동 계획',['구직활동지원 프로그램 활동 결과 보고'],['세부내용','참여기간','활동(지원)횟수']);
    if(!b)return [];
    const c=[];
    for(const el of allElements()){
      if(el===document.body||el===document.documentElement)continue;
      let sh,ch,r;try{sh=el.scrollHeight;ch=el.clientHeight;r=el.getBoundingClientRect();}catch{continue;}
      if(sh<=ch+8||ch<35||r.width<500||r.height<35)continue;
      if(r.bottom<b.top||r.top>b.bottom+80)continue;
      let score=(sh-ch);
      const tx=norm(el.innerText||el.textContent||'');
      if(tx.includes('세부내용')||PLAN_TYPES.some(k=>tx.includes(k)))score+=500;
      c.push({el,score,range:sh-ch});
    }
    c.sort((x,y)=>y.score-x.score);
    return c.slice(0,3).map(x=>x.el);
  }


  function planRowsFromRaw(supportStart='',supportEnd=''){
    const region=currentSectionRegion(['구직활동지원 프로그램 활동 계획'],['구직활동지원 프로그램 활동 결과 보고'],14000,supportStart,supportEnd);
    if(!region)return [];
    const out=[];
    const occurrences=[];
    for(const type of PLAN_TYPES){
      let p=0;
      while((p=region.indexOf(type,p))>=0){occurrences.push({type,pos:p});p+=type.length;}
    }
    occurrences.sort((a,b)=>a.pos-b.pos);
    for(let i=0;i<occurrences.length;i++){
      const cur=occurrences[i], next=occurrences[i+1]?.pos ?? region.length;
      let chunk=norm(region.slice(cur.pos+cur.type.length,next));
      const dm=chunk.match(/((?:19|20)\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\.?\s*~\s*((?:19|20)\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\.?/);
      if(!dm)continue;
      const d1=`${dm[1]}-${String(dm[2]).padStart(2,'0')}-${String(dm[3]).padStart(2,'0')}`;
      const d2=`${dm[4]}-${String(dm[5]).padStart(2,'0')}-${String(dm[6]).padStart(2,'0')}`;
      const before=norm(chunk.slice(0,dm.index));
      const after=norm(chunk.slice((dm.index||0)+dm[0].length));
      const fm=after.match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);
      const seqm=after.match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
      const detail=before.replace(/^(?:연번|구분|세부내용|참여기간|활동\(지원\)횟수\(월\)|활동\(지원\)횟수|접수내역|선택)\s*/g,'').trim();
      if(!detail || detail.length>240 || /(Frame Work|IAP이행보고|고용보험 가입이력|고용보험 일용근로이력|산재보험 가입정보|사업자조회|휴직정보|행삭제|파일추가)/.test(detail))continue;
      const obj={seq:seqm?seqm[1]:'',type:cur.type,detail,period:`${d1} ~ ${d2}`,frequency:fm?norm(fm[0]):''};
      const key=`${compact(obj.type)}|${compact(obj.detail)}|${obj.period}`;
      if(!out.some(r=>`${compact(r.type)}|${compact(r.detail)}|${r.period}`===key))out.push(obj);
    }
    return out;
  }

  function plansFromNexacroProbe(probe,supportStart='',supportEnd=''){
    if(!probe)return [];
    const candidates=[];
    for(const g of probe.grids||[]){
      for(const r of [...(g.rows||[]),...(g.datasetRows||[])]){
        candidates.push({source:g.path||'',row:r.row,values:r.values||[],text:norm(r.text||'')});
      }
    }
    for(const r of probe.datasetPlanRows||[]) candidates.push({source:r.path||'',row:r.row,values:r.values||[],text:norm(r.text||'')});
    const out=[];
    for(const c of candidates){
      const text=c.text||norm((c.values||[]).join(' '));
      const type=PLAN_TYPES.find(k=>compact(text).includes(compact(k)));
      if(!type)continue;
      const dates=[];
      for(const v of c.values||[]){
        const d=looseDate(v)||cleanDate(v);
        if(d&&!dates.includes(d))dates.push(d);
      }
      if(dates.length<2){
        const ds=allDates(text);
        for(const d of ds) if(!dates.includes(d))dates.push(d);
      }
      // 현재 회차 기간과 전혀 다른 행은 배제
      if(supportStart && supportEnd && dates.length>=2){
        const matchesCurrent = (dates.includes(supportStart)&&dates.includes(supportEnd)) ||
                               (dates[0]>=supportStart && dates[0]<=supportEnd) ||
                               (dates[1]>=supportStart && dates[1]<=supportEnd);
        if(!matchesCurrent)continue;
      }
      let freq='';
      for(const v of c.values||[]){
        const m=norm(v).match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);
        if(m){freq=norm(m[0]);break;}
      }
      if(!freq){const m=text.match(/(?:월\s*)?\d+\s*회\s*이상|(?:월\s*)?\d+\s*회|수시|필요시/);if(m)freq=norm(m[0]);}
      const bad=v=>{
        const t=norm(v);
        return !t || compact(t)===compact(type) || !!(looseDate(t)||cleanDate(t)) ||
          /^(연번|구분|세부내용|참여기간|활동\(지원\)횟수\(월\)|활동\(지원\)횟수|선택|인터넷 등록|접수내역)$/.test(t) ||
          /^(?:월\s*)?\d+\s*회(?:\s*이상)?$/.test(t) || /^\d{1,2}$/.test(t);
      };
      const vals=(c.values||[]).map(norm).filter(v=>!bad(v));
      const detail=vals.filter(v=>!PLAN_TYPES.some(k=>compact(v).includes(compact(k)))).sort((a,b)=>b.length-a.length)[0]||'';
      const seq=(c.values||[]).map(norm).find(v=>/^\d{1,2}$/.test(v))||'';
      const period=dates.length>=2?`${dates[0]} ~ ${dates[1]}`:(dates.length?`${dates[0]} ~ ${dates[0]}`:'');
      const obj={seq,type,detail,period,frequency:freq,_src:c.source};
      const key=`${compact(type)}|${compact(detail)}|${period}|${compact(freq)}`;
      if(!out.some(x=>`${compact(x.type)}|${compact(x.detail)}|${x.period}|${compact(x.frequency)}`===key))out.push(obj);
    }
    return out;
  }

  async function collectJobSearchPlans(supportStart='',supportEnd=''){
    // 현재 화면에서 실제로 보이는 계획표를 최우선으로 읽는다.
    // Work24는 같은 DOM 안에 다른 화면/탭 문구를 남겨두는 경우가 있어 body.innerText를
    // 먼저 읽으면 IAP·고용보험 영역이 현재 회차 계획으로 섞일 수 있다.
    let rows=planRowsVisibleStrict(textAtoms(),supportStart,supportEnd);

    // 가상스크롤 등으로 현재 표 좌표 파싱이 안 되는 예외에서만 RAW를 보조로 사용한다.
    if(!rows.length){
      rows=planRowsFromRaw(supportStart,supportEnd);
    }

    const clean=[];
    const noise=/(로그아웃|연장|결재|좋은일자리 북부센터|취업지원 공통|조회\/관리|겸직|Frame Work|IAP이행보고|고용보험|일용근로|산재보험|사업장관리번호|사업장명|대표자명|업종코드|업종명|생년월일|주민등록번호|사업자조회|휴직정보|행삭제|파일추가|\[\d+차\])/;
    for(const r of rows||[]){
      if(!r?.type || !r?.period)continue;
      if(noise.test(norm(r.detail||'')))continue;

      // 현재 회차와 전혀 상관없는 기간은 배제
      const ds=allDates(r.period||'');
      if(!sanePlanDates(ds,supportStart,supportEnd))continue;
      if(planDetailNoise(r.detail||''))continue;

      const obj={
        seq:norm(r.seq||''),
        type:norm(r.type||''),
        detail:norm(r.detail||''),
        period:norm(r.period||''),
        frequency:norm(r.frequency||'')
      };
      const key=`${compact(obj.type)}|${compact(obj.detail)}|${obj.period}|${compact(obj.frequency)}`;
      if(!clean.some(x=>x._key===key))clean.push({...obj,_key:key});
    }

    clean.sort((a,b)=>(+(a.seq||999))-(+(b.seq||999)));
    return {rows:clean.map(({_key,...r})=>r),probe:null};
  }

  function incomeInfoDetailed(atoms){
    // 소득 상세는 화면 전체 좌표를 섞지 않고 '소득발생내역' 원문 중
    // 실제 표 데이터 구간(헤더 뒤 ~ 총 N건 앞)만 사용한다.
    const raw=norm(bodyRegion(
      ['소득발생내역'],
      ['소득 등 기타 증빙자료','취업여부 정보','취업지원 프로그램 참여 계획'],
      9000
    ));

    let count=0,total='0';
    const cm=raw.match(/총\s*(\d+)건/);
    if(cm) count=Number(cm[1]||0);
    const tm=raw.match(/합계\s*([\d,]+)\s*원/);
    if(tm) total=tm[1];

    const types=[
      '재산소득(이자, 배당소득)',
      '사업소득(월 매출내역)',
      '이전소득(국민연금 등)',
      '취업지원프로그램',
      '근로소득',
      '사업소득',
      '기타'
    ];

    // 체크박스의 소득유형 목록은 표 헤더 앞에 있으므로 잘라낸다.
    let dataPart=raw;
    const headerCandidates=['소득내용 연번 상태','발생일 소득내용 연번 상태','연번 상태'];
    let cut=-1;
    for(const h of headerCandidates){
      const p=dataPart.lastIndexOf(h);
      if(p>cut) cut=p+h.length;
    }
    if(cut>=0) dataPart=norm(dataPart.slice(cut));

    // '총 N건' 이후는 첨부파일/취업여부 영역이므로 제외한다.
    const totalPos=dataPart.search(/총\s*\d+건/);
    if(totalPos>=0) dataPart=norm(dataPart.slice(0,totalPos));

    const typePositions=[];
    for(const type of types){
      let from=0;
      while(true){
        const p=dataPart.indexOf(type,from);
        if(p<0) break;
        typePositions.push({type,pos:p});
        from=p+type.length;
      }
    }
    typePositions.sort((a,b)=>a.pos-b.pos);

    const items=[];
    for(let i=0;i<typePositions.length;i++){
      const cur=typePositions[i];
      const next=typePositions[i+1]?.pos ?? dataPart.length;
      let chunk=norm(dataPart.slice(cur.pos+cur.type.length,next));
      if(!chunk) continue;

      const dm=chunk.match(/((?:19|20)\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
      if(!dm) continue;

      const date=`${dm[1]}-${String(dm[2]).padStart(2,'0')}-${String(dm[3]).padStart(2,'0')}`;
      const before=norm(chunk.slice(0,dm.index));
      let after=norm(chunk.slice((dm.index||0)+dm[0].length));

      // 발생일 앞 숫자 중 마지막 두 개가 신청소득액/소득액.
      // 그 앞에 숫자가 하나 더 있으면 조정률로 본다.
      const nums=[...before.matchAll(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g)].map(m=>m[0]);
      if(nums.length<2) continue;

      const applicationAmount=nums[nums.length-2];
      const amount=nums[nums.length-1];
      const adjustment=nums.length>=3 ? nums[nums.length-3] : '';

      // 행 마지막의 연번만 제거하고 나머지를 소득내용으로 사용.
      const seqm=after.match(/\s(\d{1,3})$/);
      const seq=seqm?seqm[1]:'';
      if(seqm) after=norm(after.slice(0,seqm.index));
      const content=after;

      const obj={
        type:cur.type,
        adjustment,
        applicationAmount,
        amount,
        date,
        content
      };

      const key=[compact(obj.type),obj.applicationAmount,obj.amount,obj.date,compact(obj.content)].join('|');
      if(!items.some(x=>x._key===key)) items.push({...obj,_key:key});
    }

    let clean=items.map(({_key,...x})=>x);

    // 화면 요약이 총 1건이면 상세도 반드시 1건만 유지한다.
    // 다건일 때도 화면 총건수를 초과하지 않도록 한다.
    if(count>0 && clean.length>count) clean=clean.slice(0,count);
    if(!count && clean.length) count=clean.length;

    // RAW 파싱이 실패했는데 합계/건수만 있는 경우는 잘못된 DOM값을 억지로 채우지 않는다.
    if(!tm && clean.length){
      const sum=clean.reduce((s,x)=>s+Number(String(x.amount||0).replace(/,/g,'')),0);
      total=sum.toLocaleString('en-US');
    }

    return {count,total,items:clean};
  }

  function employmentInfoDetailed(atoms){
    const b=robustSectionBounds(
      atoms,
      '취업여부 정보',
      ['취업지원 프로그램 참여 계획'],
      ['현재 취업(예정) 신고여부','회사명','취업형태','취업예정일','주당 근로시간']
    );
    if(!b)return {reported:'',company:'',employmentType:'',plannedDate:'',weeklyHours:'',is30Plus:false};

    const exactLabel=(names)=>{
      for(const n of names){
        const x=findAtoms(atoms,n,'exact').filter(a=>inBounds(a,b));
        if(x.length)return x.sort((a,c)=>a.rect.top-c.rect.top||a.rect.left-c.rect.left)[0];
      }
      return null;
    };

    const pickRightControl=(label,validator)=>{
      if(!label)return '';
      const cy=(label.rect.top+label.rect.bottom)/2;
      const cs=atoms.filter(a=>
        a.type==='control' &&
        inBounds(a,b) &&
        a.rect.left>=label.rect.right-8 &&
        Math.abs(((a.rect.top+a.rect.bottom)/2)-cy)<=22 &&
        a.text.length<160
      ).sort((x,y)=>x.rect.left-y.rect.left);
      for(const c of cs){
        const v=norm(c.text);
        if(v&&(!validator||validator(v)))return v;
      }
      return '';
    };

    const statusLabel=exactLabel(['현재 취업(예정) 신고여부','취업(예정) 신고여부']);
    let reported='';

    // 실제 checked radio/checkbox를 '신고여부' 행 근처에서만 찾는다.
    if(statusLabel){
      const cy=(statusLabel.rect.top+statusLabel.rect.bottom)/2;
      for(const el of allElements()){
        if(isHidden(el) || !(el instanceof HTMLInputElement) ||
           !['radio','checkbox'].includes(el.type) || !el.checked) continue;
        let r; try{r=el.getBoundingClientRect();}catch{continue;}
        if(r.top<b.top || r.top>=b.bottom)continue;
        if(r.left<statusLabel.rect.right-15)continue;
        if(Math.abs(((r.top+r.bottom)/2)-cy)>24)continue;
        const v=ctlValue(el);
        if(v.includes('없음')){reported='없음';break;}
        if(v.includes('있음')){reported='있음';break;}
      }

      // Nexacro가 native radio를 쓰지 않을 경우 같은 행의 시각적 선택상태만 확인.
      if(!reported){
        let best={v:'',score:-1};
        for(const ch of ['없음','있음']){
          for(const a of findAtoms(atoms,ch,'exact').filter(a=>
            inBounds(a,b) &&
            a.rect.left>=statusLabel.rect.right-15 &&
            Math.abs(((a.rect.top+a.rect.bottom)/2)-cy)<=24
          )){
            let score=0;
            for(const n of [a.el,a.el.parentElement]){
              if(!n)continue;
              const cl=norm(n.className);
              if(/active|selected|on|checked|current/i.test(cl))score+=6;
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
        if(best.score>=3)reported=best.v;
      }
    }

    // '없음'이면 뒤쪽 비활성 필드는 아예 무시.
    if(reported==='없음'){
      return {reported:'없음',company:'',employmentType:'',plannedDate:'',weeklyHours:'',is30Plus:false};
    }

    const lCompany=exactLabel(['회사명']);
    const lType=exactLabel(['취업형태']);
    const lDate=exactLabel(['취업예정일자','취업예정일']);
    const lHours=exactLabel(['주당 근로시간 (시간/주)','주당 근로시간']);

    const company=pickRightControl(lCompany,v=>
      !cleanDate(v)&&!looseDate(v)&&
      !['없음','있음','회사명','선택','비고','-','- -'].includes(v)&&
      !/^\d+회차/.test(v)&&
      !/^A\d{10,}$/i.test(v)&&
      !/^K\d{10,}$/i.test(v)&&
      !/국민취업지원제도|좋은일자리|고용센터/.test(v)
    );

    const employmentTypeTerms=[
      '근로자','임금근로자','프리랜서','상용직','일용직','정규직','계약직','기간제','기간제근로자',
      '시간제','단시간근로','아르바이트','자영업','창업',
      '특수형태근로종사자','특수고용','특고','파견근로','파견','용역'
    ];
    let employmentType=pickRightControl(lType,v=>employmentTypeTerms.includes(norm(v)));

    if(!employmentType && lType){
      const cy=(lType.rect.top+lType.rect.bottom)/2;
      const known=atoms.filter(a=>
        inBounds(a,b) &&
        employmentTypeTerms.includes(norm(a.text)) &&
        a.rect.left>=lType.rect.right-12 &&
        Math.abs(((a.rect.top+a.rect.bottom)/2)-cy)<=26
      ).sort((x,y)=>x.rect.left-y.rect.left);
      if(known.length)employmentType=norm(known[0].text);
    }

    const dateRaw=pickRightControl(lDate,v=>!!(looseDate(v)||cleanDate(v)));
    const plannedDate=looseDate(dateRaw)||cleanDate(dateRaw);
    const hr=pickRightControl(lHours,v=>/^\d+(?:\.\d+)?$/.test(norm(v)));
    const weeklyHours=(norm(hr).match(/\d+(?:\.\d+)?/)||[])[0]||'';

    // 선택상태를 못 읽었을 때는 실제 입력값 조합으로 보조판정한다.
    // Work24에서 '있음'을 선택하면 회사명·취업예정일·주당근로시간 필드가 비활성 상태로 보이는 경우가 있어
    // 취업형태 라디오를 못 읽더라도 회사명 + (취업일/근로시간/형태 중 1개)면 '있음'으로 본다.
    if(!reported){
      const meaningful=[company,employmentType,plannedDate,weeklyHours].filter(Boolean).length;
      if((employmentType && meaningful>=2) || (company && meaningful>=2))reported='있음';
    }

    // 신고여부가 확인되지 않았고 실제 취업정보도 없으면 빈값으로 둔다.
    if(reported!=='있음' && !company && !employmentType && !plannedDate && !weeklyHours){
      return {reported:reported||'',company:'',employmentType:'',plannedDate:'',weeklyHours:'',is30Plus:false};
    }

    const is30Plus=reported==='있음' && Number(weeklyHours)>=30;
    return {reported,company,employmentType,plannedDate,weeklyHours,is30Plus};
  }

  function employmentSupportInfoSafe(atoms, supportStart='', supportEnd=''){
    const knownTypes=['직업훈련','취업특강','일경험지원','일경험','취업알선','해외취업','창업','창직'];

    const cleanPhone=v=>{
      const m=norm(v).match(/0\d{1,2}-\d{3,4}-\d{4}/);
      return m?m[0]:'';
    };

    const parseDateRange=(s)=>{
      const m=norm(s).match(/((?:19|20)\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\.?\s*~\s*((?:19|20)\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\.?/);
      if(!m)return null;
      const d1=`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
      const d2=`${m[4]}-${String(m[5]).padStart(2,'0')}-${String(m[6]).padStart(2,'0')}`;
      return {d1,d2,raw:m[0],index:m.index};
    };

    const overlapsCurrent=(d1,d2)=>{
      if(!supportStart || !supportEnd)return true;
      return !(d2 < supportStart || d1 > supportEnd);
    };

    const stripHeaders=(s,isResult)=>{
      let t=norm(s);
      const words=isResult
        ? ['취업지원 프로그램 참여 결과 보고','접수내역','등록구분','구분','프로그램명','참여기간','운영기관명','전화번호','연번','상태']
        : ['취업지원 프로그램 참여 계획','구분','프로그램명','참여기간','운영기관명','전화번호','연번'];
      for(const w of words){
        const re=new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
        t=t.replace(re,' ');
      }
      return norm(t);
    };

    // Work24/Nexacro 원문에는 표 행이 순서대로 정확히 들어 있으므로
    // 섹션 원문에서 "구분 → 프로그램명 → 기간 → 기관 → 전화 → 연번" 순으로 직접 파싱한다.
    const parseRawRows=(raw,isResult=false)=>{
      raw=stripHeaders(raw,isResult);
      if(!raw)return [];
      if(!isResult && /등록된\s*참여계획이\s*없습니다/.test(raw))return [];

      const starts=[];
      for(const type of knownTypes){
        let pos=0;
        while(true){
          const p=raw.indexOf(type,pos);
          if(p<0)break;
          const before=p>0?raw[p-1]:' ';
          const after=raw[p+type.length]||' ';
          // '입사지원서(취업알선상담 포함)제출' 속의 '취업알선'처럼
          // 다른 문구에 포함된 부분문자열은 취업지원 프로그램 구분으로 보지 않는다.
          if((p===0 || /[\s\d]/.test(before)) && /\s/.test(after)){
            starts.push({type,pos:p});
          }
          pos=p+type.length;
        }
      }
      starts.sort((a,b)=>a.pos-b.pos);

      const out=[];
      for(let i=0;i<starts.length;i++){
        const cur=starts[i];
        const next=starts[i+1]?.pos ?? raw.length;

        // 결과행은 "인터넷 등록 직업훈련 ..." 형태라서 현재 type 앞의 등록구분을 따로 본다.
        const prefix=norm(raw.slice(Math.max(0,cur.pos-40),cur.pos));
        let registration='';
        if(isResult){
          if(/인터넷\s*등록/.test(prefix))registration='인터넷 등록';
          else if(/워크넷\s*등록/.test(prefix))registration='워크넷 등록';
        }

        let chunk=norm(raw.slice(cur.pos+cur.type.length,next));
        if(!chunk)continue;

        const dr=parseDateRange(chunk);
        if(!dr)continue;

        let program=norm(chunk.slice(0,dr.index));
        // 앞쪽에 등록구분/연번 같은 잔여 토큰 제거
        program=program
          .replace(/^(?:인터넷\s*등록|워크넷\s*등록|선택|상태|연번)\s*/,'')
          .replace(/^\d{1,3}\s+/,'')
          .trim();

        if(!program || /^\d{4}-\d{2}-\d{2}$/.test(program))continue;
        if(program.length>180 || /(Frame Work|IAP이행보고|고용보험 가입이력|고용보험 일용근로이력|산재보험 가입정보|사업자조회|휴직정보|행삭제|파일추가)/.test(program))continue;

        let tail=norm(chunk.slice(dr.index+dr.raw.length));
        const phone=cleanPhone(tail);

        let institution='';
        if(phone){
          const p=tail.indexOf(phone);
          institution=norm(tail.slice(0,p));
          tail=norm(tail.slice(p+phone.length));
        }else{
          // 전화번호가 없는 예외는 마지막 연번 전까지를 기관명으로 본다.
          institution=norm(tail.replace(/\s+\d{1,3}(?:\s+선택)?$/,''));
        }

        institution=institution
          .replace(/^(?:운영기관명|전화번호)\s*/,'')
          .replace(/(?:선택|행삭제|사이버진로교육센터 조회).*$/,'')
          .trim();
        if(institution.length>160 || /(Frame Work|IAP이행보고|고용보험 가입이력|고용보험 일용근로이력|산재보험 가입정보|사업자조회|휴직정보)/.test(institution))continue;

        const seqm=tail.match(/(?:^|\s)(\d{1,3})(?:\s|$)/);
        const seq=seqm?seqm[1]:'';

        if(!overlapsCurrent(dr.d1,dr.d2))continue;

        const obj=isResult
          ? {seq,registration,type:cur.type,program,period:`${dr.d1} ~ ${dr.d2}`,institution,phone}
          : {seq,type:cur.type,program,period:`${dr.d1} ~ ${dr.d2}`,institution,phone};

        const key=[compact(obj.type),compact(obj.program),obj.period,compact(obj.institution),obj.phone].join('|');
        if(!out.some(x=>x._key===key))out.push({...obj,_key:key});
      }

      return out.map(({_key,...x})=>x);
    };

    const planRaw=currentSectionRegion(
      ['취업지원 프로그램 참여 계획'],
      ['취업지원 프로그램 참여 결과 보고'],
      12000,
      supportStart,supportEnd
    );
    const resultRaw=currentSectionRegion(
      ['취업지원 프로그램 참여 결과 보고'],
      ['구직활동지원 프로그램 활동 계획'],
      12000,
      supportStart,supportEnd
    );

    let plans=parseRawRows(planRaw,false);
    let results=parseRawRows(resultRaw,true);

    // RAW 파싱이 안 된 특이 화면만 기존 Grid 좌표 파서를 보조로 사용한다.
    const fallbackGrid=(title,nextTitle,isResult)=>{
      const rows=gridRows(
        atoms,
        title,
        [nextTitle],
        isResult
          ? ['연번','상태','등록구분','구분','프로그램명','참여기간','운영기관명','전화번호']
          : ['연번','구분','프로그램명','참여기간','운영기관명','전화번호']
      ).rows||[];

      const out=[];
      for(const r of rows){
        const type=norm(r['구분']||'');
        const program=norm(r['프로그램명']||'');
        const ds=allDates(norm(r['참여기간']||''));
        if(!knownTypes.includes(type) || !program || ds.length<2)continue;
        if(!overlapsCurrent(ds[0],ds[1]))continue;
        const obj=isResult
          ? {
              seq:norm(r['연번']||''),
              registration:norm(r['등록구분']||''),
              type,program,
              period:`${ds[0]} ~ ${ds[1]}`,
              institution:norm(r['운영기관명']||''),
              phone:cleanPhone(r['전화번호']||'')
            }
          : {
              seq:norm(r['연번']||''),
              type,program,
              period:`${ds[0]} ~ ${ds[1]}`,
              institution:norm(r['운영기관명']||''),
              phone:cleanPhone(r['전화번호']||'')
            };
        out.push(obj);
      }
      return out;
    };

    if(!plans.length){
      plans=fallbackGrid('취업지원 프로그램 참여 계획','취업지원 프로그램 참여 결과 보고',false);
    }
    if(!results.length){
      results=fallbackGrid('취업지원 프로그램 참여 결과 보고','구직활동지원 프로그램 활동 계획',true);
    }

    return {
      plans,
      results,
      planEmpty:plans.length===0,
      resultEmpty:results.length===0,
      needsSample:false,
      planCount:plans.length,
      resultCount:results.length,
      planRaw:planRaw.slice(0,5000),
      resultRaw:resultRaw.slice(0,5000)
    };
  }

  function supplementRows(atoms){
    const b=sectionBounds(atoms,'보완요청 내역',['검토결과','가족수당','구직촉진수당 지급 요청']);
    if(!b)return [];

    // 실제 사유 입력값을 먼저 찾는다. '보완 완료일' 같은 헤더는 input 값이 아니므로 자연스럽게 제외된다.
    let reason='', reasonEl=null;
    for(const root of rootsDeep()){
      let cs=[]; try{cs=[...root.querySelectorAll('input,select,textarea')];}catch{}
      for(const c of cs){
        if(c instanceof HTMLInputElement && ['hidden','button','submit','reset','file'].includes(c.type))continue;
        const v=ctlValue(c); if(!v || v.length<4)continue;
        let r;try{r=c.getBoundingClientRect();}catch{continue;}
        if(r.top<b.top-5 || r.top>=b.bottom+40)continue;
        if(/보완/.test(v) && !/^(보완|보완요청|보완 완료일|보완요청 사유)$/.test(v) && !cleanDate(v)){
          if(v.length>reason.length){reason=v;reasonEl=c;}
        }
      }
    }

    // 사유 컨트롤의 가장 작은 행 컨테이너에서 날짜를 수집
    let dates=[];
    if(reasonEl){
      let n=reasonEl;
      for(let i=0;i<8 && n;i++,n=n.parentElement){
        const tx=norm(n.innerText||n.textContent||'');
        if(/보완\s*기간/.test(tx) && /보완\s*완료일/.test(tx)){
          const ds=[];
          try{
            for(const c of n.querySelectorAll('input,select,textarea')){
              const d=cleanDate(ctlValue(c)); if(d&&!ds.includes(d))ds.push(d);
            }
          }catch{}
          if(ds.length){dates=ds;break;}
        }
      }
    }

    // 행 컨테이너에서 날짜가 부족하면 섹션 내 실제 date 값만 추가
    if(dates.length<3){
      const ds=[...dates];
      for(const root of rootsDeep()){
        let cs=[]; try{cs=[...root.querySelectorAll('input,select,textarea')];}catch{}
        for(const c of cs){
          const d=cleanDate(ctlValue(c)); if(!d)continue;
          let r;try{r=c.getBoundingClientRect();}catch{continue;}
          if(r.top<b.top-5 || r.top>=b.bottom+40)continue;
          if(!ds.includes(d))ds.push(d);
        }
      }
      dates=ds;
    }

    // Nexacro가 동일 날짜 입력을 DOM 하나로만 노출하는 경우를 위한 보조 텍스트.
    if(!reason){
      const label=findAtoms(atoms,'보완요청 사유','exact').filter(a=>inBounds(a,b))[0];
      if(label){
        let n=label.el;
        for(let i=0;i<7 && n;i++,n=n.parentElement){
          const tx=elementText(n);
          const m=tx.match(/([^\n]{2,120}보완[^\n]{0,120})/);
          if(m && !/보완요청\s*사유|보완\s*완료일/.test(norm(m[1]))){reason=norm(m[1]);break;}
        }
      }
    }

    // 실제 보완요청은 반드시 사유가 있어야 한다. 헤더만 있는 빈 행/기본 날짜는 제외.
    if(!reason)return [];
    const startDate=dates[0]||'';
    const endDate=dates[1]||startDate;
    const completedDate=dates[2]||dates[dates.length-1]||startDate;
    return [{status:'',startDate,endDate,reason:norm(reason),completedDate}];
  }

  function reviewInfo(atoms){
    const b=robustSectionBounds(atoms,'검토결과',['가족수당','구직촉진수당 지급 요청'],['보고진행상태','보고서 제출일','검토승인결과']);
    const reportStatus=b?(sameRowValue(atoms,'보고진행상태',b,v=>/^(제출|미제출)$/.test(v))||checkedChoice('보고진행상태',['제출','미제출'],atoms,b)):'';
    const submitDate=b?cleanDate(sameRowValue(atoms,'보고서 제출일',b,v=>!!cleanDate(v))):'';
    const result=b?checkedChoice('검토승인결과',['지급','일부지급','미지급'],atoms,b):'';
    const badReason=/(휴직정보|고용보험|사업장관리번호|사업자조회|Frame Work|IAP이행보고|취업지원\/구직활동 상담정보|특화사업 정보|취업역량평가|지급계획)/;
    const reason=b?sameRowValue(atoms,'결과사유선택',b,v=>v!=='선택'&&v.length>1&&v.length<120&&!badReason.test(v)):'';
    return {reportStatus,submitDate,result,reason};
  }

  function paymentInfo(atoms){
    const b=sectionBounds(atoms,'구직촉진수당 지급 요청',[]);
    if(!b)return {type:'',decision:'',requestDate:'',reason:'',totalRequest:'',basicAmount:'',familyAmount:'',totalIncome:'',extraReduction:''};
    const type=checkedChoice('지급구분',['정상지급','추가지급'],atoms,b);
    const decision=checkedChoice('지급여부',['지급','부지급'],atoms,b);
    const requestDate=cleanDate(sameRowValue(atoms,'요청일자',b,v=>!!cleanDate(v)));
    const reason=sameRowValue(atoms,'신청사유',b,v=>v!=='선택'&&v.length>2&&!/^\d{2}:\d{2}:\d{2}$/.test(v));
    const m=(label)=>cleanMoney(sameRowValue(atoms,label,b,v=>/^-?\d[\d,]*$/.test(norm(v))));
    return {type,decision,requestDate,reason,totalRequest:m('총요청금액 (원)')||m('총요청금액(원)')||m('총요청금액'),basicAmount:m('기본금'),familyAmount:m('가족수당'),totalIncome:m('총소득금액'),extraReduction:m('추가감액금액')};
  }

  async function extractAllowance(){
    const body=norm(document.body?.innerText||'');
    const titleOk=/구직촉진수당\s*등록/.test(body)||/구직촉진수당\s*등록/.test(document.title||'');

    // 중요: 검토결과/지급요청 등 안정적으로 읽히던 값은 스크롤 조작 전에 먼저 수집한다.
    const atoms0=textAtoms();
    const round=activeRound();
    const processStatus=selectedProcessStatus();
    const report=reportRowFromText(round);
    const activities=activityRows(atoms0);
    const income=incomeInfoDetailed(atoms0);
    const employment=employmentInfoDetailed(atoms0);
    const employmentSupport=employmentSupportInfoSafe(atoms0,report.supportStart||'',report.supportEnd||'');
    const supplements=supplementRows(atoms0);
    const review=reviewInfo(atoms0);
    const payment=paymentInfo(atoms0);

    // 구직활동 계획은 내부 가상스크롤을 움직여야 할 수 있으므로 마지막에 별도 수집한다.
    const planCollect=await collectJobSearchPlans(report.supportStart||'',report.supportEnd||'');
    const jobSearchPlans=planCollect.rows;

    const data={
      round:round||report.round||'',
      supportStart:report.supportStart||'',supportEnd:report.supportEnd||'',designatedDate:report.designatedDate||'',
      processStatus,reportProgress:report.reportProgress||'',reportSubmitDate:report.reportSubmitDate||'',submitted:report.submitted||'',
      jobSearchPlans,activities,income,employment,employmentSupport,supplements,review,payment
    };
    const checks=[data.round,data.supportStart&&data.supportEnd,data.designatedDate,processStatus,data.reportProgress,data.reportSubmitDate,jobSearchPlans.length?'구직활동계획':'',activities.length?'활동':'',income.total!==''?'소득':'',employment.reported?'취업여부':'',supplements.length?'보완':'',review.result||review.reportStatus,payment.totalRequest||payment.basicAmount||payment.type||payment.decision];
    const found=checks.filter(Boolean).length;
    return {ok:titleOk&&found>=4,found,total:checks.length,data,debug:{
      url:location.href,title:document.title,titleOk,bodyChars:(document.body?.textContent||'').length,
      reportRegion:report.region||'',
      jobSearchPlanCount:jobSearchPlans.length,jobSearchPlanRows:jobSearchPlans,
      jobSearchPlanRaw:currentSectionRegion(['구직활동지원 프로그램 활동 계획'],['구직활동지원 프로그램 활동 결과 보고'],12000,report.supportStart||'',report.supportEnd||'').slice(0,6000),
      nexacroProbe:planCollect.probe||null,
      activitySection:!!sectionBounds(atoms0,'구직활동지원 프로그램 활동 결과 보고',['이행보고 전달사항','이행보고 첨부자료','보완요청 내역','검토결과']),activityCount:activities.length,activityRows:activities,
      activityRaw:norm(bodyRegion(['구직활동지원 프로그램 활동 결과 보고'],['이행보고 전달사항','이행보고 첨부자료','보완요청 내역','검토결과'],18000)).slice(0,5000),
      income,incomeRaw:norm(bodyRegion(['소득발생내역'],['소득 등 기타 증빙자료'],7000)).slice(0,3500),
      employment,employmentRaw:norm(bodyRegion(['취업여부 정보'],['취업지원 프로그램 참여 계획'],5000)).slice(0,2500),
      employmentSupport,
      supplementSection:!!sectionBounds(atoms0,'보완요청 내역',['검토결과','가족수당','구직촉진수당 지급 요청']),supplementRows:supplements,
      supplementRaw:norm(bodyRegion(['보완요청 내역'],['검토결과','가족수당','구직촉진수당 지급 요청'],6000)).slice(0,2500),
      payment,raw:{round:data.round,supportPeriod:[data.supportStart,data.supportEnd],designatedDate:data.designatedDate,reportProgress:data.reportProgress,reportSubmitDate:data.reportSubmitDate,submitted:data.submitted,review,payment}
    }};
  }

  chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
    if(msg?.type==='GUKCHWI_ALLOWANCE_PING'){sendResponse({ok:true,url:location.href});return;}
    if(msg?.type==='GUKCHWI_EXTRACT_ALLOWANCE'){
      (async()=>{
        try{sendResponse(await extractAllowance());}
        catch(e){sendResponse({ok:false,found:0,total:13,data:{},error:String(e),debug:{url:location.href,title:document.title,stack:e?.stack||''}});}
      })();
      return true;
    }
  });
})();
