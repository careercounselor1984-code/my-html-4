(async()=>{
  const key=location.hash.slice(1);
  const output=document.getElementById('document');
  try{
    if(!/^training-print-[a-f0-9-]+$/.test(key)) throw new Error('출력 자료가 없습니다. 계산기에서 다시 열어주세요.');
    const result=await chrome.storage.session.get(key);
    const payload=result[key];
    if(!payload?.text) throw new Error('출력 자료가 만료되었습니다. 계산기에서 다시 열어주세요.');
    for(const block of payload.text.split(/\n\s*\n/)){
      const p=document.createElement('p');p.textContent=block;output.append(p);
    }
    // Keep this one payload for refresh; remove other expired print snapshots.
    const all=await chrome.storage.session.get(null);
    const expired=Object.keys(all).filter(k=>k.startsWith('training-print-')&&k!==key&&Date.now()-all[k].createdAt>3600000);
    if(expired.length) await chrome.storage.session.remove(expired);
  }catch(e){output.textContent=e.message;document.getElementById('printBtn').disabled=true;}
})();
document.getElementById('printBtn').addEventListener('click',()=>window.print());
