'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','nearby-search-scope.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','work24-nearby-map.html'),'utf8');
const backend=fs.readFileSync(path.join(__dirname,'..','supabase/work24-nearby-map/index.ts'),'utf8');
const window={};new Function('window',script)(window);
const helper=window.GoodjobNearbyScope;
const districtCode=fs.readFileSync(path.join(__dirname,'..','nearby-korea-districts.js'),'utf8');
new Function('window',districtCode)(window);
const divisions=window.GoodjobKoreaDistricts;
assert.equal(Object.keys(divisions).length,17,'17 provinces are selectable');
assert.deepEqual(divisions['울산'],['중구','남구','동구','북구','울주군']);
assert.equal(divisions['부산'].length,16,'Busan 16 districts');
assert.ok(divisions['경북'].includes('경주시'),'Gyeongju is selectable');
assert.ok(divisions['경기'].includes('수원시 영통구'),'city-internal gu also selectable');
assert.equal(helper.inferArea('울산광역시 북구 호계로 309-20'),'울산 북구');
assert.equal(helper.regionForArea('울산 북구'),'31200');
assert.equal(helper.province('경상북도 경주시 외동읍'),'47000');
const jobs=[
 {region:'울산 북구',basicAddr:'울산광역시 북구 호계로 20',distance:2},
 {region:'경북 경주시',basicAddr:'경상북도 경주시 외동읍 15',distance:12},
 {region:'울산 남구',basicAddr:'울산광역시 남구 삼산로 34',distance:14},
 {region:'울산 북구',basicAddr:'울산 북구 100',distance:31},
];
assert.deepEqual(jobs.filter(j=>j.distance<=30).map(x=>x.region),
 ['울산 북구','경북 경주시','울산 남구'],'cross-border unrestricted distance search');
assert.deepEqual(jobs.filter(j=>j.distance<=30&&helper.matchArea(j,'울산 북구')).map(x=>x.region),
 ['울산 북구'],'district restriction must hide nearby Gyeongju and Ulsan Nam-gu');
assert.equal(helper.matchArea(jobs[1],'울산 북구'),false);
assert.equal(helper.matchArea(jobs[0],'울산 북구'),true);
assert.equal(helper.label('47000'),'경북');
(async()=>{
 const geo={coord2RegionCode(lon,lat,callback){
   const region_1depth_name=lat>35.79?'경상북도':lat<35.47?'경상남도':'울산광역시';
   callback([{region_type:'B',region_1depth_name}], 'OK');
 }};
 const codes=await helper.planRegions(geo,{lat:35.63,lng:129.34},50,'울산광역시 북구 호계로 309-20');
 for(const required of ['31000','47000','48000','26000'])assert.ok(codes.includes(required),'cross-border coverage includes '+required);
 assert.ok(backend.includes('validatedRegion(body.region)'),'backend validates multi-region parameter');
 assert.ok(backend.includes('unique.join("|")'),'backend passes multi-region to Work24 API');
 assert.ok(backend.includes('"31200"'),'restricted Ulsan Buk-gu API code whitelisted');
 assert.ok(html.includes('value="distance" selected'),'no administrative limit by default');
 assert.ok(html.includes('value="admin"'),'area-restricted mode available');
 assert.ok(html.includes('activeRegions=codes.join("|")'),'region choices actually applied to fetching');
 assert.ok(html.includes('&&allowedArea(j)'),'area restriction applied to cards and map');
 assert.ok(html.includes('id="provinceSelect"'),'province dropdown exists');
 assert.ok(html.includes('id="districtSelect"'),'district dropdown exists');
 assert.ok(html.includes('function populateDistricts()'),'province change updates district options');
 assert.ok(!html.includes('id="areaText"'),'old fixed Ulsan-Bukgu input removed');
 assert.ok(html.includes('↳ 채용정보&알선 불러오기'),'existing import connection preserved');
 assert.equal(helper.matchArea({basicAddr:'세종시 어진동 100'},'세종'),true);
 const transit=helper.transitUrl('울산 북구 호계로 309-20',35.63,129.35,'경주시 외동읍 기업',35.72,129.30);
 assert.match(transit,/^https:\/\/map\.kakao\.com\/link\/by\/traffic\//);
 assert.ok(transit.includes('35.6300000,129.3500000'),'origin coordinates encoded');
 assert.ok(transit.includes('35.7200000,129.3000000'),'company coordinates encoded');
 assert.ok(html.includes('addTransit(node,j)'),'job list has transit link');
 assert.ok(html.includes('addTransit(body,j)'),'map popup has transit link');
 assert.ok(html.includes('addClientShare(node,j)'),'job listing includes client-share button');
 assert.ok(html.includes('addClientShare(body,j)'),'map popup includes client-share button');
 assert.ok(html.includes('navigator.clipboard?.writeText'),'clipboard is available when permitted');
 assert.ok(html.includes('document.execCommand("copy")'),'clipboard fallback exists for PC iframe');
 const msgStart=html.indexOf('function transitShareMessage(job){');
 const msgEnd=html.indexOf('async function copyTransitText(',msgStart);
 assert.ok(msgStart>=0&&msgEnd>msgStart,'client-share message builder exists');
 const messageFn=new Function('transitHref','clean','safeLink',
   html.slice(msgStart,msgEnd)+';return transitShareMessage')(
   ()=>'https://map.kakao.com/link/by/traffic/START,35.6300000,129.3500000/DEST,35.7200000,129.3000000',
   (v,n=200)=>String(v||'').trim().slice(0,n),
   j=>'https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo='+encodeURIComponent(j.wantedAuthNo)
 );
 const copied=messageFn({company:'시험기업',title:'생산직 채용',basicAddr:'울산 북구 호계로 309-20',wantedAuthNo:'K123456'});
 assert.ok(copied.includes('시험기업'),'company included in client text');
 assert.ok(copied.includes('생산직 채용'),'job title included in client text');
 assert.ok(copied.includes('https://map.kakao.com/link/by/traffic/'),'bus link included');
 assert.ok(copied.includes('https://www.work24.go.kr/'),'original Work24 link included');
 assert.ok(copied.includes('출발 위치가 포함됩니다'),'client address privacy note included');
 assert.ok(html.includes('↳ 채용정보&알선 불러오기'),'existing import connection preserved');
 console.log('PASS: district-only vs cross-border radius, multi-province Work24 API, UI scope defaults and job import');
})().catch(error=>{console.error(error);process.exitCode=1});
