// ===========================================================
// js/ai-mentor.js
// "Ask the Mentor" — a floating AI chat widget for the course
// pages (Step 15). Uses Puter's keyless AI layer (User-Pays:
// each student's own free Puter account covers usage).
//
//  * Persona: a friendly study buddy that explains and guides,
//    stays on-topic, and is clearly labeled as an AI assistant
//    (never a human instructor; never grades).
//  * Course context: the current course's modules are injected
//    so answers stay aligned with the curriculum.
//  * No offline mode: requires connectivity (a notice is shown).
//  * Conversations live in memory for the session only.
// ===========================================================

(function () {
  'use strict';

  const COURSE_ID = (document.body && document.body.dataset.course) || 'cabling';
  const MODEL = 'gpt-5.4-nano';
  const STORE_KEY = 'cn_ai_mentor_dismissed';

  const COURSE_TITLES = {
    cabling: 'Level 1 — Network Foundations: Cabling & Infrastructure',
    networking: 'Level 2 — Network Operations: Configuration & Troubleshooting'
  };

  const el = {
    launcher: null,
    panel: null,
    messages: null,
    input: null,
    sendBtn: null,
    status: null,
    authBar: null
  };

  const conversation = [];
  let courseContext = null;
  let busy = false;
  let aiSessionId = null;
  let savedThisChat = false;

  // ============================================================
  // Course context (grounds answers in the curriculum)
  // ============================================================
  async function buildContext() {
    const title = COURSE_TITLES[COURSE_ID] || COURSE_ID;
    let mods = [];
    if (window.supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('modules')
          .select('title, description')
          .eq('course_id', COURSE_ID)
          .order('module_number', { ascending: true });
        mods = data || [];
      } catch (err) {
        console.log('AI mentor: module context unavailable', err);
      }
    }

    let text = 'You are the AI Mentor for Cable&Net Courses, a friendly, patient study buddy for ' +
      'students of data cabling and networking. Explain concepts clearly in simple language with ' +
      'analogies. Guide students toward understanding — you may ask a guiding question back — but never ' +
      'refuse to help. Stay strictly on-topic: data cabling, networking, the internet, and related course ' +
      'material. If asked something off-topic or inappropriate, politely decline and steer back to the ' +
      'course. You are an AI assistant, NOT a human instructor, and you never grade or decide pass/fail.';

    text += '\n\nCOURSE CONTEXT (the student is currently studying):\n' + title;
    if (mods.length) {
      text += '\nModules:\n' + mods.map(function (m) {
        return '- ' + (m.title || '') + (m.description ? ': ' + m.description : '');
      }).join('\n');
    }

    return text;
  }

  // ============================================================
  // UI construction (self-contained; theme-matching styles)
  // ============================================================
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ai-mentor-launcher {
        position: fixed;
        right: 1.25rem;
        bottom: 1.25rem;
        z-index: 900;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #fff;
        background: var(--teal);
        border: 1px solid var(--teal);
        border-radius: 999px;
        padding: 0.8em 1.3em;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(28, 36, 48, 0.22);
        transition: background 0.2s ease;
      }
      .ai-mentor-launcher:hover { background: #1F4A52; }
      .ai-mentor-panel {
        position: fixed;
        right: 1.25rem;
        bottom: 1.25rem;
        z-index: 901;
        width: min(380px, calc(100vw - 2rem));
        height: min(540px, calc(100vh - 2.5rem));
        display: none;
        flex-direction: column;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(28, 36, 48, 0.25);
        overflow: hidden;
      }
      .ai-mentor-panel.open { display: flex; }
      .ai-mentor-head {
        background: var(--teal);
        color: #fff;
        padding: 0.9rem 1.1rem;
      }
      .ai-mentor-head h3 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.05rem;
        letter-spacing: 0.01em;
      }
      .ai-mentor-head .ai-mentor-label {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.85;
        margin-top: 0.2rem;
      }
      .ai-mentor-close {
        position: absolute;
        top: 0.7rem;
        right: 0.9rem;
        background: none;
        border: none;
        color: #fff;
        font-family: var(--font-mono);
        font-size: 1rem;
        cursor: pointer;
        padding: 0.2rem 0.4rem;
      }
      .ai-mentor-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        background: var(--bg);
      }
      .ai-mentor-msg {
        max-width: 88%;
        border-radius: 10px;
        padding: 0.6rem 0.85rem;
        font-size: 0.9rem;
        line-height: 1.5;
        word-wrap: break-word;
      }
      .ai-mentor-msg.user {
        align-self: flex-end;
        background: var(--teal);
        color: #fff;
        border-bottom-right-radius: 3px;
      }
      .ai-mentor-msg.assistant {
        align-self: flex-start;
        background: #fff;
        border: 1px solid var(--line);
        border-bottom-left-radius: 3px;
      }
      .ai-mentor-msg.assistant p { margin: 0.35rem 0; }
      .ai-mentor-msg.assistant p:first-child { margin-top: 0; }
      .ai-mentor-msg.assistant p:last-child { margin-bottom: 0; }
      .ai-mentor-msg.assistant ul, .ai-mentor-msg.assistant ol { margin: 0.35rem 0; padding-left: 1.3rem; }
      .ai-mentor-msg.assistant code {
        font-family: var(--font-mono);
        font-size: 0.85em;
        background: var(--line);
        border-radius: 4px;
        padding: 0.1em 0.35em;
      }
      .ai-mentor-msg.assistant strong { color: var(--ink); }
      .ai-mentor-msg.assistant em { color: var(--ink-soft); }
      .ai-mentor-msg.typing { color: var(--ink-soft); font-style: italic; }
      .ai-mentor-msg.error { color: var(--red); border: 1px solid var(--red); }
      .ai-mentor-inputbar {
        display: flex;
        gap: 0.5rem;
        padding: 0.8rem;
        border-top: 1px solid var(--line);
        background: var(--paper);
      }
      .ai-mentor-inputbar input {
        flex: 1;
        padding: 0.6em 0.8em;
        border: 1px solid var(--line);
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.9rem;
        background: #fff;
        color: var(--ink);
      }
      .ai-mentor-inputbar input:focus { outline: 2px solid var(--teal); outline-offset: 1px; }
      .ai-mentor-inputbar button {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border: none;
        border-radius: 8px;
        padding: 0.6em 1em;
        cursor: pointer;
        background: var(--copper);
        color: #fff;
      }
      .ai-mentor-inputbar button:disabled { opacity: 0.45; cursor: not-allowed; }
      .ai-mentor-note {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.55rem 0.9rem;
        border-top: 1px solid var(--line);
        background: #fff;
        font-family: var(--font-body);
        font-size: 0.76rem;
        line-height: 1.4;
        color: var(--ink-soft);
      }
      .ai-mentor-auth {
        padding: 0.7rem 1rem;
        background: #fff;
        border-bottom: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: var(--ink-soft);
      }
      .ai-mentor-auth button {
        margin-left: 0.5rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        border: 1px solid var(--teal);
        color: var(--teal);
        background: transparent;
        border-radius: 999px;
        padding: 0.3em 0.8em;
        cursor: pointer;
      }
      .ai-mentor-auth button:hover { background: var(--teal); color: #fff; }
      .ai-mentor-offline {
        padding: 0.6rem 1rem;
        background: #FEF3E0;
        border-bottom: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: #5a3c2a;
      }
      @media (max-width: 480px) {
        .ai-mentor-panel {
          right: 0.5rem;
          left: 0.5rem;
          bottom: 0.5rem;
          width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    if (document.getElementById('aiMentorPanel')) return;

    const launcher = document.createElement('button');
    launcher.className = 'ai-mentor-launcher';
    launcher.type = 'button';
    launcher.id = 'aiMentorLauncher';
    launcher.textContent = 'Ask the Mentor';
    launcher.addEventListener('click', openPanel);

    const panel = document.createElement('div');
    panel.className = 'ai-mentor-panel';
    panel.id = 'aiMentorPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'AI Mentor chat');
    panel.innerHTML = `
      <div class="ai-mentor-head">
        <h3>AI Mentor</h3>
        <div class="ai-mentor-label">AI assistant — not a human instructor</div>
        <button type="button" class="ai-mentor-close" aria-label="Close">×</button>
      </div>
      <div class="ai-mentor-auth" id="aiMentorAuth"></div>
      <div class="ai-mentor-messages" id="aiMentorMessages"></div>
      <div class="ai-mentor-inputbar">
        <input type="text" id="aiMentorInput" placeholder="Ask about cabling, networking, the internet..." autocomplete="off">
        <button type="button" id="aiMentorSend">Send</button>
      </div>
      <div class="ai-mentor-note">
        Chat topics are summarized for your instructor so they can improve the course. No raw messages are kept.
      </div>
    `;

    panel.querySelector('.ai-mentor-close').addEventListener('click', closePanel);
    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    el.launcher = launcher;
    el.panel = panel;
    el.messages = document.getElementById('aiMentorMessages');
    el.input = document.getElementById('aiMentorInput');
    el.sendBtn = document.getElementById('aiMentorSend');
    el.authBar = document.getElementById('aiMentorAuth');

    el.sendBtn.addEventListener('click', send);
    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') send();
    });
  }

  function openPanel() {
    el.panel.classList.add('open');
    el.launcher.style.display = 'none';
    refreshAuthBar();
    if (navigator.onLine === false) showOfflineBar();
    el.input.focus();
  }

  function closePanel() {
    el.panel.classList.remove('open');
    el.launcher.style.display = '';
    handleConversationEnd();
  }

  // ============================================================
  // Auth / connectivity
  // ============================================================
  function refreshAuthBar() {
    if (!el.authBar) return;
    if (navigator.onLine === false) { showOfflineBar(); return; }
    if (!window.puter || !puter.auth) {
      el.authBar.innerHTML = 'Waiting for Puter…';
      return;
    }
    if (puter.auth.isSignedIn()) {
      el.authBar.innerHTML = 'Signed in with your free Puter account.';
    } else {
      el.authBar.innerHTML = 'Sign in with Puter to chat (free, no card).' +
        '<button type="button" id="aiMentorSignIn">Sign in</button>';
      document.getElementById('aiMentorSignIn').addEventListener('click', function () {
        puter.auth.signIn().then(refreshAuthBar).catch(function (err) {
          appendMessage('error', 'Sign-in failed or was cancelled: ' + (err && err.message));
        });
      });
    }
  }

  function showOfflineBar() {
    const bar = document.createElement('div');
    bar.className = 'ai-mentor-offline';
    bar.textContent = 'The AI Mentor needs an internet connection — check back when you are online.';
    el.panel.insertBefore(bar, el.panel.querySelector('.ai-mentor-auth') ? el.panel.querySelector('.ai-mentor-auth').nextSibling : el.panel.firstChild);
  }

  // ============================================================
  // Chat
  // ============================================================
  function appendMessage(role, html, typing) {
    const div = document.createElement('div');
    div.className = 'ai-mentor-msg ' + (role === 'user' ? 'user' : typing ? 'typing' : role === 'error' ? 'error' : 'assistant');
    div.innerHTML = html;
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
    return div;
  }

  // Puter's free tier is shared and can hit "request queue is full" (503)
  // under load. Retry a few times with backoff before giving up so students
  // rarely ever see the raw error.
  async function chatWithRetry(messages, attempts) {
    const delay = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await puter.ai.chat(messages, { model: MODEL, stream: true });
      } catch (err) {
        lastErr = err;
        const msg = (err && err.message) || String(err);
        const isBusy = /503|queue is full|rate.?limit|too many|busy/i.test(msg);
        if (!isBusy || i === attempts - 1) break;
        await delay(700 * (i + 1));
      }
    }
    throw lastErr;
  }

  async function send() {
    const text = el.input.value.trim();
    if (!text || busy) return;

    appendMessage('user', escapeHtml(text));
    el.input.value = '';
    busy = true;
    el.sendBtn.disabled = true;

    const typingEl = appendMessage('assistant', '…', true);

    conversation.push({ role: 'user', content: text });

    if (!window.puter || !puter.auth || !puter.auth.isSignedIn()) {
      typingEl.remove();
      appendMessage('error', 'Please sign in with Puter first (free account) so you can chat.');
      conversation.pop();
      busy = false;
      el.sendBtn.disabled = false;
      refreshAuthBar();
      return;
    }

    if (navigator.onLine === false) {
      typingEl.remove();
      appendMessage('error', 'No connection — the AI Mentor needs the internet to answer.');
      conversation.pop();
      busy = false;
      el.sendBtn.disabled = false;
      return;
    }

    const messages = [];
    if (courseContext) messages.push({ role: 'system', content: courseContext });
    messages.push.apply(messages, conversation.slice(-8));

    try {
      const resp = await chatWithRetry(messages, 3);
      let reply = '';
      typingEl.className = 'ai-mentor-msg assistant';
      typingEl.innerHTML = '';
      for await (const part of resp) {
        if (part && part.text) {
          reply += part.text;
          typingEl.innerHTML = renderMarkdown(reply);
          el.messages.scrollTop = el.messages.scrollHeight;
        }
      }
      if (!reply) {
        typingEl.remove();
        appendMessage('error', 'No reply received — try again.');
        conversation.pop();
      } else {
        conversation.push({ role: 'assistant', content: reply });
      }
    } catch (err) {
      console.error('AI mentor error:', err);
      typingEl.remove();
      const msg = (err && err.message) || String(err);
      const busy = /503|queue is full|rate.?limit|too many|busy/i.test(msg);
      appendMessage('error', busy
        ? 'The AI Mentor is busy right now — try again in a few seconds.'
        : 'Could not reach the AI Mentor: ' + msg);
      conversation.pop();
    }

    busy = false;
    el.sendBtn.disabled = false;
    el.input.focus();
  }

  // ============================================================
  // Capture (owner decision): the topic summary is ALWAYS saved so
  // the instructor can improve course delivery. Summaries only —
  // never raw messages. The widget tells students this up front.
  // ============================================================
  function userMessageCount() {
    return conversation.filter(function (m) { return m.role === 'user'; }).length;
  }

  async function generateSummary() {
    if (!window.puter || !puter.ai) return null;
    try {
      const prompt = [
        { role: 'system', content: 'You write ONE short sentence summarizing the topic a student asked a tutor about. Do not include personal details, do not quote any messages, and stay general.' },
        { role: 'user', content: 'Summarize this student\'s questions: ' + JSON.stringify(conversation.slice(-8).map(function (m) {
          return (m.role === 'user' ? 'Q: ' : 'A: ') + m.content;
        }).join('\n')) }
      ];
      const resp = await puter.ai.chat(prompt, { model: MODEL });
      const s = typeof resp === 'string' ? resp : (resp && resp.message && resp.message.content);
      if (s && s.trim()) return s.trim().slice(0, 500);
    } catch (err) {
      console.log('AI mentor: summary generation failed', err);
    }
    return null;
  }

  async function syncSession() {
    if (!window.supabaseClient || userMessageCount() === 0) return;

    let summary = await generateSummary();
    if (!summary) {
      summary = 'Student asked about: ' + String(conversation[0].content || 'the course').slice(0, 160);
    }

    try {
      const { data: authData } = await supabaseClient.auth.getSession();
      if (!authData.session) return;

      const { data, error } = await supabaseClient.rpc('log_ai_mentor_summary', {
        p_session_id: aiSessionId,
        p_course_id: COURSE_ID,
        p_topic_summary: summary,
        p_message_count: userMessageCount()
      });
      if (error) throw error;
      if (data) aiSessionId = data;
    } catch (err) {
      console.error('AI mentor: could not save chat', err);
    }
  }

  async function handleConversationEnd() {
    if (userMessageCount() === 0 || savedThisChat) return;
    savedThisChat = true;
    await syncSession();
  }

  // ============================================================
  // Lightweight markdown → themed HTML (same as the test page)
  // ============================================================
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  function renderMarkdown(text) {
    const lines = escapeHtml(text).split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { i++; continue; }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 5);
        out.push('<' + 'h' + level + '>' + inlineFormat(heading[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push('<li>' + inlineFormat(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ul>' + items.join('') + '</ul>');
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push('<li>' + inlineFormat(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ol>' + items.join('') + '</ol>');
        continue;
      }

      const para = [];
      while (
        i < lines.length && lines[i].trim() &&
        !/^(#{1,4})\s+/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        para.push(inlineFormat(lines[i]));
        i++;
      }
      out.push('<p>' + para.join('<br>') + '</p>');
    }

    return out.join('');
  }

  function inlineFormat(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  // ============================================================
  // Init
  // ============================================================
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      if (localStorage.getItem(STORE_KEY) === '1') return; // dismissed (not used yet)
    } catch (e) {}

    injectStyles();
    buildUI();
    courseContext = await buildContext();

    window.addEventListener('beforeunload', function () {
      if (!savedThisChat && userMessageCount() > 0) {
        syncSession();
      }
    });
  });
})();
