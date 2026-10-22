(function(root){'use strict';
const clean=v=>String(v||'').replace(/\s+/g,'').normalize('NFKC');
function counts(plan,schedules){
 return (plan?.jobRows||[]).filter(r=>/직업훈련/.test(r.kind||'')).map(row=>{
  const candidates=Object.values(schedules||{}).filter(s=>s?.info?.courseName&&clean(s.info.courseName)===clean(row.name)&&(!row.org||(s.info.institute&&clean(row.org)===clean(s.info.institute)))&&s.info.period?.start<=row.start&&s.info.period?.end>=row.end&&/^\d{4}-\d{2}-\d{2}$/.test(row.start||'')&&row.start<=row.end&&Array.isArray(s.dates)&&s.dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d))&&new Set(s.dates).size===s.verifiedCount);
  const out={name:row.name,start:row.start,end:row.end,cycle:row.jobCycle||'',matched:false};
  if(candidates.length!==1)return {...out,reason:candidates.length?'동일 이름의 과정이 여러 개입니다. 과정·기관·기간 확인 필요':'해당 과정의 실제 시간표를 먼저 계산하세요.'};
  const s=candidates[0],dates=[...new Set(s.dates)].filter(d=>d>=row.start&&d<=row.end);
  return {...out,matched:true,count:dates.length,dates,source:s.source,calculatedAt:s.calculatedAt};
 });
}

root.ClgTrainingCounts={counts};if(typeof module!=='undefined'&&module.exports)module.exports={counts};
})(typeof window!=='undefined'?window:globalThis);
