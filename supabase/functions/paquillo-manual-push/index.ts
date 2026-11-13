// Paquillo Events · notificaciones manuales · solo administradores.
// Claves secretas exclusivamente en Supabase, nunca en GitHub.
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const SITE = "https://javi13gg-creator.github.io/Eventos-Paquillo/";
const ORIGIN = "https://javi13gg-creator.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
const fail = (error: string, status = 400) => json({ error }, status);
const isUuid = (v: unknown) => typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const trim = (v: unknown) => typeof v === "string" ? v.trim() : "";
const decode = (v: string) => {
  const normalized = v.replace(/-/g, "+").replace(/_/g, "/");
  const data = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(data, (c) => c.charCodeAt(0));
};
const encode = (v: Uint8Array) => btoa(String.fromCharCode(...v))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
function vapidJwk(pubBase64: string, privBase64: string) {
  const pub = decode(pubBase64), priv = decode(privBase64);
  if (pub.length !== 65 || pub[0] !== 4 || priv.length !== 32) {
    throw new Error("Las claves VAPID no tienen el formato esperado.");
  }
  const x=encode(pub.slice(1,33)), y=encode(pub.slice(33,65)), d=encode(priv);
  return {
    publicKey: {kty:"EC",crv:"P-256",alg:"ES256",x,y,ext:true,key_ops:["verify"]},
    privateKey:{kty:"EC",crv:"P-256",alg:"ES256",x,y,d,ext:true,key_ops:["sign"]},
  };
}
type Device = { user_id:string; endpoint:string; subscription:unknown };
type DeviceStatus = { device:string; result:"accepted"|"failed"; reason?:string };
type RecipientStatus = {
  name:string; status:"ready"|"accepted"|"failed"|"partial"|"disabled"|"no_subscription"|"unlinked";
  devices:number; accepted:number; failed:number; details:DeviceStatus[];
};
const providerName=(endpoint:string)=>{
  try {
    const host=new URL(endpoint).hostname;
    if(host.includes("push.apple.com"))return "Apple";
    if(host.includes("fcm.googleapis.com")||host.includes("googleapis.com"))return "FCM / Google";
    if(host.includes("mozilla.com")||host.includes("mozilla.org"))return "Mozilla";
    return "Otro proveedor push";
  } catch { return "Proveedor desconocido"; }
};
const failureReason=(e:unknown)=>{
  const status=(e as {response?:{status?:number}})?.response?.status;
  if(status===404||status===410)return "Suscripción caducada o eliminada";
  if(status===401||status===403)return "Rechazo de autenticación VAPID";
  if(status===429)return "Límite de solicitudes del proveedor";
  if(status===400||status===413)return "Suscripción o mensaje inválido";
  if(typeof status==="number")return "Error del proveedor HTTP "+status;
  return "Fallo de conexión o envío";
};

Deno.serve(async (req) => {
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return fail("Método no permitido",405);
  if(req.headers.get("origin") && req.headers.get("origin")!==ORIGIN)return fail("Origen no permitido",403);
  const url=Deno.env.get("SUPABASE_URL");
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return fail("Falta configurar Supabase en el servidor",503);
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const authorization=req.headers.get("authorization")||"";
  const token=authorization.startsWith("Bearer ")?authorization.slice(7):"";
  if(!token||token.length>8000)return fail("Sesión requerida",401);
  try{
    const {data:auth,error:authError}=await db.auth.getUser(token);
    if(authError||!auth.user)return fail("La sesión no es válida",401);
    const {data:profile,error:profileError}=await db.from("user_profiles")
      .select("role").eq("user_id",auth.user.id).maybeSingle();
    if(profileError||profile?.role!=="admin")return fail("Solo la administración puede enviar avisos",403);
    const raw=await req.text();
    if(raw.length>3500)return fail("La solicitud es demasiado grande");
    let body:Record<string,unknown>={};
    try{body=JSON.parse(raw||"{}");}catch{return fail("JSON inválido");}
    if(!body||typeof body!=="object"||Array.isArray(body))return fail("Formato inválido");
    const action=body.action;
    if(action==="history"){
      const {data,error}=await db.from("paqui_manual_push_log")
        .select("created_at,kind,title,body,audience,attempted,sent,failed,status,event_id,delivery_details")
        .order("created_at",{ascending:false}).limit(12);
      if(error)return fail("Falta ejecutar el SQL del historial de avisos",503);
      return json({items:data||[]});
    }
    if(action!=="preview"&&action!=="send")return fail("Acción no permitida");
    const kind=body.kind==="event"?"event":"announcement";
    const audience=body.audience==="attendees"?"attendees":"all";
    const eventId=trim(body.event_id);
    const destination=["proximos","world","cumples","votaciones"].includes(String(body.destination))
      ?String(body.destination):"proximos";
    if(kind!=="event"&&audience==="attendees")return fail("Los asistentes solo se pueden seleccionar en avisos de planes");
    if(kind==="event"){
      if(!isUuid(eventId)&&!/^[0-9]{1,20}$/.test(eventId))return fail("Selecciona un plan válido");
      const {data:event,error}=await db.from("group_events").select("id,title,status").eq("id",eventId).maybeSingle();
      if(error||!event||["draft","cancelled"].includes(event.status))
        return fail("El plan no existe o no admite avisos");
    }
    const [subscriptions,preferences,memberResult]=await Promise.all([
      db.from("paqui_push_subscriptions").select("user_id,endpoint,subscription").limit(1000),
      db.from("paqui_notification_preferences").select("user_id,push_enabled").limit(1000),
      db.from("group_members").select("id,auth_user_id,display_name").eq("is_active",true).limit(1000),
    ]);
    if(subscriptions.error||preferences.error||memberResult.error)
      return fail("No se pudieron consultar las suscripciones y las preferencias push",503);
    const enabled=new Set((preferences.data||[]).filter(p=>p.push_enabled===true).map(p=>p.user_id));
    const members=memberResult.data||[];
    const active=new Set(members.map(m=>m.auth_user_id).filter(Boolean));
    let targeted:Set<string>|null=null;
    if(audience==="attendees"){
      const {data:confirmed,error}=await db.from("event_attendance")
        .select("member_id,status").eq("event_id",eventId).in("status",["yes","maybe"]);
      if(error)return fail("Error al consultar las confirmaciones de asistencia",503);
      const memberIds=new Set((confirmed||[]).map(row=>String(row.member_id)));
      targeted=new Set(members.filter(m=>memberIds.has(String(m.id))).map(m=>m.auth_user_id));
    }
    const devices:Device[]=(subscriptions.data||[]).filter(row=>
      row.endpoint&&row.subscription&&active.has(row.user_id)&&enabled.has(row.user_id)&&
      (!targeted||targeted.has(row.user_id)));
    const selectedMembers=members.filter(m=>!targeted||targeted.has(m.auth_user_id));
    const statuses:RecipientStatus[]=selectedMembers.map(m=>{
      const mine=devices.filter(row=>row.user_id===m.auth_user_id);
      const status:RecipientStatus["status"]=!m.auth_user_id?"unlinked":
        !enabled.has(m.auth_user_id)?"disabled":!mine.length?"no_subscription":"ready";
      return {
        name:String(m.display_name||"Paquillo"),status,
        devices:mine.length,accepted:0,failed:0,details:[],
      };
    });
    const memberByUser=new Map<string,RecipientStatus>();
    selectedMembers.forEach((m,i)=>{if(m.auth_user_id)memberByUser.set(m.auth_user_id,statuses[i]);});
    if(action==="preview")return json({
      devices:devices.length,users:new Set(devices.map(d=>d.user_id)).size,
      recipients:statuses,
    });
    const title=trim(body.title),message=trim(body.message);
    if(title.length<4||title.length>75||message.length<6||message.length>220)
      return fail("El título debe tener 4–75 caracteres y el mensaje 6–220");
    if(!isUuid(body.request_id))return fail("Falta identificador único del envío");
    if(!devices.length)return fail("No hay dispositivos con notificaciones push activas");
    if(devices.length>300)return fail("Existen demasiados dispositivos para un envío");

    const {data:recent,error:recentError}=await db.from("paqui_manual_push_log")
      .select("created_at").eq("created_by",auth.user.id)
      .gte("created_at",new Date(Date.now()-45_000).toISOString()).limit(1);
    if(recentError)return fail("Falta ejecutar el SQL de los avisos manuales",503);
    if(recent?.length)return fail("Espera 45 segundos antes del siguiente envío",429);
    const requestId=body.request_id as string;
    const {error:logError}=await db.from("paqui_manual_push_log").insert({
      request_id:requestId,created_by:auth.user.id,kind,title,body:message,
      audience,event_id:kind==="event"?eventId:null,attempted:devices.length,
      sent:0,failed:0,status:"sending",
    });
    if(logError)return fail(logError.code==="23505"?"Este aviso ya se envió":"No se pudo registrar el aviso",logError.code==="23505"?409:503);

    const publicKey=Deno.env.get("VAPID_PUBLIC_KEY")||"";
    const privateKey=Deno.env.get("VAPID_PRIVATE_KEY")||"";
    const subject=Deno.env.get("VAPID_SUBJECT")||"";
    let sent=0,failed=0,removed=0;
    const providerCounts=new Map<string,number>();
    const deviceRecord=new Map<string,{owner:RecipientStatus|null; entry:DeviceStatus}>();
    for(const device of devices){
      const owner=memberByUser.get(device.user_id)||null;
      const count=(providerCounts.get(device.user_id)||0)+1;
      providerCounts.set(device.user_id,count);
      const entry:DeviceStatus={device:"Dispositivo "+count+" · "+providerName(device.endpoint),result:"failed",reason:"Sin respuesta del proveedor"};
      if(owner)owner.details.push(entry);
      deviceRecord.set(device.endpoint,{owner,entry});
    }
    const settle=(row:Device,result:"accepted"|"failed",reason?:string)=>{
      const info=deviceRecord.get(row.endpoint);
      if(info){
        info.entry.result=result;
        if(reason)info.entry.reason=reason;
        else delete info.entry.reason;
        if(info.owner){
          if(result==="accepted")info.owner.accepted++;
          else info.owner.failed++;
        }
      }
    };
    const finalize=()=>{
      for(const person of statuses){
        if(person.status!=="ready")continue;
        person.status=person.accepted&&person.failed?"partial":
          person.accepted?"accepted":"failed";
      }
      return statuses;
    };
    try{
      if(!publicKey||!privateKey||!subject.startsWith("mailto:"))
        throw new Error("Configura VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT en Supabase");
      const vapidKeys=await webpush.importVapidKeys(vapidJwk(publicKey,privateKey));
      const server=await webpush.ApplicationServer.new({contactInformation:subject,vapidKeys});
      const payload=JSON.stringify({
        title,body:message,tag:"paquillo-manual-"+requestId,
        url:SITE+"#"+(kind==="event"?"proximos":destination),
      });
      for(let i=0;i<devices.length;i+=8){
        await Promise.all(devices.slice(i,i+8).map(async row=>{
          try{
            const sub=typeof row.subscription==="string"?JSON.parse(row.subscription):row.subscription;
            if(!sub?.keys?.auth||!sub?.keys?.p256dh||sub.endpoint!==row.endpoint){
              failed++;settle(row,"failed","Suscripción inválida o incompleta");return;
            }
            await server.subscribe({endpoint:row.endpoint,keys:{auth:sub.keys.auth,p256dh:sub.keys.p256dh}})
              .pushTextMessage(payload,{ttl:86400});
            sent++;settle(row,"accepted");
          }catch(e){
            failed++;settle(row,"failed",failureReason(e));
            const status=(e as {response?:{status?:number}})?.response?.status;
            if(status===404||status===410){
              const {error}=await db.from("paqui_push_subscriptions").delete().eq("endpoint",row.endpoint);
              if(!error)removed++;
            }
          }
        }));
      }
    }catch(e){
      finalize();
      await db.from("paqui_manual_push_log").update({
        status:"error",sent:0,failed:devices.length,delivery_details:statuses
      }).eq("request_id",requestId);
      return fail(e instanceof Error?e.message:"No fue posible enviar avisos",503);
    }
    finalize();
    const {error:historyError}=await db.from("paqui_manual_push_log")
      .update({sent,failed,status:failed?(sent?"partial":"error"):"sent",
        delivery_details:statuses})
      .eq("request_id",requestId);
    return json({
      attempted:devices.length,sent,failed,expired_removed:removed,
      recipients:statuses,history_saved:!historyError,
      note:"Aceptada significa que el proveedor push admitió el mensaje; no confirma que el móvil lo mostrase."
    });
  }catch(_e){return fail("Error interno del servidor de notificaciones",500);}
});
