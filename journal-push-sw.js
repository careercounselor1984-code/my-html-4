/* 상담일지 통합본 PC 알림 전용 서비스 워커.
   모든 알림은 개인정보 없는 범용 문구로 표시합니다.
   인증 확인과 읽음 기록은 통합본에서만 처리합니다. */
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('push',event=>{
  // Fail closed for unrecognized or malformed payload.
  let data={};
  try{data=event.data?.json()||{}}catch(e){data={}}
  const tag=typeof data.tag==='string'&&data.tag.length<130?data.tag:'goodjob-work';
  const title='좋은일자리 · 업무 알림';
  const body='새 업무 알림이 도착했습니다. 상담일지 통합본에서 확인해 주세요.';
  event.waitUntil(self.registration.showNotification(title,{
    body,tag,icon:'./journal-push-icon.svg',badge:'./journal-push-icon.svg',
    data:{journal:true,cardId:typeof data.cardId==='string'&&/^[0-9a-f-]{36}$/i.test(data.cardId)?data.cardId:''},renotify:false
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const cardId=event.notification.data?.cardId;
  const target=new URL(cardId?'./?centerCard='+encodeURIComponent(cardId):'./?workAlerts=1',self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    for(const client of clients){
      if(client.url.startsWith(self.registration.scope)){
        await client.focus();
        client.postMessage(cardId?{type:'goodjob:open-center-card',cardId}:{type:'clg:open-alert-center'});
        return;
      }
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  }));
});