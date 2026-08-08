const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { launchStealthBrowser, createStealthContext } = require('./stealthBrowser');
const { loadTasks, updateTask } = require('./reconTasks');

const extractDir = path.join(process.cwd(), 'pages-exploration', 'extracted');
const validationScript = path.join(__dirname, '..', 'validation', 'runValidation.py');

if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir, { recursive: true });
}

function normalizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 80);
}

async function extractFromTask(task) {
  const url = task.url;
  const browser = await launchStealthBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    const pageTitle = await page.title();
    const headings = await page.$$eval('h1, h2', (els) =>
      els.map((element) => ({ tag: element.tagName, text: element.textContent.trim() }))
    );

    const links = await page.$$eval('a[href]', (els) =>
      els.map((element) => ({ href: element.href, text: element.textContent.trim() }))
    );

    const filename = `${task.taskId}_${normalizeTitle(task.title)}.json`;
    const outputPath = path.join(extractDir, filename);
    const summary = {
      taskId: task.taskId,
      url,
      title: pageTitle,
      extractedAt: new Date().toISOString(),
      headings,
      links,
      metadata: {
        routePattern: task.routePattern,
        reportPath: task.reportPath,
      },
      outputPath,
    };

    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');

    updateTask(task.taskId, {
      extractionStatus: 'COMPLETED',
      extractionPath: outputPath,
      outputPath,
      extractionSummary: summary,
    });

    if (process.env.VALIDATE_AFTER_EXTRACTION === 'true') {
      validateExtractionFile(outputPath, task);
    }

    return summary;
  } catch (error) {
    updateTask(task.taskId, {
      extractionStatus: 'FAILED',
      extractionError: error.message,
    });
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildExcelOutputPath(task) {
  const excelDir = process.env.EXPORT_EXCEL_DIR
    ? path.resolve(process.env.EXPORT_EXCEL_DIR)
    : path.join(extractDir, 'excel');
  ensureDirectory(excelDir);
  const filename = `${task.taskId}_${normalizeTitle(task.title)}.xlsx`;
  return path.join(excelDir, filename);
}

function resolvePythonExecutable() {
  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }

  const venvPython = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  return 'python';
}

function validateExtractionFile(filePath, task) {
  const pythonExe = resolvePythonExecutable();
  const args = [validationScript, filePath];
  if (process.env.EXPORT_EXCEL_PATH) {
    args.push('--excel', process.env.EXPORT_EXCEL_PATH);
  } else if (process.env.EXPORT_EXCEL_DIR) {
    args.push('--excel', buildExcelOutputPath(task));
  }

  console.log(`[VALIDATION] Running Python validation with ${pythonExe} for ${filePath}`);
  const result = spawnSync(pythonExe, args, { encoding: 'utf-8' });
  if (result.error) {
    console.warn(`[VALIDATION] Python execution failed: ${result.error.message}`);
    return;
  }
  if (result.stdout) {
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.error(result.stderr);
  }
}

async function runExtraction() {
  const state = loadTasks();
  const approved = state.tasks.filter((task) => task.status === 'APPROVED' && task.extractionStatus !== 'COMPLETED');

  if (approved.length === 0) {
    console.log('No approved tasks found for extraction.');
    return;
  }

  console.log(`Found ${approved.length} approved task(s) to extract.`);
  for (const task of approved) {
    console.log(`Extracting: ${task.taskId} ${task.url}`);
    try {
      const summary = await extractFromTask(task);
      console.log(`Completed extraction for ${task.taskId}: ${summary.outputPath}`);
    } catch (err) {
      console.error(`Extraction failed for ${task.taskId}: ${err.message}`);
    }
  }
}

if (require.main === module) {
  runExtraction().catch((err) => {
    console.error('Extraction runner failed:', err);
    process.exit(1);
  });
}

module.exports = { runExtraction, extractFromTask };
