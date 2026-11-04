import {it,expect,afterEach,vi} from "vitest";
import {Hono} from "hono";
import {Google} from "../../src/middleware/Google.js";
import {runtime,type Runtime} from "../../src/configuracion/runtime.js";
const frontend="https://frontend-baa4tscpm.vercel.app";
const bindings={COOKIE_SECRET:"abcdefghijklmnopqrstuvwxyz0123456789",NODE_ENV:"production",APP_PUBLIC_URL:frontend,APP_ORIGINS:frontend,GOOGLE_ID:"test-client",GOOGLE_SECRET:"test-secret"};
const app=new Hono().get("/api/auth/google",Google(),c=>c.json({ok:true}));
const request=(url:string,headers:HeadersInit={},extra={})=>runtime.run({bindings:{...bindings,...extra}} as unknown as Runtime,()=>app.request(url,{headers}));
afterEach(()=>vi.unstubAllGlobals());
it("usa el frontend como callback aunque la solicitud llegue al Worker",async()=>{
 const r=await request("https://worker.test/api/auth/google");expect(r.status).toBe(302);
 const url=new URL(r.headers.get("location")!);
 expect(url.searchParams.get("redirect_uri")).toBe(frontend+"/api/auth/google");
 expect(url.searchParams.get("client_id")).toBe("test-client");
 expect(r.headers.get("set-cookie")).toContain("HttpOnly");
});
it("conserva callback y verifica state durante el intercambio",async()=>{
 const start=await request("https://worker.test/api/auth/google",{}, {GOOGLE_REDIRECT_URI:frontend+"/api/auth/google"});
 const state=new URL(start.headers.get("location")!).searchParams.get("state")!;
 const mock=vi.fn().mockResolvedValueOnce(Response.json({access_token:"test-token",scope:"openid email profile",expires_in:3600})).mockResolvedValueOnce(Response.json({id:"test-user",email:"user@example.com",verified_email:true}));vi.stubGlobal("fetch",mock);
 const result=await request("https://worker.test/api/auth/google?code=test-code&state="+encodeURIComponent(state),{cookie:"state="+state});
 expect(result.status).toBe(200);expect(mock).toHaveBeenCalledTimes(2);
 const tokenBody=mock.mock.calls[0]![1].body;
 expect(JSON.parse(tokenBody).redirect_uri).toBe(frontend+"/api/auth/google");
});
it("rechaza un callback con state ajeno antes de contactar a Google",async()=>{
 const mock=vi.fn();vi.stubGlobal("fetch",mock);
 const r=await request("https://worker.test/api/auth/google?code=test&state=bad",{cookie:"state=good"});
 expect(r.status).toBe(401);expect(mock).not.toHaveBeenCalled();
});
