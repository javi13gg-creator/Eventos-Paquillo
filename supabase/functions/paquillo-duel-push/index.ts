// Deploy: supabase functions deploy paquillo-duel-push --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...).
// Caller JWT is validated explicitly below; never accept recipient from client.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  const auth=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+jwt}}});
  const {data:{user},error:authError}=await auth.auth.getUser(jwt);
  if(authError||!user)return reply({error:'Unauthorized'},401);
  const {duel_id}=await req.json();
  if(typeof duel_id!=='string'||!/^[0-9a-f-]{36}$/i.test(duel_id))return reply({error:'Invalid duel'},400);
  const admin=createClient(url,service);
  const {data:duel,error}=await admin.from('paqui_world_duels').select('id,challenger,opponent,game,status,created_at').eq('id',duel_id).single();
  if(error||!duel||duel.challenger!==user.id||duel.status!=='pending')return reply({error:'Duel not available'},403);
  // Avoid repeated sends when clients retry: one notification per duel, recorded atomically.
  const {data:claimed,error:claimError}=await admin.rpc('paqui_duel_claim_push',{p_duel:duel.id});
  if(claimError)return reply({error:'Push claim function missing'},503);
  if(!claimed)return reply({ok:true,already_sent:true});
  const {data:subs,error:subError}=await admin.from('paqui_push_subscriptions').select('subscription').eq('user_id',duel.opponent);
  if(subError)throw subError;
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!,Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
  const {data:member}=await admin.from('group_members').select('display_name').eq('auth_user_id',user.id).eq('is_active',true).limit(1).maybeSingle();
  const gameName=({trivia:'Trivial',memory:'Memoria',reflex:'Reflejos',races:'Carreras'} as Record<string,string>)[duel.game]||'Paquillo World';
  const payload=JSON.stringify({title:'⚔️ ¡Te han retado en Paquillo World!',body:(member?.display_name||'Un Paquillo')+' te invita a una partida de '+gameName+'.',tag:'duel-'+duel.id,url:'/Eventos-Paquillo/?duel='+duel.id+'#world'});
  const results=await Promise.allSettled((subs||[]).map(s=>webpush.sendNotification(s.subscription,payload)));
  return reply({ok:true,devices:results.filter(x=>x.status==='fulfilled').length});
 }catch(e){return reply({error:String(e)},500);}
});
