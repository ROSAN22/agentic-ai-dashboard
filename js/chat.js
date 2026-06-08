/* ================================================================
   Chat Sidebar — Migration AI Assistant
   Professional conversational interface
   ================================================================ */
(function () {
  'use strict';

  /* ── DOM Refs ─────────────────────────────────────────────── */
  const toggleBtn     = document.getElementById('chat-toggle-btn');
  const sidebar       = document.getElementById('chat-sidebar');
  const overlay       = document.getElementById('body-overlay');
  const closeBtn      = document.getElementById('close-sidebar-btn');
  const clearBtn      = document.getElementById('clear-chat-btn');
  const messagesEl    = document.getElementById('chat-messages');
  const inputEl       = document.getElementById('chat-input');
  const sendBtn       = document.getElementById('chat-send-btn');
  const chips         = document.querySelectorAll('.suggestion-chip');
  const actionBtns    = document.querySelectorAll('.msg-action-btn');

  if (!toggleBtn || !sidebar) return;

  /* ── State ────────────────────────────────────────────────── */
  let isOpen = false;
  let isThinking = false;

  /* ── Open / Close ─────────────────────────────────────────── */
  function openSidebar() {
    isOpen = true;
    sidebar.classList.add('open');
    overlay.classList.add('active');
    inputEl.focus();
  }

  function closeSidebar() {
    isOpen = false;
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  toggleBtn.addEventListener('click', () => isOpen ? closeSidebar() : openSidebar());
  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  /* ── Clear Chat ───────────────────────────────────────────── */
  clearBtn.addEventListener('click', () => {
    // Keep only the welcome card
    const msgs = messagesEl.querySelectorAll('.chat-message, .chat-divider, .typing-indicator');
    msgs.forEach(m => m.remove());
    appendAIMessage("Chat cleared. I'm ready to help with your migration. What would you like to know?");
  });

  /* ── Auto-resize textarea ─────────────────────────────────── */
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  /* ── Send on Enter (Shift+Enter for newline) ─────────────── */
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  /* ── Suggestion Chips ─────────────────────────────────────── */
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt) sendWithText(prompt);
    });
  });

  /* ── Action buttons inside AI message ──────────────────────── */
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendWithText(prompt);
    });
  });

  /* ── Send Message ─────────────────────────────────────────── */
  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isThinking) return;
    sendWithText(text);
  }

  function sendWithText(text) {
    if (isThinking) return;
    if (!isOpen) openSidebar();

    appendUserMessage(text);
    inputEl.value = '';
    inputEl.style.height = 'auto';

    showTyping();
    const delay = 800 + Math.random() * 1000;
    setTimeout(() => {
      removeTyping();
      const reply = generateReply(text);
      appendAIMessage(reply.text, reply.actions);
    }, delay);
  }

  /* ── Message Builders ─────────────────────────────────────── */
  function appendUserMessage(text) {
    const now = getTime();
    const el = document.createElement('div');
    el.className = 'chat-message user-msg';
    el.innerHTML = `
      <div class="msg-avatar">RK</div>
      <div class="msg-body">
        <div class="msg-bubble">${escHtml(text)}</div>
        <div class="msg-time">${now}</div>
      </div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function appendAIMessage(text, actions) {
    const now = getTime();
    const actionsHtml = actions && actions.length
      ? `<div class="msg-actions">${actions.map(a =>
          `<button class="msg-action-btn" data-prompt="${escAttr(a.prompt)}">${a.label}</button>`
        ).join('')}</div>`
      : '';

    const el = document.createElement('div');
    el.className = 'chat-message ai-msg';
    el.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-body">
        <div class="msg-bubble">${text}</div>
        ${actionsHtml}
        <div class="msg-time">${now}</div>
      </div>`;

    // Wire up any new action buttons
    el.querySelectorAll('.msg-action-btn').forEach(btn => {
      btn.addEventListener('click', () => sendWithText(btn.dataset.prompt));
    });

    messagesEl.appendChild(el);
    scrollToBottom();
  }

  /* ── Typing Indicator ─────────────────────────────────────── */
  function showTyping() {
    isThinking = true;
    sendBtn.disabled = true;
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typing-indicator';
    el.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function removeTyping() {
    isThinking = false;
    sendBtn.disabled = false;
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  /* ── Smart Reply Generator ─────────────────────────────────── */
  function generateReply(text) {
    const t = text.toLowerCase();

    if (t.includes('start') || t.includes('migrate') || t.includes('migration')) {
      return {
        text: `<strong>Starting migration pipeline…</strong><br><br>
          I'm initializing the Supervisor Agent to orchestrate your CM → FileNet migration. Here's what will happen:<br><br>
          1. 🔌 <strong>Pre-Config</strong> — Verifying source/target environments<br>
          2. 📋 <strong>Strategy</strong> — Generating migration batches<br>
          3. 🗺️ <strong>Mapping</strong> — AI attribute mapping (confidence scored)<br>
          4. 🚀 <strong>Execution</strong> — Parallel migration across VDI instances<br>
          5. 📊 <strong>Reconciliation</strong> — Verifying document counts<br><br>
          <span class="chat-status-tag">✓ Goal submitted to Supervisor</span>`,
        actions: [
          { label: '📊 Check progress', prompt: 'Show me the migration progress' },
          { label: '🤖 Agent status', prompt: 'What is the current agent status?' }
        ]
      };
    }

    if (t.includes('progress') || t.includes('status') || t.includes('how many')) {
      return {
        text: `<strong>Migration Progress</strong><br><br>
          The Supervisor is monitoring all agents in real time:<br><br>
          • 🟢 <strong>Supervisor</strong> — Active & orchestrating<br>
          • 🟡 <strong>Pre-Config</strong> — Verifying environments<br>
          • ⏸️ <strong>Mapping, Execution</strong> — Queued<br><br>
          Check the <strong>Production View</strong> tab for the live job grid and document counts.`,
        actions: [
          { label: '📈 View jobs', prompt: 'Show me the job execution grid' },
          { label: '⚠️ Any errors?', prompt: 'What errors occurred during migration?' }
        ]
      };
    }

    if (t.includes('agent') || t.includes('supervisor')) {
      return {
        text: `<strong>Agent Architecture</strong><br><br>
          The system uses <strong>9 specialized agents</strong> coordinated by the Supervisor:<br><br>
          🧠 <code>Supervisor</code> — Orchestrates all agents & handles escalations<br>
          🔌 <code>Pre-Config</code> — Environment setup & validation<br>
          📋 <code>Strategy</code> — Migration planning & batching<br>
          🗺️ <code>Mapping</code> — AI-powered attribute mapping<br>
          🗂️ <code>Batch Planner</code> — Optimal batch sizing<br>
          🚀 <code>Execution</code> — Parallel document migration<br>
          🤖 <code>Resolver</code> — Auto-retries failed documents<br>
          📊 <code>Reconcile</code> — Source/target count verification<br>
          📝 <code>Report</code> — Final migration report generation`,
        actions: [
          { label: '🚀 Start migration', prompt: 'Start a CM to FileNet migration with 5 instances' }
        ]
      };
    }

    if (t.includes('error') || t.includes('fail') || t.includes('issue')) {
      return {
        text: `<strong>Error Diagnostics</strong><br><br>
          No active errors detected at this time. The <strong>Resolver Agent</strong> automatically handles:<br><br>
          • Document permission failures → auto-retry with elevated credentials<br>
          • Timeout errors → exponential backoff & re-queue<br>
          • Mapping failures → escalation to Human Workbench<br><br>
          All errors are logged in the <strong>Production View → Error Log</strong> panel.`,
        actions: [
          { label: '📋 View error log', prompt: 'Show me the error log details' }
        ]
      };
    }

    if (t.includes('mapping') || t.includes('attribute') || t.includes('confidence')) {
      return {
        text: `<strong>Attribute Mapping</strong><br><br>
          The Mapping Agent uses AI to match source CM attributes to FileNet properties:<br><br>
          • <strong>High confidence (>85%)</strong> — Auto-approved ✅<br>
          • <strong>Medium confidence (60–85%)</strong> — Flagged for review 🟡<br>
          • <strong>Low confidence (<60%)</strong> — Escalated to Human Workbench ⚠️<br><br>
          You can review and override mappings in the <strong>Human Workbench</strong> tab.`,
        actions: [
          { label: '🗺️ Review mappings', prompt: 'Show me the attribute mapping table' }
        ]
      };
    }

    if (t.includes('vdi') || t.includes('session') || t.includes('remote') || t.includes('desktop')) {
      return {
        text: `<strong>VDI Sessions</strong><br><br>
          The platform connects to remote VDI nodes to execute migration jobs in parallel. Each instance runs an independent migration worker.<br><br>
          To establish sessions:<br>
          1. Submit your migration goal<br>
          2. Go to <strong>Human Workbench</strong> and authenticate VDI credentials<br>
          3. Active sessions appear in the <strong>VDI Sessions</strong> tab<br><br>
          Sessions are secured with SSH key authentication and TLS encryption.`,
        actions: [
          { label: '🔐 Authenticate VDI', prompt: 'How do I set up VDI credentials?' }
        ]
      };
    }

    if (t.includes('how') || t.includes('explain') || t.includes('pipeline') || t.includes('work')) {
      return {
        text: `<strong>How the Migration Pipeline Works</strong><br><br>
          The <strong>Agentic AI</strong> platform automates end-to-end content migration:<br><br>
          <strong>Phase 1 — Planning</strong><br>
          Supervisor receives your goal and triggers Pre-Config & Strategy agents to validate environments and create a migration plan.<br><br>
          <strong>Phase 2 — Execution</strong><br>
          Batch Planner & Execution agents run parallel migrations across VDI nodes. The Resolver handles any failures automatically.<br><br>
          <strong>Phase 3 — Verification</strong><br>
          Reconciliation agent compares source vs target document counts. Report agent generates a final summary.<br><br>
          Human intervention is only needed when confidence falls below thresholds.`,
        actions: [
          { label: '🚀 Try it now', prompt: 'Start a CM to FileNet migration with 5 instances' }
        ]
      };
    }

    // Default fallback
    return {
      text: `I understand you're asking about <em>"${escHtml(text)}"</em>.<br><br>
        I can help with migration planning, agent status, attribute mapping, VDI sessions, error diagnostics, and more.<br><br>
        Try asking me something specific like <em>"Start migration"</em>, <em>"Agent status"</em>, or <em>"How does mapping work?"</em>`,
      actions: [
        { label: '🚀 Start migration', prompt: 'Start a CM to FileNet migration with 5 instances' },
        { label: '🧠 How it works', prompt: 'Explain the migration pipeline steps' }
      ]
    };
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

})();
