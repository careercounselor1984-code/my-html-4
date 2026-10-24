export const iso=v=>{const s=String(v||'').replace(/\D/g,'');if(!/^\d{8}$/.test(s))return '';const x=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6);return Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x?x:'';};
const decode=s=>String(s||'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
const plain=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function attributes(tag){const a={};for(const m of tag.matchAll(/([\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g))a[m[1].toLowerCase()]=decode(m[3]);return a;}
export function courseInfo(html,expected){
 const form=html.match(/<form\b[^>]*id=["']searchForm1["'][^>]*>([\s\S]*?)<\/form>/i)?.[1];if(!form)throw Error('고용24 과정정보 형식 변경 · 원문 확인 필요');
 const values={};for(const m of form.matchAll(/<input\b[^>]*>/gi)){const a=attributes(m[0]);if(a.name)values[a.name]=a.value||'';}
 if(values.tracseId!==expected.trainingId||String(values.tracseTme)!==String(expected.round)||values.trainstCstmrId!==expected.institutionId)throw Error('고용24 과정·회차·기관 불일치');
 const start=iso(values.tracseBeginDe),end=iso(values.tracseEndDe);if(!start||!end||end<start)throw Error('고용24 훈련기간 확인 필요');
 const daysMatch=plain(html.match(/<em\b[^>]*>\s*훈련시간\s*<\/em>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'').match(/([\d,]+)\s*일\s*,?\s*총\s*([\d,.]+)\s*시간/);
 const totalDays=daysMatch?Number(daysMatch[1].replace(/,/g,'')):null,totalHours=daysMatch?Number(daysMatch[2].replace(/,/g,'')):null;
 const allowed=['tracseId','tracseTme','tracseBeginDe','tracseEndDe','crseTracseSe','mainTracseSe','trainstCstmrId'];
 const params=new URLSearchParams(allowed.filter(k=>values[k]).map(k=>[k,values[k]]));
 const csrf=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0])).find(a=>a.name==='_csrf')?.content;if(csrf)params.set('_csrf',csrf);
 return {start,end,totalDays,totalHours,params};
}
export function timetableDates(html,start,end){
 const days=new Set();for(const m of html.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)){const a=attributes(m[1]);if(!/(?:^|\s)dt2-\d{8}(?:\s|$)/.test(a.class||''))continue;if(!/^훈련$/.test(plain(m[2])))continue;const date=iso(a['data-itemtype']);if(date&&date>=start&&date<=end)days.add(date);}
 return [...days].sort();
}
export function scheduleResult(info,html){const dates=timetableDates(html,info.start,info.end);return {start:info.start,end:info.end,totalDays:info.totalDays,totalHours:info.totalHours,dates,complete:Number.isInteger(info.totalDays)&&info.totalDays>0&&dates.length===info.totalDays,source:'고용24 공개 훈련시간표',checkedAt:new Date().toISOString()};}
