/**
 * agents.js — Simulated Agent Functions
 * 
 * Each method simulates a subagent performing work asynchronously.
 * Returns structured results after a realistic delay.
 * 
 * Exports: window.AgentRunner
 */

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class AgentRunner {

  // ── Strategy Agent ────────────────────────────────────────────────────────

  /**
   * Generates a dynamic migration plan based on goal parameters.
   * Discovers doc classes and priorities them (highest count first).
   * @param {string} prompt
   * @returns {Promise<Object>} Migration plan structure
   */
  async runStrategy(prompt) {
    await delay(1800);
    const isLegacy = prompt.toLowerCase().includes('legacy') || prompt.toLowerCase().includes('cm');

    // Discover doc classes and counts
    const discoveredClasses = [
      { name: 'Invoices', count: 15200 },
      { name: 'ClaimsDocuments', count: 12500 },
      { name: 'LoanFiles', count: 11400 },
      { name: 'UnderwritingDocs', count: 9800 },
      { name: 'CustomerAgreements', count: 8400 },
      { name: 'HRRecords', count: 6100 },
      { name: 'LegalContracts', count: 4300 },
      { name: 'ComplianceReports', count: 3500 }
    ];

    // Plan according to higher counts starting migration first
    // (Sort in descending order of counts)
    const prioritizedClasses = [...discoveredClasses].sort((a, b) => b.count - a.count);

    const waves = [
      {
        id: 'wave1',
        name: 'Phase 1: Prioritized Group A (High Volume)',
        activities: prioritizedClasses.slice(0, 3).map(dc => `Migrate class: ${dc.name} (${dc.count.toLocaleString()} docs)`)
      },
      {
        id: 'wave2',
        name: 'Phase 2: Prioritized Group B (Medium Volume)',
        activities: prioritizedClasses.slice(3, 6).map(dc => `Migrate class: ${dc.name} (${dc.count.toLocaleString()} docs)`)
      },
      {
        id: 'wave3',
        name: 'Phase 3: Prioritized Group C (Low Volume)',
        activities: prioritizedClasses.slice(6).map(dc => `Migrate class: ${dc.name} (${dc.count.toLocaleString()} docs)`)
      }
    ];

    return {
      isLegacy,
      waves,
      discoveredClasses: prioritizedClasses,
      migrationApproach: 'Prioritized High-Count First Autonomous Migration',
      estimatedDuration: '6 Weeks'
    };
  }

  // ── Pre-Config Agent ─────────────────────────────────────────────────────

  /**
   * Discovers schemas and prepares target repositories.
   */
  async runPreConfig(prompt) {
    await delay(1500);

    return {
      sourceAttrs: [
        'document_id', 'title', 'description', 'author',
        'created_date', 'modified_date', 'content_type',
        'file_size', 'filepath', 'status', 'version',
        'tags', 'permissions'
      ],
      targetAttrs: [
        'doc_id', 'name', 'summary', 'creator',
        'date_created', 'date_modified', 'type',
        'size', 'state', 'revision', 'labels',
        'access_control'
      ],
      sourceCount: 71200,
      targetRepo: 'FileNetTarget',
      targetClass: 'Document'
    };
  }

  // ── Mapping Agent ────────────────────────────────────────────────────────

  /**
   * AI-driven attribute alignment between source and target schemas.
   * Generates lower confidence values for specific unmapped or low confidence fields
   * when migrating particular document classes.
   */
  async runMapping(docClass, sourceAttrs, targetAttrs, isLegacy) {
    await delay(1500);

    // Default mappings
    let mappings = [
      { source: 'document_id',   target: 'doc_id',         confidence: 0.98, status: 'high' },
      { source: 'title',         target: 'name',           confidence: 0.95, status: 'high' },
      { source: 'description',   target: 'summary',        confidence: 0.91, status: 'high' },
      { source: 'author',        target: 'creator',        confidence: 0.93, status: 'high' },
      { source: 'created_date',  target: 'date_created',   confidence: 0.96, status: 'high' },
      { source: 'modified_date', target: 'date_modified',  confidence: 0.97, status: 'high' },
      { source: 'content_type',  target: 'type',           confidence: 0.88, status: 'high' },
      { source: 'file_size',     target: 'size',           confidence: 0.92, status: 'high' },
      { source: 'status',        target: 'state',          confidence: 0.82, status: 'high' },
      { source: 'version',       target: 'revision',       confidence: 0.85, status: 'high' },
      { source: 'tags',          target: 'labels',         confidence: 0.79, status: 'high' },
      { source: 'permissions',   target: 'access_control', confidence: 0.76, status: 'high' },
      { source: 'filepath',      target: null,             confidence: 0.00, status: 'unmapped' }
    ];

    // For Invoices (highest volume class) or legacy mode, simulate low confidence mapping under 50%
    if (docClass === 'Invoices' || isLegacy) {
      mappings = [
        { source: 'document_id',   target: 'doc_id',         confidence: 0.95, status: 'high' },
        { source: 'title',         target: 'name',           confidence: 0.92, status: 'high' },
        { source: 'description',   target: 'summary',        confidence: 0.88, status: 'high' },
        { source: 'author',        target: 'creator',        confidence: 0.45, status: 'low' }, // < 50%
        { source: 'created_date',  target: 'date_created',   confidence: 0.42, status: 'low' }, // < 50%
        { source: 'modified_date', target: 'date_modified',  confidence: 0.48, status: 'low' }, // < 50%
        { source: 'content_type',  target: 'type',           confidence: 0.40, status: 'low' }, // < 50%
        { source: 'file_size',     target: 'size',           confidence: 0.38, status: 'low' }, // < 50%
        { source: 'status',        target: 'state',          confidence: 0.35, status: 'low' }, // < 50%
        { source: 'version',       target: null,             confidence: 0.00, status: 'unmapped' },
        { source: 'tags',          target: null,             confidence: 0.00, status: 'unmapped' },
        { source: 'permissions',   target: null,             confidence: 0.00, status: 'unmapped' },
        { source: 'filepath',      target: null,             confidence: 0.00, status: 'unmapped' }
      ];
    }

    const mapped = mappings.filter(m => m.target !== null);
    const avgConfidence = +(mapped.reduce((s, m) => s + m.confidence, 0) / mapped.length).toFixed(2);
    const lowConfidenceCount = mappings.filter(m => m.confidence > 0 && m.confidence < 0.50).length;
    const unmappedCount = mappings.filter(m => m.confidence === 0).length;

    return {
      docClass,
      mappings,
      avgConfidence,
      unmappedCount,
      lowConfidenceCount,
      unmappedMandatory: mappings.filter(m => m.confidence === 0 && ['version', 'tags', 'permissions'].includes(m.source)).length
    };
  }

  // ── Planner Agent ────────────────────────────────────────────────────────

  /**
   * Plans batch queue-based execution strategy based on available instances.
   */
  async runPlanner(docClasses, docCount, vmCount) {
    await delay(1500);

    // Distribute document classes into jobs
    const jobs = docClasses.map((dc, index) => {
      // Map VM Node index (e.g. 0 to vmCount-1)
      const vmIdx = (index % vmCount) + 1;
      return {
        id: `JOB-${String(index + 1).padStart(3, '0')}`,
        docClass: dc.name,
        docs: dc.count,
        status: 'pending',
        vmNode: `VM-${String(vmIdx).padStart(2, '0')}`
      };
    });

    return {
      jobs,
      totalDocs: jobs.reduce((sum, j) => sum + j.docs, 0),
      strategy: 'queue-based parallel'
    };
  }

  // ── Execution Agent ──────────────────────────────────────────────────────

  /**
   * Simulates queue-based job execution across multiple VM nodes.
   * VM-03 will crash while running JOB-003 at 45% progress.
   */
  async runExecution({ jobs, vmCount, onJobUpdate, onVmUpdate, onVmLog, resumeFrom = null }) {
    // Shared queue of jobs remaining
    let queue = [...jobs];
    
    // VM workers state
    const workers = [];
    for (let i = 0; i < vmCount; i++) {
      workers.push({
        id: i,
        nodeId: `VM-${String(i + 1).padStart(2, '0')}`,
        activeJob: null,
        status: 'active',
        progress: 0,
        speed: 0
      });
    }

    // If we are resuming after a resolution, restore state
    if (resumeFrom) {
      // Find the job that failed and reset it to pending
      const failedJob = jobs.find(j => j.id === resumeFrom.failedJobId);
      if (failedJob) {
        failedJob.status = 'pending';
        failedJob.vmNode = null;
      }
      // Resume queue only with jobs that are not 'completed'
      queue = jobs.filter(j => j.status !== 'completed');
    }

    let failureTriggered = false;
    let failedJobId = null;
    let failedVmIndex = null;

    // Simulation loop
    while (queue.some(j => j.status !== 'completed') && !failureTriggered) {
      // 1. Assign jobs to idle workers
      for (let w of workers) {
        if (w.status === 'failed') continue;

        if (!w.activeJob) {
          // Pull next job that is pending
          const nextJob = queue.find(j => j.status === 'pending');
          if (nextJob) {
            nextJob.status = 'running';
            nextJob.vmNode = w.nodeId;
            w.activeJob = nextJob;
            w.progress = 0;
            w.speed = Math.floor(110 + Math.random() * 50); // docs/s
            
            if (onJobUpdate) {
              onJobUpdate(nextJob.id, 0, 'running', w.nodeId);
            }
            if (onVmUpdate) {
              onVmUpdate(w.id, {
                status: 'active',
                jobVal: `${nextJob.id} (${nextJob.docClass})`,
                speed: `${w.speed} docs/s`,
                progress: 0
              });
            }
            if (onVmLog) {
              onVmLog(w.id, `Pulled ${nextJob.id} from queue.`, 'system');
              onVmLog(w.id, `Extracting class ${nextJob.docClass}...`, 'command');
            }
          }
        }
      }

      // 2. Increment progress of active jobs
      for (let w of workers) {
        if (w.activeJob && w.status === 'active') {
          // Increment progress
          w.progress += 10;
          if (w.progress > 100) w.progress = 100;

          // Check for simulated failure
          // VM-03 (index 2) fails on JOB-003 when progress reaches 40-50%
          if (!resumeFrom && w.id === 2 && w.activeJob.id === 'JOB-003' && w.progress === 40) {
            // CRASH!
            w.status = 'failed';
            w.progress = 40;
            w.activeJob.status = 'failed';
            
            failureTriggered = true;
            failedJobId = w.activeJob.id;
            failedVmIndex = w.id;

            if (onJobUpdate) {
              onJobUpdate(w.activeJob.id, 40, 'failed', w.nodeId);
            }
            if (onVmUpdate) {
              onVmUpdate(w.id, {
                status: 'failed',
                jobVal: `${w.activeJob.id} failed`,
                speed: '0 docs/s',
                progress: 40
              });
            }
            if (onVmLog) {
              onVmLog(w.id, `CRITICAL: Socket timeout. RDP connection closed.`, 'error');
              onVmLog(w.id, `RapidPro worker crashed with exit code 10054.`, 'error');
            }
            break;
          }

          // Update progress
          if (onJobUpdate) {
            onJobUpdate(w.activeJob.id, w.progress, 'running', w.nodeId);
          }
          if (onVmUpdate) {
            onVmUpdate(w.id, {
              progress: w.progress
            });
          }

          // Complete job
          if (w.progress === 100) {
            const completedJob = w.activeJob;
            completedJob.status = 'completed';
            w.activeJob = null;
            
            if (onJobUpdate) {
              onJobUpdate(completedJob.id, 100, 'completed', w.nodeId);
            }
            if (onVmUpdate) {
              onVmUpdate(w.id, {
                status: 'active',
                jobVal: 'Idle',
                speed: '0 docs/s',
                progress: 100
              });
            }
            if (onVmLog) {
              onVmLog(w.id, `Finished ${completedJob.id} successfully.`, 'success');
              onVmLog(w.id, `Ingested ${completedJob.docs.toLocaleString()} records to FileNet.`, 'success');
            }
          }
        }
      }

      await delay(250);
    }

    if (failureTriggered) {
      return {
        status: 'failed',
        failedJobId,
        failedVmIndex
      };
    }

    // Finish everything
    for (let w of workers) {
      if (onVmUpdate) {
        onVmUpdate(w.id, {
          status: 'complete',
          jobVal: 'Complete',
          speed: '0 docs/s',
          progress: 100
        });
      }
    }

    return {
      status: 'completed',
      results: jobs
    };
  }

  // ── Resolver Agent ───────────────────────────────────────────────────────

  /**
   * Diagnoses and resolves execution failures.
   */
  async runResolver(failedVmIndex, failedJobId) {
    await delay(2000);

    const nodeId = `VM-${String(failedVmIndex + 1).padStart(2, '0')}`;
    return {
      resolved:     true,
      strategy:     'RDP-Reconnection & Adapter Restart',
      diagnosis:    `RDP Socket Timeout on ${nodeId} executing ${failedJobId}`,
      action:       `Reset VDI tunnel, cleared queue database locks, restarted RapidPro service on ${nodeId}.`
    };
  }

  // ── Reconciliation Agent ─────────────────────────────────────────────────

  /**
   * Verifies document count parity between source and target.
   */
  async runReconciliation(sourceCount, targetCount) {
    await delay(1800);

    return {
      sourceCount: 71200,
      targetCount: 71200,
      delta:       0,
      matchPercentage: 100
    };
  }

  // ── Report Agent ─────────────────────────────────────────────────────────

  /**
   * Generates a final migration report.
   */
  async runReport(allResults) {
    await delay(1500);

    const endTime   = new Date();
    const startTime = new Date(endTime.getTime() - 325000); // ~5m 25s ago

    return {
      totalDocs:      71200,
      migrated:       71200,
      failed:         0,
      successRate:    100,
      duration:       '5m 25s',
      issuesResolved: 1,
      startTime,
      endTime,
      agentsUsed:     8
    };
  }
}

// ── Export ──────────────────────────────────────────────────────────────────────
window.AgentRunner = AgentRunner;
