/**
 * app.js — Main Application Controller
 * 
 * Wires together all modules (DecisionLog, VDI Sessions Grid, ProjectManagerView,
 * AgentRunner, Supervisor) and binds DOM events for the dashboard.
 * 
 * Self-executing on DOMContentLoaded — no exports.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  //  Module Initialization
  // ═══════════════════════════════════════════════════════════════════════════

  const decisionLog  = new DecisionLog('decision-log', 'log-placeholder');
  const projectManagerView = new ProjectManagerView();
  const agentRunner  = new AgentRunner();

  // Render static structures
  projectManagerView.init();

  // ═══════════════════════════════════════════════════════════════════════════
  //  Supervisor (with all callback wiring)
  // ═══════════════════════════════════════════════════════════════════════════

  const supervisor = new Supervisor({
    decisionLog,
    agentGraph: projectManagerView,
    agentRunner,
    callbacks: {

      // ── KPI cards (dashboard tab) ────────────────────────────────────────
      onKpiUpdate: (data) => {
        if (data.activeAgents !== null && data.activeAgents !== undefined) {
          animateKpiValue('kpi-active-value', data.activeAgents);
        }
        if (data.tasksCompleted !== null && data.tasksCompleted !== undefined) {
          animateKpiValue('kpi-tasks-value', `${data.tasksCompleted}/9`);
        }
        if (data.confidence !== null && data.confidence !== undefined) {
          animateKpiValue('kpi-confidence-value', `${data.confidence}%`);
        }
        if (data.stage) {
          animateKpiValue('kpi-stage-value', data.stage);
        }
      },

      // ── Job progress (production tab) ────────────────────────────────────
      onJobUpdate: (jobId, progress, status, vmId) => {
        updateJobRow(jobId, progress, status, vmId);
      },

      // ── Human review needed (workbench tab) ──────────────────────────────
      onHumanNeeded: (req) => {
        // Show notification badge
        const badge = document.getElementById('workbench-badge');
        badge.classList.remove('hidden');

        // Toggle workbench states
        document.getElementById('workbench-idle').classList.add('hidden');
        document.getElementById('workbench-active').classList.remove('hidden');

        // Hide all panels by default
        document.getElementById('strategy-section').classList.add('hidden');
        document.getElementById('credentials-section').classList.add('hidden');
        document.getElementById('mapping-section').classList.add('hidden');
        document.getElementById('jobplanner-section').classList.add('hidden');

        if (req.type === 'strategy') {
          document.getElementById('strategy-section').classList.remove('hidden');
          document.getElementById('context-title').textContent = 'Prioritized Strategy Plan Approval';
          document.getElementById('context-reason').textContent =
            'Supervisor Agent paused: Strategy Agent discovered repository document classes. Dispatched plan prioritizes high-count classes first. Review and approve strategy.';
          
          // Render Strategy table
          const tbody = document.getElementById('strategy-tbody');
          tbody.innerHTML = '';
          req.data.forEach((dc, index) => {
            let wave = index < 3 ? 'Phase 1 (Priority)' : index < 6 ? 'Phase 2 (Standard)' : 'Phase 3 (Backlog)';
            let badgeClass = index < 3 ? 'high' : index < 6 ? 'low' : 'unmapped';
            tbody.innerHTML += `
              <tr>
                <td><strong style="color:var(--accent-blue);">#${index + 1}</strong></td>
                <td><strong>${dc.name}</strong></td>
                <td>${dc.count.toLocaleString()} docs</td>
                <td><span class="status-badge ${badgeClass}">${wave}</span></td>
              </tr>
            `;
          });
        } else if (req.type === 'credentials') {
          document.getElementById('credentials-section').classList.remove('hidden');
          document.getElementById('context-title').textContent = 'VDI Credentials Connection Required';
          document.getElementById('context-reason').textContent =
            `Supervisor Agent has paused: Target environment gateway requires administrative credentials validation to connect remote RDP VMs.`;
        } else if (req.type === 'mapping') {
          document.getElementById('mapping-section').classList.remove('hidden');

          const mappingData = req.data;
          document.getElementById('context-title').textContent = `Mapping Quality Review Required: Class "${mappingData.docClass}"`;
          document.getElementById('context-reason').textContent =
            `Average confidence ${Math.round(mappingData.avgConfidence * 100)}% is below threshold. ` +
            `${mappingData.lowConfidenceCount} low confidence (<50%) and ${mappingData.unmappedCount} unmapped fields found in "${mappingData.docClass}".`;

          renderMappingTable(mappingData.mappings);

          // Render summary
          const summary = document.getElementById('mapping-summary');
          if (summary) {
            const high     = mappingData.mappings.filter(m => m.confidence >= 0.75).length;
            const low      = mappingData.mappings.filter(m => m.confidence > 0 && m.confidence < 0.75).length;
            const unmapped = mappingData.mappings.filter(m => m.confidence === 0).length;

            summary.innerHTML = `
              <span class="summary-tag high">${high} high</span>
              <span class="summary-tag low">${low} low</span>
              <span class="summary-tag unmapped">${unmapped} unmapped</span>
            `;
          }
        } else if (req.type === 'jobplanner') {
          document.getElementById('jobplanner-section').classList.remove('hidden');
          document.getElementById('context-title').textContent = 'VDI Job Execution Allocation Plan';
          document.getElementById('context-reason').textContent =
            `Job Planner Agent has mapped the ${req.data.jobs.length} jobs to active VDI instances. Review target allocations.`;

          // Render Job Planner table
          const tbody = document.getElementById('jobplanner-tbody');
          tbody.innerHTML = '';
          req.data.jobs.forEach(job => {
            tbody.innerHTML += `
              <tr>
                <td><strong>${job.id}</strong></td>
                <td><strong>${job.docClass}</strong></td>
                <td>${job.docs.toLocaleString()} docs</td>
                <td><span class="status-badge high" style="background:var(--accent-blue-light); color:var(--accent-blue); border:1px solid var(--accent-blue); font-family:var(--font-mono);">${job.vmNode}</span></td>
              </tr>
            `;
          });
        }

        // Switch to workbench tab
        switchToTab('workbench');
      },

      // ── Migration complete ───────────────────────────────────────────────
      onComplete: () => {
        // Confetti / completion styling can be added
      },

      // ── Fatal error ──────────────────────────────────────────────────────
      onError: (err) => {
        console.error('Supervisor error:', err);
      },

      // ── Reconciliation values (production tab) ───────────────────────────
      onReconUpdate: (data) => {
        setTextById('recon-source', data.sourceCount.toLocaleString());
        setTextById('recon-target', data.targetCount.toLocaleString());
        setTextById('recon-delta',  data.delta.toString());
        setTextById('recon-match',  data.matchPercentage + '%');
      },

      // ── Final report (production tab) ────────────────────────────────────
      onReportReady: (report) => {
        const reportEl = document.getElementById('migration-report');
        reportEl.classList.remove('hidden');

        const body = document.getElementById('report-body');
        body.innerHTML = `
          <div class="report-success-banner" style="background:#d1fae5; color:#065f46; padding:12px 18px; border-radius:var(--radius-md); margin-bottom:20px; font-weight:600; display:flex; align-items:center; gap:8px;">
            <span>🎉</span> Content migration completed successfully. Parity verified.
          </div>
          <div class="report-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:16px;">
            <div class="report-item" style="background:#f8fafc; padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
              <span class="report-item-label" style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Total Documents</span>
              <span class="report-item-value" style="font-size:18px; font-weight:700; color:var(--text-primary);">${report.totalDocs.toLocaleString()}</span>
            </div>
            <div class="report-item" style="background:#f8fafc; padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
              <span class="report-item-label" style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Migrated</span>
              <span class="report-item-value" style="font-size:18px; font-weight:700; color:var(--accent-green);">${report.migrated.toLocaleString()}</span>
            </div>
            <div class="report-item" style="background:#f8fafc; padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
              <span class="report-item-label" style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Failed</span>
              <span class="report-item-value" style="font-size:18px; font-weight:700; color:var(--accent-red);">${report.failed}</span>
            </div>
            <div class="report-item" style="background:#f8fafc; padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
              <span class="report-item-label" style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Success Rate</span>
              <span class="report-item-value" style="font-size:18px; font-weight:700; color:var(--text-primary);">${report.successRate}%</span>
            </div>
            <div class="report-item" style="background:#f8fafc; padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
              <span class="report-item-label" style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Duration</span>
              <span class="report-item-value" style="font-size:18px; font-weight:700; color:var(--text-primary);">${report.duration}</span>
            </div>
            <div class="report-item" style="background:#f8fafc; padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
              <span class="report-item-label" style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Issues Healed</span>
              <span class="report-item-value" style="font-size:18px; font-weight:700; color:var(--text-primary);">${report.issuesResolved}</span>
            </div>
          </div>
        `;

        // Switch to production tab to show the report
        switchToTab('production');
      },

      // ── Production KPI values ────────────────────────────────────────────
      onProdKpiUpdate: (data) => {
        setTextById('prod-total-docs', data.totalDocs.toLocaleString());
        setTextById('prod-migrated',   data.migrated.toLocaleString());
        setTextById('prod-failed',     data.failed.toString());
        setTextById('prod-success-rate', data.successRate + '%');

        // Initialize job table rows if jobs are provided
        if (data.jobs) {
          initJobTable(data.jobs);
        }
      },

      // ── Error log entries ────────────────────────────────────────────────
      onErrorLog: (entry) => {
        addErrorEntry(entry);
      },

      // ── Learning updates (summary board) ──────────────────────────────────
      onLearningUpdate: (avgSpeed, newPartitionSize) => {
        setTextById('summary-partition', `${newPartitionSize.toLocaleString()} docs`);
        const learnEl = document.getElementById('summary-learning');
        if (learnEl) {
          learnEl.style.color = 'var(--accent-green)';
          learnEl.style.background = 'var(--accent-green-light)';
          learnEl.textContent = 'Learned & Optimized';
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Tab Switching
  // ═══════════════════════════════════════════════════════════════════════════

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchToTab(tabId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Goal Form Submission
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  //  Goal Form Submission & Keyboard Send
  // ═══════════════════════════════════════════════════════════════════════════

  let isRunning = false; // double-click guard
  const promptInput = document.getElementById('migration-prompt');

  // Submit on Enter key (without Shift)
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('goal-form').dispatchEvent(new Event('submit'));
    }
  });

  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isRunning) return;

    const promptVal = promptInput.value.trim();

    // Validate
    if (!promptVal) {
      alert('Please describe your migration goal.');
      return;
    }

    isRunning = true;

    // Disable form send button
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;

    // Reset previous state
    decisionLog.clear();
    projectManagerView.reset();
    resetProductionView();
    resetWorkbench();

    // Reset Summary Board parameters
    setTextById('summary-vms', `${supervisor.vmCount} Nodes`);
    setTextById('summary-partition', `${supervisor.optimalPartitionSize.toLocaleString()} docs`);
    setTextById('summary-speed', '0 docs/s');
    
    const learnEl = document.getElementById('summary-learning');
    if (learnEl) {
      learnEl.style.color = 'var(--accent-purple)';
      learnEl.style.background = 'var(--accent-purple-light)';
      learnEl.textContent = 'Analyzing capacity...';
    }

    // Initialize Canvas Chart
    chartTicks = [0, 0, 0, 0, 0];
    paintChart();

    if (chartInterval) clearInterval(chartInterval);
    chartInterval = setInterval(() => {
      const speed = getLiveIngestionSpeed();
      chartTicks.push(speed);
      if (chartTicks.length > 20) chartTicks.shift();
      
      const speedText = document.getElementById('chart-speed-text');
      if (speedText) speedText.textContent = `${speed.toLocaleString()} docs/s`;
      
      const summarySpeed = document.getElementById('summary-speed');
      if (summarySpeed) summarySpeed.textContent = `${speed.toLocaleString()} docs/s`;

      paintChart();
    }, 300);

    // Execute the full pipeline
    await supervisor.executeGoal({ prompt: promptVal });

    // Stop Chart Tick
    if (chartInterval) {
      clearInterval(chartInterval);
      chartInterval = null;
    }
    setTextById('summary-speed', '0 docs/s');
    const speedText = document.getElementById('chart-speed-text');
    if (speedText) speedText.textContent = '0 docs/s';

    // Re-enable form
    startBtn.disabled = false;
    isRunning = false;
  });

  // Chat sidebar is handled by js/chat.js

  // ── Supervisor Thinking — Collapsible Toggle ────────────────
  const thinkingToggle  = document.getElementById('thinking-toggle');
  const thinkingLog     = document.getElementById('decision-log');
  const thinkingChevron = document.getElementById('thinking-chevron');
  const thinkingBadge   = document.getElementById('thinking-live-badge');
  let thinkingOpen = false;

  if (thinkingToggle) {
    thinkingToggle.addEventListener('click', () => {
      thinkingOpen = !thinkingOpen;
      thinkingLog.style.display  = thinkingOpen ? 'block' : 'none';
      thinkingChevron.classList.toggle('open', thinkingOpen);
    });
  }

  // Expose a helper so supervisor can auto-expand + show badge while thinking
  window._setThinkingActive = (active) => {
    if (thinkingBadge) thinkingBadge.style.display = active ? 'inline-flex' : 'none';
    // Auto-open when supervisor starts thinking
    if (active && !thinkingOpen) {
      thinkingOpen = true;
      thinkingLog.style.display = 'block';
      thinkingChevron.classList.add('open');
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  //  Workbench Credentials Submission
  // ═══════════════════════════════════════════════════════════════════════════

  document.getElementById('credentials-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const env = document.getElementById('vdi-env').value;
    const address = document.getElementById('vdi-address').value;
    const username = document.getElementById('vdi-username').value;
    const password = document.getElementById('vdi-password').value;

    supervisor.handleHumanApproval(true, { env, address, username, password });

    resetWorkbench();
    switchToTab('sessions');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Workbench Strategy & Job Planner Click Actions
  // ═══════════════════════════════════════════════════════════════════════════

  document.getElementById('btn-approve-strategy').addEventListener('click', () => {
    const comments = document.getElementById('strategy-comments').value;
    supervisor.handleHumanApproval(true, comments);

    addHistoryEntry('approved', `Strategy Plan: ${comments || 'proceed'}`);
    resetWorkbench();
    switchToTab('dashboard');
  });

  document.getElementById('btn-approve-jobplanner').addEventListener('click', () => {
    const comments = document.getElementById('jobplanner-comments').value;
    supervisor.handleHumanApproval(true, comments);

    addHistoryEntry('approved', `Job Planner schedule: ${comments || 'proceed'}`);
    resetWorkbench();
    switchToTab('production');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Workbench Mapping Approval / Rejection
  // ═══════════════════════════════════════════════════════════════════════════

  document.getElementById('btn-approve').addEventListener('click', () => {
    const comments = document.getElementById('review-comments').value;
    supervisor.handleHumanApproval(true, comments);

    addHistoryEntry('approved', `Mapped fields: ${comments || 'proceed'}`);
    resetWorkbench();
    switchToTab('dashboard');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Clear Log
  // ═══════════════════════════════════════════════════════════════════════════

  document.getElementById('clear-log-btn').addEventListener('click', () => {
    decisionLog.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helper Functions
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Switch the active tab.
   * @param {string} tabId – 'dashboard' | 'workbench' | 'sessions' | 'production'
   */
  function switchToTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById('tab-' + tabId);
    if (content) content.classList.add('active');
  }

  /**
   * Set text content of an element by ID (safe).
   */
  function setTextById(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /**
   * Animate a KPI value change with a brief scale pop.
   */
  function animateKpiValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = value;
    el.classList.remove('count-up');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('count-up');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Workbench Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add an entry to the review history timeline.
   */
  function addHistoryEntry(action, comments) {
    // Remove the empty-state placeholder
    const empty = document.getElementById('history-empty');
    if (empty) empty.remove();

    const entry    = document.createElement('div');
    entry.className = 'history-entry';

    const dotColor  = action === 'approved' ? '#059669' : '#dc2626';
    const actionTxt = action === 'approved' ? 'Approved mapping' : 'Rejected mapping';
    const time      = new Date().toLocaleTimeString();

    entry.innerHTML = `
      <span class="history-dot" style="background:${dotColor}"></span>
      <div class="history-body">
        <span class="history-action">${actionTxt}</span>
        ${comments ? `<span class="history-detail">${comments}</span>` : ''}
        <span class="history-time">${time}</span>
      </div>
    `;

    document.getElementById('history-list').prepend(entry);
  }

  // Global Variables for Canvas Charting & Mapping attributes
  const TARGET_ATTRIBUTES = [
    'doc_id', 'name', 'summary', 'creator',
    'date_created', 'date_modified', 'type',
    'size', 'state', 'revision', 'labels',
    'access_control'
  ];
  let chartTicks = [0, 0, 0, 0, 0];
  let chartInterval = null;

  function getLiveIngestionSpeed() {
    let totalSpeed = 0;
    document.querySelectorAll('.vm-job-speed').forEach(el => {
      const txt = el.textContent || '';
      const match = txt.match(/(\d+)/);
      if (match) {
        totalSpeed += parseInt(match[1], 10);
      }
    });
    return totalSpeed;
  }

  function paintChart() {
    const canvas = document.getElementById('analytics-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Set internal resolution matching element size
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      let y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (chartTicks.length < 2) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 20);
      ctx.lineTo(width, height - 20);
      ctx.stroke();
      return;
    }

    // Draw line & fill gradient
    const maxVal = Math.max(1000, ...chartTicks) * 1.1;
    const points = chartTicks.map((val, idx) => {
      const x = (width / (chartTicks.length - 1)) * idx;
      const y = height - 20 - ((height - 40) * (val / maxVal));
      return { x, y };
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    const lastPt = points[points.length - 1];
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Render the mapping table for human review.
   */
  function renderMappingTable(mappings) {
    const tbody = document.getElementById('mapping-tbody');
    tbody.innerHTML = '';

    mappings.forEach((m, index) => {
      const tr = document.createElement('tr');
      const confPercent = Math.round(m.confidence * 100);
      const confClass   = confPercent >= 75 ? 'high' : confPercent > 0 ? 'low' : 'unmapped';
      const statusText  = m.target ? (confPercent >= 75 ? 'High' : 'Low') : 'Unmapped';

      tr.innerHTML = `
        <td><code>${m.source}</code></td>
        <td class="target-cell"><code>${m.target ? m.target : '—'}</code></td>
        <td>
          <div class="confidence-bar"><div class="confidence-fill ${confClass}" style="width:${confPercent}%"></div></div>
          <span style="font-size:11px;color:#64748b;margin-left:6px">${confPercent}%</span>
        </td>
        <td><span class="status-badge ${confClass}">${statusText}</span></td>
        <td><button class="btn-ghost btn-sm btn-edit-mapping" data-index="${index}">Edit</button></td>
      `;

      tbody.appendChild(tr);
    });

    // Wire up edit buttons to inline dropdown target selector
    tbody.querySelectorAll('.btn-edit-mapping').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.index, 10);
        const m = mappings[idx];
        const row = btn.closest('tr');
        const targetCell = row.querySelector('.target-cell');

        const select = document.createElement('select');
        select.innerHTML = '<option value="">-- Unmapped --</option>';
        TARGET_ATTRIBUTES.forEach(attr => {
          select.innerHTML += `<option value="${attr}" ${m.target === attr ? 'selected' : ''}>${attr}</option>`;
        });

        targetCell.innerHTML = '';
        targetCell.appendChild(select);
        select.focus();

        const commitChange = () => {
          const newVal = select.value || null;
          m.target = newVal;
          m.confidence = newVal ? 1.0 : 0.0;
          m.status = newVal ? 'high' : 'unmapped';

          const mapped = mappings.filter(x => x.target !== null);
          const avgConfidence = +(mapped.reduce((s, x) => s + x.confidence, 0) / mapped.length).toFixed(2);
          
          supervisor._mappingResult.avgConfidence = avgConfidence;
          supervisor._mappingResult.mappings = mappings;
          supervisor._mappingResult.unmappedCount = mappings.filter(x => x.target === null).length;

          renderMappingTable(mappings);

          const summary = document.getElementById('mapping-summary');
          if (summary) {
            const high     = mappings.filter(x => x.confidence >= 0.75).length;
            const low      = mappings.filter(x => x.confidence > 0 && x.confidence < 0.75).length;
            const unmapped = mappings.filter(x => x.confidence === 0).length;

            summary.innerHTML = `
              <span class="summary-tag high">${high} high</span>
              <span class="summary-tag low">${low} low</span>
              <span class="summary-tag unmapped">${unmapped} unmapped</span>
            `;
          }
        };

        select.addEventListener('change', commitChange);
        select.addEventListener('blur', () => {
          setTimeout(() => {
            if (targetCell.contains(select)) {
              renderMappingTable(mappings);
            }
          }, 100);
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Production Tab Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the job table with pending rows.
   */
  function initJobTable(jobs) {
    const tbody = document.getElementById('job-tbody');
    tbody.innerHTML = '';

    jobs.forEach(job => {
      const tr = document.createElement('tr');
      tr.id = `job-row-${job.id}`;
      tr.innerHTML = `
        <td><strong>${job.id}</strong></td>
        <td class="vm-node-badge">—</td>
        <td>${job.docs.toLocaleString()}</td>
        <td><span class="job-status pending">Pending</span></td>
        <td>
          <div class="job-progress-bar">
            <div class="job-progress-fill" style="width:0%"></div>
          </div>
        </td>
        <td>—</td>
        <td>—</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Update a single job row with new progress and status.
   */
  function updateJobRow(jobId, progress, status, vmId) {
    const row = document.getElementById(`job-row-${jobId}`);
    if (!row) return;

    const cells = row.querySelectorAll('td');

    // Target VM (index 1)
    if (vmId && cells[1]) {
      cells[1].innerHTML = `<code>${vmId}</code>`;
    }

    // Status cell (index 3)
    const statusSpan = cells[3].querySelector('.job-status');
    if (statusSpan) {
      statusSpan.className = 'job-status ' + status;
      statusSpan.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Progress bar (index 4)
    const fill = cells[4].querySelector('.job-progress-fill');
    if (fill) {
      fill.style.width = progress + '%';
      if (status === 'failed') {
        fill.classList.add('failed');
      } else {
        fill.classList.remove('failed');
      }
    }

    // Progress text (index 5)
    cells[5].textContent = progress + '%';

    // Duration (index 6)
    if (status === 'completed') {
      cells[6].textContent = '1.2s';
    } else if (status === 'failed') {
      cells[6].textContent = 'Error';
    }
  }

  /**
   * Add an error entry to the production error log.
   */
  function addErrorEntry(entry) {
    const log   = document.getElementById('error-log');
    const empty = document.getElementById('error-log-empty');
    if (empty) empty.remove();

    const el = document.createElement('div');
    el.className = 'error-entry';

    const time = entry.time ? entry.time.toLocaleTimeString() : new Date().toLocaleTimeString();

    el.innerHTML = `
      <span class="error-severity ${entry.severity}">${entry.severity.toUpperCase()}</span>
      <span class="error-message">${entry.message}</span>
      <span class="error-time">${time}</span>
    `;

    log.appendChild(el);
  }

  /**
   * Reset the entire production view to its default state.
   */
  function resetProductionView() {
    ['prod-total-docs', 'prod-migrated', 'prod-failed', 'prod-success-rate'].forEach(id => {
      setTextById(id, '—');
    });

    document.getElementById('job-tbody').innerHTML =
      '<tr class="table-empty-row"><td colspan="7">No jobs running. Start a migration to see execution data.</td></tr>';

    ['recon-source', 'recon-target', 'recon-delta', 'recon-match'].forEach(id => {
      setTextById(id, '—');
    });

    document.getElementById('error-log').innerHTML =
      '<div class="error-log-empty" id="error-log-empty"><p>No errors recorded.</p></div>';

    document.getElementById('migration-report').classList.add('hidden');
  }

  /**
   * Reset the workbench to its idle state.
   */
  function resetWorkbench() {
    document.getElementById('workbench-active').classList.add('hidden');
    document.getElementById('workbench-idle').classList.remove('hidden');
    document.getElementById('workbench-badge').classList.add('hidden');
    
    // Hide active forms in workbench
    document.getElementById('strategy-section').classList.add('hidden');
    document.getElementById('credentials-section').classList.add('hidden');
    document.getElementById('mapping-section').classList.add('hidden');
    document.getElementById('jobplanner-section').classList.add('hidden');
    
    document.getElementById('strategy-comments').value = '';
    document.getElementById('review-comments').value = '';
    document.getElementById('jobplanner-comments').value = '';
  }

  // ── Expose helpers for external access ─────────────────────────────────────
  window._renderMappingTable = renderMappingTable;
  window._switchToTab        = switchToTab;
});
