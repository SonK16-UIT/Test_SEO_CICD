const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const STATE_FILE = path.join(process.cwd(), 'src', 'hitl', 'hitl-state.json');

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { tasks: [] };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

app.get('/tasks', (req, res) => {
  const state = loadState();
  res.json(state.tasks);
});

app.post('/tasks', (req, res) => {
  const state = loadState();
  const { taskId, title, url, routePattern, reportPath } = req.body;
  const task = {
    taskId,
    title,
    url,
    routePattern,
    reportPath,
    status: 'REVIEW_PENDING',
    createdAt: new Date().toISOString(),
    reviewerNotes: null,
    approved: null,
  };
  state.tasks.push(task);
  saveState(state);
  res.status(201).json(task);
});

app.patch('/tasks/:taskId', (req, res) => {
  const state = loadState();
  const task = state.tasks.find((item) => item.taskId === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const updates = req.body;
  Object.assign(task, updates);
  task.updatedAt = new Date().toISOString();
  saveState(state);
  res.json(task);
});

app.get('/tasks/:taskId', (req, res) => {
  const state = loadState();
  const task = state.tasks.find((item) => item.taskId === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

app.use('/artifacts', express.static(path.join(process.cwd(), 'pages-exploration', 'recon')));
app.use(express.static(path.join(process.cwd(), 'src', 'hitl', 'public')));

const PORT = process.env.HITL_PORT || 4000;
app.listen(PORT, () => {
  console.log(`[HITL] Verification server running on http://localhost:${PORT}`);
});
