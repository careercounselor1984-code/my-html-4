import {courseInfo,scheduleResult} from './schedule.mjs';
const origin='https://careercounselor1984-code.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const answer=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const cache=new Map(),flights=new Map();
const ROOT='https://www.work24.go.kr/hr/a/a/3100/';
async function load(course){
 const url=ROOT+'selectTracseDetl.do?'+new URLSearchParams({tracseId:course.trainingId,tracseTme:course.round,trainstCstmrId:course.institutionId});
 const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('고용24 과정 조회 실패');const html=await r.text();if(html.length>2000000)throw Error('고용24 응답 크기 초과');
 const info=courseInfo(html,course);
 const cookies=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 const response=await fetch(ROOT+'selectTracseTimeTable.do',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:cookies,Referer:url},body:info.params,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('고용24 시간표 조회 실패');const text=await response.text();if(text.length>3000000)throw Error('고용24 시간표 응답 크기 초과');
 return {ok:true,...course,...scheduleResult(info,text),url};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return answer({ok:false,error:'POST only'},405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return answer({ok:false,error:'허용되지 않은 출처'},403);
 try{
  const text=await req.text();if(text.length>2048)return answer({ok:false,error:'요청 크기 초과'},413);const b=JSON.parse(text);
  const course={trainingId:String(b.trainingId||''),round:String(b.round||''),institutionId:String(b.institutionId||'')};
  if(!/^[A-Z0-9_-]{6,35}$/.test(course.trainingId)||!/^\d{1,4}$/.test(course.round)||!/^\d{7,20}$/.test(course.institutionId))return answer({ok:false,error:'과정 ID·회차·기관 ID 확인 필요'},400);
  const key=JSON.stringify(course),prior=cache.get(key);if(prior&&Date.now()-prior.at<900000)return answer(prior.data);
  if(!flights.has(key)){if(flights.size>=8)return answer({ok:false,error:'조회가 많습니다. 잠시 후 다시 확인해 주세요.'},429);flights.set(key,load(course).then(data=>{cache.set(key,{at:Date.now(),data});if(cache.size>200)cache.delete(cache.keys().next().value);return data;}).finally(()=>flights.delete(key)));}
  return answer(await flights.get(key));
 }catch{return answer({ok:false,error:'훈련시간표 자동조회 미완료 · 고용24 원문 또는 수업요일을 확인해 주세요.'},502);}
});
