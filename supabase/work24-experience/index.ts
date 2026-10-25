import {query,searchUrl,parseList} from './catalog.mjs';
const ORIGIN='https://careercounselor1984-code.github.io';
const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const cache=new Map(),flights=new Map();
async function load(q){const r=await fetch(searchUrl(q),{redirect:'error',signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('고용24 연결이 지연되고 있습니다.');const s=await r.text();if(s.length>2000000)throw Error('고용24 응답 크기 초과');return {...parseList(s,q),fetchedAt:new Date().toISOString()};}
Deno.serve(async req=>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==ORIGIN)return reply({ok:false,error:'허용되지 않은 출처'},403);
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({ok:false,error:'POST only'},405);
 let q;try{const s=await req.text();if(s.length>2048)return reply({ok:false,error:'요청 크기 초과'},413);q=query(JSON.parse(s));}catch{return reply({ok:false,error:'검색조건을 확인해 주세요.'},400);}
 try{const key=JSON.stringify(q),prior=cache.get(key);if(prior&&Date.now()-prior.at<300000)return reply(prior.data);if(!flights.has(key)){if(flights.size>=8)return reply({ok:false,error:'조회가 많습니다. 잠시 후 다시 검색해 주세요.'},429);flights.set(key,load(q).then(data=>{cache.set(key,{at:Date.now(),data});if(cache.size>100)cache.delete(cache.keys().next().value);return data;}).finally(()=>flights.delete(key)));}return reply(await flights.get(key));}
 catch{return reply({ok:false,error:'고용24 일경험 목록을 불러오지 못했습니다. 잠시 후 다시 검색하거나 고용24 원문에서 확인해 주세요.'},502);}
});
