/**
 * project_manager.js — Project Manager / Analyst View Controller
 * 
 * Manages the Agent Status Grid, and now the live VDI Sessions Node Grid
 * (rendering active RDP sessions, mini-terminals, storage checks, and job executions).
 * 
 * Exports: window.ProjectManagerView
 */

class ProjectManagerView {
  constructor() {
    this.agents = new Map(); // agentId -> DOM element for status card
    this.vmCards = []; // array of VM DOM elements
  }

  /**
   * Initialize DOM references and bind events if necessary.
   */
  init() {
    this._cacheElements();
    this.reset();
  }

  /**
   * Cache elements for agents dynamically.
   * @private
   */
  _cacheElements() {
    const agentIds = [
      'supervisor', 'preconfig', 'strategy', 'mapping', 
      'planner', 'execution', 'resolver', 'reconciliation', 'report'
    ];
    agentIds.forEach(id => {
      const el = document.getElementById(`agent-card-${id}`);
      if (el) {
        this.agents.set(id, el);
      }
    });
  }

  /**
   * Update the status badge and state of an agent status card.
   * @param {string} agentId - 'supervisor', 'preconfig', etc.
   * @param {'standby'|'active'|'thinking'|'error'|'complete'} status
   */
  setAgentStatus(agentId, status) {
    const el = this.agents.get(agentId);
    if (!el) return;

    // Remove old state classes
    el.classList.remove('state-standby', 'state-active', 'state-thinking', 'state-error', 'state-complete');
    el.classList.add(`state-${status}`);

    // Update the text badge in the card
    const badge = el.querySelector('.agent-badge');
    if (badge) {
      badge.className = `agent-badge badge-${status}`;
      badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  /**
   * Dynamically build the VDI VM session grid cards.
   * @param {number} count - number of VM nodes to render
   */
  initVMGrid(count) {
    const grid = document.getElementById('rdp-vm-grid');
    if (!grid) return;

    grid.innerHTML = '';
    this.vmCards = [];

    if (count <= 0) {
      grid.innerHTML = `
        <div class="vm-grid-placeholder" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; background: var(--bg-white); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); color: var(--text-secondary);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 12px;">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="2" y1="20" x2="22" y2="20"/>
                <line x1="12" y1="17" x2="12" y2="20"/>
            </svg>
            <p style="font-weight: 500; font-size: 15px; margin-bottom: 4px;">No active VDI sessions</p>
            <p style="font-size: 13px; color: var(--text-muted); max-width: 380px;">Submit a migration goal and authenticate credentials on the Human Workbench to establish connections.</p>
        </div>
      `;
      return;
    }

    for (let i = 0; i < count; i++) {
      const vmIndex = i + 1;
      const nodeId = `VDI-VM-${String(vmIndex).padStart(2, '0')}`;
      const ipAddress = `10.240.12.${100 + vmIndex}`;

      const card = document.createElement('div');
      card.className = 'vm-card state-standby';
      card.id = `vm-card-${i}`;

      card.innerHTML = `
        <div class="vm-card-header">
          <div class="vm-card-title-group">
            <span class="vm-node-id">${nodeId}</span>
            <span class="vm-ip">${ipAddress} (RDP)</span>
          </div>
          <span class="vm-status-badge standby">
            <span class="vm-status-dot-pulse"></span>
            <span class="vm-status-text">Standby</span>
          </span>
        </div>
        <div class="vm-card-body">
          <div class="vm-storage-sec">
            <span class="vm-sec-label">Storage Audit <span class="vm-storage-pct"></span></span>
            <span class="vm-sec-val vm-storage-val">—</span>
          </div>
          <div class="vm-job-sec">
            <span class="vm-sec-label">Active Job <span class="vm-job-speed"></span></span>
            <span class="vm-sec-val vm-job-val">Idle</span>
          </div>
          <div class="vm-progress-wrapper">
            <div class="vm-progress-container">
              <div class="vm-progress-fill"></div>
            </div>
            <span class="vm-progress-text">0%</span>
          </div>
        </div>
        <div class="vm-card-console" id="vm-console-${i}">
          <div class="vm-console-line system">&gt; Ready for RDP connection.</div>
        </div>
      `;

      grid.appendChild(card);
      this.vmCards.push(card);
    }
  }

  /**
   * Update state and metrics of a single VM Card.
   */
  updateVMNode(vmIndex, data) {
    const card = this.vmCards[vmIndex];
    if (!card) return;

    const { status, storage, jobVal, speed, progress } = data;

    // Only update status if explicitly provided
    if (status !== undefined) {
      card.classList.remove('state-standby', 'state-deploying', 'state-checking', 'state-active', 'state-failed', 'state-complete');
      card.classList.add(`state-${status}`);

      const badge = card.querySelector('.vm-status-badge');
      if (badge) {
        badge.className = `vm-status-badge ${status}`;
        const textEl = badge.querySelector('.vm-status-text');
        if (textEl) {
          textEl.textContent = status === 'checking' ? 'Checking' : status.charAt(0).toUpperCase() + status.slice(1);
        }
      }
    }

    // Update Storage values
    if (storage !== undefined) {
      card.querySelector('.vm-storage-val').textContent = storage;
    }

    // Update Job text
    if (jobVal !== undefined) {
      card.querySelector('.vm-job-val').textContent = jobVal;
    }

    // Update Ingestion speed
    const speedLabel = card.querySelector('.vm-job-speed');
    if (speedLabel && speed !== undefined) {
      speedLabel.textContent = speed;
    }

    // Update Progress
    if (progress !== undefined) {
      const fill = card.querySelector('.vm-progress-fill');
      const text = card.querySelector('.vm-progress-text');
      if (fill) {
        fill.style.width = `${progress}%`;
        
        const isFailed = status !== undefined ? (status === 'failed') : card.classList.contains('state-failed');
        const isDeploying = status !== undefined ? (status === 'deploying') : card.classList.contains('state-deploying');
        
        if (isFailed) {
          fill.classList.add('failed');
          fill.classList.remove('deploying');
        } else if (isDeploying) {
          fill.classList.add('deploying');
          fill.classList.remove('failed');
        } else {
          fill.classList.remove('failed', 'deploying');
        }
      }
      if (text) {
        text.textContent = `${progress}%`;
      }
    }
  }

  /**
   * Add a console log line to a specific VM node's terminal.
   */
  addVMConsoleLine(vmIndex, text, type = 'system') {
    const consoleEl = document.getElementById(`vm-console-${vmIndex}`);
    if (!consoleEl) return;

    const line = document.createElement('div');
    line.className = `vm-console-line ${type}`;
    line.innerHTML = `&gt; ${text}`;
    consoleEl.appendChild(line);

    // Auto scroll to bottom
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  /**
   * Stub method for task cards (since vertical task cards are removed).
   */
  setTaskStatus(taskId, status, outputText = '') {
    // No-op stub
  }

  /**
   * Reset all agent cards to standby.
   */
  reset() {
    this.agents.forEach((el, id) => {
      this.setAgentStatus(id, 'standby');
    });
    this.initVMGrid(0);
  }
}

// ── Export ──────────────────────────────────────────────────────────────────────
window.ProjectManagerView = ProjectManagerView;

