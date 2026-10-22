(function(root){
  'use strict';
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const dateToken='(?:(?:19|20)\\d{2}\\s*[-./]\\s*\\d{1,2}\\s*[-./]\\s*\\d{1,2}|(?:19|20)\\d{6})';
  const rangeSource='('+dateToken+')\\.?\\s*(?:~|～|〜|–|—|부터)\\s*('+dateToken+')\\.?';
  function iso(v){
    const n=String(v||'').replace(/\D/g,'');
    const m=String(v||'').match(/((?:19|20)\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    const s=m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):n.length===8?n.slice(0,4)+'-'+n.slice(4,6)+'-'+n.slice(6,8):'';
    if(!s)return '';const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s?s:'';
  }
  const types=['집단상담프로그램','단기집단상담','단기취업특강','심리안정지원프로그램','심리안정지원','취업역량강화프로그램','일경험지원','직업훈련','취업특강','집단상담','심리안정','심리검사','자격증시험응시','일경험','취업알선','해외취업','창업지원','창업','창직'];
  function heading(raw){
    let s=text(raw);
    // Registration labels may be joined (인터넷등록), omitted, or surrounded by grid buttons.
    const markers=[...s.matchAll(/(?:인터넷|워크넷|전산|직접)\s*등록(?=\s|$)/g)];
    const marker=markers.at(-1);
    if(marker)s=s.slice(marker.index+marker[0].length).trim();
    else{const end=s.lastIndexOf('전화번호');if(end>=0)s=s.slice(end+4).trim();}
    s=s.replace(/^(?:(?:\d{1,3}|선택|완료|제출|이행)\s+)*/,'').trim();
    const type=types.find(t=>s.startsWith(t));
    if(type){const program=s.slice(type.length).trim();return program?{type,program}:null;}
    // Unknown categories require an explicit registration boundary, never guess from a header.
    if(marker){const m=s.match(/^(\S{1,30})\s+(.+)$/);if(m&&/^[가-힣A-Za-z][가-힣A-Za-z0-9·()/-]{0,29}$/.test(m[1]))return {type:m[1],program:m[2]};}
    // A no-registration row can follow a phone/sequence left over from the preceding row.
    for(const t of types){const re=new RegExp('(?:^|\\s)('+t+')\\s+(.+)$'),m=s.match(re);if(m)return {type:m[1],program:m[2]};}
    return null;
  }
  function parse(d){
    const support=d?.employmentSupport||{},provided=Array.isArray(support.results)?support.results:[];
    const raw=text(support.resultRaw||'');
    // v1.4.29 verifies the actual select/input controls; body text can legitimately omit them.
    if(/^bounded-grid-controls-v1(?:49|50)$/.test(support.diagnostics?.source||'')&&support.resultUnresolved===false){
      const valid=provided.every(row=>{
        const range=text(row.period).match(new RegExp(rangeSource));
        return text(row.type)&&text(row.program)&&range&&iso(range[1])&&iso(range[2])&&iso(range[1])<=iso(range[2]);
      });
      const unread=!valid;
      return {rows:provided.slice(),unread,reasons:unread?['전산의 취업지원 결과 행 확인 필요']:[],raw};
    }
    const matches=[...raw.matchAll(new RegExp(rangeSource,'g'))];
    const rows=provided.slice(),reasons=[];
    const key=r=>[text(r.type).replace(/\s/g,''),text(r.program).replace(/\s/g,''),text(r.period).match(new RegExp(rangeSource))?.slice(1).map(iso).join('|')||text(r.period)].join('|');
    let previousEnd=0,currentRanges=0,recoveredRanges=0;
    for(let i=0;i<matches.length;i++){
      const range=matches[i],start=iso(range[1]),end=iso(range[2]);
      const prefix=raw.slice(previousEnd,range.index);previousEnd=range.index+range[0].length;
      if(!start||!end||start>end){reasons.push('참여기간 날짜 확인 필요');continue;}
      if((d.supportStart&&end<iso(d.supportStart))||(d.supportEnd&&start>iso(d.supportEnd)))continue;
      currentRanges++;
      const h=heading(prefix);
      if(!h||h.program.length>180){reasons.push('프로그램 구분·명칭 확인 필요');continue;}
      let tail=raw.slice(previousEnd,matches[i+1]?.index??raw.length);
      // Stop before the next row or trailing grid controls; those are not institution names.
      tail=tail.split(/(?:인터넷|워크넷|전산|직접)\s*등록|사이버진로교육센터\s*조회|행삭제|구직활동지원\s*프로그램/)[0];
      const phone=tail.match(/(?:0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}|1[568]\d{2}[- ]?\d{4})/)?.[0]||'';
      let institution=text(phone?tail.slice(0,tail.indexOf(phone)):tail);
      institution=institution.replace(/(?:\s+\d{1,3})?(?:\s+선택)?$/,'').trim();
      // A following row without registration must not leak into this row's institution.
      const nextType=types.map(t=>institution.indexOf(t)).filter(n=>n>=0).sort((a,b)=>a-b)[0];
      if(nextType!==undefined)institution=institution.slice(0,nextType).replace(/\s+\d{1,3}\s*$/,'').trim();
      if(institution.length>160||/고용보험|산재보험|사업자조회/.test(institution)){reasons.push('운영기관 확인 필요');continue;}
      const row={...h,period:start+' ~ '+end,institution,phone};recoveredRanges++;
      const conflict=rows.some(x=>text(x.type)===text(row.type)&&text(x.program)===text(row.program)&&key(x)!==key(row));
      if(conflict)reasons.push('표와 원문의 참여기간 충돌');
      else if(!rows.some(x=>key(x)===key(row)))rows.push(row);
    }
    const expected=Number(support.resultCount||0);
    if(expected>rows.length||currentRanges>rows.length)reasons.push('원문과 추출 건수 불일치');
    if(raw.length>=5000)reasons.push('전달 원문이 잘렸을 수 있음');
    const registrations=[...raw.matchAll(/(?:인터넷|워크넷|전산|직접)\s*등록(?=\s|$)/g)].length;
    if(registrations>matches.length)reasons.push('참여기간 미인식');
    if(support.resultUnresolved===true&&!(currentRanges>0&&recoveredRanges===currentRanges&&reasons.length===0))reasons.push('전산 추출 확인 필요');
    if((support.needsSample===true||support.resultUnresolved===true)&&!rows.length)reasons.push('전산 추출 확인 필요');
    // A valid structured row already verifies its matching text, including phone/control differences.
    return {rows,unread:reasons.length>0,reasons:[...new Set(reasons)],raw};
  }
  if(typeof module==='object'&&module.exports)module.exports=parse;
  if(root)root.clgParseAllowanceSupport=parse;
})(typeof window==='object'?window:null);
