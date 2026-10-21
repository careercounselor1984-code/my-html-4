importScripts('client-context-core.js','client-context-background.js');
async function configureSidePanel(){
  try{
    if(chrome.sidePanel?.setPanelBehavior){
      await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
    }
  }catch(e){}
}
chrome.runtime.onInstalled.addListener(configureSidePanel);
chrome.runtime.onStartup.addListener(configureSidePanel);
configureSidePanel();

// Reattach only on tab lifecycle events; never poll the Work24 screen.
const journalAttaching=new Map();
function isJournalTab(tab){
 try{
  const u=new URL(tab.url||'');
  if(u.protocol==='https:')return u.hostname==='careercounselor1984-code.github.io'&&/^\/my-html-4(?:\/|$)/.test(u.pathname);
  return u.protocol==='file:'&&/상담일지\s*통합본/.test(tab.title||'');
 }catch{return false;}
}
async function attachJournal(tab){
 if(!tab?.id||!isJournalTab(tab))return;
 if(journalAttaching.has(tab.id))return journalAttaching.get(tab.id);
 const work=(async()=>{
  try{
   await chrome.scripting.executeScript({target:{tabId:tab.id},files:['bridge-security.js','training-core.js','counsel_bridge_content.js','direct_bridge_v148.js','training-journal.js','readiness-journal.js','client-context-journal.js']});
   // Repeat the handshake after attaching so a page whose early ping timed out recovers.
   await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>window.postMessage({marker:'CLG_COUNSEL_BRIDGE_V113',type:'PING_BRIDGE'},location.protocol==='file:'?'*':location.origin)});
  }catch{/* Closed tabs, restricted files and disabled site access are handled by manual connection diagnostics. */}
 })();
 journalAttaching.set(tab.id,work);try{await work;}finally{journalAttaching.delete(tab.id);}
}
async function attachOpenJournals(){
 try{const tabs=await chrome.tabs.query({url:['https://careercounselor1984-code.github.io/my-html-4/*','file:///*']});await Promise.all(tabs.filter(isJournalTab).map(attachJournal));}catch{}
}
chrome.tabs.onUpdated.addListener((id,change,tab)=>{if(change.status==='complete')void attachJournal({...tab,id});});
chrome.tabs.onActivated.addListener(async info=>{try{await attachJournal(await chrome.tabs.get(info.tabId));}catch{}});
chrome.runtime.onInstalled.addListener(attachOpenJournals);
chrome.runtime.onStartup.addListener(attachOpenJournals);

// Event-only journal save capture; no timers, alarms or continuous DOM scans.
if(typeof importScripts==='function')importScripts('security-core.js','security-background.js','counsel-save-core.js','counsel-save-background.js');
