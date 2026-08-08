const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const taskFile = path.join(process.cwd(), 'src', 'hitl', 'hitl-state.json');

function loadTasks() {
  if (!fs.existsSync(taskFile)) {
    return { tasks: [] };
  }
  return JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
}

function saveTasks(state) {
  fs.writeFileSync(taskFile, JSON.stringify(state, null, 2), 'utf-8');
}

function createReconTask(report) {
  const state = loadTasks();
  const taskId = crypto.randomUUID();
  const task = {
    taskId,
    title: report.title || 'Recon Task',
    url: report.url,
    routePattern: report.routePattern,
    reportPath: report.reportPath,
    status: 'REVIEW_PENDING',
    extractionStatus: 'PENDING',
    extractionPath: null,
    outputPath: null,
    createdAt: new Date().toISOString(),
    networkCalls: report.networkCalls,
    interactiveSelectors: report.interactiveSelectors,
    approved: false,
  };
  state.tasks.push(task);
  saveTasks(state);
  return task;
}

function updateTask(taskId, updates) {
  const state = loadTasks();
  const task = state.tasks.find((item) => item.taskId === taskId);
  if (!task) {
    return null;
  }
  Object.assign(task, updates);
  task.updatedAt = new Date().toISOString();
  saveTasks(state);
  return task;
}

function getTask(taskId) {
  const state = loadTasks();
  return state.tasks.find((item) => item.taskId === taskId) || null;
}

module.exports = { createReconTask, loadTasks, saveTasks, updateTask, getTask };
