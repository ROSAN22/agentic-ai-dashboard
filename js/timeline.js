/**
 * timeline.js — Decision Log
 * 
 * Manages the real-time decision log that shows supervisor reasoning
 * and agent activity during the migration pipeline.
 * 
 * Exports: window.DecisionLog
 */

// ── Agent configuration map ────────────────────────────────────────────────────
const AGENT_CONFIG = {
  supervisor:      { icon: '🧠', color: 'blue',   label: 'Supervisor' },
  preconfig:       { icon: '🔌', color: 'cyan',   label: 'Pre-Config' },
  mapping:         { icon: '🗺️', color: 'purple', label: 'Mapping' },
  planner:         { icon: '📋', color: 'amber',  label: 'Planner' },
  execution:       { icon: '🚀', color: 'green',  label: 'Execution' },
  resolver:        { icon: '🤖', color: 'red',    label: 'Resolver' },
  reconciliation:  { icon: '📊', color: 'cyan',   label: 'Reconciliation' },
  report:          { icon: '📝', color: 'blue',   label: 'Report' },
  human:           { icon: '👤', color: 'amber',  label: 'Human Review' }
};

class DecisionLog {
  /**
   * @param {string} containerId   – ID of the log container element
   * @param {string} placeholderId – ID of the placeholder shown when log is empty
   */
  constructor(containerId, placeholderId) {
    this.container   = document.getElementById(containerId);
    this.placeholder = document.getElementById(placeholderId);
    this.entryCount  = 0;
  }

  /**
   * Append a new entry to the decision log.
   *
   * @param {Object}  opts
   * @param {string}  opts.agent      – Agent key from AGENT_CONFIG (e.g. 'supervisor')
   * @param {string}  opts.icon       – Emoji icon override
   * @param {string}  opts.color      – CSS color class ('blue','cyan','purple','amber','green','red')
   * @param {string}  opts.message    – Log message text
   * @param {boolean} opts.isThinking – If true, entry gets the .thinking class
   * @param {Date}   [opts.timestamp] – Timestamp for the entry (defaults to now)
   */
  addEntry({ agent, icon, color, message, isThinking = false, timestamp }) {
    // Hide placeholder on first entry
    if (this.entryCount === 0 && this.placeholder) {
      this.placeholder.style.display = 'none';
    }

    const ts  = timestamp || new Date();
    const time = this._formatTime(ts);

    // Resolve agent config (allows raw overrides)
    const cfg      = AGENT_CONFIG[agent] || {};
    const entryIcon  = icon  || cfg.icon  || '❓';
    const entryColor = color || cfg.color || 'blue';
    const entryLabel = cfg.label || agent || 'System';

    // Build DOM
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (isThinking ? ' thinking' : '');

    entry.innerHTML = `
      <div class="log-entry-icon ${entryColor}">${entryIcon}</div>
      <div class="log-entry-body">
        <span class="log-entry-agent ${entryColor}">${entryLabel}</span>
        <span class="log-entry-message">${message}</span>
        <span class="log-entry-time">${time}</span>
      </div>
    `;

    // Slide-in animation
    entry.style.animation = 'slideInLeft 0.3s ease forwards';

    this.container.appendChild(entry);
    this.entryCount++;

    // Auto-scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Remove all entries and restore the placeholder.
   */
  clear() {
    // Remove all .log-entry nodes
    const entries = this.container.querySelectorAll('.log-entry');
    entries.forEach(el => el.remove());

    this.entryCount = 0;

    // Restore placeholder
    if (this.placeholder) {
      this.placeholder.style.display = '';
    }
  }

  /**
   * Format a Date as HH:MM:SS (24-hour, zero-padded).
   * @private
   */
  _formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}

// ── Export ──────────────────────────────────────────────────────────────────────
window.DecisionLog = DecisionLog;
window.AGENT_CONFIG = AGENT_CONFIG;
