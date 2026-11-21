/* 좋은일자리 상담일지 통합본 - 채용정보&알선(P12) 카카오톡 복사용 안내문.
 * 기존 채용정보 입력·저장 로직은 수정하지 않습니다.
 * 새 창/공유 발급 서버 없이, 버튼 클릭 한 번으로 안내문과 원문 링크를 복사합니다.
 */
(function(){
  "use strict";
  const clean=v=>String(v??"").replace(/\s+/g," ").trim();
  const val=(doc,id)=>clean(doc.getElementById(id)?.value);
  function currentJob(doc){
    return {
      url:val(doc,"c_link"),
      title:val(doc,"c_title")||val(doc,"c_free_text").split("\n")[0]||"",
      company:val(doc,"c_name"),
      location:val(doc,"c_address"),
      duties:val(doc,"c_task"),
      experience:val(doc,"c_exp"),
      education:val(doc,"c_edu"),
      employment:val(doc,"c_type"),
      salary:val(doc,"c_salary"),
      workHours:[val(doc,"c_work_days"),val(doc,"c_work_hours")].filter(Boolean).join(" / ")
    };
  }
  function setStatus(doc,message,error=false){
    const el=doc.getElementById("goodjobMiniStatus");
    if(el){el.textContent=message;el.style.color=error?"#b91c1c":"#166534";}
  }
  function safeSourceUrl(raw){
    try{
      const url=new URL(raw);
      return url.protocol==="https:"&&!url.username&&!url.password?url.href:"";
    }catch{return "";}
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
    const source=safeSourceUrl(job.url);
    if(source)lines.push("", "🔗 "+source);
    return lines.join("\n");
  }
  async function copyMessage(doc){
    try{
      const message=buildMessage(doc);
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(message);
      }else{
        const field=doc.createElement("textarea");
        field.value=message;
        field.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";
        doc.body.appendChild(field);
        field.focus();field.select();
        try{if(!doc.execCommand("copy"))throw Error("복사를 지원하지 않는 브라우저입니다.");}
        finally{field.remove();}
      }
      setStatus(doc,"✓ 복사 완료! 내담자 카카오톡 대화창에 Ctrl + V로 붙여넣으세요.");
    }catch(error){
      setStatus(doc,"복사 실패: "+(error?.message||"브라우저 클립보드 권한을 확인해 주세요."),true);
    }
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
    const header=doc.createElement("div");header.textContent="📋 카카오톡 채용정보 복사";
    header.style.cssText="font-size:15px;font-weight:800;color:#1d4e7d;margin-bottom:9px";
    const copy=doc.createElement("button");
    copy.type="button";copy.id="goodjobMiniCopyBtn";
    copy.textContent="📋 채용정보+원문 링크 복사";
    copy.style.cssText="background:#1d4ed8;border:0;border-radius:9px;padding:11px 15px;color:white;font-weight:700;cursor:pointer";
    const help=doc.createElement("small");
    help.textContent="클릭하면 채용정보와 원문 링크가 함께 복사됩니다. 새 창이나 카카오 키 입력 없이 내담자 채팅창에 바로 붙여넣으세요.";
    help.style.cssText="display:block;margin-top:7px;color:#64748b;line-height:1.55";
    const state=doc.createElement("div");state.id="goodjobMiniStatus";state.setAttribute("role","status");
    state.style.cssText="font-size:12px;margin-top:8px;min-height:16px";
    panel.append(header,copy,help,state);
    copy.addEventListener("click",()=>copyMessage(doc));
    original.parentElement.insertAdjacentElement("afterend",panel);
  }
  const start=()=>{
    const frame=document.getElementById("frame");
    if(!frame)return;
    frame.addEventListener("load",attach);
    attach();
    const parent=frame.parentElement;
    if(parent)new MutationObserver(()=>attach()).observe(parent,{childList:true});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();