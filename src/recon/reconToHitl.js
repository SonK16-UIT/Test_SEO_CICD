const path = require('path');
const fs = require('fs');
const { captureReconTask } = require('./reconRunner');
const { createReconTask, loadTasks } = require('./reconTasks');
const { runExtraction } = require('./extractApprovedTasks');

const STATE_PATH = path.join(process.cwd(), 'src', 'hitl', 'hitl-state.json');
const POLL_INTERVAL_MS = 3000;
const APPROVAL_TIMEOUT_MS = 120000;

async function createTaskForUrl(targetUrl) {
  const report = await captureReconTask(targetUrl);
  report.reportPath = `/pages-exploration/recon/${report.taskId}.json`;
  const task = createReconTask(report);
  console.log(`[TASK] Created HITL task ${task.taskId} for ${targetUrl}`);
  return task;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { tasks: [] };
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
}

async function pollForApproval(taskId) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const state = loadState();
    const currentTask = state.tasks.find((item) => item.taskId === taskId);
    if (!currentTask) {
      throw new Error(`Task ${taskId} not found in HITL state`);
    }
    if (currentTask.status === 'APPROVED') {
      return currentTask;
    }
    if (currentTask.status === 'REJECTED') {
      throw new Error(`Task ${taskId} was rejected by reviewer`);
    }
    if (Date.now() - start > APPROVAL_TIMEOUT_MS) {
      throw new Error('Timeout waiting for HITL approval');
    }
    await wait(POLL_INTERVAL_MS);
  }
}

async function runFullPipeline(targetUrl) {
  const task = await createTaskForUrl(targetUrl);
  console.log('Waiting for HITL approval...');
  const approvedTask = await pollForApproval(task.taskId);
  console.log(`Task ${approvedTask.taskId} approved. Starting extraction.`);
  await runExtraction();
  return approvedTask;
}

if (require.main === module) {
  const url = process.argv[2] || 'https://mogi.vn';
  runFullPipeline(url).catch((error) => {
    console.error('Pipeline failed:', error.message || error);
    process.exit(1);
  });
}

module.exports = { createTaskForUrl, pollForApproval, runFullPipeline };
