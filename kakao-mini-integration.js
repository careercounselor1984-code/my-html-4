/* 좋은일자리 상담일지 통합본 - 채용정보&알선(P12) 카카오톡 초미니 공유.
 * 채용공고 공개 정보만 발급 서버에 전달합니다. 내담자·상담일지 정보는 제외합니다.
 * 외부 확장프로그램 없이 실행되며 기존 페이지 입력·저장 로직은 변경하지 않습니다.
 */
(function(){
  "use strict";
  const API="https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/job-card-share";
  const SHARE_PAGE="https://careercounselor1984-code.github.io/my-html-4/kakao-share.html";
  const clean=v=>String(v??"").replace(/\s+/g," ").trim();
  const val=(doc,id)=>clean(doc.getElementById(id)?.value);
  const allowedHost=url=>{
    try{
      const u=new URL(url);
      return u.protocol==="https:"&&!u.username&&!u.password&&
        ["work24.go.kr","work.go.kr","saramin.co.kr","jobkorea.co.kr","alba.co.kr"]
        .some(h=>u.hostname===h||u.hostname.endsWith("."+h));
    }catch{return false;}
  };
  function currentJob(doc){
    const url=val(doc,"c_link");
    const title=val(doc,"c_title")||val(doc,"c_free_text").split("\n")[0]||"";
    const host=(()=>{try{return new URL(url).hostname;}catch{return "";}})();
    const source=/work24|work\.go/.test(host)?"고용24":/saramin/.test(host)?"사람인":/jobkorea/.test(host)?"잡코리아":/alba/.test(host)?"알바천국":"웹 채용공고";
    return {
      url,title,company:val(doc,"c_name"),location:val(doc,"c_address"),
      duties:val(doc,"c_task"),experience:val(doc,"c_exp"),education:val(doc,"c_edu"),
      employment:val(doc,"c_type"),
      salary:val(doc,"c_salary"),
      workHours:[val(doc,"c_work_days"),val(doc,"c_work_hours")].filter(Boolean).join(" / "),
      deadline:val(doc,"c_deadline"),source
    };
  }
  function setStatus(doc,message,error=false){
    const el=doc.getElementById("goodjobMiniStatus");
    if(el){el.textContent=message;el.style.color=error?"#b91c1c":"#166534";}
  }
  function buildMessage(doc){
    const job=currentJob(doc);
    const condition=[job.experience||"-",job.education||"-"].join(" / ");
    const lines=[
      "📢 "+(job.title||"미확인"),
      "🏢 "+(job.company||"미확인"),
      "🛠️ "+(job.duties||"미확인"),
      "📍 "+(job.location||"-"),
      "👤 "+condition,
      "📄 "+(job.employment||"미확인"),
      "🕒 "+(job.workHours||"미확인")
    ];
    if(job.salary)lines.push("💰 "+job.salary);
    return lines.join("\n");
  }
  async function copyMessage(doc){
    try{
      const message=buildMessage(doc);
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(message);
      else {
        const el=doc.createElement("textarea");el.value=message;
        doc.body.appendChild(el);el.select();if(!doc.execCommand("copy"))throw Error("복사를 지원하지 않는 브라우저입니다.");
        el.remove();
      }
      setStatus(doc,"채용안내 글 복사 완료 · 카카오톡에 먼저 붙여넣으세요.");
    }catch(error){setStatus(doc,"복사 실패: "+error.message,true);}
  }
  function imageJpeg(job){
    // 기존 OG 서버는 JPG가 필수입니다. 카카오 공식 초미니 카드에는 이미지를 표시하지 않습니다.
    const canvas=document.createElement("canvas");canvas.width=720;canvas.height=360;
    const c=canvas.getContext("2d");
    if(!c)throw Error("공유 링크용 이미지 생성이 지원되지 않습니다.");
    c.fillStyle="#163b69";c.fillRect(0,0,720,360);
    c.fillStyle="#ffde59";c.fillRect(0,280,720,80);
    c.font="bold 27px sans-serif";c.fillStyle="#fff";
    c.fillText("GOOD JOB  ·  채용정보",35,74,655);
    c.font="bold 39px sans-serif";c.fillText(job.title.slice(0,55),35,168,650);
    c.font="bold 25px sans-serif";c.fillStyle="#163b69";
    c.fillText("원문 채용공고 확인하기",40,329,640);
    return canvas.toDataURL("image/jpeg",0.72);
  }
  async function share(doc){
    const job=currentJob(doc);
    if(!job.title){setStatus(doc,"공고 제목을 확인해 주세요.",true);return;}
    if(!allowedHost(job.url)){setStatus(doc,"원문 HTTPS URL을 입력해 주세요. 고용24·사람인·잡코리아·알바천국만 지원합니다.",true);return;}
    const client=typeof window.clgJobArchiveClient==="function"?window.clgJobArchiveClient():null;
    if(!client?.auth?.getSession){setStatus(doc,"상담일지 통합본에 로그인한 뒤 다시 시도해 주세요.",true);return;}
    const popup=window.open("about:blank","_blank");
    const btn=doc.getElementById("goodjobMiniShareBtn");
    if(btn)btn.disabled=true;
    setStatus(doc,"공고별 원문 링크를 발행하는 중입니다…");
    try{
      const {data,error:authError}=await client.auth.getSession();
      const token=data?.session?.access_token;
      if(authError||!token)throw Error("로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.");
      const body={...job,image:imageJpeg(job),designVersion:"mini-share-v1"};
      const response=await fetch(API,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body:JSON.stringify(body)
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.ok||!/^[a-f0-9]{12}$/.test(result.id||"")){
        throw Error(result.message||"링크 발급 실패 ("+response.status+")");
      }
      const params=new URLSearchParams({
        id:result.id,
        title:job.title,company:job.company,location:job.location,
        duties:job.duties,experience:job.experience,education:job.education,
        employment:job.employment,workHours:job.workHours,salary:job.salary,source:job.source
      });
      const shareUrl=SHARE_PAGE+"?"+params.toString();
      if(popup&&!popup.closed){popup.location.replace(shareUrl);}
      else{await navigator.clipboard.writeText(shareUrl);throw Error("팝업이 차단돼 공유 페이지 주소만 복사했습니다. 팝업 허용 후 다시 시도해 주세요.");}
      setStatus(doc,"초미니 공유 페이지를 열었습니다. 카카오톡 공유 버튼을 눌러 전송해 주세요.");
    }catch(error){
      if(popup&&!popup.closed)popup.close();
      setStatus(doc,error.message||"초미니 공유에 실패했습니다.",true);
    }finally{if(btn)btn.disabled=false;}
  }
  function attach(){
    const frame=document.getElementById("frame");
    if(!frame)return;
    let doc;
    try{doc=frame.contentDocument;}catch{return;}
    if(!doc||!doc.getElementById("c_title")||!doc.getElementById("c_name")||!doc.getElementById("c_link"))return;
    if(doc.getElementById("goodjobMiniActions"))return;
    const original=doc.querySelector(".btn-copy-kakao-referral")||doc.querySelector(".btn-copy-kakao");
    if(!original)return;
    const panel=doc.createElement("div");
    panel.id="goodjobMiniActions";
    panel.style.cssText="margin:14px 0;padding:14px 16px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;font-family:'Malgun Gothic',sans-serif";
    const header=doc.createElement("div");header.textContent="🔗 카카오톡 초미니 원문 링크";header.style.cssText="font-size:15px;font-weight:800;color:#1d4e7d;margin-bottom:9px";
    const controls=doc.createElement("div");controls.style.cssText="display:flex;flex-wrap:wrap;gap:8px";
    const copy=doc.createElement("button");copy.type="button";copy.textContent="① 채용안내 글 복사";copy.style.cssText="background:#dbeafe;border:0;border-radius:9px;padding:11px 15px;color:#1e40af;font-weight:700;cursor:pointer";
    const send=doc.createElement("button");send.type="button";send.id="goodjobMiniShareBtn";send.textContent="② 카카오톡 초미니 링크 공유";send.style.cssText="background:#1d4ed8;border:0;border-radius:9px;padding:11px 15px;color:white;font-weight:700;cursor:pointer";
    controls.append(copy,send);
    const help=doc.createElement("small");help.textContent="공고 정보만 발행 서버에 전달합니다. 내담자·상담일지 정보는 전송되지 않습니다. 상담일지 통합본 로그인 상태로 자동 인증됩니다.";
    help.style.cssText="display:block;color:#64748b;line-height:1.55";
    const state=doc.createElement("div");state.id="goodjobMiniStatus";state.setAttribute("role","status");state.style.cssText="font-size:12px;margin-top:8px;min-height:16px";
    panel.append(header,controls,help,state);
    copy.addEventListener("click",()=>copyMessage(doc));
    send.addEventListener("click",()=>share(doc));
    const parent=original.parentElement;
    parent.insertAdjacentElement("afterend",panel);
  }
  const start=()=>{
    const frame=document.getElementById("frame");
    if(!frame)return;
    frame.addEventListener("load",attach);
    attach();
    // Some tools replace the iframe's srcdoc without replacing the iframe.
    const parent=frame.parentElement;
    if(parent) new MutationObserver(()=>attach()).observe(parent,{childList:true});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();