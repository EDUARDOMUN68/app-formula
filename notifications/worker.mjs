import webpush from 'web-push';
import {validSubscription,deviceId} from './transport.mjs';
import {APP_URL,FEED_URL,RECEIVER_VERSION,reminders,dueForDevice} from './core.mjs';
const ORIGIN=new URL(APP_URL).origin;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,Vary:'Origin'}});
async function bodyJson(request){
  const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw Error('size');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
  async fetch(request,env){
    if(request.headers.get('Origin')!==ORIGIN)return new Response('Forbidden',{status:403});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type',Vary:'Origin'}});
    const path=new URL(request.url).pathname;
    if(path==='/config'&&request.method==='GET')return json({ready:!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY),publicKey:env.VAPID_PUBLIC_KEY??null});
    if(path!=='/subscription'||!['POST','DELETE'].includes(request.method)||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Not found'},404);
    let payload;try{payload=await bodyJson(request);}catch{return json({error:'Invalid request'},400);}
    if(!validSubscription(payload.subscription??payload))return json({error:'Invalid subscription'},400);
    if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return json({error:'Not configured'},503);
    if(request.method==='POST'&&payload.receiverVersion!==RECEIVER_VERSION)return json({error:'Update app'},409);
    const object=env.SESSION_NOTICES.get(env.SESSION_NOTICES.idFromName('formula'));
    return object.fetch(new Request('https://internal/subscription',{method:request.method,body:JSON.stringify(payload)}));
  },
  scheduled(event,env,ctx){const object=env.SESSION_NOTICES.get(env.SESSION_NOTICES.idFromName('formula'));ctx.waitUntil(object.fetch('https://internal/check').then(r=>{if(!r.ok)throw Error('Check failed');}));}
};
export class SessionNotices {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.running=null;}
  async deliver(subscription,notice){
    const details=webpush.generateRequestDetails(subscription,JSON.stringify(notice),{TTL:Math.max(1,Math.floor((notice.expiresAt-Date.now())/1000)),urgency:'high',topic:(await deviceId(notice.eventId)).slice(0,32),vapidDetails:{subject:APP_URL,publicKey:this.env.VAPID_PUBLIC_KEY,privateKey:this.env.VAPID_PRIVATE_KEY}});
    return fetch(details.endpoint,{method:details.method,headers:details.headers,body:details.body,signal:AbortSignal.timeout(12000),redirect:'manual'});
  }
  readyNotice(test=false){return {kind:'formula-ready',eventId:crypto.randomUUID(),title:test?'Prueba de APP FORMULA':'Avisos de APP FORMULA activados',body:test?'Prueba con la app cerrada. Los avisos de sesiones se programan diez minutos antes.':'Este móvil recibirá avisos diez minutos antes de cada sesión.',url:APP_URL,expiresAt:Date.now()+180000};}
  async fetch(request){
    if(new URL(request.url).pathname==='/check'){
      await this.run(true);return json({ok:true});
    }
    if(new URL(request.url).pathname!=='/subscription')return json({error:'Not found'},404);
    const payload=await request.json(),subscription=payload.subscription??payload,key='sub:'+await deviceId(subscription.endpoint);
    return this.ctx.blockConcurrencyWhile(async()=>{
      if(request.method==='DELETE'){await this.ctx.storage.delete(key);await this.ctx.storage.delete('test:'+key);return json({ok:true});}
      const old=await this.ctx.storage.get(key),all=await this.ctx.storage.list({prefix:'sub:'});
      if(!old&&all.size>=100)return json({error:'Device limit reached'},429);
      const device={subscription,createdAt:old?.createdAt??Date.now(),sent:old?.sent??{},welcomeSentAt:old?.welcomeSentAt??null,lastTestAt:old?.lastTestAt??null};
      await this.ctx.storage.put(key,device);
      if(payload.testDelay===30){
        if(device.lastTestAt&&Date.now()-device.lastTestAt<60000)return json({error:'Wait one minute'},429);
        device.lastTestAt=Date.now();await this.ctx.storage.put(key,device);const due=Date.now()+30000;
        await this.ctx.storage.put('test:'+key,{deviceKey:key,due});await this.plan();return json({ok:true,testScheduled:true});
      }
      if(!device.welcomeSentAt||payload.confirmationReceived===false&&Date.now()-device.welcomeSentAt>60000){
        try{
          const result=await this.deliver(subscription,this.readyNotice());
          if([404,410].includes(result.status)){await this.ctx.storage.delete(key);return json({error:'Expired subscription'},410);}
          if(result.ok){device.welcomeSentAt=Date.now();await this.ctx.storage.put(key,device);}
        }catch{/* La preferencia no se pierde ante un fallo de red. */}
      }
      await this.run(true);return json({ok:true,confirmationSent:!!device.welcomeSentAt});
    });
  }
  async alarm(){await this.run(false);}
  async run(refresh){
    if(!this.running)this.running=this.perform(refresh).finally(()=>this.running=null);
    return this.running;
  }
  async perform(refresh){
    const now=Date.now();
    if(refresh){
      const devices=await this.ctx.storage.list({prefix:'sub:'});
      if(devices.size){
        try{
          const response=await fetch(FEED_URL,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('feed');
          const feed=await response.json();const updated=Date.parse(feed.updatedAt);
          if(!Array.isArray(feed.races)||!Number.isFinite(updated)||updated>now+60000||now-updated>6*3600000)throw Error('stale feed');
          await this.ctx.storage.put('schedule',{events:reminders(feed),updated});
        }catch{console.error('formula-feed-unavailable');}
      }
    }
    const tests=await this.ctx.storage.list({prefix:'test:'});
    for(const [key,test] of tests){
      if(test.due>now)continue;await this.ctx.storage.delete(key);const device=await this.ctx.storage.get(test.deviceKey);
      if(device&&now-test.due<90000)try{const r=await this.deliver(device.subscription,this.readyNotice(true));if([404,410].includes(r.status))await this.ctx.storage.delete(test.deviceKey);}catch{console.error('formula-test-failed');}
    }
    const schedule=await this.ctx.storage.get('schedule');
    if(schedule&&now-schedule.updated<=6*3600000){
      const devices=await this.ctx.storage.list({prefix:'sub:'});
      const queue=[...devices];let index=0;
      await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
        while(index<queue.length){const [key,device]=queue[index++];
          for(const notice of schedule.events){
            if(!dueForDevice(notice,device,now))continue;
            try{const r=await this.deliver(device.subscription,notice);
              if([404,410].includes(r.status)){await this.ctx.storage.delete(key);break;}
              if(r.ok){device.sent[notice.eventId]=Date.now();device.sent=Object.fromEntries(Object.entries(device.sent).filter(([,at])=>at>now-45*86400000));await this.ctx.storage.put(key,device);}
            }catch{console.error('formula-push-failed');}
          }
        }
      }));
    }
    await this.plan();
  }
  async plan(){
    const now=Date.now(),tests=await this.ctx.storage.list({prefix:'test:'});
    const dates=[...tests.values()].map(task=>task.due).filter(due=>due>now);
    const devices=await this.ctx.storage.list({prefix:'sub:'});const schedule=await this.ctx.storage.get('schedule');
    if(devices.size&&schedule&&now-schedule.updated<=6*3600000)for(const notice of schedule.events)if(notice.due>now)dates.push(notice.due);
    if(dates.length)await this.ctx.storage.setAlarm(Math.min(...dates));else await this.ctx.storage.deleteAlarm();
  }
}
