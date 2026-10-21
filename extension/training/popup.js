let contextVersion = 0;
let loadSerial = 0;
let activeTabId = null;
let currentInfo = null;
let lastFingerprint = "";
let latestResults = null;

const $ = (id) => document.getElementById(id);
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const pad2 = (n) => String(n).padStart(2, "0");

function parseDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (Number.isNaN(d.getTime()) || d.getFullYear() !== +m[1] || d.getMonth() !== +m[2]-1 || d.getDate() !== +m[3]) return null;
  return d;
}

function iso(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonthsClamped(d, months) {
  const day = d.getDate();
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDay));
  return first;
}

function makePeriods(iapIso) {
  const iap = parseDate(iapIso);
  if (!iap) return [];
  const periods = [];
  let prevEnd = new Date(iap);
  for (let round = 2; round <= 6; round++) {
    const start = addDays(prevEnd, 1);
    const end = addMonthsClamped(iap, round - 1);
    periods.push({ round, start: iso(start), end: iso(end) });
    prevEnd = end;
  }
  return periods;
}

function shortDate(isoStr) {
  const d = parseDate(isoStr);
  return d ? `${d.getMonth() + 1}/${d.getDate()}` : isoStr;
}

function statusFor(count) {
  if (count >= 10) return { label: "10일 이상", cls: "good", ref: "2회 인정 기준 참고" };
  if (count >= 1) return { label: "10일 미만", cls: "warn", ref: "1회 인정 기준 참고" };
  return { label: "훈련 없음", cls: "none", ref: "해당 회차 훈련 없음" };
}

function show(el, yes = true) { el.classList.toggle("hidden", !yes); }

function setError(message) {
  $("errorBox").textContent = `⚠ ${message}`;
  show($("errorBox"), true);
}

function clearError() {
  $("errorBox").textContent = "";
  show($("errorBox"), false);
}

async function sendMessage(message) {
  try {
    return await chrome.tabs.sendMessage(activeTabId, message);
  } catch (e) {
    throw new Error("고용24 직업훈련 상세페이지에서 사용하세요. 설치 직후 이미 열려 있던 페이지라면 한 번 새로고침해 주세요.");
  }
}

function renderInfo(info) {
  currentInfo = info;
  $("courseName").textContent = info.courseName || "-";
  $("institute").textContent = info.institute || "-";
  $("period").textContent = info.period ? `${info.period.start} ~ ${info.period.end}` : "자동감지 실패";
  $("scheduleStatus").textContent = info.advertisedDays ? `총 ${info.advertisedDays}일 · 계산 전` : "계산 전";
  $("scheduleStatus").className = "muted";
}

async function loadPageInfo() {
  const serial = ++loadSerial;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const previousTab = activeTabId;
  if (serial !== loadSerial) return;
  activeTabId = tab?.id;
  if (previousTab !== activeTabId) { $("iapDate").value = ""; invalidateResults(); }
  if (!activeTabId) throw new Error("활성 탭을 확인할 수 없습니다.");

  const supportedUrl = /^https:\/\/(?:www\.|m\.)work24\.go\.kr\/hr\/a\/a\/3100\/selectTracseDetl\.do(?:[?#]|$)/.test(tab?.url || "");
  if (!supportedUrl) {
    $("unsupported").textContent = "고용24 국민내일배움카드 직업훈련 상세페이지에서 사용하세요.";
    show($("unsupported"), true);
    show($("content"), false);
    return;
  }

  const requestTab = activeTabId;
  const res = await sendMessage({ type: "GET_PAGE_INFO" });
  if (requestTab !== activeTabId || serial !== loadSerial) return;
  if (!res?.info?.supported) {
    $("unsupported").textContent = "고용24 국민내일배움카드 직업훈련 상세페이지에서 사용하세요.";
    show($("unsupported"), true);
    show($("content"), false);
    return;
  }

  show($("unsupported"), false);
  show($("content"), true);
  if (lastFingerprint && lastFingerprint !== res.info.fingerprint) invalidateResults();
  renderInfo(res.info);
  lastFingerprint = res.info.fingerprint || "";
  if (!$("iapDate").value) {
    const stored=await chrome.storage.local.get(['clgTrainingPlanContextV1','clgIapTransferPendingV120']);
    const pending=stored?.clgTrainingPlanContextV1||stored?.clgIapTransferPendingV120;
    if(requestTab!==activeTabId||serial!==loadSerial)return;
    const date=normalizeDate(pending?.iapDate||'');
    if(date){$("iapDate").value=date;$("dateHelp").textContent=`통합본 작성 IAP일 ${date} 자동 반영 · 현재 내담자와 날짜가 맞는지 확인하세요.`;}
    else if(res.lastIapDate)$("iapDate").value=res.lastIapDate;
  }
}

function buildResults(scheduleDates, iapDate) {
  const periods = makePeriods(iapDate);
  const allDates = [...new Set(scheduleDates.map(x => x.date))];
  return periods.map(p => {
    const dates = allDates.filter(d => d >= p.start && d <= p.end);
    return { ...p, dates, count: dates.length, status: statusFor(dates.length) };
  });
}

function renderResults(results) {
  const rows = $("rows");
  rows.innerHTML = "";

  for (const r of results) {
    const wrapper = document.createElement("div");
    wrapper.className = "result-row";

    const main = document.createElement("button");
    main.className = "result-main";
    main.type = "button";
    main.innerHTML = `
      <span class="round">${r.round}회차</span>
      <span class="period">${shortDate(r.start)}~${shortDate(r.end)}</span>
      <span class="days">${r.count}일</span>
      <span class="badge ${r.status.cls}">${r.status.label}</span>
      <span class="chev">▼</span>`;

    const detail = document.createElement("div");
    detail.className = "detail hidden";
    detail.innerHTML = `<span class="hint">${r.status.ref}</span><div class="dates">${r.dates.length ? r.dates.map(shortDate).join(", ") : "계산에 포함된 훈련일자가 없습니다."}</div>`;

    main.addEventListener("click", () => {
      const isHidden = detail.classList.contains("hidden");
      detail.classList.toggle("hidden", !isHidden);
      main.querySelector(".chev").textContent = isHidden ? "▲" : "▼";
    });

    wrapper.append(main, detail);
    rows.appendChild(wrapper);
  }
  show($("results"), true);
}

function makeCopyText(results) {
  const lines = ["직업훈련 예정 참여일수 확인"];
  if (currentInfo?.courseName && currentInfo.courseName !== "자동감지 실패") lines.push(`과정: ${currentInfo.courseName}`);
  if (currentInfo?.institute) lines.push(`기관: ${currentInfo.institute}`);
  lines.push(`IAP 수립일: ${normalizeDate($("iapDate").value)}`);
  for (const r of results) {
    const label = r.count === 0 ? "해당 회차 훈련 없음" : r.status.label;
    lines.push(`${r.round}회차(${r.start}~${r.end}): ${r.count}일 / ${label}`);
  }
  lines.push("※ IAP 작성 참고용이며 실제 인정 여부·출석 여부는 상담사가 최종 확인");
  return lines.join("\n");
}

async function calculate() {
  if ($("calcBtn").disabled) return;
  try { await loadPageInfo(); } catch(e) { setError(e.message); return; }
  if ($("content").classList.contains("hidden")) return;
  clearError();
  invalidateResults();

  const iapDate = normalizeDate($("iapDate").value);
  if (iapDate) $("iapDate").value = iapDate;
  if (!iapDate) {
    setError("실제 날짜를 하나만 입력하세요. 예: 20261016, 2026.10.16, 2026년 10월 16일");
    return;
  }

  const calculationTab = activeTabId;
  const calculationVersion = contextVersion;
  $("calcBtn").disabled = true;
  show($("progress"), true);
  $("scheduleStatus").textContent = "시간표 확인 중…";
  $("scheduleStatus").className = "muted";

  try {
    await sendMessage({ type: "SET_IAP_DATE", value: iapDate });
    const res = await chrome.tabs.sendMessage(calculationTab, { type: "EXTRACT_SCHEDULE" });
    if (contextVersion !== calculationVersion || activeTabId !== calculationTab || normalizeDate($("iapDate").value) !== iapDate) return;
    if (!res?.ok) {
      throw new Error(res?.reason || "고용24 시간표의 실제 훈련일자를 자동으로 확인하지 못했습니다.");
    }

    currentInfo = res.info || currentInfo;
    renderInfo(currentInfo);
    $("scheduleStatus").textContent = `${res.verifiedCount}일 확인 · 실제 시간표 기준`;
    $("scheduleStatus").className = "";

    const results = buildResults(res.dates, iapDate);
    latestResults = results;
    window.dispatchEvent(new Event("training-results-changed"));
    renderResults(results);
    const key='clgVerifiedTrainingSchedulesV1';
    const info=res.info||currentInfo;
    const existing=(await chrome.storage.local.get(key))?.[key]||{};
    if(contextVersion!==calculationVersion||activeTabId!==calculationTab)return;
    if(info?.fingerprint&&info?.period){
      const record={info,dates:[...new Set(res.dates.map(x=>x.date))].sort(),verifiedCount:res.verifiedCount,source:res.source||'고용24 실제 시간표',calculatedAt:new Date().toISOString()};
      existing[info.fingerprint]=record;
      await chrome.storage.local.set({[key]:existing});
      $("scheduleStatus").textContent+= ' · 전산도우미 IAP 훈련행 일수에 연결됨(과정·기간 일치 시)';
    }
  } catch (e) {
    if (contextVersion !== calculationVersion) return;
    $("scheduleStatus").textContent = "자동추출 실패";
    $("scheduleStatus").className = "muted";
    setError(e.message || String(e));
  } finally {
    show($("progress"), false);
    $("calcBtn").disabled = false;
    if (contextVersion !== calculationVersion) syncTab();
  }
}

async function copyResults() {
  if (!latestResults) return;
  const text = makeCopyText(latestResults);
  try {
    await navigator.clipboard.writeText(text);
    $("copyBtn").textContent = "복사 완료";
    $("copyBtn").classList.add("copy-ok");
    setTimeout(() => {
      $("copyBtn").textContent = "결과 복사";
      $("copyBtn").classList.remove("copy-ok");
    }, 1300);
  } catch {
    setError("클립보드 복사에 실패했습니다.");
  }
}


function normalizeDate(value) {
  const text = String(value || "").trim();
  const matches = [...text.matchAll(/(?<!\d)(?:(\d{4})(?:[-./]\s*|년\s*)(\d{1,2})(?:[-./]\s*|월\s*)(\d{1,2})(?:일)?|(\d{4})(\d{2})(\d{2}))(?!\d)/g)];
  if (matches.length !== 1) return "";
  const m = matches[0];
  const valueIso = `${m[1] || m[4]}-${pad2(+(m[2] || m[5]))}-${pad2(+(m[3] || m[6]))}`;
  return parseDate(valueIso) ? valueIso : "";
}
function invalidateResults() {
  contextVersion++;
  latestResults = null;
  show($("results"), false);
  $("scheduleStatus").textContent = "계산 전";
  window.dispatchEvent(new Event("training-results-changed"));
}
$("calcBtn").addEventListener("click", calculate);
$("refreshBtn").addEventListener("click", () => { invalidateResults(); clearError(); loadPageInfo().catch(e => setError(e.message)); });
$("copyBtn").addEventListener("click", copyResults);
$("iapDate").addEventListener("input", invalidateResults);
$("iapDate").addEventListener("change", async () => {
  const value = normalizeDate($("iapDate").value);
  if (value) { $("iapDate").value = value; $("datePicker").value = value; }
  if (activeTabId) {
    try { await sendMessage({type:"SET_IAP_DATE", value}); } catch {}
  }
});
$("datePicker").addEventListener("change", () => {
  $("iapDate").value = $("datePicker").value;
  invalidateResults();
  $("iapDate").dispatchEvent(new Event("change"));
});
$("iapDate").addEventListener("keydown", e => {if(e.key === "Enter") calculate();});
async function syncTab() {
  if ($("calcBtn").disabled) return;
  try { await loadPageInfo(); }
  catch(e) { $("unsupported").textContent=e.message; show($("unsupported"),true); show($("content"),false); }
}
chrome.tabs.onActivated.addListener(() => {invalidateResults(); currentInfo=null; show($("content"),false); syncTab();});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === activeTabId && (change.url || change.status === "loading")) {
    invalidateResults(); currentInfo = null;
    show($("content"),false);
  }
  if(id === activeTabId && change.status === "complete") syncTab();
});
syncTab();
