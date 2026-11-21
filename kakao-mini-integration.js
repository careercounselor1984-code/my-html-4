/* 채용정보&알선: 카카오톡 링크 미리보기(OG)용 클립보드 공유.
 * 버튼 클릭 => 서버에 공고별 미리보기 링크 발급 => 클립보드 복사.
 * 새 창 / 카카오 JS 키 / 발급키 없음. 기존 입력·저장 로직 유지.
 */
(function(){
"use strict";
const API="https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/job-card-share";
const clean=v=>String(v??"").replace(/\s+/g," ").trim();
const val=(doc,id)=>clean(doc.getElementById(id)?.value);
const approvedUrl=raw=>{
  try{
    const u=new URL(raw);
    return u.protocol==="https:"&&!u.username&&!u.password&&
      ["work24.go.kr","work.go.kr","saramin.co.kr","jobkorea.co.kr","alba.co.kr"]
        .some(host=>u.hostname===host||u.hostname.endsWith("."+host));
  }catch{return false;}
};
function currentJob(doc){
  const url=val(doc,"c_link");
  const host=(()=>{try{return new URL(url).hostname;}catch{return"";}})();
  return {
    url,title:val(doc,"c_title")||val(doc,"c_free_text").split("\n")[0]||"",
    company:val(doc,"c_name"),location:val(doc,"c_address"),
    duties:val(doc,"c_task"),experience:val(doc,"c_exp"),
    education:val(doc,"c_edu"),employment:val(doc,"c_type"),
    salary:val(doc,"c_salary"),
    workHours:[val(doc,"c_work_days"),val(doc,"c_work_hours")].filter(Boolean).join(" / "),
    deadline:val(doc,"c_deadline"),
    source:/work24|work\.go/.test(host)?"고용24":/saramin/.test(host)?"사람인":/jobkorea/.test(host)?"잡코리아":/alba/.test(host)?"알바천국":"웹 채용공고"
  };
}
function status(doc,message,error=false){
  const el=doc.getElementById("goodjobMiniStatus");
  if(el){el.textContent=message;el.style.color=error?"#b91c1c":"#166534";}
}
function buildDescription(job){
  const rows=[
    "📢 "+(job.title||"미확인"),
    "🏢 "+(job.company||"미확인"),
    "🛠️ "+(job.duties||"미확인"),
    "📍 "+(job.location||"-"),
    "👤 "+(job.experience||"-")+" / "+(job.education||"-"),
    "📄 "+(job.employment||"미확인"),
    "🕒 "+(job.workHours||"미확인")
  ];
  if(job.salary)rows.push("💰 "+job.salary);
  return rows.join("\n");
}
function shareImage(job){
  const canvas=document.createElement("canvas");
  canvas.width=720;canvas.height=360;
  const c=canvas.getContext("2d");
  if(!c)throw Error("공유 미리보기 이미지 준비에 실패했습니다.");
  c.fillStyle="#153b6a";c.fillRect(0,0,720,360);
  c.fillStyle="#ffdd55";c.fillRect(0,280,720,80);
  c.font="bold 27px sans-serif";c.fillStyle="#ffffff";
  c.fillText("GOOD JOB · 채용정보",35,75,650);
  c.font="bold 37px sans-serif";c.fillText(job.title.slice(0,55),35,173,650);
  c.fillStyle="#153b6a";c.font="bold 25px sans-serif";
  c.fillText("원문 채용공고 확인하기",40,328,630);
  return canvas.toDataURL("image/jpeg",0.72);
}
async function writeClipboard(doc,value){
  // Prefer async clipboard in the host document, followed by legacy fallback.
  if(navigator.clipboard?.writeText) {
    try{await navigator.clipboard.writeText(value);return true;}catch{}
  }
  const ta=doc.createElement("textarea");
  ta.value=value;
  ta.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";
  doc.body.appendChild(ta);
  try{ta.focus();ta.select();return !!doc.execCommand("copy");}
  finally{ta.remove();}
}
async function createLink(job){
  const client=typeof window.clgJobArchiveClient==="function"?window.clgJobArchiveClient():null;
  if(!client?.auth?.getSession)throw Error("상담일지 통합본 로그인 상태를 확인해 주세요.");
  const {data,error}=await client.auth.getSession();
  const token=data?.session?.access_token;
  if(error||!token)throw Error("로그인이 만료됐습니다. 다시 로그인해 주세요.");
  const body={...job,image:shareImage(job),designVersion:"mini-share-v2"};
  const response=await fetch(API,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify(body)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok||!/^[a-f0-9]{12}$/.test(result.id||""))
    throw Error(result.message||"공고 미리보기 링크 생성 실패 ("+response.status+")");
  return API+"?id="+result.id+"&mini=1";
}
async function copyJob(doc,mode){
  const job=currentJob(doc);
  if(!job.title){status(doc,"공고 제목을 먼저 입력해 주세요.",true);return;}
  if(!approvedUrl(job.url)){
    status(doc,"현재 지원되는 원문 링크는 고용24·사람인·잡코리아·알바천국 HTTPS 주소입니다.",true);
    return;
  }
  const buttons=[doc.getElementById("goodjobMiniPreviewBtn"),doc.getElementById("goodjobMiniDetailBtn")].filter(Boolean);
  buttons.forEach(b=>b.disabled=true);
  status(doc,"카카오톡 미리보기 링크를 준비하고 있습니다…");
  try {
    const link=await createLink(job);
    // Only the URL is pasted for card-focused mode. KakaoTalk renders OG preview when supported.
    const message=mode==="detail"?buildDescription(job)+"\n\n🔗 "+link:link;
    if(!(await writeClipboard(doc,message)))throw Error("클립보드 복사가 차단되었습니다.");
    status(doc,mode==="detail"?
      "✓ 상세 안내문과 미리보기 링크 복사 완료! 카카오톡 채팅창에 Ctrl + V로 붙여넣으세요.":
      "✓ 미니카드 링크 복사 완료! 카카오톡 채팅창에 Ctrl + V로 붙여넣으세요. 카카오톡이 미리보기 카드를 생성합니다.");
  }catch(error){status(doc,"복사 실패: "+(error?.message||String(error)),true);}
  finally{buttons.forEach(b=>b.disabled=false);}
}
function attach(){
  const frame=document.getElementById("frame");
  if(!frame)return;
  let doc;
  try{doc=frame.contentDocument;}catch{return;}
  if(!doc||!doc.getElementById("c_title")||!doc.getElementById("c_name")||!doc.getElementById("c_link"))return;
  if(doc.getElementById("goodjobMiniActions"))return;
  const original=doc.querySelector(".btn-copy-kakao-referral")||doc.querySelector(".btn-copy-kakao");
  if(!original?.parentElement)return;
  const panel=doc.createElement("div");panel.id="goodjobMiniActions";
  panel.style.cssText="margin:14px 0;padding:14px 16px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;font-family:'Malgun Gothic',sans-serif";
  const header=doc.createElement("div");
  header.textContent="🔗 카카오톡 채용 미니카드";
  header.style.cssText="font-size:15px;font-weight:800;color:#1d4e7d;margin-bottom:9px";
  const controls=doc.createElement("div");
  controls.style.cssText="display:flex;flex-wrap:wrap;gap:8px";
  const mini=doc.createElement("button");
  mini.type="button";mini.id="goodjobMiniPreviewBtn";
  mini.textContent="① 미니카드 링크 복사";
  mini.style.cssText="background:#1d4ed8;border:0;border-radius:9px;padding:11px 15px;color:white;font-weight:700;cursor:pointer";
  const detail=doc.createElement("button");
  detail.type="button";detail.id="goodjobMiniDetailBtn";
  detail.textContent="② 전체 안내문+카드 링크 복사";
  detail.style.cssText="background:#dbeafe;border:0;border-radius:9px;padding:11px 15px;color:#1e40af;font-weight:700;cursor:pointer";
  const help=doc.createElement("small");
  help.textContent="①은 링크 미리보기 카드 중심, ②는 기존 7항목 안내문과 미리보기 링크를 함께 복사합니다. 새 창·카카오 키 입력은 필요 없습니다. 카카오톡의 링크 미리보기 지원 여부에 따라 카드 표시가 달라질 수 있습니다.";
  help.style.cssText="display:block;margin-top:8px;color:#64748b;line-height:1.55";
  const state=doc.createElement("div");
  state.id="goodjobMiniStatus";state.setAttribute("role","status");
  state.style.cssText="font-size:12px;margin-top:8px;min-height:16px";
  controls.append(mini,detail);panel.append(header,controls,help,state);
  mini.addEventListener("click",()=>copyJob(doc,"mini"));
  detail.addEventListener("click",()=>copyJob(doc,"detail"));
  original.parentElement.insertAdjacentElement("afterend",panel);
}
function start(){
  const frame=document.getElementById("frame");
  if(!frame)return;
  frame.addEventListener("load",attach);attach();
  const parent=frame.parentElement;
  if(parent)new MutationObserver(()=>attach()).observe(parent,{childList:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();