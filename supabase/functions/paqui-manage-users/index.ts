// Supabase Edge Function: paqui-manage-users
// Deploy with JWT verification enabled. Set SUPABASE_SERVICE_ROLE_KEY only as a Supabase secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "https://javi13gg-creator.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (status:number, value:unknown) => new Response(JSON.stringify(value), {status,headers:cors});
const slug = (name:string) => name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
Deno.serve(async (req:Request) => {
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST") return respond(405,{error:"Método no permitido"});
  try {
    const url=Deno.env.get("SUPABASE_URL")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if(!url||!anon||!secret) return respond(500,{error:"Falta configurar Supabase"});
    const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
    if(!token) return respond(401,{error:"Sesión requerida"});
    const userClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await userClient.auth.getUser(token);
    if(authError||!user) return respond(401,{error:"Sesión inválida"});
    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:actor,error:actorError}=await admin.from("user_profiles").select("role").eq("user_id",user.id).single();
    if(actorError||actor?.role!=="admin") return respond(403,{error:"Solo el administrador puede gestionar usuarios"});
    const payload=await req.json();
    const action=String(payload.action||"");
    const username=String(payload.username||"").trim();
    const password=String(payload.password||"");
    const normalized=slug(username);
    if(!["create","reset"].includes(action)) return respond(400,{error:"Acción inválida"});
    if(username.length<2||username.length>60||!normalized||normalized.length>60) return respond(400,{error:"Nombre de usuario inválido"});
    if(password.length<10||password.length>128) return respond(400,{error:"La contraseña debe tener entre 10 y 128 caracteres"});
    const email=`${normalized}@paquillo-events.com`;
    const {data:profiles,error:profilesError}=await admin.from("user_profiles").select("user_id,username");
    if(profilesError) throw profilesError;
    const matching=(profiles||[]).find((p:{username:string})=>slug(p.username)===normalized);
    if(action==="reset"){
      if(!matching) return respond(404,{error:"No existe ese usuario"});
      const {error}=await admin.auth.admin.updateUserById(matching.user_id,{password});
      if(error) throw error;
      const {data:verified,error:verifyError}=await admin.auth.admin.getUserById(matching.user_id);
      if(verifyError||!verified.user) return respond(500,{error:"No se ha podido verificar la cuenta en Supabase Auth"});
      return respond(200,{ok:true,user_id:verified.user.id,auth_email:verified.user.email,project:new URL(url).hostname});
    }
    if(matching) return respond(409,{error:"Ese usuario ya existe"});
    const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username}});
    if(createError||!created.user) throw createError||new Error("No se pudo crear la cuenta");
    const uid=created.user.id;
    try {
      const {error:profileError}=await admin.from("user_profiles").insert({user_id:uid,username,role:"member"});
      if(profileError) throw profileError;
      const {data:existing,error:memberLookupError}=await admin.from("group_members").select("id,auth_user_id").ilike("display_name",username).limit(2);
      if(memberLookupError) throw memberLookupError;
      if((existing||[]).length>1) throw new Error("Hay varios miembros con ese nombre");
      if(existing?.length){
        if(existing[0].auth_user_id) throw new Error("Ese miembro ya tiene una cuenta asociada");
        const {error:linkError}=await admin.from("group_members").update({auth_user_id:uid,is_active:true}).eq("id",existing[0].id).is("auth_user_id",null);
        if(linkError) throw linkError;
      } else {
        const {error:memberError}=await admin.from("group_members").insert({display_name:username,auth_user_id:uid,is_active:true});
        if(memberError) throw memberError;
      }
    }catch(err){
      await admin.auth.admin.deleteUser(uid).catch(()=>{});
      return respond(400,{error:err instanceof Error?err.message:"No se pudo vincular el perfil"});
    }
    const {data:verified,error:verifyError}=await admin.auth.admin.getUserById(uid);
    if(verifyError||!verified.user) return respond(500,{error:"La cuenta no se ha podido verificar en Supabase Auth"});
    return respond(200,{ok:true,user_id:verified.user.id,auth_email:verified.user.email,project:new URL(url).hostname});
  }catch(err){
    console.error("Account management error",err);
    return respond(500,{error:err instanceof Error?err.message:"Error interno"});
  }
});
