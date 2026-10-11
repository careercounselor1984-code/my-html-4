const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const terms=['PIN_KEY','ccLocalPin','ccPinForm','ccPinBtn','ccLockBtn','ccLockOverlay','ccLockForm','ccLockInput','ccPinInput','showLock','unlock','lockScreen','setPin','setPIN','createPin','verifyPin','localStorage.getItem(PIN_KEY)','localStorage.setItem(PIN_KEY)','sessionStorage','IDLE_MS'];
for(const t of terms){
 let at=-1,hits=[];
 while((at=s.indexOf(t,at+1))>=0&&hits.length<18){hits.push(at)}
 console.log('TERM',t,'COUNT',hits.length,'POSITIONS',hits.join(','));
 for(const x of hits.slice(0,5)){
  if(t==='sessionStorage')continue;
  console.log('AROUND',t,JSON.stringify(s.slice(Math.max(0,x-450),Math.min(s.length,x+650)).replace(/https?:\/\/[^'"<>\s]+/g,'[URL]').replace(/[\w.+-]+@[\w.-]+/g,'[EMAIL]')));
 }
}
