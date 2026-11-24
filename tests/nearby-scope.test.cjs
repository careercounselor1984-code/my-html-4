'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','nearby-search-scope.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','work24-nearby-map.html'),'utf8');
const backend=fs.readFileSync(path.join(__dirname,'..','supabase/work24-nearby-map/index.ts'),'utf8');
const window={};new Function('window',script)(window);
const helper=window.GoodjobNearbyScope;
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
 assert.ok(html.includes('id="workAreaSuggestions"'),'district suggestions available');
 assert.ok(html.includes('↳ 채용정보&알선 불러오기'),'existing import connection preserved');
 console.log('PASS: district-only vs cross-border radius, multi-province Work24 API, UI scope defaults and job import');
})().catch(error=>{console.error(error);process.exitCode=1});
