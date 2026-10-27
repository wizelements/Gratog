/** Select only the workflow-owned Sandbox subscription for a new Preview. */
export const CERTIFICATION_SUBSCRIPTION_NAME='Taste of Gratitude Turso Preview Sandbox';
const host=/^gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app$/;
export function isCertificationCallback(value){
 let url;try{url=new URL(value)}catch{return false}
 return url.protocol==='https:'&&host.test(url.hostname)&&!url.port&&
   !url.username&&!url.password&&url.pathname==='/api/webhooks/square'&&
   !url.search&&!url.hash;
}
export function selectCertificationSubscription(subscriptions,target){
 if(!isCertificationCallback(target)||!Array.isArray(subscriptions))
   throw Error('CERTIFICATION_SUBSCRIPTION_TARGET_INVALID');
 const activeExact=subscriptions.filter(s=>s.enabled===true&&s.notification_url===target);
 if(activeExact.length>1)throw Error('DUPLICATE_WEBHOOK_SUBSCRIPTIONS');
 if(activeExact.length===1)return {action:'verify',subscription:activeExact[0]};
 const owned=subscriptions.filter(s=>s.name===CERTIFICATION_SUBSCRIPTION_NAME);
 if(owned.some(s=>!s.id||!isCertificationCallback(s.notification_url)))
   throw Error('OWNED_CERTIFICATION_SUBSCRIPTION_UNSAFE');
 // Reuse an existing endpoint slot: Square counts disabled subscriptions too.
 // Never delete or retarget another application's Sandbox integration.
 const existing=owned.find(s=>s.notification_url===target)||
   owned.sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||'')))[0];
 return existing?{action:'update',subscription:existing}:{action:'create',subscription:null};
}
