(() => {
  if (window.__WORK24_IAP_EXT_LOADED__) return;
  window.__WORK24_IAP_EXT_LOADED__ = true;

  const STORAGE_KEY = "__work24_iap_calc_last_date";
  const DETAIL_PATH_RE = /\/hr\/a\/a\/3100\/selectTracseDetl\.do$/;
  const DATE_HOUR_RE = /(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시간(?:\s*(\d{1,2})분)?/g;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  function isSupportedPage() {
    return (location.hostname === "www.work24.go.kr" || location.hostname === "m.work24.go.kr")
      && DETAIL_PATH_RE.test(location.pathname);
  }

  function getLines() {
    return (document.body?.innerText || "")
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean);
  }

  function extractTrainingPeriod(text) {
    const m = text.match(/훈련기간\s*(?:\r?\n|\s)*?(\d{4})[-.\s]+(\d{1,2})[-.\s]+(\d{1,2})\s*~\s*(\d{4})[-.\s]+(\d{1,2})[-.\s]+(\d{1,2})/);
    if (!m) return null;
    const start = new Date(+m[1], +m[2] - 1, +m[3]);
    const end = new Date(+m[4], +m[5] - 1, +m[6]);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
    return { start: ymd(start), end: ymd(end) };
  }

  function extractAdvertisedDays(text) {
    const m = text.match(/훈련시간\s*(?:\r?\n|\s)*?(\d{1,4})일\s*,?\s*총\s*[\d,]+시간/);
    return m ? Number(m[1]) : null;
  }

  function stripInstituteBadges(line) {
    return clean(line
      .replace(/우수훈련기관/g, "")
      .replace(/BHA/g, "")
      .replace(/\d+년\s*인증/g, "")
      .replace(/인증평가[^\s]*/g, "")
      .replace(/[★☆]/g, "")
      .replace(/^[,\s]+|[,\s]+$/g, ""));
  }

  function extractCourseAndInstitute(text) {
    const lines = getLines();
    let courseName = "";
    let institute = "";

    const quote = text.match(/귀하는\s*["“](.+?)["”]\s*훈련과정/);
    if (quote) courseName = clean(quote[1]);

    const peopleIdx = lines.findIndex(line => /수강확정인원\s*\d+명/.test(line) && /수강신청인원/.test(line));
    if (peopleIdx >= 1) {
      const before = lines.slice(Math.max(0, peopleIdx - 6), peopleIdx);
      if (!courseName) {
        for (let i = before.length - 1; i >= 0; i--) {
          const line = before[i];
          if (!/^(모집중|모집마감|모집완료)$/.test(line) &&
              !/^(훈련과정 보기|훈련과정 정보|훈련기관 정보|만족도 및 취업률)$/.test(line) &&
              line.length >= 3) {
            courseName = line;
            break;
          }
        }
      }
      if (courseName) {
        const idx = lines.lastIndexOf(courseName, peopleIdx - 1);
        if (idx > 0) {
          for (let i = idx - 1; i >= Math.max(0, idx - 4); i--) {
            const candidate = stripInstituteBadges(lines[i]);
            if (candidate &&
                !candidate.includes("훈련과정") &&
                !candidate.includes("선발") &&
                !candidate.includes("일정") &&
                !/^(훈련과정 보기|훈련과정 정보|훈련기관 정보|만족도 및 취업률)$/.test(candidate)) {
              institute = candidate;
              break;
            }
          }
        }
      }
    }

    if (!institute && courseName) {
      const esc = courseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:이후의 훈련일정[^\\n]*\\n+)?([^\\n]{2,100})\\n+${esc}`);
      const m = text.match(re);
      if (m) institute = stripInstituteBadges(m[1]);
    }

    return {
      courseName: courseName || "자동감지 실패",
      institute: institute || "자동감지 실패"
    };
  }

  function getPageInfo() {
    const text = document.body?.innerText || "";
    const meta = extractCourseAndInstitute(text);
    const period = extractTrainingPeriod(text);
    const advertisedDays = extractAdvertisedDays(text);
    return {
      supported: isSupportedPage(),
      url: location.href,
      title: document.title,
      courseName: meta.courseName,
      institute: meta.institute,
      period,
      advertisedDays,
      fingerprint: `${location.href}|${meta.courseName}|${period?.start || ""}|${period?.end || ""}`
    };
  }

  function visible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function textClickable(label, exact = true) {
    const nodes = [...document.querySelectorAll('button, a, [role="button"], [onclick], li')];
    return nodes.filter(el => {
      const t = clean(el.innerText || el.textContent);
      return exact ? t === label : t.includes(label);
    });
  }

  function safeClick(el) {
    try {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    } catch {
      try { el.click(); return true; } catch { return false; }
    }
  }

  function findBestScheduleTable() {
    let best = null;
    for (const table of document.querySelectorAll("table")) {
      const txt = table.textContent || "";
      const matches = [...txt.matchAll(new RegExp(DATE_HOUR_RE.source, "g"))];
      if (!matches.length) continue;
      const hasWeekHeader = /일\s*월\s*화\s*수\s*목\s*금\s*토/.test(clean(txt)) || /요일/.test(txt);
      const score = matches.length * 10 + (hasWeekHeader ? 20 : 0) + (/훈련/.test(txt) ? 5 : 0);
      if (!best || score > best.score) best = { table, text: txt, score, count: matches.length };
    }
    return best;
  }

  function collectScheduleText() {
    const chunks = [];
    for (const table of document.querySelectorAll("table")) {
      const txt = table.textContent || "";
      if ([...txt.matchAll(new RegExp(DATE_HOUR_RE.source, "g"))].length) chunks.push(txt);
    }
    return chunks.join("\n");
  }

  function countUniqueMonthDay(text) {
    const keys = new Set();
    for (const m of text.matchAll(new RegExp(DATE_HOUR_RE.source, "g"))) {
      keys.add(`${Number(m[1])}-${Number(m[2])}`);
    }
    return keys.size;
  }

  async function tryOpenTimetable() {
    let best = findBestScheduleTable();
    if (best && best.count > 0) return best;

    const viewButtons = textClickable("시간표 보기", true);
    if (viewButtons.length) {
      safeClick(viewButtons.find(visible) || viewButtons[0]);
      await sleep(700);
      best = findBestScheduleTable();
      if (best) return best;
    }

    const tabButtons = textClickable("시간표", true);
    if (tabButtons.length) {
      safeClick(tabButtons.find(visible) || tabButtons[0]);
      await sleep(900);
      best = findBestScheduleTable();
      if (best) return best;
    }
    return null;
  }

  function findNearestExpandButton(table) {
    const candidates = textClickable("펼치기", true).filter(visible);
    if (!candidates.length) return null;
    if (!table) return candidates[0];
    const tr = table.getBoundingClientRect();
    let best = null;
    let bestDistance = Infinity;
    for (const c of candidates) {
      const r = c.getBoundingClientRect();
      const vertical = r.top >= tr.top ? Math.abs(r.top - tr.bottom) : 10000 + Math.abs(r.top - tr.top);
      if (vertical < bestDistance) {
        bestDistance = vertical;
        best = c;
      }
    }
    return bestDistance < 1200 ? best : null;
  }

  async function expandTimetableIfNeeded(expectedDays) {
    let best = await tryOpenTimetable();
    if (!best) return null;

    let previousCount = countUniqueMonthDay(collectScheduleText() || best.text);
    if (expectedDays && previousCount >= expectedDays) return findBestScheduleTable();

    for (let i = 0; i < 30; i++) {
      const btn = findNearestExpandButton(best.table);
      if (!btn) break;
      safeClick(btn);
      await sleep(450);
      best = findBestScheduleTable() || best;
      const count = countUniqueMonthDay(collectScheduleText() || best.text);
      if (count <= previousCount) break;
      previousCount = count;
      if (expectedDays && count >= expectedDays) break;
    }
    return findBestScheduleTable();
  }

  function parseLocalDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function inferFullDates(scheduleText, startIso, endIso) {
    const start = parseLocalDate(startIso);
    const end = parseLocalDate(endIso);
    if (!start || !end) return [];

    const raw = [];
    for (const m of scheduleText.matchAll(new RegExp(DATE_HOUR_RE.source, "g"))) {
      raw.push({ month: Number(m[1]), day: Number(m[2]), hours: Number(m[3]), minutes: Number(m[4] || 0) });
    }
    if (!raw.length) return [];

    const out = [];
    let prev = null;
    for (const item of raw) {
      const candidates = [];
      for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1; year++) {
        const d = new Date(year, item.month - 1, item.day);
        if (d.getMonth() !== item.month - 1 || d.getDate() !== item.day) continue;
        if (d >= start && d <= end) candidates.push(d);
      }
      if (!candidates.length) continue;
      candidates.sort((a, b) => a - b);
      let chosen = candidates[0];
      if (prev) {
        chosen = candidates.find(d => d >= prev) || candidates[candidates.length - 1];
      }
      out.push({ date: ymd(chosen), hours: item.hours, minutes: item.minutes });
      prev = chosen;
    }

    const dedup = new Map();
    for (const item of out) {
      if (!dedup.has(item.date)) dedup.set(item.date, item);
    }
    return [...dedup.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async function extractSchedule() {
    if (!isSupportedPage()) {
      return { ok: false, reason: "고용24 국민내일배움카드 직업훈련 상세페이지에서 사용하세요." };
    }

    const info = getPageInfo();
    if (!info.period) {
      return { ok: false, reason: "훈련기간을 페이지에서 확인하지 못했습니다." };
    }

    let best = await expandTimetableIfNeeded(info.advertisedDays);
    if (!best || !best.text) {
      return {
        ok: false,
        reason: "고용24 시간표의 실제 훈련일자를 자동으로 확인하지 못했습니다. 시간표 탭/표가 아직 로딩되지 않았거나 페이지 구조가 변경되었을 수 있습니다."
      };
    }

    const scheduleText = collectScheduleText() || best.text;
    const dates = inferFullDates(scheduleText, info.period.start, info.period.end);
    if (!dates.length) {
      return {
        ok: false,
        reason: "시간표 영역은 찾았지만 '월/일 + 훈련시간' 형식의 실제 수업일자를 읽지 못했습니다. 임의의 평일 계산은 하지 않았습니다."
      };
    }

    if (info.advertisedDays && dates.length !== info.advertisedDays) {
      return {
        ok: false,
        reason: `시간표에서 ${dates.length}일만 읽었지만 고용24 기본정보에는 총 ${info.advertisedDays}일로 표시됩니다. 시간표가 일부만 펼쳐졌거나 동적 로딩이 완료되지 않은 것으로 판단되어 자동판정을 중단했습니다.`,
        partialCount: dates.length,
        advertisedDays: info.advertisedDays
      };
    }

    return {
      ok: true,
      info,
      dates,
      source: "고용24 상세페이지 시간표 DOM",
      verifiedCount: dates.length
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    if (message.type === "PING") {
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "GET_PAGE_INFO") {
      sendResponse({ ok: true, info: getPageInfo(), lastIapDate: sessionStorage.getItem(STORAGE_KEY) || "" });
      return;
    }

    if (message.type === "SET_IAP_DATE") {
      if (message.value) sessionStorage.setItem(STORAGE_KEY, message.value);
      else sessionStorage.removeItem(STORAGE_KEY);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "EXTRACT_SCHEDULE") {
      extractSchedule()
        .then(sendResponse)
        .catch(err => sendResponse({ ok: false, reason: `시간표 분석 중 오류가 발생했습니다: ${err?.message || String(err)}` }));
      return true;
    }
  });
})();
