/* Recibe avisos incluso cuando la ventana de Madridista está cerrada. */
function rememberPush(id,readOnly=false){
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('formula-push',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('seen',{keyPath:'id'});
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result,tx=db.transaction('seen','readwrite'),store=tx.objectStore('seen');let added=false;
      const get=store.get(id);get.onsuccess=()=>{if(readOnly){added=!!get.result;}else if(!get.result){store.add({id,at:Date.now()});added=true;}};
      const cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(c.value.at<Date.now()-45*86400000)c.delete();c.continue();}};
      tx.oncomplete=()=>{db.close();resolve(added);};tx.onerror=()=>{db.close();reject(tx.error);};
    };
  });
}
function pushRecord(id,value){
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('formula-push',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('seen',{keyPath:'id'});
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result,tx=db.transaction('seen','readwrite'),store=tx.objectStore('seen');let result;
      if(value===null)store.delete(id);
      else if(value!==undefined)store.put({id,at:Date.now(),...value});
      else {const get=store.get(id);get.onsuccess=()=>{result=get.result;};}
      tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};
    };
  });
}
self.addEventListener('message',event=>{
  if(event.data?.type!=='FORMULA_PUSH_STATUS'||!event.ports?.[0])return;
  event.waitUntil((async()=>{
    try{event.ports[0].postMessage({ready:true,version:'1.2.0',confirmationReceived:!!(await pushRecord('confirmed')),lastDisplayed:(await pushRecord('last-displayed'))?.at??null});}
    catch{event.ports[0].postMessage({ready:true,version:'1.2.0',confirmationReceived:null,lastDisplayed:null});}
  })());
});
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let notice;try{notice=event.data?.json();}catch{return;}
    if(!['formula-ready','formula-session'].includes(notice?.kind)||typeof notice.eventId!=='string'||notice.eventId.length>200||!notice.eventId||!Number.isFinite(notice.expiresAt)||notice.expiresAt<=Date.now())return;
    let url;try{url=new URL(notice.url);const scope=new URL(self.registration.scope);if(url.origin!==scope.origin||url.pathname!==scope.pathname)return;}catch{return;}
    const key=notice.kind+':'+notice.eventId;let persisted=false;
    try{if(!await rememberPush(key))return;persisted=true;}catch{}
    try{
      await self.registration.showNotification(String(notice.title||'APP FORMULA').slice(0,120),{body:String(notice.body||'').slice(0,200),icon:new URL('icon-192.png',self.registration.scope).href,badge:new URL('icon-192.png',self.registration.scope).href,tag:key,renotify:false,data:{url:url.href}});
    }catch(error){if(persisted)await pushRecord(key,null).catch(()=>{});throw error;}
    await pushRecord('last-displayed',{}).catch(()=>{});
    if(notice.kind==='formula-ready')await pushRecord('confirmed',{}).catch(()=>{});
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();event.waitUntil((async()=>{
    let target;try{target=new URL(event.notification.data?.url||self.registration.scope);const scope=new URL(self.registration.scope);if(target.origin!==scope.origin||target.pathname!==scope.pathname)return;}catch{return;}
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(w=>w.url.startsWith(self.registration.scope));
    if(existing){await existing.navigate(target.href);await existing.focus();}else await clients.openWindow(target.href);
  })());
});
