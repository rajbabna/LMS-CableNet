// ===========================================================
// js/content-renderer.js
// Inline content rendering for non-lesson modules (Step 5).
//
// Instead of navigating away from the course page, clicking a
// `video | pdf | interactive | text` module card opens a themed
// modal overlay on the same page that embeds / renders the
// module's content_url.
//
//   video       -> HTML5 <video> (.mp4/.webm) or YouTube/Vimeo iframe
//   pdf         -> embedded <iframe> (PDF viewer) + new-tab fallback
//   interactive -> embedded <iframe> (an in-page tool)
//   text        -> fetched and rendered as an article (CORS-friendly)
//
// Falls back to a plain "open in new tab" link if a type can't be
// embedded (e.g. a fetch fails or the type is unknown).
// ===========================================================

(function () {
  'use strict';

  var lastFocused = null;

  function injectStyles() {
    if (document.getElementById('contentRendererStyle')) return;
    var style = document.createElement('style');
    style.id = 'contentRendererStyle';
    style.textContent = `
      .cr-modal {
        position: fixed;
        inset: 0;
        z-index: 2100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
      }
      .cr-modal[hidden] { display: none; }
      .cr-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(18, 24, 31, 0.55);
      }
      .cr-panel {
        position: relative;
        width: min(880px, 100%);
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.32);
      }
      .cr-head {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.85rem 1.1rem;
        background: var(--teal);
        color: #fff;
      }
      .cr-badge {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.25em 0.7em;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.35);
        white-space: nowrap;
      }
      .cr-title {
        flex: 1;
        min-width: 0;
        font-family: var(--font-display);
        font-size: 1.05rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cr-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        padding: 0.1rem 0.45rem;
      }
      .cr-close:hover { color: #d9ecec; }
      .cr-body {
        background: #fff;
        overflow: hidden;
      }
      .cr-frame {
        display: block;
        width: 100%;
        height: 62vh;
        min-height: 340px;
        border: 0;
        background: #fff;
      }
      .cr-video {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 16 / 9;
        background: #000;
      }
      .cr-article {
        margin: 0;
        padding: 1.4rem 1.6rem;
        max-height: 62vh;
        overflow: auto;
        white-space: pre-wrap;
        font-family: var(--font-body);
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--ink);
      }
      .cr-loading,
      .cr-fallback {
        padding: 2.4rem 2rem;
        text-align: center;
        color: var(--ink-soft);
        font-style: italic;
        font-family: var(--font-body);
        font-size: 0.95rem;
      }
      .cr-info {
        padding: 1.4rem 1.6rem;
        max-height: 62vh;
        overflow: auto;
        font-family: var(--font-body);
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--ink);
      }
      .cr-info-row {
        margin-top: 0.6rem;
        padding-top: 0.6rem;
        border-top: 1px dashed var(--line);
        color: var(--ink-soft);
        font-size: 0.85rem;
      }
      .cr-info-row:first-of-type {
        margin-top: 0;
        padding-top: 0;
        border-top: 0;
      }
      .cr-foot {
        display: flex;
        justify-content: flex-end;
        padding: 0.65rem 1.1rem;
        border-top: 1px solid var(--line);
        background: var(--paper);
      }
      .cr-external {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--teal);
        text-decoration: none;
        border: 1px solid var(--teal);
        border-radius: 999px;
        padding: 0.4em 0.9em;
      }
      .cr-external:hover { background: var(--teal); color: #fff; }
    `;
    document.head.appendChild(style);
  }

  var MODAL_HTML = [
    '<div class="cr-modal" hidden role="dialog" aria-modal="true" aria-label="Course content">',
    '  <div class="cr-backdrop" data-cr-close></div>',
    '  <div class="cr-panel">',
    '    <div class="cr-head">',
    '      <span class="cr-badge" data-cr-badge></span>',
    '      <span class="cr-title" data-cr-title></span>',
    '      <button type="button" class="cr-close" data-cr-close aria-label="Close">&times;</button>',
    '    </div>',
    '    <div class="cr-body" data-cr-body></div>',
    '    <div class="cr-foot">',
    '      <a class="cr-external" data-cr-external target="_blank" rel="noopener">Open in new tab&nbsp;&#8599;</a>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n');

  // ============================================================
  // URL helpers
  // ============================================================
  function getYoutubeId(url) {
    var m;
    m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    m = url.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    return null;
  }

  function isMp4(url) {
    return /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(url);
  }

  // ============================================================
  // Per-type renderers: each returns HTML for the .cr-body
  // ============================================================
  function videoHtml(url) {
    var yt = getYoutubeId(url);
    if (yt) {
      return '<iframe class="cr-video" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) +
        '" title="Video content" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    }
    if (isMp4(url)) {
      return '<video class="cr-video" controls preload="metadata" playsinline' +
        (url ? ' src="' + url + '"' : '') + '></video>';
    }
    // Unknown video host (Vimeo, etc.) — iframe the page as a best effort.
    return '<iframe class="cr-frame" src="' + url + '" title="Video content" allowfullscreen></iframe>';
  }

  function pdfHtml(url) {
    return '<iframe class="cr-frame" src="' + url + '" title="PDF content"></iframe>';
  }

  function interactiveHtml(url) {
    return '<iframe class="cr-frame" src="' + url +
      '" title="Interactive content" allow="fullscreen; clipboard-write; encrypted-media"></iframe>';
  }

  // Fetches remote text and renders it as an article. Falls back to
  // a link if the fetch is blocked (e.g. CORS) or returns HTML.
  function textHtml(url, bodyEl) {
    bodyEl.innerHTML = '<div class="cr-loading">Loading…</div>';
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        if (!text || /^\s*</.test(text.trim().slice(0, 200))) throw new Error('not plain text');
        const pre = document.createElement('pre');
        pre.className = 'cr-article';
        pre.textContent = text;
        bodyEl.innerHTML = '';
        bodyEl.appendChild(pre);
      })
      .catch(function () {
        bodyEl.innerHTML = '<div class="cr-fallback">Could not load this article inline. ' +
          'Use the link below to open it in a new tab.</div>';
      });
  }

  // ============================================================
  // Public API
  // ============================================================
  function open(module) {
    var type = (module && module.content_type) || 'lesson';
    var url = (module && module.content_url) || '';
    var title = (module && module.title) || 'Content';
    var badge = type.charAt(0).toUpperCase() + type.slice(1);

    injectStyles();
    ensureModal();

    var modal = document.getElementById('crModal');
    var badgeEl = modal.querySelector('[data-cr-badge]');
    var titleEl = modal.querySelector('[data-cr-title]');
    var bodyEl = modal.querySelector('[data-cr-body]');
    var extEl = modal.querySelector('[data-cr-external]');

    badgeEl.textContent = badge;
    titleEl.textContent = title;
    extEl.href = url;

    lastFocused = document.activeElement;

    // text is fetched async; the rest are synchronous embeds.
    if (type === 'text') {
      textHtml(url, bodyEl);
    } else if (type === 'video') {
      bodyEl.innerHTML = videoHtml(url);
    } else if (type === 'pdf') {
      bodyEl.innerHTML = pdfHtml(url);
    } else if (type === 'interactive') {
      bodyEl.innerHTML = interactiveHtml(url);
    } else {
      // Unknown / lesson requested via the modal — just a fallback link.
      bodyEl.innerHTML = '<div class="cr-fallback">This module opens in a new tab.</div>';
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('[data-cr-close]');
    closeBtn.focus();
  }

  // Info view: shows the module's type, status, description and number in
  // a clean panel. The raw content URL is deliberately NOT printed here —
  // opening the content is the job of the module's Open button and the
  // footer action, not a read-only text row.
  function openInfo(module, statusLabel) {
    if (!module) return;
    var type = (module.content_type || 'lesson');
    var title = module.title || 'Module info';

    injectStyles();
    ensureModal();

    var modal = document.getElementById('crModal');
    var badgeEl = modal.querySelector('[data-cr-badge]');
    var titleEl = modal.querySelector('[data-cr-title]');
    var bodyEl = modal.querySelector('[data-cr-body]');
    var extEl = modal.querySelector('[data-cr-external]');

    badgeEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    titleEl.textContent = title;
    extEl.href = module.content_url || '';
    extEl.textContent = (type === 'lesson'
      ? 'Open lesson'
      : 'Open in new tab') + '\u00A0\u2197';

    bodyEl.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'cr-info';

    if (module.description) {
      var p = document.createElement('p');
      p.textContent = module.description;
      box.appendChild(p);
    } else {
      var none = document.createElement('p');
      none.textContent = 'No additional details are available for this module.';
      none.style.color = 'var(--ink-soft)';
      none.style.fontStyle = 'italic';
      box.appendChild(none);
    }

    var meta = [
      module.module_number ? 'Module ' + module.module_number : null,
      statusLabel ? 'Status: ' + statusLabel : null
    ].filter(Boolean);
    if (meta.length) {
      var row = document.createElement('div');
      row.className = 'cr-info-row';
      row.textContent = meta.join(' · ');
      box.appendChild(row);
    }

    bodyEl.appendChild(box);

    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('[data-cr-close]').focus();
  }

  function close() {
    var modal = document.getElementById('crModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function ensureModal() {
    if (document.getElementById('crModal')) return;
    var wrapper = document.createElement('div');
    wrapper.innerHTML = MODAL_HTML.trim();
    var modal = wrapper.firstChild;
    modal.id = 'crModal';
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-cr-close]')) close();
    });
    document.body.appendChild(modal);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('crModal');
      if (modal && !modal.hidden) close();
    }
  });

  window.ContentRenderer = { open: open, openInfo: openInfo, close: close };
})();