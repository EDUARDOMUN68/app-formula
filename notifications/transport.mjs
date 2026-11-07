export function validSubscription(sub){
  try{
    const u=new URL(sub.endpoint);
    const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!allowed.includes(u.hostname))return false;
    if(!/^\/[\w/:.%-]+$/.test(u.pathname)||u.pathname.length<10)return false;
    if(!/^[\w-]{87}=?$/.test(sub.keys?.p256dh||'')||!/^[\w-]{22}(==)?$/.test(sub.keys?.auth||''))return false;
    return true;
  }catch{return false;}
}
export async function deviceId(endpoint){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint))),b=>b.toString(16).padStart(2,'0')).join('');}
