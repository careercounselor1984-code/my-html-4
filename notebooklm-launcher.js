/* 좋은일자리 상담일지 통합본 - NotebookLM 국취 AI 바로가기
 * NotebookLM의 질문창을 iframe에 임베드하지 않습니다.
 * 노트북 공유 URL은 브라우저에만 저장하며, 별도 창에서 재사용해 엽니다.
 */
(function () {
  'use strict';
  var STORAGE_KEY = 'goodjob.notebooklm.notebookUrl.v1';
  var WINDOW_NAME = 'goodjob_kookchwi_notebooklm';
  var sessionUrl = '';
  var dialogReturnFocus = null;

  function validatedUrl(raw) {
    try {
      var url = new URL(String(raw || '').trim());
      if (url.protocol !== 'https:' || !['notebooklm.google.com', 'notebook.google.com'].includes(url.hostname)) return '';
      if (!/^\/notebook\/[A-Za-z0-9_-]+(?:\/preview)?\/?$/.test(url.pathname)) return '';
      url.hash = '';
      return url.toString();
    } catch (_) { return ''; }
  }
  function getUrl() {
    try { return validatedUrl(localStorage.getItem(STORAGE_KEY)) || sessionUrl; }
    catch (_) { return sessionUrl; }
  }
  function storeUrl(url) {
    sessionUrl = url;
    try {
      localStorage.setItem(STORAGE_KEY, url);
      return true;
    } catch (_) { return false; }
  }
  function clearUrl() {
    sessionUrl = '';
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }
  function openNotebook() {
    var url = getUrl();
    if (!url) { showSettings(true); return; }
    var popup = window.open(url, WINDOW_NAME);
    if (popup) {
      try { popup.opener = null; popup.focus(); } catch (_) {}
    } else {
      alert('브라우저에서 팝업이 차단되었어요. 이 사이트의 팝업을 허용한 후 다시 눌러주세요.');
    }
  }

  var overlay, input, errorMessage, statusText;
  function showSettings(openAfterSave) {
    if (!overlay) return;
    dialogReturnFocus = document.activeElement;
    overlay.dataset.openAfterSave = openAfterSave ? '1' : '0';
    input.value = getUrl();
    errorMessage.textContent = '';
    statusText.textContent = getUrl()
      ? '저장된 노트북 주소가 있습니다. 변경하거나 연결을 해제할 수 있습니다.'
      : 'NotebookLM에서 국취 AI 노트북을 연 뒤 주소창의 링크를 붙여넣으세요. 이 설정은 현재 브라우저에만 저장됩니다.';
    overlay.hidden = false;
    input.focus();
    input.select();
  }
  function closeSettings() {
    if (!overlay) return;
    overlay.hidden = true;
    try { if (dialogReturnFocus && dialogReturnFocus.focus) dialogReturnFocus.focus(); } catch (_) {}
  }

  function buildSettings() {
    overlay = document.createElement('div');
    overlay.id = 'clgNotebookOverlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<section class="clgNotebookDialog" role="dialog" aria-modal="true" aria-labelledby="clgNotebookHeading">' +
      '  <div class="clgNotebookHead"><h2 id="clgNotebookHeading">국취 AI 도우미 연결</h2><button type="button" id="clgNotebookClose" aria-label="닫기">×</button></div>' +
      '  <p id="clgNotebookStatus" class="clgNotebookHint"></p>' +
      '  <form id="clgNotebookForm"><label for="clgNotebookUrl">NotebookLM 노트북 주소</label>' +
      '    <input id="clgNotebookUrl" type="url" autocomplete="off" spellcheck="false" required ' +
      '      placeholder="https://notebooklm.google.com/notebook/..." />' +
      '    <p id="clgNotebookError" class="clgNotebookError" role="alert" aria-live="polite"></p>' +
      '    <div class="clgNotebookControls"><button type="button" id="clgNotebookUnlink">연결 해제</button>' +
      '      <button type="button" id="clgNotebookCancel">취소</button>' +
      '      <button type="submit" class="clgNotebookPrimary">저장하고 열기</button></div>' +
      '  </form>' +
      '  <p class="clgNotebookHint">개인정보를 입력하지 마세요. 실제 수당·종료·실적 처리는 원문과 담당자 확인 후 진행하세요.</p>' +
      '</section>';
    document.body.appendChild(overlay);
    input = document.getElementById('clgNotebookUrl');
    errorMessage = document.getElementById('clgNotebookError');
    statusText = document.getElementById('clgNotebookStatus');
    document.getElementById('clgNotebookClose').onclick = closeSettings;
    document.getElementById('clgNotebookCancel').onclick = closeSettings;
    overlay.addEventListener('pointerdown', function (ev) {
      if (ev.target === overlay) closeSettings();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !overlay.hidden) { ev.preventDefault(); closeSettings(); }
    });
    document.getElementById('clgNotebookUnlink').onclick = function () {
      clearUrl();
      input.value = '';
      errorMessage.textContent = '';
      statusText.textContent = '연결을 해제했어요. 다시 연결하려면 노트북 주소를 입력하세요.';
      input.focus();
    };
    document.getElementById('clgNotebookForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var url = validatedUrl(input.value);
      if (!url) {
        errorMessage.textContent = 'NotebookLM에서 해당 노트북을 열고 주소창의 전체 주소를 복사해 주세요.';
        input.focus();
        return;
      }
      var persisted = storeUrl(url);
      closeSettings();
      if (!persisted) {
        alert('노트북을 열지만 브라우저 저장소가 차단되어 주소는 이번 사용 중에만 유지됩니다.');
      }
      openNotebook();
    });
  }

  function injectStyle() {
    var style = document.createElement('style');
    style.id = 'clgNotebookStyles';
    style.textContent = [
      '.clgNotebookWrap{position:relative;margin-top:8px}',
      '.clgNotebookCard{width:100%;text-align:left;cursor:pointer;border:1px solid #9fc6ff;background:#eff6ff;display:flex;align-items:center}',
      '.clgNotebookCard .fixedGptBadge{background:#dbeafe;color:#1e40af}',
      '.clgNotebookCard .fixedGptTitle{color:#1e3a8a}',
      '.clgNotebookCard .fixedGptDesc{color:#475569}',
      '.clgNotebookCard:focus-visible,.clgNotebookSettings:focus-visible{outline:3px solid #2563eb;outline-offset:2px}',
      '.clgNotebookSettings{position:absolute;top:7px;right:7px;border:0;border-radius:7px;padding:5px 8px;background:#fff;color:#334155;cursor:pointer;font-size:13px;z-index:1}',
      '.clgNotebookCard .fixedGptArrow{margin-right:29px}',
      '#clgNotebookOverlay[hidden]{display:none!important}',
      '#clgNotebookOverlay{position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.58);z-index:2147483000}',
      '.clgNotebookDialog{box-sizing:border-box;background:#fff;border-radius:16px;max-width:490px;width:100%;padding:22px;box-shadow:0 24px 66px rgba(0,0,0,.24);color:#0f172a}',
      '.clgNotebookHead{display:flex;justify-content:space-between;align-items:center;gap:12px}',
      '.clgNotebookHead h2{font-size:18px;margin:0}',
      '#clgNotebookClose{font-size:25px;line-height:1;border:0;background:transparent;cursor:pointer;color:#475569}',
      '.clgNotebookDialog label{display:block;margin:18px 0 6px;font-size:14px;font-weight:700}',
      '.clgNotebookDialog input{box-sizing:border-box;width:100%;padding:11px;border-radius:8px;border:1px solid #94a3b8;font-size:14px}',
      '.clgNotebookHint{font-size:12px;line-height:1.6;color:#64748b}',
      '.clgNotebookError{min-height:20px;margin:4px 0;color:#b91c1c;font-size:12px}',
      '.clgNotebookControls{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}',
      '.clgNotebookControls button{border:1px solid #cbd5e1;border-radius:8px;padding:9px 11px;background:#f8fafc;cursor:pointer;font-size:13px}',
      '.clgNotebookControls .clgNotebookPrimary{background:#2563eb;color:#fff;border-color:#2563eb}',
      '.clgNotebookDialog button:focus-visible{outline:3px solid #2563eb;outline-offset:2px}'
    ].join('\n');
    document.head.appendChild(style);
  }
  function init() {
    if (document.getElementById('clgNotebookOverlay')) return;
    var sidebar = document.querySelector('.fixedGptWrap');
    var topActions = document.querySelector('.topActions');
    if (!sidebar && !topActions) return;
    injectStyle();
    buildSettings();

    if (sidebar) {
      var wrap = document.createElement('div');
      wrap.className = 'clgNotebookWrap';
      wrap.innerHTML =
        '<button type="button" class="fixedGptCard clgNotebookCard" id="clgNotebookSidebarBtn" title="NotebookLM 국취 AI 열기">' +
        '<span class="fixedGptIcon">AI</span>' +
        '<span class="fixedGptText"><span class="fixedGptTop"><span class="fixedGptBadge">NotebookLM</span></span>' +
        '<span class="fixedGptTitle">국취 AI 도우미</span><span class="fixedGptDesc">수당 · 취업종료 · 실적 확인</span></span>' +
        '<span class="fixedGptArrow" aria-hidden="true">↗</span></button>' +
        '<button type="button" class="clgNotebookSettings" id="clgNotebookSettingsBtn" title="국취 AI 노트북 주소 설정" aria-label="국취 AI 노트북 주소 설정">⚙</button>';
      sidebar.appendChild(wrap);
      document.getElementById('clgNotebookSidebarBtn').addEventListener('click', openNotebook);
      document.getElementById('clgNotebookSettingsBtn').addEventListener('click', function () { showSettings(false); });
    }
    if (topActions) {
      var topButton = document.createElement('button');
      topButton.type = 'button';
      topButton.id = 'clgNotebookTopBtn';
      topButton.className = 'topBtn';
      topButton.title = 'NotebookLM 국취 AI 도우미 열기';
      topButton.innerHTML = '✨ <span class="label">국취 AI</span>';
      var oldGpt = topActions.querySelector('.clgGptTopBtn');
      if (oldGpt) oldGpt.insertAdjacentElement('afterend', topButton);
      else topActions.insertBefore(topButton, topActions.firstChild);
      topButton.addEventListener('click', openNotebook);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
