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

        if (req.type === 'credentials') {
          // Show VDI credentials, hide mapping review
          document.getElementById('credentials-section').classList.remove('hidden');
          document.getElementById('mapping-section').classList.add('hidden');

          document.getElementById('context-title').textContent = 'VDI Credentials Connection Required';
          document.getElementById('context-reason').textContent =
            `Supervisor Agent has paused: Target environment gateway requires administrative credentials validation to connect remote RDP VMs.`;
        } else if (req.type === 'mapping') {
          // Hide credentials, show mapping review
          document.getElementById('credentials-section').classList.add('hidden');
          document.getElementById('mapping-section').classList.remove('hidden');

          const mappingData = req.data;
          document.getElementById('context-title').textContent = 'Mapping Quality Review Required';
          document.getElementById('context-reason').textContent =
            `Average confidence ${Math.round(mappingData.avgConfidence * 100)}% is below threshold. ` +
            `${mappingData.unmappedMandatory} mandatory field(s) unmapped. Supervisor has paused for human input.`;

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

    // Execute the full pipeline
    await supervisor.executeGoal({ prompt: promptVal });

    // Re-enable form
    startBtn.disabled = false;
    isRunning = false;
  });

  // Chat sidebar is handled by js/chat.js


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
  //  Workbench Mapping Approval / Rejection
  // ═══════════════════════════════════════════════════════════════════════════

  document.getElementById('btn-approve').addEventListener('click', () => {
    const comments = document.getElementById('review-comments').value;
    supervisor.handleHumanApproval(true, comments);

    addHistoryEntry('approved', comments);
    resetWorkbench();
    switchToTab('dashboard');
  });

  document.getElementById('btn-reject').addEventListener('click', () => {
    const comments = document.getElementById('review-comments').value;
    supervisor.handleHumanApproval(false, comments);

    addHistoryEntry('rejected', comments);
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

  /**
   * Render the mapping table for human review.
   */
  function renderMappingTable(mappings) {
    const tbody = document.getElementById('mapping-tbody');
    tbody.innerHTML = '';

    mappings.forEach(m => {
      const tr = document.createElement('tr');
      const confPercent = Math.round(m.confidence * 100);
      const confClass   = confPercent >= 75 ? 'high' : confPercent > 0 ? 'low' : 'unmapped';
      const statusText  = m.target ? (confPercent >= 75 ? 'High' : 'Low') : 'Unmapped';

      tr.innerHTML = `
        <td><code>${m.source}</code></td>
        <td>${m.target ? '<code>' + m.target + '</code>' : '<em style="color:#94a3b8">—</em>'}</td>
        <td>
          <div class="confidence-bar"><div class="confidence-fill ${confClass}" style="width:${confPercent}%"></div></div>
          <span style="font-size:11px;color:#64748b;margin-left:6px">${confPercent}%</span>
        </td>
        <td><span class="status-badge ${confClass}">${statusText}</span></td>
        <td><button class="btn-ghost btn-sm">Edit</button></td>
      `;

      tbody.appendChild(tr);
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
    document.getElementById('credentials-section').classList.add('hidden');
    document.getElementById('mapping-section').classList.add('hidden');
    
    document.getElementById('review-comments').value = '';
  }

  // ── Expose helpers for external access ─────────────────────────────────────
  window._renderMappingTable = renderMappingTable;
  window._switchToTab        = switchToTab;
});
