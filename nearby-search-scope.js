/* 근무지 채용지도 검색 범위: 행정구역 경계와 거리 반경을 독립적으로 판단합니다. */
(function(root){
"use strict";
const entries=[
 ["11000","서울",/서울/],["12000","전남광주",/전라남도|전남|광주/],
 ["26000","부산",/부산/],["27000","대구",/대구/],["28000","인천",/인천/],
 ["30000","대전",/대전/],["31000","울산",/울산/],["36000","세종",/세종/],
 ["41000","경기",/경기도|경기/],["43000","충북",/충청북도|충북/],
 ["44000","충남",/충청남도|충남/],["45000","전북",/전북특별자치도|전라북도|전북/],
 ["47000","경북",/경상북도|경북/],["48000","경남",/경상남도|경남/],
 ["50000","제주",/제주/],["51000","강원",/강원/]
];
const norm=(value)=>{
 const s=String(value||"").trim();
 return s.replace(/서울특별시/g,"서울").replace(/부산광역시/g,"부산")
  .replace(/대구광역시/g,"대구").replace(/인천광역시/g,"인천")
  .replace(/광주광역시/g,"광주").replace(/대전광역시/g,"대전").replace(/울산광역시/g,"울산")
  .replace(/세종특별자치시/g,"세종").replace(/경기도/g,"경기")
  .replace(/경상북도/g,"경북").replace(/경상남도/g,"경남")
  .replace(/충청북도/g,"충북").replace(/충청남도/g,"충남")
  .replace(/전라남도/g,"전남").replace(/전라북도|전북특별자치도/g,"전북")
  .replace(/강원특별자치도|강원도/g,"강원").replace(/제주특별자치도/g,"제주")
  .replace(/\s+/g," ").trim();
};
function province(address){
 const s=norm(address);
 const prefix=s.split(" ")[0]||"";
 const found=entries.find(x=>x[2].test(prefix));
 return found?found[0]:"";
}
function inferArea(address){
 const w=norm(address).split(" ");
 if(w.length<2)return "";
 let length=2;
 if(/(?:포항|고양|수원|성남|안양|안산|용인|청주|천안|창원)시$/.test(w[1])&&w[2]&&/구$/.test(w[2]))length=3;
 if(!/(구|군|시)$/.test(w[length-1]))return "";
 return w.slice(0,length).join(" ");
}
function matchArea(job,area){
 const needle=norm(area);
 if(!needle||!/(\uad6c|\uad70|\uc2dc)$/.test(needle))return false;
 // 실제 근무지 기본주소를 우선합니다. 공고의 광역 지역명으로 다른 구 공고를 포함하지 않습니다.
 const address=norm(job?.basicAddr||job?.region||"").replace(/,/g," ");
 return address===needle||address.startsWith(needle+" ")||address.includes(" "+needle+" ");
}
function regionForArea(area){
 const n=norm(area);
 if(n==="울산 북구")return "31200"; // 고용24 북구 지역코드
 return province(n);
}
async function planRegions(geo,point,radius,address){
 const current=province(address);
 const codes=new Set(current?[current]:[]);
 const radiusKm=Number(radius)||5;
 const samples=[point];
 for(const [n,ratio] of [[12,.96],[8,.52]]){
  for(let i=0;i<n;i++){
   const rad=2*Math.PI*i/n,km=radiusKm*ratio;
   const deltaLat=km*Math.cos(rad)/111.32;
   const deltaLon=km*Math.sin(rad)/(111.32*Math.max(.2,Math.cos(point.lat*Math.PI/180)));
   samples.push({lat:point.lat+deltaLat,lng:point.lng+deltaLon});
  }
 }
 let next=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(next<samples.length){
   const p=samples[next++];
   const code=await new Promise(resolve=>{
    try{
     geo.coord2RegionCode(p.lng,p.lat,(r,s)=>{
      if(s!=="OK"||!r?.length){resolve("");return}
      const a=r.find(x=>x.region_type==="B")||r[0];
      resolve(province(a?.region_1depth_name));
     });
    }catch{resolve("")}
   });
   if(code)codes.add(code);
  }
 }));
 // 울산 경계 검색: 일부 역지오코딩 실패 시에도 경주·양산·부산을 놓치지 않도록 인접 시도를 후보에 포함
 if(current==="31000"&&radiusKm>=15){codes.add("47000");codes.add("48000");if(radiusKm>=35)codes.add("26000")}
 if(!codes.size)throw Error("기준 주소의 시·도를 확인하지 못했습니다.");
 if(codes.size>5)throw Error("반경에 걸치는 시·도가 5개를 넘습니다. 반경을 줄여 주세요.");
 return [...codes].sort();
}
function label(code){
 return code==="31200"?"울산 북구":(entries.find(e=>e[0]===code)?.[1]||code);
}
root.GoodjobNearbyScope=Object.freeze({norm,province,inferArea,matchArea,regionForArea,planRegions,label});
})(window);
