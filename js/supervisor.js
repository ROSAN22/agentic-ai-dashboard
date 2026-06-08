/**
 * supervisor.js — Autonomous Supervisor Agent
 * 
 * The core agentic decision loop. The supervisor evaluates state,
 * reasons about what to do next, dispatches subagents, and makes autonomous
 * decisions (e.g. pausing for credentials, auditing storage, handling queue executions,
 * and dispatching the Resolver agent on VM failures).
 * 
 * Exports: window.Supervisor
 */

const _delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class Supervisor {
  /**
   * @param {Object} deps
   * @param {DecisionLog}         deps.decisionLog
   * @param {ProjectManagerView}  deps.agentGraph
   * @param {AgentRunner}         deps.agentRunner
   * @param {Object}              deps.callbacks
   */
  constructor({ decisionLog, agentGraph, agentRunner, callbacks }) {
    this.log      = decisionLog;
    this.graph    = agentGraph; // holds ProjectManagerView
    this.runner   = agentRunner;
    this.cb       = callbacks || {};

    // Pipeline state flags
    this._resetState();

    // Control
    this.isRunning = false;
    this._humanResolver = null; // resolve function for human approval promise
  }

  // ── Public: execute the full migration goal ────────────────────────────────

  /**
   * @param {Object} goal
   * @param {string} goal.prompt
   */
  async executeGoal(goal) {
    this._resetState();
    this.isRunning = true;
    this.goal      = goal;

    const promptText = goal.prompt || "migrate CM to FileNet with 5 instances";
    
    // Parse VM count from prompt
    let parsedVms = 5;
    const vmMatch = promptText.match(/(\d+)\s*(?:instances|vms|vdis|nodes|servers)/i);
    if (vmMatch) {
      parsedVms = parseInt(vmMatch[1], 10);
    }
    this.vmCount = parsedVms;

    // Detect legacy mode based on input containing 'legacy' or 'cm'
    this._isLegacy = promptText.toLowerCase().includes('legacy');

    this._updateStatus('working', 'Executing goal...');
    this.graph.setAgentStatus('supervisor', 'active');

    this.log.addEntry({
      agent: 'supervisor', icon: '🧠', color: 'blue',
      message: `Goal received — <strong>"${promptText}"</strong> (Parsed: <strong>${this.vmCount}</strong> VDI instances)`
    });

    try {
      // ── The decision loop ────────────────────────────────────────────
      while (!this._allDone() && this.isRunning) {
        await this._decide();
      }

      if (this.isRunning) {
        this._updateStatus('done', 'Migration complete');
        this.graph.setAgentStatus('supervisor', 'complete');
        this.log.addEntry({
          agent: 'supervisor', icon: '🎉', color: 'green',
          message: 'All pipeline stages complete. Migration finished successfully!'
        });
        if (this.cb.onComplete) this.cb.onComplete();
      }
    } catch (err) {
      this._updateStatus('error', 'Pipeline error');
      this.graph.setAgentStatus('supervisor', 'error');
      this.log.addEntry({
        agent: 'supervisor', icon: '❌', color: 'red',
        message: `Fatal error: ${err.message}`
      });
      if (this.cb.onError) this.cb.onError(err);
    } finally {
      this.isRunning = false;
    }
  }

  // ── Public: handle human decision (called from app.js) ─────────────────

  handleHumanApproval(approved, data) {
    if (!this._humanResolver) return;

    if (approved) {
      this._humanResolver({ approved: true, data });
    } else {
      this._humanResolver({ approved: false, data });
    }
  }

  // ── Public: get current state / reset ──────────────────────────────────

  getState() {
    return { ...this.state };
  }

  reset() {
    this.isRunning = false;
    this._resetState();
    this._updateStatus('idle', 'Idle');
    this.graph.reset();
  }

  // ── Core decision engine (private) ────────────────────────────────────────

  /** @private */
  async _decide() {

    // ── Step 1: Strategy Formulation ───────────────────────────────────────
    if (!this.state.strategyPlanned) {
      await this._think(
        'Analyzing goal parameters to generate dynamic implementation plan...'
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: 'Dispatching <strong>Strategy Agent</strong> to plan waves...'
      });

      const result = await this._dispatchAgent('strategy', 'strategy', () =>
        this.runner.runStrategy(this.goal.prompt)
      );

      this._strategyResult = result;
      this.state.strategyPlanned = true;

      this.log.addEntry({
        agent: 'strategy', icon: '📋', color: 'amber',
        message: `Dynamic plan formulated — <strong>${result.migrationApproach}</strong>, estimated duration <strong>${result.estimatedDuration}</strong>.`
      });

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 1,
          confidence: null,
          stage: 'Strategy Planned'
        });
      }

      await _delay(300);
      return;
    }

    // ── Step 2: VDI Provisioning (RapidPro Deployment) ──────────────────────
    if (!this.state.vdiDeployed) {
      await this._think(
        `Deploying RapidPro migration codebase to target <strong>${this.vmCount}</strong> VDI remote desktops...`
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: `Initializing connection grid. Spawning exactly <strong>${this.vmCount}</strong> VDI Session nodes...`
      });

      // Render VM grid in VDI tab
      this.graph.initVMGrid(this.vmCount);

      // Simulate connection / code deployment on each card
      for (let i = 0; i < this.vmCount; i++) {
        const ip = `10.240.12.${101 + i}`;
        this.graph.updateVMNode(i, { status: 'deploying', progress: 20 });
        this.graph.addVMConsoleLine(i, `Establishing VDI session connection to gateway...`, 'system');
        this.graph.addVMConsoleLine(i, `RDP tunnel established on ${ip}:3389`, 'system');
      }

      await _delay(1000);

      for (let i = 0; i < this.vmCount; i++) {
        this.graph.updateVMNode(i, { progress: 60 });
        this.graph.addVMConsoleLine(i, `Copying RapidPro package binaries...`, 'command');
        this.graph.addVMConsoleLine(i, `Configuring local extraction environments...`, 'command');
      }

      await _delay(1000);

      for (let i = 0; i < this.vmCount; i++) {
        this.graph.updateVMNode(i, { progress: 100, status: 'standby' });
        this.graph.addVMConsoleLine(i, `RapidPro binary deployment successful.`, 'success');
        this.graph.addVMConsoleLine(i, `Service agent listening on port 8080. Standby.`, 'success');
      }

      this.state.vdiDeployed = true;
      this.log.addEntry({
        agent: 'preconfig', icon: '🔌', color: 'cyan',
        message: `VDI code deployment completed successfully across <strong>${this.vmCount}</strong> worker nodes.`
      });

      await _delay(300);
      return;
    }

    // ── Step 3: VDI Authentication Pause (Human Input) ──────────────────────
    if (!this.state.credentialsProvided) {
      await this._think(
        'VDI nodes deployed. Credentials authorization required to authenticate remote desktop sessions.'
      );
      await _delay(500);

      this.graph.setAgentStatus('supervisor', 'active');
      this.log.addEntry({
        agent: 'supervisor', icon: '👤', color: 'amber',
        message: 'Supervisor paused: VDI Gateways credentials authorization required. Check Human Workbench.'
      });

      // Switch active workbench view to credentials form
      if (this.cb.onHumanNeeded) {
        this.cb.onHumanNeeded({ type: 'credentials' });
      }

      // ── PAUSE: Wait for user credentials submit ───────────────────────
      const credentials = await new Promise(resolve => {
        this._humanResolver = resolve;
      });
      this._humanResolver = null;

      this.state.credentialsProvided = true;

      this.log.addEntry({
        agent: 'human', icon: '👤', color: 'amber',
        message: `VDI Credentials supplied for <strong>${credentials.data.env.toUpperCase()}</strong> environment (User: ${credentials.data.username}). Authenticating sessions...`
      });

      for (let i = 0; i < this.vmCount; i++) {
        this.graph.addVMConsoleLine(i, `Credentials verified. Local VDI Administrator session authenticated.`, 'success');
      }

      await _delay(800);
      return;
    }

    // ── Step 4: Storage Auditing ───────────────────────────────────────────
    if (!this.state.storageChecked) {
      await this._think(
        `Auditing remote storage capacity on target VMs to ensure extraction files space...`
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: `Pre-Config Agent executing storage capacity validation audits on VM-01 to VM-${String(this.vmCount).padStart(2, '0')}...`
      });

      // Set cards state to checking
      for (let i = 0; i < this.vmCount; i++) {
        this.graph.updateVMNode(i, { status: 'checking', storage: 'Checking...' });
        this.graph.addVMConsoleLine(i, `Auditing local disk partitions...`, 'command');
        this.graph.addVMConsoleLine(i, `DF -H query submitted to OS kernel...`, 'command');
      }

      await _delay(1200);

      const vmStorageCapacities = [
        "1.2 TB / 2.0 TB Free (60% Available)",
        "820 GB / 2.0 TB Free (41% Available)",
        "1.5 TB / 2.0 TB Free (75% Available)",
        "1.1 TB / 2.0 TB Free (55% Available)",
        "920 GB / 2.0 TB Free (46% Available)",
        "1.3 TB / 2.0 TB Free (65% Available)",
        "1.4 TB / 2.0 TB Free (70% Available)"
      ];

      for (let i = 0; i < this.vmCount; i++) {
        const cap = vmStorageCapacities[i % vmStorageCapacities.length];
        this.graph.updateVMNode(i, { status: 'standby', storage: cap });
        this.graph.addVMConsoleLine(i, `Storage verification: PASSED. Capacity: ${cap}`, 'success');
      }

      this.state.storageChecked = true;
      this.log.addEntry({
        agent: 'preconfig', icon: '🔌', color: 'cyan',
        message: `Storage capacity check PASSED. Central VDI reports adequate allocation across all ${this.vmCount} instances.`
      });

      await _delay(300);
      return;
    }

    // ── Step 5: Pre-Config Schema Discovery ─────────────────────────────────
    if (!this.state.schemasDiscovered) {
      await this._think(
        'VDI sessions authorized and storage audited. Discovering database schema schemas...'
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: 'Dispatching <strong>Pre-Config Agent</strong> to discover repository schemas...'
      });

      const result = await this._dispatchAgent('preconfig', 'preconfig', () =>
        this.runner.runPreConfig(this.goal.prompt)
      );

      this._preConfigResult = result;
      this.state.schemasDiscovered = true;

      this.log.addEntry({
        agent: 'preconfig', icon: '🔌', color: 'cyan',
        message: `Schema discovery complete — <strong>${result.sourceAttrs.length}</strong> source attributes, <strong>${result.targetAttrs.length}</strong> target attributes. <strong>${result.sourceCount.toLocaleString()}</strong> documents total detected.`
      });

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 2,
          stage: 'Schemas Discovered'
        });
      }

      await _delay(300);
      return;
    }

    // ── Step 6: AI Schema Mapping & Approval ────────────────────────────────
    if (!this.state.mappingsProposed) {
      await this._think(
        'Database schemas extracted. Aligning schema properties...'
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: 'Dispatching <strong>Mapping Agent</strong> for AI attribute alignment...'
      });

      const result = await this._dispatchAgent('mapping', 'mapping', () =>
        this.runner.runMapping(this._preConfigResult.sourceAttrs, this._preConfigResult.targetAttrs, this._isLegacy)
      );

      this._mappingResult = result;
      this.state.mappingsProposed = true;

      const confPct = Math.round(result.avgConfidence * 100);
      this.log.addEntry({
        agent: 'mapping', icon: '🗺️', color: 'purple',
        message: `AI attribute mapping formulated — avg confidence: <strong>${confPct}%</strong>, unmapped fields: <strong>${result.unmappedCount}</strong>.`
      });

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 3,
          confidence: confPct,
          stage: 'Mappings Generated'
        });
      }

      await _delay(300);
      return;
    }

    if (!this.state.mappingApproved) {
      const confPct = Math.round(this._mappingResult.avgConfidence * 100);

      if (this._mappingResult.avgConfidence >= 0.75 && this._mappingResult.unmappedMandatory === 0) {
        // Auto approve
        await this._think(
          `Mapping confidence is high (${confPct}%). Auto-approving schemas...`
        );
        this.state.mappingApproved = true;
        this.log.addEntry({
          agent: 'supervisor', icon: '✅', color: 'green',
          message: 'Mapping auto-approved by Supervisor logic.'
        });
        if (this.cb.onKpiUpdate) {
          this.cb.onKpiUpdate({ tasksCompleted: 4, stage: 'Mapping Approved' });
        }
      } else {
        // Pausing for human mapping review
        await this._think(
          `Mapping confidence is low (${confPct}%) with unmapped mandatory fields. Pausing for human review...`
        );
        
        this.graph.setAgentStatus('supervisor', 'active');
        this.log.addEntry({
          agent: 'supervisor', icon: '👤', color: 'amber',
          message: 'Supervisor paused: Attribute mapping review required. Check Human Workbench.'
        });

        if (this.cb.onHumanNeeded) {
          this.cb.onHumanNeeded({ type: 'mapping', data: this._mappingResult });
        }

        // Wait for decision
        const decision = await new Promise(resolve => {
          this._humanResolver = resolve;
        });
        this._humanResolver = null;

        this.state.mappingApproved = true;
        this.log.addEntry({
          agent: 'supervisor', icon: '✅', color: 'green',
          message: `Mapping approved by user comments: "${decision.comments || 'proceed'}"`
        });
        if (this.cb.onKpiUpdate) {
          this.cb.onKpiUpdate({ tasksCompleted: 4, stage: 'Mapping Approved' });
        }
      }

      await _delay(300);
      return;
    }

    // ── Step 7: Batch Planner ──────────────────────────────────────────────
    if (!this.state.planReady) {
      await this._think(
        'Mappings finalized. Scheduling job batches for Document Classes...'
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: 'Dispatching <strong>Planner Agent</strong> to schedule queue batches...'
      });

      const result = await this._dispatchAgent('planner', 'planner', () =>
        this.runner.runPlanner(this._mappingResult.mappings, this._preConfigResult.sourceCount)
      );

      this._planResult = result;
      this.state.planReady = true;

      this.log.addEntry({
        agent: 'planner', icon: '📋', color: 'amber',
        message: `Execution schedule ready — <strong>${result.jobs.length}</strong> parallel jobs mapped to document classes queue.`
      });

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 5,
          stage: 'Batch Planning Ready'
        });
      }

      // Initialize job table in production tab
      if (this.cb.onProdKpiUpdate) {
        this.cb.onProdKpiUpdate({
          totalDocs: result.totalDocs,
          migrated: 0,
          failed: 0,
          successRate: 0,
          jobs: result.jobs
        });
      }

      await _delay(300);
      return;
    }

    // ── Step 8: Execution ──────────────────────────────────────────────────
    if (!this.state.executionComplete) {
      await this._think(
        `Orchestrating queue jobs parallel execution across active VM instances...`
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: `Dispatching <strong>Execution Agent</strong> to execute queue on <strong>${this.vmCount}</strong> VDI instances...`
      });

      // Update VM grid status
      for (let i = 0; i < this.vmCount; i++) {
        this.graph.updateVMNode(i, { status: 'active' });
      }

      let runResult;
      if (this.state.hasFailures && this.state.resolved) {
        // Resuming execution
        this.log.addEntry({
          agent: 'supervisor', icon: '🧠', color: 'blue',
          message: `Resuming migration execution queue starting from <strong>${this._failedJobId}</strong>...`
        });
        runResult = await this._dispatchAgent('execution', 'execution', () =>
          this.runner.runExecution({
            jobs: this._planResult.jobs,
            vmCount: this.vmCount,
            onJobUpdate: (jobId, progress, status, vmId) => {
              if (this.cb.onJobUpdate) this.cb.onJobUpdate(jobId, progress, status, vmId);
            },
            onVmUpdate: (vmIdx, data) => {
              this.graph.updateVMNode(vmIdx, data);
            },
            onVmLog: (vmIdx, text, type) => {
              this.graph.addVMConsoleLine(vmIdx, text, type);
            },
            resumeFrom: { failedJobId: this._failedJobId, failedVmIndex: this._failedVmIndex }
          })
        );
      } else {
        // Start execution normal
        runResult = await this._dispatchAgent('execution', 'execution', () =>
          this.runner.runExecution({
            jobs: this._planResult.jobs,
            vmCount: this.vmCount,
            onJobUpdate: (jobId, progress, status, vmId) => {
              if (this.cb.onJobUpdate) this.cb.onJobUpdate(jobId, progress, status, vmId);
            },
            onVmUpdate: (vmIdx, data) => {
              this.graph.updateVMNode(vmIdx, data);
            },
            onVmLog: (vmIdx, text, type) => {
              this.graph.addVMConsoleLine(vmIdx, text, type);
            },
          })
        );
      }

      if (runResult.status === 'failed') {
        this.state.hasFailures = true;
        this._failedJobId = runResult.failedJobId;
        this._failedVmIndex = runResult.failedVmIndex;

        const nodeLabel = `VM-${String(runResult.failedVmIndex + 1).padStart(2, '0')}`;
        this.log.addEntry({
          agent: 'execution', icon: '🚀', color: 'red',
          message: `CRITICAL: Execution halted. Connection lost on <strong>${nodeLabel}</strong> during <strong>${runResult.failedJobId}</strong> extraction.`
        });

        if (this.cb.onErrorLog) {
          this.cb.onErrorLog({
            severity: 'critical',
            message: `Remote desktop session closed timeout on ${nodeLabel} processing job ${runResult.failedJobId}.`,
            time: new Date()
          });
        }

        // Interrupt execution loop to run Resolver
        await _delay(800);
        return;
      }

      this.state.executionComplete = true;
      this.log.addEntry({
        agent: 'execution', icon: '🚀', color: 'green',
        message: `All document classes migration queue completed successfully.`
      });

      // Update production statistics to final
      if (this.cb.onProdKpiUpdate) {
        this.cb.onProdKpiUpdate({
          totalDocs: this._planResult.totalDocs,
          migrated: this._planResult.totalDocs,
          failed: 0,
          successRate: 100
        });
      }

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 6,
          stage: 'Migration Execution Complete'
        });
      }

      await _delay(300);
      return;
    }

    // ── Step 9: Resolver Healing ──────────────────────────────────────────
    if (this.state.hasFailures && !this.state.resolved) {
      const nodeLabel = `VM-${String(this._failedVmIndex + 1).padStart(2, '0')}`;
      await this._think(
        `Ingestion queue halted. Dispatching Resolver agent to diagnostic check ${nodeLabel}...`
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: `Dispatching <strong>Resolver Agent</strong> to repair RDP connection node ${nodeLabel}...`
      });

      const result = await this._dispatchAgent('resolver', 'resolver', () =>
        this.runner.runResolver(this._failedVmIndex, this._failedJobId)
      );

      this._resolverResult = result;
      this.state.resolved = true;

      this.log.addEntry({
        agent: 'resolver', icon: '🤖', color: 'red',
        message: `Diagnostic resolved: <strong>${result.diagnosis}</strong>. Recovery strategy: <strong>${result.strategy}</strong>.`
      });

      // Visual updates on the failed VM
      this.graph.updateVMNode(this._failedVmIndex, { status: 'active', progress: 40 });
      this.graph.addVMConsoleLine(this._failedVmIndex, `Resolver: Re-establishing RDP credentials validation...`, 'system');
      this.graph.addVMConsoleLine(this._failedVmIndex, result.action, 'success');
      this.graph.addVMConsoleLine(this._failedVmIndex, `Connection restored. RapidPro adapter restarted. Resuming job.`, 'success');

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 7,
          stage: 'Resolver Node Recovered'
        });
      }

      await _delay(1200);
      return;
    }

    // ── Step 10: Reconciliation ────────────────────────────────────────────
    if (!this.state.reconciled) {
      await this._think(
        'Migration complete. Auditing database counts parity...'
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: 'Dispatching <strong>Reconciliation Agent</strong> for checksum audits...'
      });

      const result = await this._dispatchAgent('reconciliation', 'reconciliation', () =>
        this.runner.runReconciliation(this._preConfigResult.sourceCount, this._preConfigResult.sourceCount)
      );

      this._reconResult = result;
      this.state.reconciled = true;

      this.log.addEntry({
        agent: 'reconciliation', icon: '📊', color: 'cyan',
        message: `Audit complete — Source: <strong>${result.sourceCount.toLocaleString()}</strong>, Target: <strong>${result.targetCount.toLocaleString()}</strong>, Delta: <strong>${result.delta}</strong>, Match: <strong>${result.matchPercentage}%</strong>.`
      });

      if (this.cb.onReconUpdate) {
        this.cb.onReconUpdate(result);
      }

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 1,
          tasksCompleted: 8,
          stage: 'Parity Audited'
        });
      }

      await _delay(300);
      return;
    }

    // ── Step 11: Compilation Report ─────────────────────────────────────────
    if (!this.state.reported) {
      await this._think(
        'Compiling summary migration logs and report metadata...'
      );
      await _delay(500);

      this.log.addEntry({
        agent: 'supervisor', icon: '🧠', color: 'blue',
        message: 'Dispatching <strong>Report Agent</strong>...'
      });

      const result = await this._dispatchAgent('report', 'report', () =>
        this.runner.runReport({
          preconfig:       this._preConfigResult,
          mapping:         this._mappingResult,
          plan:            this._planResult,
          resolver:        this._resolverResult,
          reconciliation:  this._reconResult
        })
      );

      this.state.reported = true;

      this.log.addEntry({
        agent: 'report', icon: '📝', color: 'blue',
        message: `Report generated — duration: <strong>${result.duration}</strong>, success rate: <strong>${result.successRate}%</strong>.`
      });

      if (this.cb.onReportReady) {
        this.cb.onReportReady(result);
      }

      if (this.cb.onKpiUpdate) {
        this.cb.onKpiUpdate({
          activeAgents: 0,
          tasksCompleted: 9,
          stage: 'Migration Completed'
        });
      }

      await _delay(300);
      return;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Dispatch a subagent: activate visuals, run function, complete visuals.
   * @private
   */
  async _dispatchAgent(agentId, taskId, agentFn) {
    this.graph.setAgentStatus(agentId, 'active');
    const result = await agentFn();
    this.graph.setAgentStatus(agentId, 'complete');
    return result;
  }

  /**
   * Log a supervisor "thinking" entry.
   * @private
   */
  async _think(message) {
    this.log.addEntry({
      agent: 'supervisor',
      icon: '🧠',
      color: 'blue',
      message,
      isThinking: true
    });
    this.graph.setAgentStatus('supervisor', 'thinking');
    await _delay(450); // Brief pause so thinking feels deliberate
  }

  /**
   * Update the status indicator in the header.
   * @private
   */
  _updateStatus(state, text) {
    const dot  = document.getElementById('status-dot');
    const span = document.getElementById('status-text');

    if (dot) {
      dot.className = 'status-dot ' + state;
    }
    if (span) {
      span.textContent = text;
    }
  }

  /**
   * Check whether all pipeline stages have completed.
   * @private
   */
  _allDone() {
    const s = this.state;
    return s.strategyPlanned && s.vdiDeployed && s.credentialsProvided && s.storageChecked && 
           s.schemasDiscovered && s.mappingsProposed && s.mappingApproved &&
           s.planReady && s.executionComplete && s.reconciled && s.reported;
  }

  /**
   * Reset internal state for a new run.
   * @private
   */
  _resetState() {
    this.state = {
      strategyPlanned:     false,
      vdiDeployed:         false,
      credentialsProvided: false,
      storageChecked:      false,
      schemasDiscovered:   false,
      mappingsProposed:    false,
      mappingApproved:     false,
      planReady:           false,
      executionComplete:   false,
      hasFailures:         false,
      resolved:            false,
      reconciled:          false,
      reported:            false
    };
    this.vmCount           = 5;
    this._strategyResult   = null;
    this._preConfigResult  = null;
    this._mappingResult    = null;
    this._planResult       = null;
    this._resolverResult   = null;
    this._reconResult      = null;
    this._humanResolver    = null;
    this._isLegacy         = false;
    this._failedJobId      = null;
    this._failedVmIndex    = null;
  }
}

// ── Export ──────────────────────────────────────────────────────────────────────
window.Supervisor = Supervisor;
