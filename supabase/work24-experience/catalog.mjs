/* Read-only public catalog from the official Youth Work24 portal. */
export const ROOT='https://yw.work24.go.kr';
export const TYPES={I:'인턴형',P:'프로젝트형',E:'ESG지원형',C:'기업탐방형',Z:'타기관 사업'};
export const REGIONS={'':'전국','31000':'울산','26000':'부산','27000':'대구','48000':'경남','47000':'경북','11000':'서울','41000':'경기','28000':'인천','30000':'대전','36000':'세종','44000':'충남','43000':'충북','29000':'광주','46000':'전남','52000':'전북','51000':'강원','50000':'제주','99999':'지역무관'};
export function query(input={}){
 const keyword=String(input.keyword??'').trim(),field=input.field??'program',region=String(input.region??''),type=String(input.type??''),page=Number(input.page??1);
 if(keyword.length>100||/[\x00-\x1f]/.test(keyword)||!['program','company','agency'].includes(field)||!Object.hasOwn(REGIONS,region)||(type&&!Object.hasOwn(TYPES,type))||!Number.isInteger(page)||page<1||page>1000)throw Error('검색어·검색조건을 확인해 주세요.');
 return {keyword,field,region,type,page,includeClosed:input.includeClosed===true};
}
export function searchUrl(input){const q=query(input),p=new URLSearchParams({currentPageNo:String(q.page),recordCountPerPage:'12',listCnt:'12',sortOption:'C'});if(q.keyword)p.set({program:'pgnm',company:'prtcInstNm',agency:'operInstNm'}[q.field],q.keyword);if(q.region)p.set('areaCd',q.region);if(q.type)p.set('prgmSecd',q.type);if(q.includeClosed)p.set('closeYnInc','Y');return ROOT+'/d/a/selectWkexPrgmList.do?'+p;}
export function text(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);?/gi,(_,v)=>{const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp|middot);/g,(_,k)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',middot:'·'}[k])).replace(/[\u200b-\u200f\ufeff]/g,'').replace(/\s+/g,' ').trim();}
export function range(value){const dates=[...String(value||'').matchAll(/\b(\d{4}|\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/g)].map(m=>(m[1].length===2?'20'+m[1]:m[1])+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'));const valid=s=>{const n=Date.parse(s+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s;};return dates.length===2&&dates.every(valid)&&dates[1]>=dates[0]?{start:dates[0],end:dates[1]}:{start:'',end:''};}
export function parseList(html,input={}){
 const q=query(input),s=String(html||'').replace(/<!--[\s\S]*?-->/g,''),count=s.match(/totalRecordCount\s*:\s*["'](\d+)["']/)?.[1];if(count===undefined)throw Error('고용24 검색 결과 형식을 확인할 수 없습니다. 원문에서 확인해 주세요.');
 const total=Number(count),start=s.search(/<ul\b[^>]*class=["'][^"']*\bcard-list\b/i),region=start<0?'':s.slice(start).split(/<\/form>/i)[0];
 const positions=[...region.matchAll(/<div\b[^>]*class=["'](?:[^"']*\s)?card(?:\s[^"']*)?["'][^>]*>/g)].map(m=>m.index),items=new Map();
 for(let i=0;i<positions.length;i++){
  const block=region.slice(positions[i],positions[i+1]??region.length),id=block.match(/fn_searchDetail\(\s*['"]([IPECZ])['"]\s*,\s*['"]([A-Z0-9_-]{10,40})['"]/);if(!id)continue;
  const name=text(block.match(/<div\b[^>]*class=["']link["'][^>]*>[\s\S]*?<strong\b[^>]*>([\s\S]*?)<\/strong>/)?.[1]);if(!name)continue;
  const fields={};for(const m of block.matchAll(/<li\b[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*<span\b[^>]*>([\s\S]*?)<\/span>\s*<\/li>/g))fields[text(m[1]).replace(/\s/g,'')]=text(m[2]);
  const period=range(fields['일경험기간']||fields['참여기간']),recruitment=range(fields['모집기간']),training=range(fields['사전직무교육']);
  items.set(id[2],{id:id[2],typeCode:id[1],type:TYPES[id[1]],name:name.slice(0,400),company:(fields['참여기업']||'').slice(0,200),agency:(fields['운영기관']||'').slice(0,200),region:(fields['지역']||'').slice(0,100),job:(fields['직무']||'').slice(0,100),specialization:(fields['특화유형']||'').slice(0,100),start:period.start,end:period.end,recruitStart:recruitment.start,recruitEnd:recruitment.end,trainingStart:training.start,trainingEnd:training.end});
 }
 if(total>0&&!items.size)throw Error('고용24 프로그램 목록을 읽지 못했습니다. 잠시 후 다시 검색하거나 원문에서 확인해 주세요.');
 return {ok:true,source:'고용24 청년일경험 포털',url:searchUrl(q),page:q.page,pageSize:12,total,hasNext:q.page*12<total,programs:[...items.values()]};
}
