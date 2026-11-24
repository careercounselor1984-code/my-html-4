import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

/* Internal map listing. No client address or geocoding data is accepted or stored. */
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(supabaseUrl, serviceKey);
const XML_URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";
const ALLOWED_ORIGIN = "https://careercounselor1984-code.github.io";
const REGIONS = new Set(["31000", "26000", "48000", "47000", "41000", "43000", "44000"]);
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });
const str = (v: unknown, max = 250) => String(v ?? "").trim().slice(0, max);
const arr = (v: unknown): any[] => Array.isArray(v) ? v : v == null ? [] : [v];
const cors = (origin: string | null) => ({
 "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
 "Access-Control-Allow-Headers": "authorization, apikey, content-type",
 "Access-Control-Allow-Methods": "POST, OPTIONS",
 "Vary": "Origin"
});
const response = (data: unknown, status = 200, origin: string | null = null) =>
 new Response(JSON.stringify(data), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const official = (n: string) => "https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=" +
 encodeURIComponent(n) + "&infoTypeCd=VALIDATION&infoTypeGroup=tb_workinfoworknet";

async function authenticate(request: Request) {
 const bearer = request.headers.get("authorization") || "";
 const match = /^Bearer\s+([^\s]+)$/i.exec(bearer);
 if (!match) throw new Error("AUTH_REQUIRED");
 const { data, error } = await db.auth.getUser(match[1]);
 if (error || !data?.user?.id) throw new Error("AUTH_REQUIRED");
 const { data: row, error: roleError } = await db.from("counselor_accounts")
  .select("user_id").eq("user_id", data.user.id).eq("active", true).is("terminated_at", null).maybeSingle();
 if (roleError || !row) throw new Error("NOT_AUTHORIZED");
}

async function work24Key() {
 const { data, error } = await db.rpc("get_career_secret", { p_name: "WORK24_JOB_KEY" });
 if (error || !str(data)) throw new Error("고용24 API 인증키가 등록되지 않았습니다.");
 return str(data, 800);
}

function listJob(x: any) {
 const no = str(x.wantedAuthNo ?? x.WANTED_AUTH_NO, 50);
 return {
   wantedAuthNo: no, source: "고용24", company: str(x.company ?? x.COMPANY, 160),
   title: str(x.title ?? x.TITLE, 240), region: str(x.region ?? x.REGION, 100),
   basicAddr: str(x.basicAddr ?? x.BASIC_ADDR, 250),
   detailAddr: str(x.detailAddr ?? x.DETAIL_ADDR, 180),
   pay: [str(x.salTpNm ?? x.SAL_TP_NM, 70), str(x.sal ?? x.SAL, 90)].filter(Boolean).join(" "),
   registeredDate: str(x.regDt ?? x.REG_DT, 40),
   closeDate: str(x.closeDt ?? x.CLOSE_DT, 40),
   url: official(no)
 };
}
async function fetchList(key: string, region: string, keyword: string, page: number, display: number) {
 const query = new URLSearchParams({
   authKey: key, callTp: "L", returnType: "XML", startPage: String(page),
   display: String(display), region, sortOrderBy: "DESC"
 });
 if (keyword) query.set("keyword", keyword);
 const ctrl = new AbortController();
 const t = setTimeout(() => ctrl.abort(), 12000);
 let upstream: Response;
 try {
   upstream = await fetch(XML_URL + "?" + query, { headers: { Accept: "application/xml,text/xml,*/*" }, signal: ctrl.signal });
 } finally { clearTimeout(t) }
 if (!upstream.ok) throw new Error("고용24 조회 오류 (" + upstream.status + ")");
 const xml = await upstream.text();
 if (xml.length > 2_000_000) throw new Error("고용24 응답 크기 제한을 초과했습니다.");
 if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE_KEY_IS_NULL|SERVICE_ACCESS_DENIED|PERMISSION_DENIED|승인되지|인증키가 유효하지/i.test(xml) && xml.length < 12000) {
   throw new Error("고용24 API 사용 승인을 확인해 주세요.");
 }
 const data = parser.parse(xml);
 const root = data?.wantedRoot ?? data?.WantedRoot ?? data;
 const message = str(root?.message ?? root?.MESSAGE);
 if (/오류|error|승인되지|인증키/i.test(message)) throw new Error("고용24 조회 오류: " + message);
 const dedup = new Map<string, ReturnType<typeof listJob>>();
 for (const j of arr(root?.wanted ?? root?.WANTED).map(listJob)) {
   if (j.wantedAuthNo && j.title && j.company) dedup.set(j.wantedAuthNo, j);
 }
 return { total: Number(root?.total ?? root?.TOTAL ?? 0) || 0, jobs: [...dedup.values()] };
}

Deno.serve(async (req) => {
 const origin = req.headers.get("origin");
 if (req.method === "OPTIONS") {
   return new Response("ok", { status: 200, headers: cors(origin) });
 }
 if (origin && origin !== ALLOWED_ORIGIN) return response({ ok: false, error: "Origin not allowed" }, 403, origin);
 if (req.method !== "POST") return response({ ok: false, error: "POST only" }, 405, origin);
 try {
   await authenticate(req);
 } catch (e) {
   const code = (e as Error).message;
   return response({ ok: false, error: code === "NOT_AUTHORIZED" ? "상담사 사용권한이 없습니다." : "상담일지 통합본에서 로그인한 후 사용해 주세요." }, 401, origin);
 }
 try {
   const body = await req.json().catch(() => ({}));
   const region = str(body.region || "31000", 10);
   if (!REGIONS.has(region)) return response({ ok: false, error: "지원하지 않는 검색 지역입니다." }, 400, origin);
   const keyword = str(body.keyword, 60);
   const page = Math.floor(Number(body.page ?? 1));
   if (!Number.isFinite(page) || page < 1 || page > 10 || (keyword && keyword.length < 2)) {
     return response({ ok: false, error: "검색 페이지 또는 키워드를 확인해 주세요." }, 400, origin);
   }
   const count = 60;
   const result = await fetchList(await work24Key(), region, keyword, page, count);
   return response({
     ok: true, source: "고용24 채용정보 목록 API", region, keyword, page, pageSize: count,
     total: result.total, returned: result.jobs.length, jobs: result.jobs,
     note: "최근 공고 일부를 페이지 단위로 조회합니다. 표시 범위 밖의 공고도 존재합니다. 근무지 주소가 불분명한 공고는 지도에 표시하지 않습니다. 반드시 고용24 원문을 확인하세요."
   }, 200, origin);
 } catch (e) {
   return response({ ok: false, error: str((e as Error)?.message || e) }, 502, origin);
 }
});
