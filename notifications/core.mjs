export const APP_URL='https://eduardomun68.github.io/app-formula/';
export const FEED_URL=new URL('data/season.json',APP_URL).href;
export const RECEIVER_VERSION='1.2.0';
export function reminders(feed) {
  const result=[];
  for(const race of feed.races??[]) for(const session of race.sessions??[]) {
    const start=Date.parse(session.start);
    if(!Number.isFinite(start)||session.results?.rows?.length)continue;
    const key=`${feed.season}:${race.id}:${session.id}:${session.start}`;
    const url=new URL(APP_URL);url.searchParams.set('race',race.id);
    const time=new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(start));
    result.push({kind:'formula-session',eventId:key,title:`Fórmula 1 · ${session.name}`,body:`${race.location}: empieza a las ${time} h (España peninsular).`,url:url.href,due:start-600000,expiresAt:start,start});
  }
  return result.sort((a,b)=>a.due-b.due);
}
export function dueForDevice(notice,device,now) {
  return now>=notice.due&&now<notice.due+90000&&now<notice.expiresAt&&device.createdAt<=notice.due&&!device.sent?.[notice.eventId];
}
